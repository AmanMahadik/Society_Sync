import React, { useEffect, useRef } from 'react';
import { useAuth } from '../lib/auth-context';
import { useNotifications } from '../lib/notification-context';
import { supabase } from '../lib/supabase';
import { dataManager } from '../lib/data-manager';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';

export const GlobalSOSListener: React.FC = () => {
  const { user, profile } = useAuth();
  const { addNotification, refreshSOSCount } = useNotifications();
  const router = useRouter();

  const currentSocietyIdRef = useRef<string | null>(null);
  const activeChannelsRef = useRef<{
    sos?: any;
    parking?: any;
    announcement?: any;
    chat?: any;
    visitor?: any;
  }>({});

  const lastCheckedIdRef = useRef(0);
  const lastCheckedParkingIdRef = useRef(0);
  const lastCheckedAnnouncementIdRef = useRef(0);

  const cleanupChannels = () => {
    Object.entries(activeChannelsRef.current).forEach(([key, chan]) => {
      if (chan) {
        supabase.removeChannel(chan).catch(err => console.warn(`Error removing channel ${key}:`, err));
      }
    });
    activeChannelsRef.current = {};
    currentSocietyIdRef.current = null;
    lastCheckedIdRef.current = 0;
    lastCheckedParkingIdRef.current = 0;
    lastCheckedAnnouncementIdRef.current = 0;
  };

  // 1. Supabase Realtime Listeners (Insert / Update)
  useEffect(() => {
    if (!user || !profile || !profile.society_id) {
      cleanupChannels();
      return;
    }

    // Skip re-subscribing if already listening to the same society
    if (currentSocietyIdRef.current === profile.society_id && Object.keys(activeChannelsRef.current).length > 0) {
      return;
    }

    // Clean up any old active channels before subscribing
    cleanupChannels();
    currentSocietyIdRef.current = profile.society_id;

    // A. SOS Alerts Realtime Channel
    const channel = supabase
      .channel(`sos-alerts-${profile.society_id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'complaints', filter: `society_id=eq.${profile.society_id}` },
        async (payload) => {
          const newRecord = payload.new;
          await refreshSOSCount();

          // Guard gets full overlay
          if (profile.role === 'guard' && newRecord.type === 'security' && newRecord.status === 'pending') {
            addNotification({
              type: 'sos_full',
              message: '🚨 SOS ALERT!',
              subtext: `Wing ${newRecord.wing} - Flat ${newRecord.flat_number} needs help!`,
              complaintId: newRecord.id,
              wing: newRecord.wing,
              flat_number: newRecord.flat_number,
              onAction: async () => {
                try {
                  await dataManager.acknowledgeComplaint(String(newRecord.id), user.id);
                  await refreshSOSCount();
                } catch (e) {
                  console.warn('Acknowledge error:', e);
                }
              },
              actionLabel: 'ACKNOWLEDGE'
            });
          }

          // Admin gets floating info toast
          if (profile.role === 'admin' && newRecord.type === 'security' && newRecord.status === 'pending') {
            addNotification({
              type: 'sos_info',
              message: '🔔 SOS Generated',
              subtext: `Flat ${newRecord.wing}-${newRecord.flat_number} · ${newRecord.description || 'Emergency alert'}`,
              complaintId: newRecord.id,
              autoDismiss: true,
              dismissAfterMs: 8000,
              actionLabel: 'View Details',
              wing: newRecord.wing,
              flat_number: newRecord.flat_number
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'complaints', filter: `society_id=eq.${profile.society_id}` },
        async (payload) => {
          const oldRecord = payload.old;
          const newRecord = payload.new;
          await refreshSOSCount();

          // Sender (Owner/Tenant) gets status updates
          if (newRecord.user_id === user.id && newRecord.type === 'security') {
            if (newRecord.status === 'acknowledged' && oldRecord.status !== 'acknowledged') {
              addNotification({
                type: 'status_update',
                message: '🟠 SOS Acknowledged',
                subtext: 'Security guard has acknowledged your SOS. Help is on the way.',
                autoDismiss: true,
                dismissAfterMs: 5000,
                color: '#E28743'
              });
            } else if (newRecord.status === 'resolved' && oldRecord.status !== 'resolved') {
              addNotification({
                type: 'status_update',
                message: '🟢 SOS Resolved',
                subtext: 'Your SOS alert has been marked as resolved.',
                autoDismiss: true,
                dismissAfterMs: 5000,
                color: '#388E3C'
              });
            }
          }
        }
      )
      .subscribe();
    activeChannelsRef.current.sos = channel;

    // B. Parking Bookings Realtime Channel (Notify guard for any new parking allocation/request)
    const parkingChannel = supabase
      .channel(`parking-alerts-${profile.society_id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'parking_requests', filter: `society_id=eq.${profile.society_id}` },
        async (payload) => {
          const newRecord = payload.new;

          // Guard gets floating toast for any new parking allocation/request
          if (profile.role === 'guard') {
            let applicantName = newRecord.visitor_name || 'Resident';
            
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('full_name, wing, flat_number')
              .eq('id', newRecord.user_id)
              .single();

            const displayName = userProfile?.full_name || applicantName;
            const locationStr = userProfile ? ` (${userProfile.wing}-${userProfile.flat_number})` : '';

            addNotification({
              type: 'parking_alert',
              message: newRecord.status === 'approved' ? '🚗 Parking Allocated' : '🚗 New Parking Booking',
              subtext: `${displayName}${locationStr} booked vehicle ${newRecord.vehicle_number} on Slot ${newRecord.slot_number || 'Visitor'}`,
              autoDismiss: true,
              dismissAfterMs: 8000,
              actionLabel: 'OPEN BOOKINGS',
              onAction: () => {
                router.push('/(tabs)/parking' as any);
              }
            });
          }
        }
      )
      .subscribe();
    activeChannelsRef.current.parking = parkingChannel;

    // C. Announcements Realtime Channel (Notify all roles when a new announcement is published)
    const announcementChannel = supabase
      .channel(`announcement-alerts-${profile.society_id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'announcements', filter: `society_id=eq.${profile.society_id}` },
        (payload) => {
          const newRecord = payload.new;
          addNotification({
            type: 'status_update',
            message: newRecord.is_pinned ? '📌 Pinned Announcement' : '📢 New Announcement',
            subtext: `${newRecord.title}: ${newRecord.body}`,
            autoDismiss: true,
            dismissAfterMs: 10000,
            color: '#06B6D4',
            actionLabel: 'VIEW',
            onAction: () => {
              router.push('/' as any);
            }
          });
        }
      )
      .subscribe();
    activeChannelsRef.current.announcement = announcementChannel;

    // D. Chat Messages Realtime Channel (Notify all users when a new chat message is sent)
    const chatChannel = supabase
      .channel(`chat-alerts-${profile.society_id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `society_id=eq.${profile.society_id}` },
        async (payload) => {
          const newRecord = payload.new;

          // Do not show notification to the sender of the message
          if (newRecord.user_id === user.id) return;

          // Fetch sender profile info
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('full_name, wing, flat_number')
            .eq('id', newRecord.user_id)
            .single();

          // Fetch thread details
          const { data: thread } = await supabase
            .from('chat_threads')
            .select('title')
            .eq('id', newRecord.thread_id)
            .single();

          const senderName = senderProfile?.full_name || 'Resident';
          const senderLoc = senderProfile ? ` (${senderProfile.wing}-${senderProfile.flat_number})` : '';
          const threadTitle = thread?.title || 'Chat';

          addNotification({
            type: 'status_update',
            message: `💬 ${senderName}${senderLoc} in ${threadTitle}`,
            subtext: newRecord.content,
            autoDismiss: true,
            dismissAfterMs: 6000,
            color: '#3b82f6',
            actionLabel: 'OPEN CHAT',
            onAction: () => {
              router.push('/(tabs)/chat' as any);
            }
          });

          // Trigger native OS heads-up banner notification (WhatsApp style)
          Notifications.scheduleNotificationAsync({
            content: {
              title: `💬 ${senderName}${senderLoc} in ${threadTitle}`,
              body: newRecord.content,
              sound: true,
              priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger: null,
          }).catch((err) => console.warn('Error triggering native notification:', err));
        }
      )
      .subscribe();
    activeChannelsRef.current.chat = chatChannel;

    // E. Visitors Realtime Channel (Notify resident when their guest checks in)
    const visitorChannel = supabase
      .channel(`visitor-alerts-${profile.society_id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'visitors', filter: `society_id=eq.${profile.society_id}` },
        (payload) => {
          const newRecord = payload.new;

          // Only notify if the check-in is linked to this resident (user_id matches)
          if (newRecord.user_id === user.id) {
            const guestName = newRecord.name || 'Your guest';
            const purposeStr = newRecord.purpose ? ` (${newRecord.purpose})` : '';

            addNotification({
              type: 'confirmation',
              message: `🚪 Guest Arrived${purposeStr}`,
              subtext: `${guestName} has checked in at the main gate.`,
              autoDismiss: true,
              dismissAfterMs: 8000,
              color: '#388E3C',
              actionLabel: 'OK',
              onAction: () => {}
            });

            // Trigger native OS heads-up banner notification
            Notifications.scheduleNotificationAsync({
              content: {
                title: `🚪 Guest Arrived${purposeStr}`,
                body: `${guestName} has checked in at the main gate.`,
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
              },
              trigger: null,
            }).catch((err) => console.warn('Error triggering native guest notification:', err));
          }
        }
      )
      .subscribe();
    activeChannelsRef.current.visitor = visitorChannel;

    return () => {
      cleanupChannels();
    };
  }, [user, profile, addNotification, refreshSOSCount]);
  // 2. OFFLINE FALLBACK POLLER (Polls every 30s in case Realtime WebSockets disconnect)
  useEffect(() => {
    if (!user || !profile || !profile.society_id) return;

    const performOfflinePollCheck = async () => {
      try {
        // A. SOS Alerts Check (Guard/Admin only)
        if (profile.role === 'guard' || profile.role === 'admin') {
          const { data, error } = await supabase
            .from('complaints')
            .select('*')
            .eq('type', 'security')
            .eq('status', 'pending')
            .eq('society_id', profile.society_id)
            .gt('id', lastCheckedIdRef.current);

          if (!error && data && data.length > 0) {
            const maxId = Math.max(...data.map(d => Number(d.id)));
            
            // Only notify if we already established a baseline to avoid alerts on startup
            if (lastCheckedIdRef.current > 0) {
              data.forEach(newRecord => {
                if (profile.role === 'guard') {
                  addNotification({
                    type: 'sos_full',
                    message: '🚨 SOS ALERT!',
                    subtext: `Wing ${newRecord.wing} - Flat ${newRecord.flat_number} needs help!`,
                    complaintId: newRecord.id,
                    wing: newRecord.wing,
                    flat_number: newRecord.flat_number,
                    onAction: async () => {
                      await dataManager.acknowledgeComplaint(String(newRecord.id), user.id);
                      await refreshSOSCount();
                    },
                    actionLabel: 'ACKNOWLEDGE'
                  });
                } else if (profile.role === 'admin') {
                  addNotification({
                    type: 'sos_info',
                    message: '🔔 SOS Generated',
                    subtext: `Flat ${newRecord.wing}-${newRecord.flat_number} · ${newRecord.description || 'Emergency alert'}`,
                    complaintId: newRecord.id,
                    autoDismiss: true,
                    dismissAfterMs: 8000,
                    actionLabel: 'View Details',
                    wing: newRecord.wing,
                    flat_number: newRecord.flat_number
                  });
                }
              });
            }
            lastCheckedIdRef.current = maxId;
          } else if (!error && lastCheckedIdRef.current === 0) {
            // Establish baseline
            const { data: allPending } = await supabase
              .from('complaints')
              .select('id')
              .eq('type', 'security')
              .eq('status', 'pending')
              .eq('society_id', profile.society_id);
            if (allPending && allPending.length > 0) {
              lastCheckedIdRef.current = Math.max(...allPending.map(d => Number(d.id)));
            } else {
              lastCheckedIdRef.current = 1;
            }
          }
        }

        // B. Parking Requests Check (Guard only)
        if (profile.role === 'guard') {
          const { data: parkingData, error: parkingError } = await supabase
            .from('parking_requests')
            .select('*')
            .eq('society_id', profile.society_id)
            .gt('id', lastCheckedParkingIdRef.current);

          if (!parkingError && parkingData && parkingData.length > 0) {
            const maxId = Math.max(...parkingData.map(d => Number(d.id)));
            
            if (lastCheckedParkingIdRef.current > 0) {
              parkingData.forEach(async (newRecord) => {
                const { data: userProfile } = await supabase
                  .from('profiles')
                  .select('full_name, wing, flat_number')
                  .eq('id', newRecord.user_id)
                  .single();

                const displayName = userProfile?.full_name || newRecord.visitor_name || 'Resident';
                const locationStr = userProfile ? ` (${userProfile.wing}-${userProfile.flat_number})` : '';

                addNotification({
                  type: 'parking_alert',
                  message: newRecord.status === 'approved' ? '🚗 Parking Allocated' : '🚗 New Parking Booking',
                  subtext: `${displayName}${locationStr} booked vehicle ${newRecord.vehicle_number} on Slot ${newRecord.slot_number || 'Visitor'}`,
                  autoDismiss: true,
                  dismissAfterMs: 8000,
                  actionLabel: 'OPEN BOOKINGS',
                  onAction: () => {
                    router.push('/(tabs)/parking' as any);
                  }
                });
              });
            }
            lastCheckedParkingIdRef.current = maxId;
          } else if (!parkingError && lastCheckedParkingIdRef.current === 0) {
            const { data: allPendingParking } = await supabase
              .from('parking_requests')
              .select('id')
              .eq('society_id', profile.society_id);
            if (allPendingParking && allPendingParking.length > 0) {
              lastCheckedParkingIdRef.current = Math.max(...allPendingParking.map(d => Number(d.id)));
            } else {
              lastCheckedParkingIdRef.current = 1;
            }
          }
        }

        // C. Announcements Check (All Roles)
        const { data: announcementData, error: announcementError } = await supabase
          .from('announcements')
          .select('*')
          .eq('society_id', profile.society_id)
          .gt('id', lastCheckedAnnouncementIdRef.current);

        if (!announcementError && announcementData && announcementData.length > 0) {
          const maxId = Math.max(...announcementData.map(d => Number(d.id)));
          
          if (lastCheckedAnnouncementIdRef.current > 0) {
            announcementData.forEach((newRecord) => {
              addNotification({
                type: 'status_update',
                message: newRecord.is_pinned ? '📌 Pinned Announcement' : '📢 New Announcement',
                subtext: `${newRecord.title}: ${newRecord.body}`,
                autoDismiss: true,
                dismissAfterMs: 10000,
                color: '#06B6D4',
                actionLabel: 'VIEW',
                onAction: () => {
                  router.push('/' as any);
                }
              });
            });
          }
          lastCheckedAnnouncementIdRef.current = maxId;
        } else if (!announcementError && lastCheckedAnnouncementIdRef.current === 0) {
          const { data: allAnnouncements } = await supabase
            .from('announcements')
            .select('id')
            .eq('society_id', profile.society_id);
          if (allAnnouncements && allAnnouncements.length > 0) {
            lastCheckedAnnouncementIdRef.current = Math.max(...allAnnouncements.map(d => Number(d.id)));
          } else {
            lastCheckedAnnouncementIdRef.current = 1;
          }
        }
      } catch (e) {
        console.warn('Offline fallback check error:', e);
      }
    };

    performOfflinePollCheck();
    const timer = setInterval(performOfflinePollCheck, 30000);
    return () => clearInterval(timer);
  }, [user, profile, addNotification, refreshSOSCount]);

  return null;
};
export default GlobalSOSListener;
