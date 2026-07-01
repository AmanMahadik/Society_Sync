import React, { useEffect } from 'react';
import { useAuth } from '../lib/auth-context';
import { useNotifications } from '../lib/notification-context';
import { supabase } from '../lib/supabase';
import { dataManager } from '../lib/data-manager';
import { useRouter } from 'expo-router';

export const GlobalSOSListener: React.FC = () => {
  const { user, profile } = useAuth();
  const { addNotification, refreshSOSCount } = useNotifications();
  const router = useRouter();

  // 1. Supabase Realtime Listeners (Insert / Update)
  useEffect(() => {
    if (!user || !profile) return;

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

    const parkingChannel = supabase
      .channel(`parking-alerts-${profile.society_id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'parking_requests', filter: `society_id=eq.${profile.society_id}` },
        async (payload) => {
          const newRecord = payload.new;

          // Guard gets floating toast for new visitor parking request
          if (profile.role === 'guard' && newRecord.status === 'pending') {
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
              message: '🚗 New Parking Booking',
              subtext: `${displayName}${locationStr} is requesting parking for vehicle ${newRecord.vehicle_number}`,
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

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(parkingChannel);
    };
  }, [user, profile, addNotification, refreshSOSCount]);

  // 2. OFFLINE FALLBACK POLLER (Polls every 30s in case Realtime WebSockets disconnect)
  useEffect(() => {
    if (!user || !profile) return;
    if (profile.role !== 'guard' && profile.role !== 'admin') return;

    let lastCheckedId = 0;
    let lastCheckedParkingId = 0;

    const performOfflinePollCheck = async () => {
      try {
        const { data, error } = await supabase
          .from('complaints')
          .select('*')
          .eq('type', 'security')
          .eq('status', 'pending')
          .eq('society_id', profile.society_id)
          .gt('id', lastCheckedId);

        if (!error && data && data.length > 0) {
          const maxId = Math.max(...data.map(d => Number(d.id)));
          
          // Only notify if we already established a baseline to avoid alerts on startup
          if (lastCheckedId > 0) {
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
          lastCheckedId = maxId;
        } else if (!error) {
          // Establish baseline on first query if no pending records match
          if (lastCheckedId === 0) {
            const { data: allPending } = await supabase
              .from('complaints')
              .select('id')
              .eq('type', 'security')
              .eq('status', 'pending')
              .eq('society_id', profile.society_id);
            if (allPending && allPending.length > 0) {
              lastCheckedId = Math.max(...allPending.map(d => Number(d.id)));
            } else {
              lastCheckedId = 1;
            }
          }
        }

        // Check pending parking requests (for Guard only)
        if (profile.role === 'guard') {
          const { data: parkingData, error: parkingError } = await supabase
            .from('parking_requests')
            .select('*')
            .eq('status', 'pending')
            .eq('society_id', profile.society_id)
            .gt('id', lastCheckedParkingId);

          if (!parkingError && parkingData && parkingData.length > 0) {
            const maxId = Math.max(...parkingData.map(d => Number(d.id)));
            
            if (lastCheckedParkingId > 0) {
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
                  message: '🚗 New Parking Booking',
                  subtext: `${displayName}${locationStr} is requesting parking for vehicle ${newRecord.vehicle_number}`,
                  autoDismiss: true,
                  dismissAfterMs: 8000,
                  actionLabel: 'OPEN BOOKINGS',
                  onAction: () => {
                    router.push('/(tabs)/parking' as any);
                  }
                });
              });
            }
            lastCheckedParkingId = maxId;
          } else if (!parkingError && lastCheckedParkingId === 0) {
            const { data: allPendingParking } = await supabase
              .from('parking_requests')
              .select('id')
              .eq('status', 'pending')
              .eq('society_id', profile.society_id);
            if (allPendingParking && allPendingParking.length > 0) {
              lastCheckedParkingId = Math.max(...allPendingParking.map(d => Number(d.id)));
            } else {
              lastCheckedParkingId = 1;
            }
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
