import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, ScrollView, Vibration, Platform, Image, TouchableOpacity, Animated, Share, Alert } from 'react-native';
import { Text, Button, Card, Portal, Modal, IconButton, Avatar, useTheme, Chip, TextInput, Dialog } from 'react-native-paper';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../../lib/auth-context';
import { dataManager, Complaint, Announcement, VisitorPreApproval, Visitor } from '../../lib/data-manager';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '../../lib/notification-context';
import { useNavigation } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase, uriToArrayBuffer } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface HomeScreenProps {
  jumpTo?: (key: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ jumpTo }) => {
  const { profile, user, refreshProfile } = useAuth();
  const { addNotification } = useNotifications();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [activeEvents, setActiveEvents] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  const fetchActiveEvents = async () => {
    try {
      const list = await dataManager.getActiveEvents();
      setActiveEvents(list);
    } catch (e) {
      console.warn('Failed to fetch active events on HomeScreen:', e);
    }
  };

  const exportEventPatrikaPdf = async (event: any) => {
    try {
      const items = await dataManager.getTimetableItems(event.id);
      
      const sortedItems = [...items].sort((a, b) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return a.time.localeCompare(b.time);
      });

      const daysMap: Record<string, any[]> = {};
      sortedItems.forEach(item => {
        if (!daysMap[item.date]) {
          daysMap[item.date] = [];
        }
        daysMap[item.date].push(item);
      });

      const formatMarathiDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const day = date.getDate();
        const devDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
        const devDayStr = String(day).split('').map(d => devDigits[Number(d)]).join('');
        const months = ['सप्टें', 'ऑक्टो', 'नोव्हें', 'डिसें', 'जाने', 'फेब्रु', 'मार्च', 'एप्रिल', 'मे', 'जून', 'जुलै', 'ऑगस्ट'];
        const monthName = months[date.getMonth()];
        return `${devDayStr} ${monthName || 'सप्टें'}`;
      };

      const getMarathiDayName = (dateStr: string) => {
        const date = new Date(dateStr);
        const days = ['रविवार', 'सोमवार', 'मंगळवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
        return days[date.getDay()];
      };

      let daysHtml = '';
      Object.keys(daysMap).forEach((dateKey) => {
        const dayItems = daysMap[dateKey];
        const dateDisplay = formatMarathiDate(dateKey);
        const dayName = getMarathiDayName(dateKey);

        let eventsLiHtml = '';
        dayItems.forEach(item => {
          eventsLiHtml += `
            <li style="margin-bottom:8px; display:flex; align-items:center; gap:8px;">
              <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#c1442d;"></span>
              <span>${item.time} — <b>${item.title_mr || item.title_en}</b> ${item.notes_mr ? `<span style="font-size:10px; color:#3d5a40; background:rgba(61,90,64,0.1); padding:1px 4px; border-radius:4px; margin-left:4px;">${item.notes_mr}</span>` : ''}</span>
            </li>
          `;
        });

        const isSpecial = dateKey === event.start_date || dayItems.some(i => i.category === 'pooja' && i.title_mr.includes('सत्यनारायण'));
        const isVisarjan = dayItems.some(i => i.category === 'visarjan');
        const cardClass = isVisarjan ? 'day-card finale' : (isSpecial ? 'day-card special' : 'day-card');

        daysHtml += `
          <div class="${cardClass}">
            <div class="day-head">
              <span class="date-chip">${dateDisplay}</span>
              <span class="day-name">${dayName}</span>
            </div>
            <ul class="events" style="list-style:none; padding:0; margin:0;">
              ${eventsLiHtml}
            </ul>
          </div>
        `;
      });

      const htmlContent = `
<!DOCTYPE html>
<html lang="mr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${event.name_mr || event.name_en || event.name} — दैनंदिन कार्यक्रम</title>
<style>
  :root{
    --maroon:#6b1626;
    --maroon-deep:#4a0f1c;
    --vermilion:#c1442d;
    --marigold:#e2a53d;
    --marigold-soft:#f3cf8a;
    --ivory:#fbf3e6;
    --ivory-2:#f6e9d4;
    --leaf:#3d5a40;
    --ink:#2c1810;
    --ink-soft:#5c463c;
    --shadow: 0 10px 30px rgba(74,15,28,0.15);
  }
  *{box-sizing:border-box;}
  body{
    background: radial-gradient(circle at 15% 8%, rgba(226,165,61,0.08), transparent 40%), var(--ivory);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    color:var(--ink);
    padding: 50px 30px;
    margin:0;
    position: relative;
    min-height: 100vh;
  }
  body::before, body::after {
    content: '';
    position: absolute;
    z-index: 10;
    pointer-events: none;
  }
  body::before {
    top: 15px; left: 15px; right: 15px; bottom: 15px;
    border: 2px solid var(--maroon);
    border-radius: 8px;
  }
  body::after {
    top: 20px; left: 20px; right: 20px; bottom: 20px;
    border: 1px dashed var(--marigold);
    border-radius: 6px;
  }
  header{
    text-align:center;
    padding: 24px;
    background: linear-gradient(180deg, var(--maroon-deep) 0%, var(--maroon) 78%, var(--vermilion) 100%);
    color:var(--ivory);
    border-radius: 12px;
    margin-bottom: 24px;
  }
  header h1{
    font-size:28px;
    margin: 10px 0 6px;
  }
  header .sub{
    font-size:16px;
    color:var(--marigold-soft);
    margin:0 0 10px;
  }
  .venue-note{
    font-size:12px;
    opacity:0.85;
  }
  main{
    max-width:720px;
    margin:0 auto;
  }
  .timeline{
    position:relative;
    padding-left:16px;
    border-left: 2px dashed var(--marigold);
  }
  .day-card{
    position:relative;
    margin-bottom:20px;
    background:#fff;
    border-radius:12px;
    padding:15px 20px;
    box-shadow: var(--shadow);
    border: 1px solid rgba(74,15,28,0.08);
  }
  .day-head{
    display:flex;
    align-items:center;
    gap:10px;
    border-bottom:1px dashed rgba(193,68,45,0.35);
    padding-bottom:8px;
    margin-bottom:10px;
  }
  .date-chip{
    font-size:11px;
    font-weight:bold;
    color:#fff;
    background:var(--vermilion);
    padding:2px 8px;
    border-radius:12px;
  }
  .day-name{
    font-size:16px;
    font-weight:bold;
    color:var(--maroon);
  }
  .day-card.special{
    background: linear-gradient(180deg,#fff 0%, var(--ivory-2) 100%);
    border:1px solid rgba(226,165,61,0.3);
  }
  .day-card.special .day-name{ color:var(--vermilion); }
  .day-card.finale{
    background: linear-gradient(160deg, var(--maroon) 0%, var(--maroon-deep) 100%);
    color:var(--ivory);
  }
  .day-card.finale .day-name{ color:var(--marigold-soft); }
  .day-card.finale ul li{ color:#f0dcc8; }
  .day-card.finale ul li b{ color:#fff; }
  footer{
    text-align:center;
    margin-top:20px;
  }
  footer .committee{
    font-size:14px;
    font-weight:bold;
    color:var(--maroon);
  }
</style>
</head>
<body>
<header>
  <h1>${event.name_mr || event.name_en || event.name}</h1>
  <p class="sub">दैनंदिन कार्यक्रम वेळापत्रक</p>
  <p class="venue-note">${event.description_mr || event.description_en || 'सर्व रहिवाशांना नम्र विनंती की वेळापत्रकानुसार कार्यक्रमांना उपस्थित रहावे.'}</p>
</header>
<main>
  <div class="timeline">
    ${daysHtml}
  </div>
</main>
<footer>
  <p class="committee">उत्सव समिती, सोसायटी</p>
</footer>
</body>
</html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Download Patrika PDF', UTI: 'com.adobe.pdf' });
      } else {
        await Print.printAsync({ html: htmlContent });
      }
    } catch (e: any) {
      Alert.alert('Error', 'Failed to generate Patrika PDF: ' + e.message);
    }
  };
  const [sosModalVisible, setSosModalVisible] = useState(false);
  const [selectedType, setSelectedType] = useState<'water_low' | 'motor_off' | 'electricity' | 'security' | 'other'>('water_low');
  const [sosDescription, setSosDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeAlarm, setActiveAlarm] = useState<Complaint | null>(null);

  // Global & Local SOS configuration toggles
  const [globalSOSActive, setGlobalSOSActive] = useState(true);
  const [localSOSActive, setLocalSOSActive] = useState(true);

  const fetchSOSStatus = async () => {
    try {
      const localVal = await AsyncStorage.getItem('sync_notif_sos');
      setLocalSOSActive(localVal !== 'false');

      const socSettings = await dataManager.getSocietySettings();
      if (socSettings && socSettings.admin_contact) {
        try {
          const parsed = JSON.parse(socSettings.admin_contact);
          if (parsed && typeof parsed.sos_active === 'boolean') {
            setGlobalSOSActive(parsed.sos_active);
            return;
          }
        } catch (e) {}
      }
      setGlobalSOSActive(true);
    } catch (e) {
      console.warn('Error fetching SOS status:', e);
    }
  };

  // Refresh profile & SOS settings on screen focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (refreshProfile) {
        refreshProfile();
      }
      fetchSOSStatus();
    });
    return unsubscribe;
  }, [navigation]);

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

  // MyGate Visitor Approval states
  const [visitorPhotoUri, setVisitorPhotoUri] = useState<string | null>(null);
  const [uploadingVisitorPhoto, setUploadingVisitorPhoto] = useState(false);
  const [awaitingResidentApproval, setAwaitingResidentApproval] = useState(false);
  const [currentActiveApprovalRequest, setCurrentActiveApprovalRequest] = useState<Visitor | null>(null);
  const [residentApprovalState, setResidentApprovalState] = useState<'pending' | 'approved' | 'denied' | 'none'>('none');
  const [myPendingApprovals, setMyPendingApprovals] = useState<Visitor[]>([]);
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [activeApprovalToReview, setActiveApprovalToReview] = useState<Visitor | null>(null);

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
    if (profile?.society_status === 'suspended') {
      Alert.alert('Suspended', 'Visitor features are disabled because your society has been suspended.');
      return;
    }
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
    if (profile?.society_status === 'suspended') return;
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
    if (profile?.society_status === 'suspended') {
      Alert.alert('Suspended', 'This feature is disabled because your society has been suspended.');
      return;
    }
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
    if (profile?.society_status === 'suspended') return;
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

  const handleSelectVisitorPhoto = () => {
    Alert.alert(
      '📸 Capture Visitor Photo',
      'Open camera to photograph the visitor or delivery package',
      [
        { text: 'Open Camera', onPress: () => handlePickVisitorPhoto() },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handlePickVisitorPhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to capture visitor photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setVisitorPhotoUri(result.assets[0].uri);
      }
    } catch (e) {
      console.error('Visitor photo capture error', e);
      Alert.alert('Error', 'Failed to capture photo.');
    }
  };

  const uploadVisitorPhoto = async (localUri: string): Promise<string | null> => {
    try {
      setUploadingVisitorPhoto(true);
      const arrayBuffer = await uriToArrayBuffer(localUri);
      const fileExt = localUri.split('.').pop() || 'jpg';
      const fileName = `visitor_${Date.now()}.${fileExt}`;
      const filePath = `visitor-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (e) {
      console.error('Visitor photo upload error', e);
      return null;
    } finally {
      setUploadingVisitorPhoto(false);
    }
  };

  const handleRequestVisitorApproval = async () => {
    if (profile?.society_status === 'suspended') {
      Alert.alert('Suspended', 'Visitor features are disabled because your society has been suspended.');
      return;
    }
    if (!manualVisitorName.trim() || !manualVisitorFlat.trim()) {
      Alert.alert('Missing Fields', 'Please enter visitor name and flat number.');
      return;
    }

    setSubmittingManualVisitor(true);
    try {
      let photoUrl = null;
      if (visitorPhotoUri) {
        photoUrl = await uploadVisitorPhoto(visitorPhotoUri);
      }

      const req = await dataManager.createVisitorApprovalRequest(
        manualVisitorName.trim(),
        manualVisitorVehicle.trim(),
        manualVisitorFlat.trim(),
        manualVisitorPurpose,
        photoUrl
      );

      setCurrentActiveApprovalRequest(req);
      setAwaitingResidentApproval(true);
      setResidentApprovalState('pending');
      
      setManualVisitorModalVisible(false);
      fetchRecentVisitors();

      // Trigger Email and Push Notifications
      try {
        const allProfiles = await dataManager.getAllProfiles();
        let targetWing = 'Gen';
        let targetFlat = manualVisitorFlat.trim();
        if (manualVisitorFlat.includes('-')) {
          const parts = manualVisitorFlat.split('-');
          targetWing = parts[0].trim().toUpperCase();
          targetFlat = parts[1].trim();
        }

        const targetResident = allProfiles.find(p => 
          (p.wing || '').trim().toUpperCase() === targetWing && 
          (p.flat_number || '').trim() === targetFlat
        );

        if (targetResident) {
          // 1. Send Email Notification
          if (targetResident.email) {
            fetch('https://society-sync-portal.vercel.app/api/approve-email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                status: 'visitor_approval',
                residentEmail: targetResident.email,
                visitorName: manualVisitorName.trim(),
                purpose: manualVisitorPurpose,
                wing: targetWing,
                flatNumber: targetFlat,
                photoUrl: photoUrl
              })
            }).catch(err => console.warn('Email API trigger failed', err));
          }

          // 2. Send Expo Push Notification
          if (targetResident.notification_token) {
            fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
              },
              body: JSON.stringify({
                to: targetResident.notification_token,
                sound: 'default',
                title: '🚨 Gate Entry Requested',
                body: `${manualVisitorName.trim()} requests entry to Flat ${targetWing}-${targetFlat} (Purpose: ${manualVisitorPurpose}).`,
                data: {
                  type: 'visitor_approval',
                  visitorId: req.id,
                  wing: targetWing,
                  flatNumber: targetFlat
                },
              })
            }).catch(err => console.warn('Push notification API trigger failed', err));
          }
        }
      } catch (err) {
        console.warn('Notification trigger error:', err);
      }

      addNotification({
        type: 'confirmation',
        message: '🔔 Approval Request Sent',
        subtext: `Request sent to Flat ${manualVisitorFlat}. Waiting for host response...`,
        autoDismiss: true,
        dismissAfterMs: 4000
      });
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e.message || 'Failed to submit visitor approval request.');
    } finally {
      setSubmittingManualVisitor(false);
    }
  };

  // Guard Real-Time approval check effect
  useEffect(() => {
    if (!awaitingResidentApproval || !currentActiveApprovalRequest) return;

    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('visitors')
          .select('status')
          .eq('id', currentActiveApprovalRequest.id)
          .single();

        if (!error && data) {
          if (data.status === 'approved') {
            setResidentApprovalState('approved');
            setAwaitingResidentApproval(false);
            clearInterval(interval);
            Vibration.vibrate([0, 100, 100, 100]);
            addNotification({
              type: 'confirmation',
              message: '✅ Gate Entry Approved',
              subtext: `Resident approved entry for ${currentActiveApprovalRequest.name}.`,
              autoDismiss: true,
              dismissAfterMs: 5000
            });
            fetchRecentVisitors();
          } else if (data.status === 'denied') {
            setResidentApprovalState('denied');
            setAwaitingResidentApproval(false);
            clearInterval(interval);
            Vibration.vibrate(400);
            addNotification({
              type: 'sos_full',
              message: '❌ Entry Denied',
              subtext: `Resident denied entry for ${currentActiveApprovalRequest.name}.`,
              autoDismiss: true,
              dismissAfterMs: 5000
            });
            fetchRecentVisitors();
          }
        }
      } catch (e) {
        console.warn('Error polling approval status', e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [awaitingResidentApproval, currentActiveApprovalRequest]);

  // Resident Pending Approvals Poll effect
  const fetchMyPendingApprovals = async () => {
    if (profile?.role === 'guard' || !profile?.flat_number) return;
    try {
      const list = await dataManager.getPendingApprovalsForFlat(profile.wing || '', profile.flat_number);
      setMyPendingApprovals(list);
      if (list.length > 0 && !approvalModalVisible) {
        setActiveApprovalToReview(list[0]);
        setApprovalModalVisible(true);
      }
    } catch (e) {
      console.warn('Error checking visitor approvals:', e);
    }
  };

  useEffect(() => {
    if (profile?.role === 'guard' || !profile?.flat_number) return;
    fetchMyPendingApprovals();
    const interval = setInterval(fetchMyPendingApprovals, 3000);
    return () => clearInterval(interval);
  }, [profile]);

  // Trigger alarm vibration on resident phone when gate entry requested
  useEffect(() => {
    if (approvalModalVisible) {
      Vibration.vibrate([0, 500, 500, 500, 500, 500, 500, 500, 500, 500], false);
      const timer = setTimeout(() => {
        Vibration.cancel();
      }, 10000);

      return () => {
        clearTimeout(timer);
        Vibration.cancel();
      };
    }
  }, [approvalModalVisible]);

  const handleReviewApproval = async (status: 'approved' | 'denied') => {
    if (!activeApprovalToReview) return;
    try {
      await dataManager.updateVisitorApprovalStatus(activeApprovalToReview.id, status);
      setApprovalModalVisible(false);
      setActiveApprovalToReview(null);
      fetchMyPendingApprovals();
      addNotification({
        type: 'confirmation',
        message: status === 'approved' ? 'Entry Approved' : 'Entry Refused',
        subtext: `Gate updated successfully for ${activeApprovalToReview.name}.`,
        autoDismiss: true,
        dismissAfterMs: 3000
      });
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to update approval status.');
    }
  };

  const handleCheckInManualGuest = async () => {
    if (profile?.society_status === 'suspended') {
      Alert.alert('Suspended', 'Visitor features are disabled because your society has been suspended.');
      return;
    }
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
    if (profile?.society_status === 'suspended') return;
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
    if (refreshProfile) {
      try {
        await refreshProfile();
      } catch (e) {
        console.error('Error refreshing profile in loadAllData:', e);
      }
    }
    if (profile?.society_status === 'suspended') return;
    await fetchSOSStatus();
    await fetchComplaints();
    await fetchSummaryData();
    await fetchAnnouncementsData();
    await fetchPreApprovals();
    await fetchRecentVisitors();
    await fetchActiveEvents();
  };

  const handleClearComplaints = async () => {
    Alert.alert(
      'Clear All Logs',
      'Are you sure you want to permanently clear all utility & SOS logs for this society?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: async () => {
            try {
              await dataManager.clearAllComplaints();
              loadAllData();
              addNotification({
                type: 'confirmation',
                message: '🧹 Logs Cleared',
                subtext: 'All utility and SOS logs have been deleted.',
                autoDismiss: true,
                dismissAfterMs: 3000
              });
            } catch (e) {
              console.error('Error clearing complaints:', e);
              Alert.alert('Error', 'Failed to clear complaints log.');
            }
          }
        }
      ]
    );
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

        {/* ACTIVE FESTIVAL EVENTS PROGRAM CARDS */}
        {activeEvents.map((event) => (
          <Card 
            key={event.id}
            style={{ 
              marginVertical: 10, 
              borderRadius: 20, 
              overflow: 'hidden', 
              borderWidth: 1.5, 
              borderColor: '#e2a53d',
              elevation: 4
            }}
          >
            <View style={{ backgroundColor: '#4a0f1c', padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Avatar.Icon 
                  size={36} 
                  icon="calendar-star" 
                  color="#fbf3e6" 
                  style={{ backgroundColor: 'rgba(226, 165, 61, 0.25)' }} 
                />
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium" style={{ color: '#fbf3e6', fontWeight: 'bold' }}>
                    🚩 {event.name_mr || event.name_en || event.name}
                  </Text>
                  <Text style={{ color: '#f3cf8a', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Active Festival Timetable
                  </Text>
                </View>
              </View>

              <Text style={{ color: '#f6e9d4', fontSize: 11.5, lineHeight: 16, marginBottom: 12 }}>
                {event.description_mr || event.description_en || 'सर्व रहिवाशांना नम्र विनंती की वेळापत्रकानुसार कार्यक्रमांना उपस्थित रहावे.'}
              </Text>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button 
                  mode="contained"
                  onPress={() => jumpTo?.('chat')}
                  buttonColor="#e2a53d"
                  textColor="#4a0f1c"
                  labelStyle={{ fontSize: 9.5, fontWeight: 'bold' }}
                  style={{ flex: 1, borderRadius: 10 }}
                  contentStyle={{ height: 38, justifyContent: 'center' }}
                  icon="calendar-sync"
                  compact
                >
                  View Schedule
                </Button>
                <Button 
                  mode="outlined"
                  onPress={() => exportEventPatrikaPdf(event)}
                  textColor="#fbf3e6"
                  style={{ flex: 1, borderRadius: 10, borderColor: '#e2a53d', borderWidth: 1.5 }}
                  contentStyle={{ height: 38, justifyContent: 'center' }}
                  labelStyle={{ fontSize: 9.5, fontWeight: 'bold' }}
                  icon="printer"
                  compact
                >
                  Download PDF
                </Button>
              </View>
            </View>
          </Card>
        ))}

        {/* NOTICE BOARD CAROUSEL */}
        <View style={{ marginVertical: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', letterSpacing: 1, color: theme.dark ? '#A1A1AA' : '#4B5563', textTransform: 'uppercase' }}>
              Notice Board
            </Text>
            <TouchableOpacity onPress={() => jumpTo && jumpTo('chat')}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#00D4AA' }}>
                See all ›
              </Text>
            </TouchableOpacity>
          </View>

          {announcements.length === 0 ? (
            <Card style={{ borderRadius: 24, backgroundColor: theme.colors.elevation.level1, borderWidth: theme.dark ? 1 : 0, borderColor: 'rgba(255, 255, 255, 0.08)' }}>
              <Card.Content style={{ alignItems: 'center', padding: 20 }}>
                <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>No notices posted yet.</Text>
              </Card.Content>
            </Card>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 4 }}>
              {announcements.map((notice) => {
                const noticeDate = new Date(notice.created_at);
                const diffTime = Math.abs(new Date().getTime() - noticeDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const timeLabel = diffDays <= 1 ? 'Today' : `${diffDays}d ago`;

                return (
                  <Card 
                    key={notice.id} 
                    style={{ 
                      width: 280, 
                      borderRadius: 24, 
                      backgroundColor: theme.colors.elevation.level1, 
                      borderWidth: theme.dark ? 1 : 0, 
                      borderColor: 'rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <Card.Content style={{ padding: 16 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <View style={{ 
                          backgroundColor: theme.dark ? 'rgba(0, 212, 170, 0.15)' : '#E6F4F1', 
                          borderRadius: 12, 
                          paddingHorizontal: 8, 
                          paddingVertical: 4 
                        }}>
                          <Text style={{ color: '#00D4AA', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' }}>
                            Notice
                          </Text>
                        </View>
                        {notice.is_pinned && (
                          <IconButton icon="pin" size={14} iconColor="#FF3B30" style={{ margin: 0, padding: 0 }} />
                        )}
                      </View>
                      
                      <Text variant="titleMedium" numberOfLines={1} style={{ fontWeight: 'bold', color: theme.colors.onSurface, fontSize: 15 }}>
                        {notice.title}
                      </Text>
                      
                      <Text variant="bodySmall" numberOfLines={2} style={{ color: theme.colors.outline, marginTop: 4, height: 32, fontSize: 12 }}>
                        {notice.body}
                      </Text>

                      <Text variant="labelSmall" style={{ color: theme.colors.outline, marginTop: 8, fontSize: 10 }}>
                        {timeLabel}
                      </Text>
                    </Card.Content>
                  </Card>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* QUICK STATS */}
        {profile?.role === 'admin' && (
          <View style={{ marginVertical: 8, marginBottom: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', letterSpacing: 1, color: theme.dark ? '#A1A1AA' : '#4B5563', textTransform: 'uppercase', marginBottom: 12, paddingHorizontal: 4 }}>
              Quick Stats
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
              {/* 1. Residents / Approvals stat */}
              <Card style={{ 
                flex: 1, 
                borderRadius: 24, 
                backgroundColor: theme.colors.elevation.level1, 
                borderWidth: theme.dark ? 1 : 0, 
                borderColor: 'rgba(255, 255, 255, 0.08)' 
              }}>
                <Card.Content style={{ padding: 12, alignItems: 'flex-start' }}>
                  <View style={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: 18, 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    backgroundColor: theme.dark ? 'rgba(56, 189, 248, 0.15)' : '#E0F2FE', 
                    marginBottom: 8 
                  }}>
                    <IconButton 
                      icon={profile?.role === 'admin' ? "account-multiple-check" : "account-group"} 
                      size={18} 
                      iconColor={theme.dark ? '#38BDF8' : '#0284C7'} 
                      style={{ margin: 0, padding: 0 }} 
                    />
                  </View>
                  <Text style={{ fontSize: 22, fontWeight: 'bold', color: theme.colors.onSurface }}>
                    {profile?.role === 'admin' ? summaryData.pendingApprovals : '248'}
                  </Text>
                  <Text style={{ fontSize: 10, color: theme.colors.outline, marginTop: 2, fontWeight: '500' }}>
                    {profile?.role === 'admin' ? 'Approvals' : 'Residents'}
                  </Text>
                </Card.Content>
              </Card>

              {/* 2. Open parking / Parking booked */}
              <Card style={{ 
                flex: 1, 
                borderRadius: 24, 
                backgroundColor: theme.colors.elevation.level1, 
                borderWidth: theme.dark ? 1 : 0, 
                borderColor: 'rgba(255, 255, 255, 0.08)' 
              }}>
                <Card.Content style={{ padding: 12, alignItems: 'flex-start' }}>
                  <View style={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: 18, 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    backgroundColor: theme.dark ? 'rgba(74, 222, 128, 0.15)' : '#DCFCE7', 
                    marginBottom: 8 
                  }}>
                    <IconButton 
                      icon="parking" 
                      size={18} 
                      iconColor={theme.dark ? '#4ADE80' : '#15803D'} 
                      style={{ margin: 0, padding: 0 }} 
                    />
                  </View>
                  <Text style={{ fontSize: 22, fontWeight: 'bold', color: theme.colors.onSurface }}>
                    {profile?.role === 'admin' ? summaryData.todaysParkings : '6'}
                  </Text>
                  <Text style={{ fontSize: 10, color: theme.colors.outline, marginTop: 2, fontWeight: '500' }}>
                    {profile?.role === 'admin' ? 'Parkings' : 'Open parking'}
                  </Text>
                </Card.Content>
              </Card>

              {/* 3. Active SOS / Dues */}
              <Card style={{ 
                flex: 1, 
                borderRadius: 24, 
                backgroundColor: theme.colors.elevation.level1, 
                borderWidth: theme.dark ? 1 : 0, 
                borderColor: 'rgba(255, 255, 255, 0.08)' 
              }}>
                <Card.Content style={{ padding: 12, alignItems: 'flex-start' }}>
                  <View style={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: 18, 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    backgroundColor: theme.dark ? 'rgba(248, 113, 113, 0.15)' : '#FEE2E2', 
                    marginBottom: 8 
                  }}>
                    <IconButton 
                      icon={profile?.role === 'admin' ? "shield-alert" : "wallet-outline"} 
                      size={18} 
                      iconColor={theme.dark ? '#F87171' : '#EF4444'} 
                      style={{ margin: 0, padding: 0 }} 
                    />
                  </View>
                  <Text numberOfLines={1} style={{ fontSize: 20, fontWeight: 'bold', color: theme.colors.onSurface }}>
                    {profile?.role === 'admin' ? complaints.length : `₹${summaryData.pendingDues}`}
                  </Text>
                  <Text numberOfLines={1} style={{ fontSize: 10, color: theme.colors.outline, marginTop: 2, fontWeight: '500' }}>
                    {profile?.role === 'admin' ? 'Active SOS' : 'Pending dues'}
                  </Text>
                </Card.Content>
              </Card>
            </View>
          </View>
        )}
 
        {/* RESIDENT QUICK ACTIONS & PASSCODE MANAGER */}
        {profile?.role !== 'guard' && (
          <View style={styles.sectionContainer}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                🔑 Visitor Gate Passcodes
              </Text>
              {profile?.society_status !== 'suspended' && (
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
              )}
            </View>

            {profile?.society_status === 'suspended' ? (
              <Card style={[styles.passcodeEmptyCard, { backgroundColor: theme.colors.elevation.level1, borderWidth: 0.5, borderColor: theme.colors.error }]}>
                <Card.Content style={{ alignItems: 'center', paddingVertical: 16 }}>
                  <IconButton icon="lock" size={24} iconColor={theme.colors.error} style={{ margin: 0 }} />
                  <Text variant="bodyMedium" style={{ color: theme.colors.error, fontWeight: 'bold', marginTop: 4, textAlign: 'center' }}>
                    Feature Disabled
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.outline, textAlign: 'center', marginTop: 4 }}>
                    Visitor passcodes are disabled because your society has been suspended.
                  </Text>
                </Card.Content>
              </Card>
            ) : preApprovals.filter(p => p.status === 'pending').length === 0 ? (
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
              {profile?.society_status !== 'suspended' && (
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
              )}
            </View>

            {profile?.society_status === 'suspended' ? (
              <Card style={[styles.consoleCard, { backgroundColor: theme.colors.elevation.level2, borderColor: theme.colors.error, borderWidth: 1, marginBottom: 16 }]}>
                <Card.Content style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <IconButton icon="lock" size={32} iconColor={theme.colors.error} style={{ margin: 0 }} />
                  <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.error, marginTop: 8 }}>
                    Console Suspended
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.outline, textAlign: 'center', marginTop: 4, paddingHorizontal: 16 }}>
                    This console is disabled because the society's account has been suspended. Please contact the administrator.
                  </Text>
                </Card.Content>
              </Card>
            ) : (
              /* Passcode Verification Card */
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
            )}

            {/* Real-time Approval Feedback Card (MyGate style) */}
            {currentActiveApprovalRequest && residentApprovalState !== 'none' && (
              <Card style={[styles.consoleCard, { 
                backgroundColor: theme.colors.elevation.level2, 
                borderColor: residentApprovalState === 'pending' ? '#FFD700' : (residentApprovalState === 'approved' ? '#00D4AA' : '#FF3B30'), 
                borderWidth: 1, 
                marginBottom: 16 
              }]}>
                <Card.Content style={{ padding: 12 }}>
                  <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 8, color: '#E2E8F0', fontSize: 13 }}>
                    🛡️ Unexpected Gate Approval Status
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#FFF' }}>
                        {currentActiveApprovalRequest.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: theme.colors.outline, marginTop: 2 }}>
                        Flat: {currentActiveApprovalRequest.flat_number} • Purpose: {currentActiveApprovalRequest.purpose}
                      </Text>
                      
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                        <IconButton 
                          icon={residentApprovalState === 'pending' ? 'clock-outline' : (residentApprovalState === 'approved' ? 'check-circle' : 'close-circle')} 
                          iconColor={residentApprovalState === 'pending' ? '#FFD700' : (residentApprovalState === 'approved' ? '#00D4AA' : '#FF3B30')} 
                          size={16} 
                          style={{ margin: 0, padding: 0 }}
                        />
                        <Text style={{ 
                          fontSize: 11, 
                          fontWeight: 'bold', 
                          color: residentApprovalState === 'pending' ? '#FFD700' : (residentApprovalState === 'approved' ? '#00D4AA' : '#FF3B30') 
                        }}>
                          {residentApprovalState === 'pending' ? 'WAITING FOR RESIDENT APPROVAL...' : `ENTRY ${residentApprovalState.toUpperCase()}`}
                        </Text>
                      </View>
                    </View>
                    {currentActiveApprovalRequest.photo_url && (
                      <Image 
                        source={{ uri: currentActiveApprovalRequest.photo_url }} 
                        style={{ width: 50, height: 50, borderRadius: 8 }} 
                      />
                    )}
                  </View>

                  {residentApprovalState !== 'pending' && (
                    <Button 
                      mode="outlined" 
                      compact 
                      onPress={() => {
                        setResidentApprovalState('none');
                        setCurrentActiveApprovalRequest(null);
                      }} 
                      style={{ marginTop: 10, alignSelf: 'flex-end', borderRadius: 8 }}
                      textColor={theme.colors.outline}
                    >
                      Clear Status
                    </Button>
                  )}
                </Card.Content>
              </Card>
            )}

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
        {profile?.role !== 'guard' && globalSOSActive && localSOSActive && (
          <Card style={[styles.sosCard, { 
            backgroundColor: theme.colors.elevation.level1, 
            borderColor: 'rgba(255, 59, 48, 0.25)', 
            borderWidth: 1,
            borderRadius: 24,
          }]}>
            <Card.Content style={styles.sosCardContent}>
              <Text variant="titleMedium" style={[styles.sosTitle, { color: theme.colors.onSurface }]}>Need Urgent Utilities or Security Help?</Text>
              <Text variant="bodySmall" style={styles.sosSubtitle}>
                Tap the Red Shield to trigger a persistent alarm on the Guard Desk and Admin panels instantly.
              </Text>
   
              <View style={{ position: 'relative', width: 160, height: 160, justifyContent: 'center', alignItems: 'center', marginVertical: 12 }}>
                {/* Glowing border ring */}
                <View 
                  style={{
                    position: 'absolute',
                    width: 140,
                    height: 140,
                    borderRadius: 70,
                    borderWidth: 3,
                    borderColor: 'rgba(255, 59, 48, 0.7)',
                    borderStyle: 'dashed',
                  }}
                />

                <Animated.View style={[styles.sosRippleOuter, { transform: [{ scale: pulseAnim }] }]}>
                  <Animated.View style={[styles.sosRippleInner, { transform: [{ scale: pulseAnim }] }]}>
                    <IconButton
                      icon="shield-alert"
                      iconColor="#FFFFFF"
                      size={64}
                      style={[styles.giantSosButton, { backgroundColor: '#FF3B30', margin: 0, shadowColor: '#FF3B30', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 }]}
                      onPress={() => setSosModalVisible(true)}
                    />
                  </Animated.View>
                </Animated.View>
              </View>
   
              <Text variant="labelLarge" style={{ color: '#FF3B30', fontWeight: 'bold', marginTop: 8, letterSpacing: 0.8, textTransform: 'uppercase', fontSize: 11 }}>
                TAP TO TRIGGER SOS SHIELD
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* 5. ACTIVE COMPLAINTS SECTION */}
        {globalSOSActive && localSOSActive && (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { marginBottom: 0 }]}>
            Active Utility & SOS Log ({complaints.length})
          </Text>
          {profile?.role === 'admin' && complaints.length > 0 && (
            <Button
              mode="contained"
              icon="delete-sweep"
              buttonColor={theme.colors.error}
              textColor="#FFFFFF"
              style={{ borderRadius: 8 }}
              labelStyle={{ fontSize: 11, fontWeight: 'bold' }}
              onPress={handleClearComplaints}
              compact
            >
              Clear Logs
            </Button>
          )}
        </View>
        
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
          </>
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
          {/* Visitor Photo Selector */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Button
              mode="outlined"
              icon="camera"
              onPress={handleSelectVisitorPhoto}
              style={{ flex: 1, borderRadius: 8, borderColor: '#00D4AA' }}
              textColor="#00D4AA"
              disabled={submittingManualVisitor}
            >
              {visitorPhotoUri ? 'Retake Photo' : 'Take Photo'}
            </Button>
            {visitorPhotoUri && (
              <View style={{ position: 'relative' }}>
                <Image 
                  source={{ uri: visitorPhotoUri }} 
                  style={{ width: 46, height: 46, borderRadius: 8, borderWidth: 1, borderColor: '#00D4AA' }} 
                />
                <IconButton
                  icon="close-circle"
                  iconColor="#FF3B30"
                  size={18}
                  style={{ position: 'absolute', top: -14, right: -14, margin: 0 }}
                  onPress={() => setVisitorPhotoUri(null)}
                />
              </View>
            )}
          </View>
          
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

          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Button
                mode="outlined"
                onPress={() => {
                  setManualVisitorModalVisible(false);
                  setVisitorPhotoUri(null);
                }}
                style={{ flex: 1, borderRadius: 8 }}
                disabled={submittingManualVisitor}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleCheckInManualGuest}
                buttonColor="#555"
                textColor="#FFF"
                style={{ flex: 1, borderRadius: 8 }}
                disabled={submittingManualVisitor || !manualVisitorName.trim() || !manualVisitorFlat.trim()}
                loading={submittingManualVisitor}
              >
                Direct Entry
              </Button>
            </View>
            
            <Button
              mode="contained"
              onPress={handleRequestVisitorApproval}
              buttonColor="#00D4AA"
              textColor="#0F0F0F"
              style={{ borderRadius: 8 }}
              disabled={submittingManualVisitor || !manualVisitorName.trim() || !manualVisitorFlat.trim()}
              loading={submittingManualVisitor || uploadingVisitorPhoto}
              icon="bell-ring"
              labelStyle={{ fontWeight: 'bold' }}
            >
              Request Resident Approval
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* MYGATE STYLE RESIDENT VISITOR APPROVAL MODAL */}
      <Portal>
        <Dialog
          visible={approvalModalVisible}
          onDismiss={() => {}} 
          style={{ backgroundColor: theme.colors.elevation.level3, borderRadius: 24, borderWidth: 1, borderColor: '#00D4AA' }}
        >
          <Dialog.Title style={{ fontWeight: 'bold', color: '#00D4AA', textAlign: 'center', fontSize: 18 }}>
            🚨 Gate Entry Requested
          </Dialog.Title>
          <Dialog.Content style={{ alignItems: 'center', gap: 12 }}>
            {activeApprovalToReview?.photo_url ? (
              <Image 
                source={{ uri: activeApprovalToReview.photo_url }} 
                style={{ width: 140, height: 140, borderRadius: 20, borderWidth: 2, borderColor: '#00D4AA' }} 
              />
            ) : (
              <Avatar.Icon 
                size={80} 
                icon="account-question" 
                style={{ backgroundColor: 'rgba(0, 212, 170, 0.15)' }} 
                color="#00D4AA" 
              />
            )}
            
            <View style={{ alignItems: 'center' }}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold', color: '#FFF' }}>
                {activeApprovalToReview?.name}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.outline, marginTop: 2 }}>
                Purpose: {activeApprovalToReview?.purpose} {activeApprovalToReview?.vehicle_number ? `• Vehicle: ${activeApprovalToReview.vehicle_number}` : ''}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 4 }}>
                Waiting at main gate for your approval.
              </Text>
            </View>
          </Dialog.Content>
          <Dialog.Actions style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: 16 }}>
            <Button
              mode="contained"
              buttonColor={theme.colors.error}
              textColor="#FFF"
              onPress={() => handleReviewApproval('denied')}
              style={{ flex: 1, borderRadius: 28 }}
              labelStyle={{ fontWeight: 'bold' }}
            >
              Deny
            </Button>
            <Button
              mode="contained"
              buttonColor="#00D4AA"
              textColor="#09090b"
              onPress={() => handleReviewApproval('approved')}
              style={{ flex: 1, borderRadius: 28 }}
              labelStyle={{ fontWeight: 'bold' }}
            >
              Approve
            </Button>
          </Dialog.Actions>
        </Dialog>
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
