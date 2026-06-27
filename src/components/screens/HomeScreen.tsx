import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Vibration, Platform, Image } from 'react-native';
import { Text, Button, Card, Portal, Modal, IconButton, Avatar, useTheme, Chip } from 'react-native-paper';
import { useAuth } from '../../lib/auth-context';
import { dataManager, Complaint } from '../../lib/data-manager';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const HomeScreen: React.FC = () => {
  const { profile, user } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [sosModalVisible, setSosModalVisible] = useState(false);
  const [selectedType, setSelectedType] = useState<'water_low' | 'motor_off' | 'electricity' | 'security' | 'other'>('water_low');
  const [sosDescription, setSosDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeAlarm, setActiveAlarm] = useState<Complaint | null>(null);

  // Summary Card Statistics State
  const [summaryData, setSummaryData] = useState({
    pendingApprovals: 0,
    todaysParkings: 0,
    pendingDues: 0
  });

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
    try {
      const list = await dataManager.getComplaints();
      setComplaints(list);
      
      // If user is Guard or Admin, check if there's any active 'pending' alert to trigger the loud visual alarm
      if (profile?.role === 'admin' || profile?.role === 'guard') {
        const pending = list.find(c => c.status === 'pending');
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
      }
    } catch (e) {
      console.error('Error fetching complaints', e);
    }
  };

  const loadAllData = async () => {
    await fetchComplaints();
    await fetchSummaryData();
  };

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
      userWing = profile?.role === 'admin' ? 'HQ' : (profile?.role === 'guard' ? 'Gate' : 'Gen');
    }
    if (!userFlat || userFlat.trim() === '') {
      userFlat = profile?.role === 'admin' ? 'Admin' : (profile?.role === 'guard' ? 'Guard' : 'Office');
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
            <IconButton icon="bell-ring" iconColor={theme.colors.error} size={32} style={styles.flashingBell} />
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
        </View>
 
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
 
        {/* 4. GIANT RED SOS BUTTON */}
        <Card style={[styles.sosCard, { backgroundColor: '#1E1E1E', borderColor: '#FF3B30', borderWidth: 1.5 }]}>
          <Card.Content style={styles.sosCardContent}>
            <Text variant="titleMedium" style={[styles.sosTitle, { color: theme.colors.onSurface }]}>Need Urgent Utilities or Security Help?</Text>
            <Text variant="bodySmall" style={styles.sosSubtitle}>
              Tap the Red Shield to trigger a persistent alarm on the Guard Desk and Admin panels instantly.
            </Text>
 
            <View style={styles.sosRippleOuter}>
              <View style={styles.sosRippleInner}>
                <IconButton
                  icon="shield-alert"
                  iconColor="#FFFFFF"
                  size={70}
                  style={[styles.giantSosButton, { backgroundColor: '#FF3B30', margin: 0 }]}
                  onPress={() => setSosModalVisible(true)}
                />
              </View>
            </View>
 
            <Text variant="labelLarge" style={{ color: '#FF3B30', fontWeight: 'bold', marginTop: 12, letterSpacing: 0.5 }}>
              TAP TO TRIGGER SOS SHIELD
            </Text>
          </Card.Content>
        </Card>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 100,
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
});
