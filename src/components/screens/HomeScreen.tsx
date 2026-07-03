import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, ScrollView, Vibration, Platform, Image, TouchableOpacity, Animated, Share } from 'react-native';
import { Text, Button, Card, Portal, Modal, IconButton, Avatar, useTheme, Chip, TextInput } from 'react-native-paper';
import { useAuth } from '../../lib/auth-context';
import { dataManager, Complaint, Announcement, VisitorPreApproval, Visitor } from '../../lib/data-manager';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '../../lib/notification-context';
// @ts-ignore
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface HomeScreenProps {
  jumpTo?: (key: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ jumpTo }) => {
  const { profile, user } = useAuth();
  const { addNotification } = useNotifications();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [sosModalVisible, setSosModalVisible] = useState(false);
  const [selectedType, setSelectedType] = useState<'water_low' | 'motor_off' | 'electricity' | 'security' | 'other'>('water_low');
  const [sosDescription, setSosDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeAlarm, setActiveAlarm] = useState<Complaint | null>(null);

  // Notice board / announcements state
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [noticeModalVisible, setNoticeModalVisible] = useState(false);
  const [newNoticeTitle, setNewNoticeTitle] = useState('');
  const [newNoticeContent, setNewNoticeContent] = useState('');
  const [newNoticePinned, setNewNoticePinned] = useState(false);
  const [isSubmittingNotice, setIsSubmittingNotice] = useState(false);

  // Loop pulse & ring animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bellRotation = useRef(new Animated.Value(0)).current;

  // Summary Card Statistics State
  const [summaryData, setSummaryData] = useState({
    pendingApprovals: 0,
    todaysParkings: 0,
    pendingDues: 0
  });

  // Visitor passcodes and registry states (Resident)
  const [preApprovals, setPreApprovals] = useState<VisitorPreApproval[]>([]);
  const [visitorModalVisible, setVisitorModalVisible] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [visitorVehicle, setVisitorVehicle] = useState('');
  const [visitorPurpose, setVisitorPurpose] = useState('Delivery');
  const [generatedPasscode, setGeneratedPasscode] = useState('');
  const [submittingVisitor, setSubmittingVisitor] = useState(false);

  // Guard registry states
  const [passcodeInput, setPasscodeInput] = useState('');
  const [verifyingPasscode, setVerifyingPasscode] = useState(false);
  const [verifiedGuest, setVerifiedGuest] = useState<VisitorPreApproval | null>(null);
  const [recentVisitors, setRecentVisitors] = useState<Visitor[]>([]);
  const [manualVisitorModalVisible, setManualVisitorModalVisible] = useState(false);
  const [manualVisitorName, setManualVisitorName] = useState('');
  const [manualVisitorVehicle, setManualVisitorVehicle] = useState('');
  const [manualVisitorFlat, setManualVisitorFlat] = useState('');
  const [manualVisitorPurpose, setManualVisitorPurpose] = useState('Delivery');
  const [submittingManualVisitor, setSubmittingManualVisitor] = useState(false);

  const fetchSummaryData = async () => {
    try {
      const allProfs = await dataManager.getAllProfiles();
      const pendingProfs = allProfs.filter(p => p.status === 'pending').length;

      const today = new Date().toISOString().split('T')[0];
      const parkings = await dataManager.getParkingBookings(today);
      const approvedParkings = parkings.filter(p => p.status === 'approved').length;

      const dues = await dataManager.getMaintenanceDues();
      const pendingDuesVal = dues
        .filter(d => d.status !== 'paid')
        .reduce((sum, d) => sum + (Number(d.amount) + Number(d.interest_charged) - Number(d.paid_amount)), 0);

      setSummaryData({
        pendingApprovals: pendingProfs,
        todaysParkings: approvedParkings,
        pendingDues: pendingDuesVal
      });
    } catch (e) {
      console.error('Error fetching summary stats', e);
    }
  };

  const fetchComplaints = async () => {
    if (!user) return;
    try {
      const list = await dataManager.getComplaints(profile?.role, user.id);
      setComplaints(list);
      
      // If user is Guard, check if there's any active 'pending' alert to trigger the loud visual alarm
      if (profile?.role === 'guard') {
        const pending = list.find(c => c.status === 'pending' && c.type === 'security');
        if (pending) {
          setActiveAlarm(pending);
          // Vibrate device on new pending alert (if native)
          if (Platform.OS !== 'web') {
            Vibration.vibrate([500, 500, 500], true);
          }
        } else {
          setActiveAlarm(null);
          if (Platform.OS !== 'web') {
            Vibration.cancel();
          }
        }
      } else {
        // Admins and residents do not get the full-screen visual alarm overlay
        setActiveAlarm(null);
        if (Platform.OS !== 'web') {
          Vibration.cancel();
        }
      }
    } catch (e) {
      console.error('Error fetching complaints', e);
    }
  };

  const fetchAnnouncementsData = async () => {
    try {
      const list = await dataManager.getAnnouncements();
      setAnnouncements(list);
    } catch (e) {
      console.error('Error fetching announcements', e);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!newNoticeTitle.trim() || !newNoticeContent.trim() || !user) return;
    setIsSubmittingNotice(true);
    try {
      await dataManager.createAnnouncement(
        newNoticeTitle.trim(),
        newNoticeContent.trim(),
        newNoticePinned,
        null,
        user.id
      );
      setNoticeModalVisible(false);
      setNewNoticeTitle('');
      setNewNoticeContent('');
      setNewNoticePinned(false);
      addNotification({
        type: 'confirmation',
        message: '📢 Notice Published',
        subtext: 'Your announcement has been posted successfully.',
        autoDismiss: true,
        dismissAfterMs: 4000
      });
      fetchAnnouncementsData();
    } catch (e) {
      console.error('Error publishing notice', e);
    } finally {
      setIsSubmittingNotice(false);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    try {
      await dataManager.deleteAnnouncement(id);
      addNotification({
        type: 'confirmation',
        message: '🗑️ Notice Deleted',
        subtext: 'The announcement has been deleted successfully.',
        autoDismiss: true,
        dismissAfterMs: 4000
      });
      fetchAnnouncementsData();
    } catch (e) {
      console.error('Error deleting notice', e);
    }
  };

  const handleTogglePin = async (id: string, isPinned: boolean) => {
    try {
      await dataManager.togglePinAnnouncement(id, isPinned);
      addNotification({
        type: 'confirmation',
        message: isPinned ? '📌 Notice Pinned' : '📌 Notice Unpinned',
        subtext: isPinned ? 'Notice pinned to top.' : 'Notice unpinned.',
        autoDismiss: true,
        dismissAfterMs: 3000
      });
      fetchAnnouncementsData();
    } catch (e) {
      console.error('Error toggling notice pin', e);
    }
  };

  const fetchPreApprovals = async () => {
    if (!user || !profile) return;
    if (profile.role === 'guard' || profile.role === 'admin' || profile.role === 'master_admin') return;
    try {
      const list = await dataManager.getPreApprovals(user.id);
      setPreApprovals(list);
    } catch (e) {
      console.error('Error fetching pre approvals', e);
    }
  };

  const fetchRecentVisitors = async () => {
    if (!profile || profile.role !== 'guard') return;
    try {
      const list = await dataManager.getRecentVisitors();
      setRecentVisitors(list);
    } catch (e) {
      console.error('Error fetching recent visitors', e);
    }
  };

  const handleCreatePreApproval = async () => {
    if (!visitorName.trim() || !user) return;
    setSubmittingVisitor(true);
    try {
      const record = await dataManager.createPreApproval(
        user.id,
        visitorName.trim(),
        visitorVehicle.trim(),
        visitorPurpose
      );
      setGeneratedPasscode(record.passcode);
      fetchPreApprovals();
      addNotification({
        type: 'confirmation',
        message: '🔑 Passcode Generated',
        subtext: `6-digit entry code: ${record.passcode}`,
        autoDismiss: true,
        dismissAfterMs: 4000
      });
    } catch (e) {
      console.error('Error creating pre approval', e);
      addNotification({
        type: 'status_update',
        message: '❌ Error',
        subtext: 'Could not create guest passcode.',
        color: theme.colors.error
      });
    } finally {
      setSubmittingVisitor(false);
    }
  };

  const handleRevokePreApproval = async (id: string) => {
    try {
      await dataManager.revokePreApproval(id);
      fetchPreApprovals();
      addNotification({
        type: 'confirmation',
        message: '🚫 Passcode Revoked',
        subtext: 'The guest entry code is now invalid.',
        autoDismiss: true,
        dismissAfterMs: 3000
      });
    } catch (e) {
      console.error('Error revoking pre approval', e);
    }
  };

  const handleSharePasscode = async (passcode: string, name: string) => {
    const shareText = `Hello ${name},\n\nHere is your Visitor Entry Passcode for my society:\n🔑 PASSCODE: ${passcode}\n\nPlease show this to the guard at the gate for instant entry.`;
    try {
      if (Platform.OS === 'web') {
        alert('Passcode Copied to Clipboard!');
      } else {
        await Share.share({ message: shareText });
      }
    } catch (e) {
      console.error('Error sharing passcode', e);
    }
  };

  const handleVerifyPasscode = async () => {
    if (!passcodeInput.trim() || passcodeInput.trim().length !== 6) {
      addNotification({
        type: 'status_update',
        message: '⚠️ Invalid Passcode',
        subtext: 'Please enter a 6-digit numeric passcode.',
        color: '#FFD700'
      });
      return;
    }
    setVerifyingPasscode(true);
    try {
      const record = await dataManager.verifyPasscode(passcodeInput.trim());
      if (record) {
        setVerifiedGuest(record);
        addNotification({
          type: 'confirmation',
          message: '✅ Passcode Verified',
          subtext: `Guest: ${record.name} - Approved!`,
          autoDismiss: true,
          dismissAfterMs: 4000
        });
      } else {
        setVerifiedGuest(null);
        addNotification({
          type: 'status_update',
          message: '❌ Passcode Not Found',
          subtext: 'Code is invalid, expired, or already used.',
          color: theme.colors.error
        });
      }
    } catch (e) {
      console.error('Error verifying passcode', e);
    } finally {
      setVerifyingPasscode(false);
    }
  };

  const handleCheckInVerifiedGuest = async () => {
    if (!verifiedGuest) return;
    try {
      await dataManager.checkInPreApprovedVisitor(verifiedGuest.id);
      setVerifiedGuest(null);
      setPasscodeInput('');
      fetchRecentVisitors();
      addNotification({
        type: 'confirmation',
        message: '🚗 Guest Checked In',
        subtext: 'The entry has been successfully logged.',
        autoDismiss: true,
        dismissAfterMs: 4000
      });
    } catch (e) {
      console.error('Error checking in verified guest', e);
    }
  };

  const handleCheckInManualGuest = async () => {
    if (!manualVisitorName.trim() || !manualVisitorFlat.trim()) return;
    setSubmittingManualVisitor(true);
    try {
      await dataManager.checkInManualVisitor(
        manualVisitorName.trim(),
        manualVisitorVehicle.trim(),
        manualVisitorFlat.trim(),
        manualVisitorPurpose
      );
      setManualVisitorModalVisible(false);
      setManualVisitorName('');
      setManualVisitorVehicle('');
      setManualVisitorFlat('');
      fetchRecentVisitors();
      addNotification({
        type: 'confirmation',
        message: '📝 Visitor Registered',
        subtext: 'Manual visitor check-in successfully logged.',
        autoDismiss: true,
        dismissAfterMs: 4000
      });
    } catch (e) {
      console.error('Error manual check-in', e);
    } finally {
      setSubmittingManualVisitor(false);
    }
  };

  const handleCheckOutVisitor = async (id: string) => {
    try {
      await dataManager.checkOutVisitor(id);
      fetchRecentVisitors();
      addNotification({
        type: 'confirmation',
        message: '🏁 Guest Checked Out',
        subtext: 'Departure logged successfully.',
        autoDismiss: true,
        dismissAfterMs: 3000
      });
    } catch (e) {
      console.error('Error checking out visitor', e);
    }
  };

  const loadAllData = async () => {
    await fetchComplaints();
    await fetchSummaryData();
    await fetchAnnouncementsData();
    await fetchPreApprovals();
    await fetchRecentVisitors();
  };

  // Loop pulse animation
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 950,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 950,
          useNativeDriver: true,
        })
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, []);

  // Alarm ringing shake animation
  useEffect(() => {
    let bellLoop: Animated.CompositeAnimation | null = null;
    if (activeAlarm) {
      bellLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(bellRotation, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(bellRotation, {
            toValue: -1,
            duration: 100,
            useNativeDriver: true,
          })
        ])
      );
      bellLoop.start();
    } else {
      bellRotation.setValue(0);
    }
    return () => {
      if (bellLoop) bellLoop.stop();
    };
  }, [activeAlarm]);

  // Poll for complaints and summary statistics every 4 seconds
  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 4000);

    // Also subscribe to changes if using real Supabase
    let unsubscribe: any;
    if (!dataManager.isMockMode()) {
      unsubscribe = dataManager.subscribe('complaints', () => {
        loadAllData();
      });
    }

    return () => {
      clearInterval(interval);
      if (unsubscribe) unsubscribe();
      if (Platform.OS !== 'web') Vibration.cancel();
    };
  }, [profile]);

  const handleRaiseSOS = async () => {
    if (!user) return;
    setSubmitting(true);
    
    // Fallback for admin or guard profiles that may not have standard residential wings/flats
    let userWing = profile?.wing || '';
    let userFlat = profile?.flat_number || '';
    if (!userWing || userWing.trim() === '') {
      userWing = (profile?.role === 'admin' || profile?.role === 'master_admin') ? 'HQ' : (profile?.role === 'guard' ? 'Gate' : 'Gen');
    }
    if (!userFlat || userFlat.trim() === '') {
      userFlat = (profile?.role === 'admin' || profile?.role === 'master_admin') ? 'Admin' : (profile?.role === 'guard' ? 'Guard' : 'Office');
    }

    let desc = sosDescription;
    if (!desc) {
      if (selectedType === 'water_low') desc = 'Wing ' + userWing + ' Water Level Low - Please check tank!';
      else if (selectedType === 'motor_off') desc = 'E Wing water pressure low. Motor needs to be manually turned ON.';
      else if (selectedType === 'electricity') desc = 'Power cut / Phase failure reported in Wing ' + userWing;
      else if (selectedType === 'security') desc = 'Security alert / Unauthorized parking or intruder reported!';
      else desc = 'Emergency service requested at Flat ' + userWing + '-' + userFlat;
    }

    try {
      await dataManager.raiseComplaint(
        user.id,
        selectedType,
        userWing,
        userFlat,
        desc
      );
      setSosModalVisible(false);
      setSosDescription('');

      // Show confirmation toast
      addNotification({
        type: 'confirmation',
        message: '✅ SOS Sent',
        subtext: 'Your SOS alert has been sent. Help is on the way.',
        autoDismiss: true,
        dismissAfterMs: 5000
      });

      loadAllData();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcknowledge = async (complaintId: string) => {
    if (!user) return;
    await dataManager.acknowledgeComplaint(complaintId, user.id);
    loadAllData();
  };

  const handleResolve = async (complaintId: string) => {
    if (!user) return;
    await dataManager.resolveComplaint(complaintId, user.id);
    loadAllData();
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'water_low': return 'water-off';
      case 'motor_off': return 'engine-off';
      case 'electricity': return 'flash-off';
      case 'security': return 'shield-alert';
      default: return 'alert-circle';
    }
  };

  const getAlertColor = (status: string) => {
    switch (status) {
      case 'pending': return theme.colors.error;
      case 'acknowledged': return '#F57C00'; // Orange
      case 'resolved': return '#388E3C'; // Green
      default: return theme.colors.outline;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      {/* 1. LOUD ALARM OVERLAY FOR GUARD/ADMIN */}
      {activeAlarm && (
        <Card style={[styles.alarmCard, { backgroundColor: theme.colors.errorContainer }]}>
          <Card.Content style={styles.alarmContent}>
            <Animated.View style={{
              transform: [{
                rotate: bellRotation.interpolate({
                  inputRange: [-1, 1],
                  outputRange: ['-18deg', '18deg']
                })
              }]
            }}>
              <IconButton icon="bell-ring" iconColor={theme.colors.error} size={32} style={styles.flashingBell} />
            </Animated.View>
            <View style={styles.alarmTextContainer}>
              <Text variant="titleMedium" style={{ color: theme.colors.onErrorContainer, fontWeight: 'bold', fontSize: 13 }}>
                🚨 LOUD SOS ALERT!
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onErrorContainer, fontWeight: 'bold', fontSize: 13 }}>
                Flat {activeAlarm.wing}-{activeAlarm.flat_number} • {activeAlarm.type.replace('_', ' ').toUpperCase()}
              </Text>
              <Text variant="bodySmall" numberOfLines={1} style={{ color: theme.colors.onErrorContainer, fontSize: 11 }}>
                {activeAlarm.description}
              </Text>
            </View>
            <View style={styles.alarmActionContainer}>
              <Button 
                mode="contained" 
                buttonColor={theme.colors.error} 
                textColor={theme.colors.onError}
                onPress={() => handleAcknowledge(activeAlarm.id)}
                labelStyle={{ fontSize: 10 }}
                style={styles.alarmButton}
                compact
              >
                Acknowledge
              </Button>
            </View>
          </Card.Content>
        </Card>
      )}

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* 2. WELCOME HEADER */}
        <View style={styles.welcomeRow}>
          <View style={styles.headerBranding}>
            <Image 
              source={require('../../../assets/images/logo.png')} 
              style={styles.headerLogo} 
              resizeMode="contain"
            />
            <View>
              <Text variant="headlineSmall" style={[styles.welcomeText, { color: theme.colors.onSurface }]}>
                Namaste, {profile?.full_name?.split(' ')[0]}
              </Text>
              <View style={styles.roleBadgeContainer}>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                  Wing {profile?.wing || '?'}-{profile?.flat_number || '?'} • 
                </Text>
                {(() => {
                  const getContrastColor = (r?: string) => {
                    const isDark = theme.dark;
                    switch (r) {
                      case 'admin': return isDark ? '#FFD700' : '#B45309';
                      case 'owner': return isDark ? '#00D4AA' : '#047857';
                      case 'renter': return isDark ? '#3B82F6' : '#1D4ED8';
                      case 'guard': return isDark ? '#06B6D4' : '#0E7490';
                      default: return isDark ? '#888888' : '#555555';
                    }
                  };
                  const badgeText = (() => {
                    switch (profile?.role) {
                      case 'admin': return 'Admin';
                      case 'owner': return 'Owner';
                      case 'renter': return 'Tenant';
                      case 'guard': return 'Guard';
                      default: return 'Resident';
                    }
                  })();
                  const contrastColor = getContrastColor(profile?.role);
                  return (
                    <View 
                      style={{ 
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: contrastColor + '15', 
                        borderColor: contrastColor, 
                        borderWidth: 0.5,
                        borderRadius: 4,
                        paddingHorizontal: 6,
                        paddingVertical: 1.5,
                        marginLeft: 4,
                      }}
                    >
                      <Text style={{ fontSize: 8, fontWeight: 'bold', color: contrastColor, textTransform: 'uppercase' }}>
                        {badgeText}
                      </Text>
                    </View>
                  );
                })()}
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={() => jumpTo?.('profile')} activeOpacity={0.7}>
            {profile?.google_picture_url ? (
              <Avatar.Image 
                size={42} 
                source={{ uri: profile.google_picture_url }} 
              />
            ) : (
              <Avatar.Text 
                size={42} 
                label={profile?.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'RS'} 
                style={{ backgroundColor: '#00D4AA' }}
                color="#0F0F0F"
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Pinned Announcements Carousel */}
        {(() => {
          const pinnedNotices = announcements.filter(n => n.is_pinned);
          if (pinnedNotices.length === 0) return null;
          return (
            <View style={styles.pinnedContainer}>
              {pinnedNotices.map((notice) => (
                <Card key={notice.id} style={[styles.pinnedCard, { backgroundColor: theme.colors.errorContainer, borderColor: theme.colors.error, borderWidth: 0.5 }]}>
                  <Card.Content style={styles.pinnedContent}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <View style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        backgroundColor: theme.colors.error, 
                        borderRadius: 12, 
                        paddingHorizontal: 8, 
                        paddingVertical: 4,
                      }}>
                        <Text style={{ color: '#FFF', fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase' }}>
                          📌 Pinned Notice
                        </Text>
                      </View>
                      {profile?.role === 'admin' && (
                        <IconButton 
                          icon="pin-off" 
                          size={16} 
                          iconColor={theme.colors.error}
                          onPress={() => handleTogglePin(notice.id.toString(), false)} 
                          style={{ margin: 0 }}
                        />
                      )}
                    </View>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onErrorContainer }}>
                      {notice.title}
                    </Text>
                    <Text variant="bodyMedium" style={{ marginTop: 4, color: theme.colors.onErrorContainer }}>
                      {notice.body}
                    </Text>
                    <Text variant="bodySmall" style={{ marginTop: 8, fontStyle: 'italic', color: theme.colors.outline }}>
                      Posted by {notice.creator_name} on {new Date(notice.created_at).toLocaleDateString()}
                    </Text>
                  </Card.Content>
                </Card>
              ))}
            </View>
          );
        })()}

        {/* 3. HOME SUMMARY CARDS GRID */}
        <View style={styles.summaryRow}>
          {profile?.role === 'admin' && (
            <Card style={[styles.summaryCard, { borderColor: '#06B6D4', borderWidth: 1 }]}>
              <Card.Content style={styles.summaryContent}>
                <IconButton icon="account-multiple-check" size={20} iconColor="#06B6D4" style={styles.summaryIconOverride} />
                <Text variant="titleMedium" style={[styles.summaryVal, { color: '#06B6D4' }]}>{summaryData.pendingApprovals}</Text>
                <Text variant="bodySmall" numberOfLines={1} style={styles.summaryLabel}>Approvals</Text>
              </Card.Content>
            </Card>
          )}
 
          <Card style={[styles.summaryCard, { borderColor: '#3B82F6', borderWidth: 1 }]}>
            <Card.Content style={styles.summaryContent}>
              <IconButton icon="car-connected" size={20} iconColor="#3B82F6" style={styles.summaryIconOverride} />
              <Text variant="titleMedium" style={[styles.summaryVal, { color: '#3B82F6' }]}>{summaryData.todaysParkings}</Text>
              <Text variant="bodySmall" numberOfLines={1} style={styles.summaryLabel}>Today's Parking</Text>
            </Card.Content>
          </Card>
 
          {profile?.role !== 'guard' && (
            <Card style={[styles.summaryCard, { borderColor: '#FFD700', borderWidth: 1 }]}>
              <Card.Content style={styles.summaryContent}>
                <IconButton icon="wallet-outline" size={20} iconColor="#FFD700" style={styles.summaryIconOverride} />
                <Text variant="titleMedium" numberOfLines={1} style={[styles.summaryVal, { fontSize: 11.5, color: '#FFD700' }]}>
                  ₹{summaryData.pendingDues.toLocaleString('en-IN')}
                </Text>
                <Text variant="bodySmall" numberOfLines={1} style={styles.summaryLabel}>Pending Dues</Text>
              </Card.Content>
            </Card>
          )}
        </View>
 
        {/* RESIDENT QUICK ACTIONS & PASSCODE MANAGER */}
        {profile?.role !== 'guard' && (
          <View style={styles.sectionContainer}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                🔑 Visitor Gate Passcodes
              </Text>
              <Button
                mode="contained"
                icon="key-plus"
                buttonColor="#00D4AA"
                textColor="#0F0F0F"
                onPress={() => {
                  setGeneratedPasscode('');
                  setVisitorName('');
                  setVisitorVehicle('');
                  setVisitorPurpose('Delivery');
                  setVisitorModalVisible(true);
                }}
                style={{ borderRadius: 8 }}
                labelStyle={{ fontSize: 11, fontWeight: 'bold' }}
                compact
              >
                Create Pass
              </Button>
            </View>

            {preApprovals.filter(p => p.status === 'pending').length === 0 ? (
              <Card style={[styles.passcodeEmptyCard, { backgroundColor: theme.colors.elevation.level1, borderWidth: 0.5, borderColor: '#333' }]}>
                <Card.Content style={{ alignItems: 'center', paddingVertical: 16 }}>
                  <Text variant="bodySmall" style={{ color: theme.colors.outline, textAlign: 'center' }}>
                    No active pre-approved guest codes. Tap "Create Pass" to generate one.
                  </Text>
                </Card.Content>
              </Card>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
                {preApprovals
                  .filter(p => p.status === 'pending')
                  .map((pass) => (
                    <Card key={pass.id} style={[styles.passcodeCard, { backgroundColor: theme.colors.elevation.level2, width: 180, borderColor: '#333', borderWidth: 0.5 }]}>
                      <Card.Content style={{ padding: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Chip compact style={{ height: 18, justifyContent: 'center', backgroundColor: '#06B6D4' }} textStyle={{ fontSize: 8, color: '#0F0F0F', fontWeight: 'bold' }}>
                              {pass.purpose?.toUpperCase() || 'GUEST'}
                            </Chip>
                          </View>
                          <IconButton
                            icon="close"
                            iconColor={theme.colors.error}
                            size={14}
                            style={{ margin: 0 }}
                            onPress={() => handleRevokePreApproval(pass.id.toString())}
                          />
                        </View>
                        <Text variant="titleMedium" style={{ fontWeight: 'bold', marginTop: 4, fontSize: 13, color: '#FFFFFF' }} numberOfLines={1}>
                          {pass.name}
                        </Text>
                        {pass.vehicle_number && (
                          <Text variant="bodySmall" style={{ fontSize: 9, color: theme.colors.outline }}>
                            {pass.vehicle_number}
                          </Text>
                        )}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, backgroundColor: '#00D4AA20', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, borderWidth: 0.5, borderColor: '#00D4AA' }}>
                          <Text variant="titleMedium" style={{ fontWeight: 'bold', color: '#00D4AA', letterSpacing: 1.5, fontSize: 13 }}>
                            {pass.passcode}
                          </Text>
                          <IconButton
                            icon="share-variant"
                            iconColor="#00D4AA"
                            size={12}
                            style={{ margin: 0 }}
                            onPress={() => handleSharePasscode(pass.passcode, pass.name)}
                          />
                        </View>
                      </Card.Content>
                    </Card>
                  ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* GUARD GATE KEEPER CONSOLE */}
        {profile?.role === 'guard' && (
          <View style={styles.gateConsoleContainer}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: '#06B6D4' }]}>
                🛡️ Gate Control Console
              </Text>
              <Button
                mode="contained"
                icon="plus"
                buttonColor="#0EA5E9"
                textColor="#FFFFFF"
                onPress={() => {
                  setManualVisitorName('');
                  setManualVisitorVehicle('');
                  setManualVisitorFlat('');
                  setManualVisitorPurpose('Delivery');
                  setManualVisitorModalVisible(true);
                }}
                style={{ borderRadius: 8 }}
                labelStyle={{ fontSize: 11, fontWeight: 'bold' }}
                compact
              >
                Manual Entry
              </Button>
            </View>

            {/* Passcode Verification Card */}
            <Card style={[styles.consoleCard, { backgroundColor: theme.colors.elevation.level2, borderColor: '#06B6D4', borderWidth: 1, marginBottom: 16 }]}>
              <Card.Content style={{ padding: 12 }}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 8, color: '#E2E8F0', fontSize: 13 }}>
                  🔑 Scan/Verify Guest Passcode
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TextInput
                    placeholder="Enter 6-digit passcode..."
                    value={passcodeInput}
                    onChangeText={setPasscodeInput}
                    keyboardType="number-pad"
                    maxLength={6}
                    mode="outlined"
                    style={{ flex: 1, height: 42, backgroundColor: 'transparent' }}
                    dense
                  />
                  <Button
                    mode="contained"
                    buttonColor="#06B6D4"
                    textColor="#0F0F0F"
                    onPress={handleVerifyPasscode}
                    loading={verifyingPasscode}
                    disabled={verifyingPasscode || passcodeInput.trim().length !== 6}
                    style={{ borderRadius: 8 }}
                  >
                    Verify
                  </Button>
                </View>

                {/* Verified Guest Details Box */}
                {verifiedGuest && (
                  <View style={{ marginTop: 12, backgroundColor: '#00D4AA15', borderColor: '#00D4AA', borderWidth: 1, borderRadius: 8, padding: 10 }}>
                    <Text variant="labelMedium" style={{ color: '#00D4AA', fontWeight: 'bold' }}>GUEST VERIFIED</Text>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold', marginTop: 4, color: '#FFFFFF' }}>{verifiedGuest.name}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 2 }}>
                      Purpose: {verifiedGuest.purpose} {verifiedGuest.vehicle_number ? `• Vehicle: ${verifiedGuest.vehicle_number}` : ''}
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                      <Button
                        mode="outlined"
                        onPress={() => setVerifiedGuest(null)}
                        textColor={theme.colors.error}
                        style={{ borderColor: theme.colors.error, borderRadius: 6 }}
                        compact
                      >
                        Cancel
                      </Button>
                      <Button
                        mode="contained"
                        onPress={handleCheckInVerifiedGuest}
                        buttonColor="#00D4AA"
                        textColor="#0F0F0F"
                        style={{ borderRadius: 6 }}
                        compact
                      >
                        Check In
                      </Button>
                    </View>
                  </View>
                )}
              </Card.Content>
            </Card>

            {/* Active Visitors Log */}
            <Text variant="titleMedium" style={[styles.sectionTitle, { marginBottom: 8, fontWeight: 'bold', fontSize: 14 }]}>
              🚗 Active Visitor Logs ({recentVisitors.filter(v => !v.check_out).length})
            </Text>

            {recentVisitors.filter(v => !v.check_out).length === 0 ? (
              <Card style={[styles.emptyCard, { marginBottom: 20 }]}>
                <Card.Content style={{ alignItems: 'center', paddingVertical: 20 }}>
                  <IconButton icon="shield-check" iconColor="#388E3C" size={32} />
                  <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>No active visitors inside the society.</Text>
                </Card.Content>
              </Card>
            ) : (
              <View style={{ gap: 8, marginBottom: 20 }}>
                {recentVisitors
                  .filter(v => !v.check_out)
                  .map((visitor) => (
                    <Card key={visitor.id} style={[styles.visitorCard, { backgroundColor: theme.colors.elevation.level1, borderColor: '#333', borderWidth: 0.5 }]}>
                      <Card.Content style={{ padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text variant="titleMedium" style={{ fontWeight: 'bold', fontSize: 13, color: '#E2E8F0' }}>
                              {visitor.name}
                            </Text>
                            <Chip compact style={{ height: 18, justifyContent: 'center', backgroundColor: '#333' }} textStyle={{ fontSize: 8, color: '#FFF' }}>
                              {visitor.purpose || 'Visitor'}
                            </Chip>
                          </View>
                          <Text variant="bodySmall" style={{ color: theme.colors.outline, fontSize: 10, marginTop: 2 }}>
                            Flat: {visitor.flat_number} {visitor.vehicle_number ? `• Vehicle: ${visitor.vehicle_number}` : ''}
                          </Text>
                          <Text variant="bodySmall" style={{ color: '#888', fontSize: 9, marginTop: 4 }}>
                            In: {new Date(visitor.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                        <Button
                          mode="contained"
                          buttonColor="#FF3B30"
                          textColor="#FFF"
                          onPress={() => handleCheckOutVisitor(visitor.id.toString())}
                          labelStyle={{ fontSize: 9, fontWeight: 'bold' }}
                          style={{ borderRadius: 6 }}
                          compact
                        >
                          Check Out
                        </Button>
                      </Card.Content>
                    </Card>
                  ))}
              </View>
            )}
          </View>
        )}

        {/* 4. GIANT RED SOS BUTTON (RESIDENTS & ADMINS ONLY) */}
        {profile?.role !== 'guard' && (
          <Card style={[styles.sosCard, { backgroundColor: '#1E1E1E', borderColor: '#FF3B30', borderWidth: 1.5 }]}>
            <Card.Content style={styles.sosCardContent}>
              <Text variant="titleMedium" style={[styles.sosTitle, { color: theme.colors.onSurface }]}>Need Urgent Utilities or Security Help?</Text>
              <Text variant="bodySmall" style={styles.sosSubtitle}>
                Tap the Red Shield to trigger a persistent alarm on the Guard Desk and Admin panels instantly.
              </Text>
   
              <Animated.View style={[styles.sosRippleOuter, { transform: [{ scale: pulseAnim }] }]}>
                <Animated.View style={[styles.sosRippleInner, { transform: [{ scale: pulseAnim }] }]}>
                  <IconButton
                    icon="shield-alert"
                    iconColor="#FFFFFF"
                    size={70}
                    style={[styles.giantSosButton, { backgroundColor: '#FF3B30', margin: 0 }]}
                    onPress={() => setSosModalVisible(true)}
                  />
                </Animated.View>
              </Animated.View>
   
              <Text variant="labelLarge" style={{ color: '#FF3B30', fontWeight: 'bold', marginTop: 12, letterSpacing: 0.5 }}>
                TAP TO TRIGGER SOS SHIELD
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* 5. ACTIVE COMPLAINTS SECTION */}
        <Text variant="titleMedium" style={styles.sectionTitle}>Active Utility & SOS Log ({complaints.length})</Text>
        
        {complaints.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <IconButton icon="check-circle" iconColor="#388E3C" size={36} />
              <Text variant="titleMedium">All Systems Normal</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.outline, textAlign: 'center' }}>
                No active water shortages, motor outages, or security threats.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          complaints.map((c) => (
            <Card key={c.id} style={styles.alertItemCard}>
              <Card.Content>
                <View style={styles.alertHeader}>
                  <View style={styles.alertTypeRow}>
                    <IconButton 
                      icon={getAlertIcon(c.type)} 
                      iconColor={theme.colors.onPrimary} 
                      size={18}
                      style={{ backgroundColor: getAlertColor(c.status), margin: 0 }}
                    />
                    <Text variant="titleMedium" style={[styles.alertTypeName, { fontSize: 13 }]}>
                      {c.type.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                  <View 
                    style={{ 
                      backgroundColor: getAlertColor(c.status), 
                      paddingHorizontal: 8, 
                      paddingVertical: 3, 
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#FFF' }}>
                      {c.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text variant="bodyMedium" style={styles.alertDesc}>{c.description}</Text>
                
                <View style={styles.alertFooter}>
                  <Text variant="bodySmall" style={{ color: theme.colors.outline, fontSize: 11 }}>
                    Flat {c.wing}-{c.flat_number} • Raised by {c.user_name} • {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                {/* Actions for Admin/Guard */}
                {(profile?.role === 'admin' || profile?.role === 'guard') && c.status !== 'resolved' && (
                  <View style={styles.actionButtons}>
                    {c.status === 'pending' && (
                      <Button 
                        mode="contained-tonal" 
                        onPress={() => handleAcknowledge(c.id)}
                        icon="checkbox-marked-circle-outline"
                        labelStyle={{ fontSize: 10 }}
                        style={styles.actionButton}
                        compact
                      >
                        Acknowledge
                      </Button>
                    )}
                    <Button 
                      mode="contained" 
                      buttonColor="#388E3C"
                      textColor="#FFF"
                      onPress={() => handleResolve(c.id)}
                      icon="check"
                      labelStyle={{ fontSize: 10 }}
                      style={styles.actionButton}
                      compact
                    >
                      Resolve
                    </Button>
                  </View>
                )}
              </Card.Content>
            </Card>
          ))
        )}

        {/* 4.5. GENERAL NOTICE BOARD */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 }}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            📢 Notice Board ({announcements.length})
          </Text>
          {profile?.role === 'admin' && (
            <Button 
              mode="contained" 
              icon="plus" 
              onPress={() => setNoticeModalVisible(true)}
              style={{ borderRadius: 8 }}
              labelStyle={{ fontSize: 11, fontWeight: 'bold' }}
              compact
            >
              Add Notice
            </Button>
          )}
        </View>

        {announcements.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={{ alignItems: 'center', padding: 20 }}>
              <IconButton icon="bullhorn-outline" size={40} iconColor={theme.colors.outline} />
              <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>No announcements posted yet.</Text>
            </Card.Content>
          </Card>
        ) : (
          announcements.map((notice) => (
            <Card key={notice.id} style={[styles.noticeCard, { backgroundColor: theme.colors.elevation.level1 }]}>
              <Card.Content>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                      {notice.title}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {profile?.role === 'admin' && (
                      <>
                        <IconButton 
                          icon={notice.is_pinned ? "pin" : "pin-outline"} 
                          size={18} 
                          iconColor={notice.is_pinned ? theme.colors.primary : theme.colors.outline}
                          onPress={() => handleTogglePin(notice.id.toString(), !notice.is_pinned)}
                          style={{ margin: 0 }}
                        />
                        <IconButton 
                          icon="delete" 
                          size={18} 
                          iconColor={theme.colors.error}
                          onPress={() => handleDeleteNotice(notice.id.toString())}
                          style={{ margin: 0 }}
                        />
                      </>
                    )}
                  </View>
                </View>
                <Text variant="bodyMedium" style={{ marginTop: 6, color: theme.colors.onSurfaceVariant }}>
                  {notice.body}
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                  <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                    By {notice.creator_name}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                    {new Date(notice.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      {/* SOS MODAL PANEL */}
      <Portal>
        <Modal
          visible={sosModalVisible}
          onDismiss={() => setSosModalVisible(false)}
          contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.elevation.level3 }]}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>🚨 Select Emergency Alert Type</Text>
          <Text variant="bodySmall" style={styles.modalSubtitle}>
            This will trigger a loud alarm panel and vibration on security guard and admin dashboards.
          </Text>

          <View style={styles.chipContainer}>
            {[
              { type: 'water_low', label: 'Water Pressure Low', icon: 'water' },
              { type: 'motor_off', label: 'Turn ON Motor Now', icon: 'engine' },
              { type: 'electricity', label: 'Phase Outage / Power Cut', icon: 'flash' },
              { type: 'security', label: 'Security Emergency', icon: 'shield-alert' },
            ].map((item) => (
              <Button
                key={item.type}
                mode={selectedType === item.type ? 'contained' : 'outlined'}
                onPress={() => setSelectedType(item.type as any)}
                icon={item.icon}
                style={styles.modalChip}
                labelStyle={{ fontSize: 12 }}
                compact
              >
                {item.label}
              </Button>
            ))}
          </View>

          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={() => setSosModalVisible(false)} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button 
              mode="contained" 
              buttonColor={theme.colors.error}
              textColor={theme.colors.onError}
              onPress={handleRaiseSOS} 
              loading={submitting}
              disabled={submitting}
              style={{ flex: 1 }}
              icon="bell-ring"
            >
              TRIGGER SOS
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* WRITE ANNOUNCEMENT MODAL */}
      <Portal>
        <Modal
          visible={noticeModalVisible}
          onDismiss={() => setNoticeModalVisible(false)}
          contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.elevation.level3 }]}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>📢 Publish New Notice</Text>
          <Text variant="bodySmall" style={styles.modalSubtitle}>
            Broadcast official society-wide news or announcements to all residents.
          </Text>

          <TextInput
            label="Notice Title"
            value={newNoticeTitle}
            onChangeText={setNewNoticeTitle}
            mode="outlined"
            placeholder="e.g. Water Tank Maintenance"
            style={{ marginBottom: 12 }}
          />

          <TextInput
            label="Notice Content"
            value={newNoticeContent}
            onChangeText={setNewNoticeContent}
            mode="outlined"
            multiline
            numberOfLines={4}
            placeholder="Type details of the announcement here..."
            style={{ marginBottom: 12 }}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <Text variant="bodyMedium">Pin to Top of Feed?</Text>
            <Button
              mode={newNoticePinned ? 'contained' : 'outlined'}
              onPress={() => setNewNoticePinned(!newNoticePinned)}
              icon="pin"
              compact
            >
              {newNoticePinned ? 'Pinned' : 'Not Pinned'}
            </Button>
          </View>

          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={() => setNoticeModalVisible(false)} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button 
              mode="contained" 
              onPress={handleCreateAnnouncement} 
              loading={isSubmittingNotice}
              disabled={isSubmittingNotice || !newNoticeTitle.trim() || !newNoticeContent.trim()}
              style={{ flex: 1 }}
              icon="send"
            >
              PUBLISH
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* PRE-APPROVE GUEST MODAL (RESIDENT) */}
      <Portal>
        <Modal
          visible={visitorModalVisible}
          onDismiss={() => {
            if (!submittingVisitor) {
              setVisitorModalVisible(false);
              setVisitorName('');
              setVisitorVehicle('');
              setGeneratedPasscode('');
            }
          }}
          contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.elevation.level3 }]}
        >
          <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 16, color: '#E2E8F0' }}>
            🔑 Pre-approve Guest
          </Text>

          {generatedPasscode ? (
            <View style={{ alignItems: 'center', marginVertical: 8 }}>
              <Text variant="bodyMedium" style={{ color: theme.colors.outline, marginBottom: 4 }}>
                Share this passcode with your guest:
              </Text>
              <Text variant="displaySmall" style={{ fontWeight: 'bold', color: '#00D4AA', letterSpacing: 4, marginVertical: 12 }}>
                {generatedPasscode}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.outline, textAlign: 'center', marginBottom: 20 }}>
                Valid for 24 hours. They will show this code to the guard.
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setVisitorModalVisible(false);
                    setVisitorName('');
                    setVisitorVehicle('');
                    setGeneratedPasscode('');
                  }}
                  style={{ flex: 1, borderRadius: 8 }}
                >
                  Close
                </Button>
                <Button
                  mode="contained"
                  buttonColor="#00D4AA"
                  textColor="#0F0F0F"
                  icon="share-variant"
                  onPress={() => handleSharePasscode(generatedPasscode, visitorName)}
                  style={{ flex: 1, borderRadius: 8 }}
                >
                  Share
                </Button>
              </View>
            </View>
          ) : (
            <View>
              <TextInput
                label="Guest Name *"
                value={visitorName}
                onChangeText={setVisitorName}
                mode="outlined"
                style={{ marginBottom: 12 }}
              />
              <TextInput
                label="Vehicle Number (Optional)"
                value={visitorVehicle}
                onChangeText={setVisitorVehicle}
                mode="outlined"
                placeholder="e.g. MH-12-AB-1234"
                style={{ marginBottom: 12 }}
              />
              
              <Text variant="labelLarge" style={{ marginBottom: 8, color: '#E2E8F0' }}>Purpose of Visit:</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
                {['Delivery', 'Guest', 'Home Service', 'Cab'].map((purpose) => (
                  <Chip
                    key={purpose}
                    selected={visitorPurpose === purpose}
                    onPress={() => setVisitorPurpose(purpose)}
                    style={{ backgroundColor: visitorPurpose === purpose ? '#00D4AA' : '#333' }}
                    textStyle={{ color: visitorPurpose === purpose ? '#0F0F0F' : '#FFF', fontSize: 11 }}
                  >
                    {purpose}
                  </Chip>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Button
                  mode="outlined"
                  onPress={() => setVisitorModalVisible(false)}
                  style={{ flex: 1, borderRadius: 8 }}
                  disabled={submittingVisitor}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleCreatePreApproval}
                  buttonColor="#00D4AA"
                  textColor="#0F0F0F"
                  style={{ flex: 1, borderRadius: 8 }}
                  disabled={submittingVisitor || !visitorName.trim()}
                  loading={submittingVisitor}
                >
                  Generate Pass
                </Button>
              </View>
            </View>
          )}
        </Modal>
      </Portal>

      {/* MANUAL VISITOR REGISTRY MODAL (GUARD) */}
      <Portal>
        <Modal
          visible={manualVisitorModalVisible}
          onDismiss={() => {
            if (!submittingManualVisitor) {
              setManualVisitorModalVisible(false);
              setManualVisitorName('');
              setManualVisitorVehicle('');
              setManualVisitorFlat('');
            }
          }}
          contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.elevation.level3 }]}
        >
          <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 16, color: '#E2E8F0' }}>
            📝 Manual Visitor Registry
          </Text>

          <TextInput
            label="Visitor Name *"
            value={manualVisitorName}
            onChangeText={setManualVisitorName}
            mode="outlined"
            style={{ marginBottom: 12 }}
          />
          <TextInput
            label="Flat Number *"
            value={manualVisitorFlat}
            onChangeText={setManualVisitorFlat}
            placeholder="e.g. E-102"
            mode="outlined"
            style={{ marginBottom: 12 }}
          />
          <TextInput
            label="Vehicle Number (Optional)"
            value={manualVisitorVehicle}
            onChangeText={setManualVisitorVehicle}
            mode="outlined"
            style={{ marginBottom: 12 }}
          />
          
          <Text variant="labelLarge" style={{ marginBottom: 8, color: '#E2E8F0' }}>Purpose of Visit:</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
            {['Delivery', 'Guest', 'Home Service', 'Cab'].map((purpose) => (
              <Chip
                key={purpose}
                selected={manualVisitorPurpose === purpose}
                onPress={() => setManualVisitorPurpose(purpose)}
                style={{ backgroundColor: manualVisitorPurpose === purpose ? '#00D4AA' : '#333' }}
                textStyle={{ color: manualVisitorPurpose === purpose ? '#0F0F0F' : '#FFF', fontSize: 11 }}
              >
                {purpose}
              </Chip>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button
              mode="outlined"
              onPress={() => setManualVisitorModalVisible(false)}
              style={{ flex: 1, borderRadius: 8 }}
              disabled={submittingManualVisitor}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleCheckInManualGuest}
              buttonColor="#00D4AA"
              textColor="#0F0F0F"
              style={{ flex: 1, borderRadius: 8 }}
              disabled={submittingManualVisitor || !manualVisitorName.trim() || !manualVisitorFlat.trim()}
              loading={submittingManualVisitor}
            >
              Check In
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 130,
  },
  welcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerBranding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderColor: '#00D4AA',
    borderWidth: 1,
  },
  roleBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  miniRoleChip: {
    height: 18,
    justifyContent: 'center',
    borderRadius: 4,
  },
  summaryIconOverride: {
    margin: 0,
    height: 24,
    width: 24,
  },
  sosRippleOuter: {
    padding: 8,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
  },
  sosRippleInner: {
    padding: 8,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 59, 48, 0.25)',
  },
  welcomeText: {
    fontWeight: 'bold',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    elevation: 1.5,
  },
  summaryContent: {
    alignItems: 'center',
    padding: 8,
    paddingVertical: 12,
  },
  summaryIcon: {
    margin: 0,
    height: 24,
    width: 24,
  },
  summaryVal: {
    fontWeight: 'bold',
    marginTop: 4,
    fontSize: 15,
  },
  summaryLabel: {
    fontSize: 9,
    color: '#888',
    textAlign: 'center',
    marginTop: 2,
  },
  alarmCard: {
    margin: 16,
    borderRadius: 12,
    elevation: 6,
    borderColor: '#D32F2F',
    borderWidth: 2,
    marginBottom: 0,
  },
  alarmContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  flashingBell: {
    margin: 0,
  },
  alarmTextContainer: {
    flex: 1,
    paddingHorizontal: 8,
  },
  alarmActionContainer: {
    justifyContent: 'center',
  },
  alarmButton: {
    borderRadius: 6,
  },
  sosCard: {
    borderRadius: 20,
    elevation: 3,
    marginBottom: 24,
  },
  sosCardContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  sosTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
    fontSize: 15,
  },
  sosSubtitle: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 12,
  },
  giantSosButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    elevation: 6,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  emptyCard: {
    borderRadius: 16,
    elevation: 1,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  alertItemCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  alertTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  alertTypeName: {
    fontWeight: 'bold',
  },
  alertDesc: {
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  alertFooter: {
    borderTopWidth: 0.5,
    borderTopColor: '#EEE',
    paddingTop: 6,
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    borderRadius: 6,
  },
  modalContainer: {
    padding: 20,
    margin: 20,
    borderRadius: 16,
  },
  modalTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalSubtitle: {
    textAlign: 'center',
    color: '#777',
    marginBottom: 16,
  },
  chipContainer: {
    gap: 8,
    marginBottom: 20,
  },
  modalChip: {
    borderRadius: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  pinnedContainer: {
    marginBottom: 16,
  },
  pinnedCard: {
    borderRadius: 12,
    elevation: 3,
    marginBottom: 8,
  },
  pinnedContent: {
    padding: 12,
  },
  noticeCard: {
    marginBottom: 10,
    borderRadius: 12,
    elevation: 2,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  passcodeEmptyCard: {
    borderRadius: 12,
    elevation: 0,
  },
  passcodeCard: {
    borderRadius: 12,
    elevation: 2,
  },
  gateConsoleContainer: {
    marginBottom: 20,
  },
  consoleCard: {
    borderRadius: 12,
    elevation: 3,
  },
  visitorCard: {
    borderRadius: 10,
    elevation: 1,
  },
});
