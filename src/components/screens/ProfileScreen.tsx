import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Card, Button, Avatar, useTheme, List, Divider, Switch, Snackbar, IconButton, Chip, TextInput } from 'react-native-paper';
import { useAuth } from '../../lib/auth-context';
import { dataManager, Profile, UserRole, SocietySettings, Complaint } from '../../lib/data-manager';

export const ProfileScreen: React.FC = () => {
  const { profile, signOut, isMock, toggleMockMode, user } = useAuth();
  const theme = useTheme();

  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);

  // Society Settings State (Admin only)
  const [settings, setSettings] = useState<SocietySettings | null>(null);
  const [mRate, setMRate] = useState('3.50');
  const [lFee, setLFee] = useState('2.00');
  const [pCount, setPCount] = useState('10');
  const [aContact, setAContact] = useState('');
  const [editingSettings, setEditingSettings] = useState(false);

  // Snackbar Toast
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const showToast = (msg: string) => {
    setSnackbarMessage(msg);
    setSnackbarVisible(true);
  };

  const loadAllData = async () => {
    try {
      const users = await dataManager.getAllProfiles();
      setAllProfiles(users);

      const activeComplaints = await dataManager.getComplaints();
      setComplaints(activeComplaints);

      const socSettings = await dataManager.getSocietySettings();
      setSettings(socSettings);
      if (socSettings) {
        setMRate(String(socSettings.maintenance_rate_per_sqft));
        setLFee(String(socSettings.late_fee_percentage));
        setPCount(String(socSettings.parking_slot_count));
        setAContact(socSettings.admin_contact || '');
      }
    } catch (e) {
      console.error('Error fetching profiles data', e);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [profile]);

  const handleApprove = async (userId: string, name: string) => {
    setLoading(true);
    try {
      await dataManager.updateProfileApproval(userId, true);
      showToast(`Resident '${name}' approved successfully!`);
      loadAllData();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (userId: string, name: string) => {
    setLoading(true);
    try {
      await dataManager.updateProfileApproval(userId, false);
      showToast(`Resident '${name}' request rejected.`);
      loadAllData();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (userId: string, currentRole: UserRole) => {
    let newRole: UserRole = 'renter';
    if (currentRole === 'renter') newRole = 'owner';
    else if (currentRole === 'owner') newRole = 'admin';
    else if (currentRole === 'admin') newRole = 'guard';
    else newRole = 'renter';

    try {
      await dataManager.updateProfileRole(userId, newRole);
      showToast(`Role updated to ${newRole.toUpperCase()}`);
      loadAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await dataManager.updateSocietySettings({
        society_name: settings?.society_name || 'SocietySync Co-Op Housing',
        address: settings?.address || 'Ganesh Nagar, Pune, Maharashtra',
        maintenance_rate_per_sqft: Number(mRate),
        late_fee_percentage: Number(lFee),
        parking_slot_count: Number(pCount),
        admin_contact: aContact
      });
      setEditingSettings(false);
      showToast('Society settings updated successfully!');
      loadAllData();
    } catch (e) {
      console.error(e);
      showToast('Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  // Permission List Matrix
  const getRolePermissions = () => {
    switch (profile?.role) {
      case 'admin':
        return [
          '✅ Full control over resident approvals & society roster',
          '✅ Acknowledge and resolve water & power SOS alerts',
          '✅ Create events and manage ledger receipts & bills',
          '✅ Full authority to approve visitor parking requests',
          '✅ Configure society-wide settings (maintenance rates & late fees)'
        ];
      case 'owner':
        return [
          '✅ Full transparency to view ledger balances & vendor bills',
          '✅ Raise utility SOS alerts and book visitor parking slots',
          '✅ Active debates, thread creation, and poll voting in chat room',
          '❌ Cannot modify financial entries or approve residents'
        ];
      case 'guard':
        return [
          '✅ Instant loud notifications & vibrations on utility crises',
          '✅ Acknowledge SOS alerts directly to stop alarm desk',
          '✅ Read-only Gate Entry Checklist of approved visitor vehicles',
          '❌ No access to financial ledger or council chat room'
        ];
      case 'renter':
      default:
        return [
          '✅ Raise utility SOS alerts and book visitor parking slots',
          '✅ View own flat dues ledger (transparency on owner payments)',
          '✅ Read-Only access to official debates to stay updated',
          '❌ Cannot post in chat room or view other residents dues'
        ];
    }
  };

  // Analytics helper variables
  const getComplaintTypeCounts = () => {
    const counts = { water: 0, power: 0, security: 0, other: 0 };
    complaints.forEach(c => {
      if (c.type === 'water_low' || c.type === 'motor_off') counts.water++;
      else if (c.type === 'electricity') counts.power++;
      else if (c.type === 'security') counts.security++;
      else counts.other++;
    });
    return counts;
  };

  const getComplaintStatusCounts = () => {
    const counts = { pending: 0, acknowledged: 0, resolved: 0 };
    complaints.forEach(c => {
      if (c.status === 'pending') counts.pending++;
      else if (c.status === 'acknowledged') counts.acknowledged++;
      else if (c.status === 'resolved') counts.resolved++;
    });
    return counts;
  };

  const pendingUsers = allProfiles.filter(p => p.status === 'pending');
  const approvedUsers = allProfiles.filter(p => p.status === 'approved');
  const complaintTypeData = getComplaintTypeCounts();
  const complaintStatusData = getComplaintStatusCounts();

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return { icon: 'shield-crown', color: '#FFD700', text: 'Society Admin (Secretary)' };
      case 'owner':
        return { icon: 'home-key', color: '#00D4AA', text: 'Property Owner' };
      case 'renter':
        return { icon: 'home-account', color: '#3B82F6', text: 'Tenant / Resident' };
      case 'guard':
        return { icon: 'shield-account', color: '#06B6D4', text: 'Security Guard' };
      default:
        return { icon: 'account-circle', color: '#888888', text: 'Resident' };
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* 1. RESIDENT CARD */}
        <Card style={styles.profileCard}>
          <Card.Content style={styles.profileContent}>
            <Avatar.Text 
              size={60} 
              label={profile?.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'RS'} 
              style={{ backgroundColor: '#06B6D4', marginBottom: 8 }}
              color="#0F0F0F"
            />
            <Text variant="headlineSmall" style={[styles.profileName, { color: '#FFFFFF' }]}>{profile?.full_name}</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
              Wing {profile?.wing || '?'}-{profile?.flat_number || '?'} • {profile?.society_name || 'My Society'}
            </Text>
            
            {(() => {
              const badge = getRoleBadge(profile?.role);
              return (
                <Chip 
                  icon={badge.icon} 
                  style={[styles.roleChip, { backgroundColor: badge.color + '15', borderColor: badge.color, borderWidth: 1 }]}
                  textStyle={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: 11, color: badge.color }}
                >
                  {badge.text}
                </Chip>
              );
            })()}

            <Divider style={styles.divider} />

            <View style={styles.detailsRow}>
              <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>Phone Number:</Text>
              <Text variant="bodyMedium" style={{ color: '#FFFFFF' }}>{profile?.phone || 'N/A'}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>Ledger Roster Status:</Text>
              <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: '#00D4AA' }}>
                APPROVED COUNCIL MEMBER
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* 2. ROLE PERMISSIONS MATRIX */}
        <Card style={styles.permissionsCard}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.permissionsTitle, { color: '#06B6D4' }]}>🔑 Role Authorization Matrix</Text>
            <View style={{ gap: 6, marginTop: 8 }}>
              {getRolePermissions().map((perm, idx) => (
                <Text key={idx} variant="bodySmall" style={{ lineHeight: 18, color: '#E0E0E0' }}>
                  {perm}
                </Text>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* ==================== SUPER ADMIN CONTROL PANEL ==================== */}
        {profile?.role === 'admin' && (
          <View style={{ marginTop: 12 }}>
            <Text variant="titleMedium" style={styles.consoleTitle}>
              🛡️ Super Admin Control Panel
            </Text>

            {/* A. Resident Approvals Gate */}
            <Card style={styles.adminSectionCard}>
              <Card.Content>
                <Text variant="titleSmall" style={{ fontWeight: 'bold', color: theme.colors.error, marginBottom: 8 }}>
                  ⏳ Pending Approvals Queue ({pendingUsers.length})
                </Text>
                {pendingUsers.length === 0 ? (
                  <Text variant="bodySmall" style={{ color: theme.colors.outline, paddingVertical: 4 }}>
                    No pending resident registrations. Roster is up to date!
                  </Text>
                ) : (
                  pendingUsers.map((u) => (
                    <View key={u.id} style={styles.userRow}>
                      <View style={{ flex: 1 }}>
                        <Text variant="titleMedium" style={{ fontWeight: 'bold', fontSize: 14 }}>{u.full_name}</Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                          Flat {u.wing}-{u.flat_number} • Role: {u.role.toUpperCase()}
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                          Ph: {u.phone || 'N/A'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <IconButton 
                          icon="close-circle" 
                          iconColor={theme.colors.error} 
                          size={24}
                          onPress={() => handleReject(u.id, u.full_name)}
                          style={{ margin: 0 }}
                        />
                        <Button 
                          mode="contained" 
                          onPress={() => handleApprove(u.id, u.full_name)}
                          style={{ borderRadius: 6 }}
                          buttonColor="#388E3C"
                          textColor="#FFF"
                          labelStyle={{ fontSize: 10 }}
                          compact
                          loading={loading}
                        >
                          Approve
                        </Button>
                      </View>
                    </View>
                  ))
                )}
              </Card.Content>
            </Card>

            {/* B. Society Settings Editor */}
            <Card style={[styles.adminSectionCard, { marginTop: 16 }]}>
              <Card.Content>
                <View style={styles.settingsHeaderRow}>
                  <Text variant="titleSmall" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                    ⚙️ Society Settings
                  </Text>
                  <Button 
                    mode="text" 
                    icon={editingSettings ? "check" : "pencil"}
                    onPress={() => {
                      if (editingSettings) handleSaveSettings();
                      else setEditingSettings(true);
                    }}
                    labelStyle={{ fontSize: 11 }}
                    compact
                  >
                    {editingSettings ? "Save Settings" : "Edit"}
                  </Button>
                </View>

                <View style={{ gap: 10, marginTop: 8 }}>
                  {editingSettings ? (
                    <View style={{ gap: 8 }}>
                      <TextInput
                        label="Base Maintenance Rate per Sqft (₹)"
                        value={mRate}
                        onChangeText={setMRate}
                        keyboardType="numeric"
                        mode="outlined"
                        dense
                      />
                      <TextInput
                        label="Late Fee Penalty Percentage (%)"
                        value={lFee}
                        onChangeText={setLFee}
                        keyboardType="numeric"
                        mode="outlined"
                        dense
                      />
                      <TextInput
                        label="Total Visitor Parking Slots"
                        value={pCount}
                        onChangeText={setPCount}
                        keyboardType="numeric"
                        mode="outlined"
                        dense
                      />
                      <TextInput
                        label="Secretary Contact Number"
                        value={aContact}
                        onChangeText={setAContact}
                        mode="outlined"
                        dense
                      />
                    </View>
                  ) : (
                    <View style={{ gap: 6 }}>
                      <Text variant="bodyMedium">Maintenance Rate: <Text style={{ fontWeight: 'bold' }}>₹{mRate}/sqft</Text></Text>
                      <Text variant="bodyMedium">Late Fee Penalty: <Text style={{ fontWeight: 'bold' }}>{lFee}% overdue</Text></Text>
                      <Text variant="bodyMedium">Allocated Visitor Slots: <Text style={{ fontWeight: 'bold' }}>{pCount} slots (V1-V{pCount})</Text></Text>
                      <Text variant="bodyMedium">Admin Contact: <Text style={{ fontWeight: 'bold' }}>{aContact || 'Not set'}</Text></Text>
                    </View>
                  )}
                </View>
              </Card.Content>
            </Card>

            {/* C. Interactive Complaint Analytics (Flex bar charts!) */}
            <Card style={[styles.adminSectionCard, { marginTop: 16 }]}>
              <Card.Content>
                <Text variant="titleSmall" style={{ fontWeight: 'bold', color: theme.colors.primary, marginBottom: 12 }}>
                  📊 Real-time Complaint Analytics
                </Text>

                <Text variant="labelMedium" style={{ fontWeight: 'bold', marginBottom: 8 }}>By Status:</Text>
                <View style={styles.chartContainer}>
                  {[
                    { label: 'Pending', count: complaintStatusData.pending, color: theme.colors.error },
                    { label: 'Acknow.', count: complaintStatusData.acknowledged, color: '#F57C00' },
                    { label: 'Resolved', count: complaintStatusData.resolved, color: '#388E3C' },
                  ].map((bar, idx) => {
                    const maxCount = Math.max(complaints.length, 1);
                    const percent = bar.count / maxCount;
                    return (
                      <View key={idx} style={styles.chartBarRow}>
                        <Text variant="bodySmall" style={styles.chartBarLabel}>{bar.label}</Text>
                        <View style={styles.chartBarTrack}>
                          <View 
                            style={[
                              styles.chartBarFill, 
                              { width: `${Math.max(percent * 100, 5)}%`, backgroundColor: bar.color }
                            ]} 
                          />
                        </View>
                        <Text variant="bodySmall" style={styles.chartBarVal}>{bar.count}</Text>
                      </View>
                    );
                  })}
                </View>

                <Divider style={{ marginVertical: 12 }} />

                <Text variant="labelMedium" style={{ fontWeight: 'bold', marginBottom: 8 }}>By Emergency Category:</Text>
                <View style={styles.chartContainer}>
                  {[
                    { label: 'Water Issues', count: complaintTypeData.water, color: '#2196F3' },
                    { label: 'Power Cuts', count: complaintTypeData.power, color: '#FFEB3B' },
                    { label: 'Security Threats', count: complaintTypeData.security, color: theme.colors.error },
                    { label: 'Other Crises', count: complaintTypeData.other, color: '#9E9E9E' },
                  ].map((bar, idx) => {
                    const maxCount = Math.max(complaints.length, 1);
                    const percent = bar.count / maxCount;
                    return (
                      <View key={idx} style={styles.chartBarRow}>
                        <Text variant="bodySmall" style={[styles.chartBarLabel, { fontSize: 10.5 }]}>{bar.label}</Text>
                        <View style={styles.chartBarTrack}>
                          <View 
                            style={[
                              styles.chartBarFill, 
                              { width: `${Math.max(percent * 100, 5)}%`, backgroundColor: bar.color }
                            ]} 
                          />
                        </View>
                        <Text variant="bodySmall" style={styles.chartBarVal}>{bar.count}</Text>
                      </View>
                    );
                  })}
                </View>
              </Card.Content>
            </Card>

            {/* D. Society Council Roster */}
            <Card style={[styles.adminSectionCard, { marginTop: 16 }]}>
              <Card.Content>
                <Text variant="titleSmall" style={{ fontWeight: 'bold', color: theme.colors.primary, marginBottom: 8 }}>
                  👥 Approved Resident Roster ({approvedUsers.length})
                </Text>
                {approvedUsers.map((u) => (
                  <View key={u.id} style={styles.userRow}>
                    <View style={{ flex: 1 }}>
                      <Text variant="titleMedium" style={{ fontWeight: 'bold', fontSize: 14 }}>
                        {u.full_name} {u.id === user?.id && '(You)'}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                        Flat {u.wing}-{u.flat_number} • Ph: {u.phone || 'N/A'}
                      </Text>
                      <View style={styles.rosterTags}>
                        {(() => {
                          const badge = getRoleBadge(u.role);
                          return (
                            <Chip 
                              icon={badge.icon} 
                              style={{ height: 22, justifyContent: 'center', backgroundColor: badge.color + '15', borderColor: badge.color, borderWidth: 0.5 }}
                              textStyle={{ fontSize: 9, fontWeight: 'bold', color: badge.color }}
                              compact
                            >
                              {badge.text.split(' ')[0]}
                            </Chip>
                          );
                        })()}
                      </View>
                    </View>
                    
                    {u.id !== user?.id && (
                      <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                        <Button 
                          mode="outlined" 
                          onPress={() => handleChangeRole(u.id, u.role)}
                          labelStyle={{ fontSize: 9 }}
                          style={{ borderRadius: 6 }}
                          compact
                        >
                          Cycle Role
                        </Button>
                        <IconButton 
                          icon="account-off" 
                          iconColor={theme.colors.error}
                          size={20}
                          style={{ margin: 0 }}
                          onPress={() => handleReject(u.id, u.full_name)}
                        />
                      </View>
                    )}
                  </View>
                ))}
              </Card.Content>
            </Card>
          </View>
        )}

        {/* 3. SETTINGS & MODE */}
        <Card style={styles.settingsCard}>
          <Card.Content>
            <View style={styles.settingSwitchRow}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>Demo Offline Mode</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                  Simulate local memory databases instead of live Supabase
                </Text>
              </View>
              <Switch value={isMock} onValueChange={toggleMockMode} />
            </View>
          </Card.Content>
        </Card>

        {/* 4. LOG OUT BUTTON */}
        <Button 
          mode="contained" 
          buttonColor={theme.colors.error}
          textColor={theme.colors.onError}
          icon="logout"
          onPress={signOut}
          style={styles.logoutButton}
        >
          Sign Out of SocietySync
        </Button>
      </ScrollView>

      {/* Snackbar Toast */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={{ marginBottom: 60 }}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  profileCard: {
    borderRadius: 20,
    elevation: 3,
    marginBottom: 16,
  },
  profileContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  profileName: {
    fontWeight: 'bold',
  },
  roleChip: {
    marginTop: 8,
    borderRadius: 8,
  },
  divider: {
    width: '100%',
    marginVertical: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  permissionsCard: {
    borderRadius: 16,
    elevation: 1,
    marginBottom: 16,
  },
  permissionsTitle: {
    fontWeight: 'bold',
  },
  consoleTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  adminSectionCard: {
    borderRadius: 16,
    elevation: 2,
    marginBottom: 16,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#EEE',
    paddingVertical: 10,
  },
  rosterTags: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  settingsCard: {
    borderRadius: 12,
    elevation: 1,
    marginBottom: 16,
  },
  settingSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoutButton: {
    marginTop: 8,
    borderRadius: 10,
    paddingVertical: 6,
  },
  settingsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chartContainer: {
    gap: 8,
    marginTop: 8,
  },
  chartBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartBarLabel: {
    width: 85,
    fontSize: 11,
  },
  chartBarTrack: {
    flex: 1,
    height: 12,
    backgroundColor: '#2A2A2A',
    borderRadius: 6,
    overflow: 'hidden',
  },
  chartBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  chartBarVal: {
    width: 20,
    textAlign: 'right',
    fontWeight: 'bold',
    fontSize: 11,
  },
});
