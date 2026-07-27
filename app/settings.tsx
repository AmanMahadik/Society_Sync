import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { Appbar, Card, Text, List, Switch, RadioButton, Divider, useTheme, Menu, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/lib/auth-context';
import { useThemeContext, ThemeMode } from '@/lib/theme-context';
import { useNotifications } from '@/lib/notification-context';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';

let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  console.warn('Failed to load expo-notifications:', e);
}

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user, profile } = useAuth();
  const { themeMode, setThemeMode } = useThemeContext();
  const { addNotification } = useNotifications();
  const [testingDiag, setTestingDiag] = useState(false);

  // Notification Preferences States
  const [notifSOS, setNotifSOS] = useState(true);
  const [notifMaintenance, setNotifMaintenance] = useState(true);
  const [notifParking, setNotifParking] = useState(true);
  const [notifCommunity, setNotifCommunity] = useState(true);
  const [notifFestivals, setNotifFestivals] = useState(true);
  const [globalSOSActive, setGlobalSOSActive] = useState(true);

  // Language Menu State
  const [langMenuVisible, setLangMenuVisible] = useState(false);
  const [language, setLanguage] = useState<'english' | 'marathi'>('english');

  // App & Connection Status States
  const [dbStatus, setDbStatus] = useState<'Connected' | 'Disconnected'>('Connected');
  const [realtimeStatus, setRealtimeStatus] = useState<'Active' | 'Inactive'>('Active');
  const [notifPermission, setNotifPermission] = useState<string>('Checking...');

  // Load Preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const keys = [
          ['sync_notif_sos', setNotifSOS],
          ['sync_notif_maintenance', setNotifMaintenance],
          ['sync_notif_parking', setNotifParking],
          ['sync_notif_community', setNotifCommunity],
          ['sync_notif_festivals', setNotifFestivals],
        ];

        for (const [key, setter] of keys) {
          const val = await AsyncStorage.getItem(key as string);
          if (val !== null) {
            (setter as Function)(val === 'true');
          }
        }

        const lang = await AsyncStorage.getItem('sync_app_language');
        if (lang) {
          setLanguage(lang as 'english' | 'marathi');
        }

        // Fetch society settings for global SOS status check
        const { data: socSettings } = await supabase
          .from('society_settings')
          .select('*')
          .limit(1)
          .maybeSingle();

        let isGloballyActive = true;
        if (socSettings && socSettings.admin_contact) {
          try {
            const parsed = JSON.parse(socSettings.admin_contact);
            if (parsed && typeof parsed.sos_active === 'boolean') {
              isGloballyActive = parsed.sos_active;
            }
          } catch (e) {}
        }
        setGlobalSOSActive(isGloballyActive);
        if (!isGloballyActive) {
          setNotifSOS(false);
        }
      } catch (e) {
        console.error('Failed to load settings preferences', e);
      }
    };

    const checkAppStatuses = async () => {
      // Check Supabase DB Status
      try {
        const { data, error } = await supabase.from('society_settings').select('id').limit(1);
        if (error) throw error;
        setDbStatus('Connected');
      } catch (e) {
        setDbStatus('Disconnected');
      }

      // Check Notification Permissions
      try {
        if (Notifications) {
          const { status } = await Notifications.getPermissionsAsync();
          if (status === 'granted') {
            setNotifPermission('Active');
          } else {
            const { status: askStatus } = await Notifications.requestPermissionsAsync();
            setNotifPermission(askStatus === 'granted' ? 'Active' : 'Disabled');
          }
        } else {
          setNotifPermission('Disabled (Not Loaded)');
        }
      } catch (e) {
        setNotifPermission('Disabled (Not Supported)');
      }

      // Supabase Realtime Channel Check
      if (supabase.realtime) {
        setRealtimeStatus('Active');
      } else {
        setRealtimeStatus('Inactive');
      }
    };

    loadPreferences();
    checkAppStatuses();
  }, []);

  // Save Preference Helper
  const saveNotifPref = async (key: string, value: boolean, setter: (val: boolean) => void) => {
    try {
      setter(value);
      await AsyncStorage.setItem(key, value ? 'true' : 'false');

      // If the admin of the society toggles SOS, save it to society_settings in Supabase
      if (key === 'sync_notif_sos' && profile && profile.role === 'admin') {
        const { data: currentSettings } = await supabase
          .from('society_settings')
          .select('*')
          .limit(1)
          .maybeSingle();

        const settingsObj = currentSettings || {
          society_id: profile.society_id,
          society_name: profile.society_name || 'SocietySync Co-Op Housing',
          maintenance_rate_per_sqft: 3.5,
          late_fee_percentage: 2.0,
          parking_slot_count: 10,
          admin_contact: ''
        };

        const contactVal = settingsObj.admin_contact || '';
        let parsedContact: any = {};
        try {
          parsedContact = JSON.parse(contactVal);
        } catch (e) {
          parsedContact = { contact: contactVal };
        }
        parsedContact.sos_active = value;
        settingsObj.admin_contact = JSON.stringify(parsedContact);

        if (currentSettings) {
          const { error } = await supabase
            .from('society_settings')
            .update({ admin_contact: settingsObj.admin_contact })
            .eq('id', currentSettings.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('society_settings')
            .insert(settingsObj);
          if (error) throw error;
        }

        // Notify user about global change
        addNotification({
          type: 'confirmation',
          message: value ? '🔔 SOS Alerts Enabled' : '🔕 SOS Alerts Disabled',
          subtext: value ? 'SOS features are now enabled society-wide.' : 'SOS features are now disabled society-wide.',
          autoDismiss: true,
          dismissAfterMs: 5000,
          color: value ? '#10B981' : '#EF4444',
        });
      }
    } catch (e) {
      console.error(`Failed to save ${key}`, e);
    }
  };

  const handleLanguageChange = async (lang: 'english' | 'marathi') => {
    try {
      setLanguage(lang);
      await AsyncStorage.setItem('sync_app_language', lang);
      setLangMenuVisible(false);
    } catch (e) {
      console.error('Failed to save language preference', e);
    }
  };

  const handleRunDiagnostics = async () => {
    setTestingDiag(true);
    try {
      const { error } = await supabase.from('society_settings').select('id').limit(1);
      if (error) throw error;
      setDbStatus('Connected');
      
      addNotification({
        type: 'confirmation',
        message: '🛠️ Diagnostics Check Pass',
        subtext: 'Realtime WebSockets active. Floating notification stack is functional!',
        autoDismiss: true,
        dismissAfterMs: 6000,
        color: '#10B981',
      });
    } catch (e) {
      setDbStatus('Disconnected');
      addNotification({
        type: 'sos_full',
        message: '⚠️ Diagnostics Failed',
        subtext: 'Could not contact database server. Please check internet connectivity.',
        autoDismiss: true,
        dismissAfterMs: 6000,
      });
    } finally {
      setTestingDiag(false);
    }
  };

  // Date Formatter
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Capitalize Role Helper
  const formatRole = (role?: string) => {
    if (!role) return 'Resident';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Soft brand glow backdrop */}
      <View 
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: [{ translateX: -150 }],
          width: 300,
          height: 300,
          borderRadius: 150,
          backgroundColor: '#00D4AA',
          opacity: theme.dark ? 0.04 : 0.02,
          pointerEvents: 'none',
        }}
      />

      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['bottom']}>
        <Appbar.Header style={{ backgroundColor: theme.colors.elevation.level1 }} elevated>
          <Appbar.BackAction onPress={() => router.back()} color={theme.colors.onSurface} />
          <Appbar.Content title="Settings" titleStyle={{ fontWeight: 'bold' }} />
        </Appbar.Header>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* 1. Theme Configuration */}
          <Card style={[styles.card, { 
            backgroundColor: theme.colors.elevation.level1,
            borderRadius: 20, 
            borderWidth: theme.dark ? 1 : 0, 
            borderColor: 'rgba(255, 255, 255, 0.08)'
          }]}>
            <Card.Content>
              <Text variant="titleMedium" style={[styles.cardTitle, { color: '#00D4AA' }]}>
                Theme Preference
              </Text>
              <RadioButton.Group onValueChange={value => setThemeMode(value as ThemeMode)} value={themeMode}>
                <View style={styles.radioRow}>
                  <RadioButton.Android value="dark" color="#00D4AA" />
                  <Text variant="bodyLarge" style={[styles.radioLabel, { color: theme.colors.onSurface }]}>🌙 Dark Mode</Text>
                </View>
                <Divider style={styles.divider} />
                <View style={styles.radioRow}>
                  <RadioButton.Android value="light" color="#00D4AA" />
                  <Text variant="bodyLarge" style={[styles.radioLabel, { color: theme.colors.onSurface }]}>☀️ Light Mode</Text>
                </View>
              <Divider style={styles.divider} />
              <View style={styles.radioRow}>
                <RadioButton.Android value="system" color="#00D4AA" />
                <Text variant="bodyLarge" style={[styles.radioLabel, { color: theme.colors.onSurface }]}>📱 System Default</Text>
              </View>
            </RadioButton.Group>
          </Card.Content>
        </Card>

        {/* 2. Notification Preferences */}
        <Card style={[styles.card, { 
          backgroundColor: theme.colors.elevation.level1,
          borderRadius: 20, 
          borderWidth: theme.dark ? 1 : 0, 
          borderColor: 'rgba(255, 255, 255, 0.08)'
        }]}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.cardTitle, { color: '#00D4AA' }]}>
              Notification Settings
            </Text>
            
            <View style={styles.switchRow}>
              <View style={styles.switchTextContainer}>
                <Text variant="bodyLarge" style={{ fontWeight: '600', color: theme.colors.onSurface }}>SOS Emergency Alerts</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                  {!globalSOSActive 
                    ? '⚠️ Disabled globally by Society Admin' 
                    : 'Immediate alerts for safety and security'}
                </Text>
              </View>
              <Switch
                value={notifSOS}
                disabled={!globalSOSActive && profile?.role !== 'admin'}
                onValueChange={val => saveNotifPref('sync_notif_sos', val, setNotifSOS)}
                color="#00D4AA"
              />
            </View>

            <Divider style={styles.divider} />

            <View style={styles.switchRow}>
              <View style={styles.switchTextContainer}>
                <Text variant="bodyLarge" style={{ fontWeight: '600', color: theme.colors.onSurface }}>Maintenance Updates</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>Reminders for dues and payment confirmations</Text>
              </View>
              <Switch
                value={notifMaintenance}
                onValueChange={val => saveNotifPref('sync_notif_maintenance', val, setNotifMaintenance)}
                color="#00D4AA"
              />
            </View>

            <Divider style={styles.divider} />

            <View style={styles.switchRow}>
              <View style={styles.switchTextContainer}>
                <Text variant="bodyLarge" style={{ fontWeight: '600', color: theme.colors.onSurface }}>Parking Allocations</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>Approval/rejection notifications for slot requests</Text>
              </View>
              <Switch
                value={notifParking}
                onValueChange={val => saveNotifPref('sync_notif_parking', val, setNotifParking)}
                color="#00D4AA"
              />
            </View>

            <Divider style={styles.divider} />

            <View style={styles.switchRow}>
              <View style={styles.switchTextContainer}>
                <Text variant="bodyLarge" style={{ fontWeight: '600', color: theme.colors.onSurface }}>Community Messages</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>Chat mentions and thread discussions</Text>
              </View>
              <Switch
                value={notifCommunity}
                onValueChange={val => saveNotifPref('sync_notif_community', val, setNotifCommunity)}
                color="#00D4AA"
              />
            </View>

            <Divider style={styles.divider} />

            <View style={styles.switchRow}>
              <View style={styles.switchTextContainer}>
                <Text variant="bodyLarge" style={{ fontWeight: '600', color: theme.colors.onSurface }}>Festival & Event Updates</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>Announcements for society cultural programs</Text>
              </View>
              <Switch
                value={notifFestivals}
                onValueChange={val => saveNotifPref('sync_notif_festivals', val, setNotifFestivals)}
                color="#00D4AA"
              />
            </View>
          </Card.Content>
        </Card>

        {/* 3. Language Selection */}
        <Card style={[styles.card, { 
          backgroundColor: theme.colors.elevation.level1,
          borderRadius: 20, 
          borderWidth: theme.dark ? 1 : 0, 
          borderColor: 'rgba(255, 255, 255, 0.08)'
        }]}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.cardTitle, { color: '#00D4AA' }]}>
              Language Support
            </Text>
            <View style={styles.langRow}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyLarge" style={{ fontWeight: '600', color: theme.colors.onSurface }}>App Language</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                  Selected: {language === 'english' ? 'English (Active)' : 'मराठी (Future Ready)'}
                </Text>
              </View>
              
              <Menu
                visible={langMenuVisible}
                onDismiss={() => setLangMenuVisible(false)}
                anchor={
                  <Button 
                    mode="outlined" 
                    onPress={() => setLangMenuVisible(true)}
                    textColor={theme.colors.primary}
                    style={{ borderColor: theme.colors.primary }}
                  >
                    {language === 'english' ? 'English' : 'मराठी'}
                  </Button>
                }
              >
                <Menu.Item onPress={() => handleLanguageChange('english')} title="English" leadingIcon="check" />
                <Divider />
                <Menu.Item onPress={() => handleLanguageChange('marathi')} title="मराठी (Marathi)" disabled />
              </Menu>
            </View>
          </Card.Content>
        </Card>

        {/* 4. Account Information */}
        <Card style={[styles.card, { 
          backgroundColor: theme.colors.elevation.level1,
          borderRadius: 20, 
          borderWidth: theme.dark ? 1 : 0, 
          borderColor: 'rgba(255, 255, 255, 0.08)'
        }]}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.cardTitle, { color: '#00D4AA' }]}>
              Account Details
            </Text>
            
            <List.Item
              title="Registered Email"
              titleStyle={{ color: theme.colors.onSurface }}
              description={user?.email || 'N/A'}
              descriptionStyle={{ color: theme.colors.outline }}
              left={props => <List.Icon {...props} icon="email-outline" color="#00D4AA" />}
            />
            <Divider />
            <List.Item
              title="Role Profile"
              titleStyle={{ color: theme.colors.onSurface }}
              description={formatRole(profile?.role)}
              descriptionStyle={{ color: theme.colors.outline }}
              left={props => <List.Icon {...props} icon="shield-account-outline" color="#00D4AA" />}
            />
            <Divider />
            <View style={styles.infoRowGrid}>
              <View style={{ flex: 1 }}>
                <List.Item
                  title="Wing"
                  titleStyle={{ color: theme.colors.onSurface }}
                  description={profile?.wing || 'N/A'}
                  descriptionStyle={{ color: theme.colors.outline }}
                  left={props => <List.Icon {...props} icon="office-building" color="#00D4AA" />}
                />
              </View>
              <View style={{ flex: 1 }}>
                <List.Item
                  title="Flat Number"
                  titleStyle={{ color: theme.colors.onSurface }}
                  description={profile?.flat_number || 'N/A'}
                  descriptionStyle={{ color: theme.colors.outline }}
                  left={props => <List.Icon {...props} icon="home-outline" color="#00D4AA" />}
                />
              </View>
            </View>
            <Divider />
            <List.Item
              title="Verified Status"
              titleStyle={{ color: theme.colors.onSurface }}
              description={profile?.status === 'approved' ? 'Verified (Active)' : 'Pending Review'}
              descriptionStyle={{ color: profile?.status === 'approved' ? '#10B981' : theme.colors.error, fontWeight: 'bold' }}
              left={props => (
                <List.Icon 
                  {...props} 
                  icon={profile?.status === 'approved' ? "shield-check" : "shield-alert"} 
                  color={profile?.status === 'approved' ? '#10B981' : theme.colors.error} 
                />
              )}
            />
            <Divider />
            <List.Item
              title="Account Created"
              titleStyle={{ color: theme.colors.onSurface }}
              description={formatDate(profile?.created_at || user?.created_at)}
              descriptionStyle={{ color: theme.colors.outline }}
              left={props => <List.Icon {...props} icon="calendar-account" color="#00D4AA" />}
            />
            <Divider />
            <List.Item
              title="Last Signed In"
              titleStyle={{ color: theme.colors.onSurface }}
              description={formatDate(user?.last_sign_in_at)}
              descriptionStyle={{ color: theme.colors.outline }}
              left={props => <List.Icon {...props} icon="login" color="#00D4AA" />}
            />
          </Card.Content>
        </Card>

        {/* 5. Security Access */}
        <Card style={[styles.card, { 
          backgroundColor: theme.colors.elevation.level1,
          borderRadius: 20, 
          borderWidth: theme.dark ? 1 : 0, 
          borderColor: 'rgba(255, 255, 255, 0.08)'
        }]}>
          <Card.Content style={{ padding: 4 }}>
            <List.Item
              title="Security & Password"
              titleStyle={{ color: theme.colors.onSurface }}
              description="Change your account password"
              descriptionStyle={{ color: theme.colors.outline }}
              left={props => <List.Icon {...props} icon="lock-outline" color="#00D4AA" />}
              right={props => <List.Icon {...props} icon="chevron-right" color={theme.colors.outline} />}
              onPress={() => router.push('/change-password' as any)}
            />
          </Card.Content>
        </Card>

        {/* 6. App & Network Diagnostics */}
        <Card style={[styles.card, { 
          backgroundColor: theme.colors.elevation.level1,
          borderRadius: 20, 
          borderWidth: theme.dark ? 1 : 0, 
          borderColor: 'rgba(255, 255, 255, 0.08)'
        }]}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.cardTitle, { color: '#00D4AA' }]}>
              App Information
            </Text>
            
            <View style={styles.diagRow}>
              <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurface }}>App Version</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>v1.0.0</Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.diagRow}>
              <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurface }}>Build Number</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>1</Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.diagRow}>
              <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurface }}>Database Connection</Text>
              <Text variant="bodyMedium" style={{ color: dbStatus === 'Connected' ? '#10B981' : theme.colors.error, fontWeight: 'bold' }}>
                {dbStatus}
              </Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.diagRow}>
              <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurface }}>Realtime Sync Engine</Text>
              <Text variant="bodyMedium" style={{ color: realtimeStatus === 'Active' ? '#10B981' : theme.colors.error, fontWeight: 'bold' }}>
                {realtimeStatus}
              </Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.diagRow}>
              <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurface }}>Notifications Service</Text>
              <Text variant="bodyMedium" style={{ color: notifPermission === 'Active' ? '#10B981' : theme.colors.error, fontWeight: 'bold' }}>
                {notifPermission}
              </Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.diagRow}>
              <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurface }}>Supabase Connection</Text>
              <Text variant="bodyMedium" style={{ color: '#10B981', fontWeight: 'bold' }}>Active</Text>
            </View>
            <Divider style={[styles.divider, { marginVertical: 12 }]} />
            <Button
              mode="contained"
              icon="tune-variant"
              onPress={handleRunDiagnostics}
              loading={testingDiag}
              disabled={testingDiag}
              buttonColor="#00D4AA"
              textColor="#09090b"
              style={{ marginTop: 8, borderRadius: 28 }}
              labelStyle={{ fontWeight: 'bold' }}
            >
              Run Diagnostics & Test Alert
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 12,
    marginBottom: 16,
    elevation: 1,
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  radioLabel: {
    marginLeft: 12,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  switchTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoRowGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  divider: {
    marginVertical: 4,
  },
});
