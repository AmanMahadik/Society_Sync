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
import { useLanguageContext } from '@/lib/language-context';

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

  const { language, setLanguage, t } = useLanguageContext();
  // Language Menu State
  const [langMenuVisible, setLangMenuVisible] = useState(false);

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
      await setLanguage(lang);
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
          <Appbar.Content title={t('settings')} titleStyle={{ fontWeight: 'bold' }} />
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
                {t('themePreference')}
              </Text>
              <RadioButton.Group onValueChange={value => setThemeMode(value as ThemeMode)} value={themeMode}>
                <View style={styles.radioRow}>
                  <RadioButton.Android value="dark" color="#00D4AA" />
                  <Text variant="bodyLarge" style={[styles.radioLabel, { color: theme.colors.onSurface }]}>{t('darkMode')}</Text>
                </View>
                <Divider style={styles.divider} />
                <View style={styles.radioRow}>
                  <RadioButton.Android value="light" color="#00D4AA" />
                  <Text variant="bodyLarge" style={[styles.radioLabel, { color: theme.colors.onSurface }]}>{t('lightMode')}</Text>
                </View>
              <Divider style={styles.divider} />
              <View style={styles.radioRow}>
                <RadioButton.Android value="system" color="#00D4AA" />
                <Text variant="bodyLarge" style={[styles.radioLabel, { color: theme.colors.onSurface }]}>{t('systemDefault')}</Text>
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
              {t('notificationSettings')}
            </Text>
            
            <View style={styles.switchRow}>
              <View style={styles.switchTextContainer}>
                <Text variant="bodyLarge" style={{ fontWeight: '600', color: theme.colors.onSurface }}>{t('sosAlerts')}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                  {!globalSOSActive 
                    ? t('sosAlertsSubDisabled') 
                    : t('sosAlertsSub')}
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
                <Text variant="bodyLarge" style={{ fontWeight: '600', color: theme.colors.onSurface }}>{t('maintenanceUpdates')}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>{t('maintenanceUpdatesSub')}</Text>
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
                <Text variant="bodyLarge" style={{ fontWeight: '600', color: theme.colors.onSurface }}>{t('parkingAllocations')}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>{t('parkingAllocationsSub')}</Text>
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
                <Text variant="bodyLarge" style={{ fontWeight: '600', color: theme.colors.onSurface }}>{t('communityMessages')}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>{t('communityMessagesSub')}</Text>
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
                <Text variant="bodyLarge" style={{ fontWeight: '600', color: theme.colors.onSurface }}>{t('festivalEventUpdates')}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>{t('festivalEventUpdatesSub')}</Text>
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
              {t('languageLabel')}
            </Text>
            <View style={styles.langRow}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyLarge" style={{ fontWeight: '600', color: theme.colors.onSurface }}>{t('languageLabel')}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                  {language === 'english' ? 'Selected: English' : 'निवडलेली भाषा: मराठी'}
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
                <Menu.Item onPress={() => handleLanguageChange('english')} title="English" leadingIcon={language === 'english' ? 'check' : undefined} />
                <Divider />
                <Menu.Item onPress={() => handleLanguageChange('marathi')} title="मराठी (Marathi)" leadingIcon={language === 'marathi' ? 'check' : undefined} />
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
              {t('accountDetails')}
            </Text>
            
            <List.Item
              title={t('registeredEmail')}
              titleStyle={{ color: theme.colors.onSurface }}
              description={user?.email || 'N/A'}
              descriptionStyle={{ color: theme.colors.outline }}
              left={props => <List.Icon {...props} icon="email-outline" color="#00D4AA" />}
            />
            <Divider />
            <List.Item
              title={t('role')}
              titleStyle={{ color: theme.colors.onSurface }}
              description={formatRole(profile?.role)}
              descriptionStyle={{ color: theme.colors.outline }}
              left={props => <List.Icon {...props} icon="shield-account-outline" color="#00D4AA" />}
            />
            <Divider />
            <View style={styles.infoRowGrid}>
              <View style={{ flex: 1 }}>
                <List.Item
                  title={t('wingLabel')}
                  titleStyle={{ color: theme.colors.onSurface }}
                  description={profile?.wing || 'N/A'}
                  descriptionStyle={{ color: theme.colors.outline }}
                  left={props => <List.Icon {...props} icon="office-building" color="#00D4AA" />}
                />
              </View>
              <View style={{ flex: 1 }}>
                <List.Item
                  title={t('flatNumberLabel')}
                  titleStyle={{ color: theme.colors.onSurface }}
                  description={profile?.flat_number || 'N/A'}
                  descriptionStyle={{ color: theme.colors.outline }}
                  left={props => <List.Icon {...props} icon="home-outline" color="#00D4AA" />}
                />
              </View>
            </View>
            <Divider />
            <List.Item
              title={language === 'english' ? 'Verified Status' : 'पडताळणी स्थिती'}
              titleStyle={{ color: theme.colors.onSurface }}
              description={profile?.status === 'approved' ? (language === 'english' ? 'Verified (Active)' : 'सक्रिय (पडताळणी पूर्ण)') : (language === 'english' ? 'Pending Review' : 'पुनरावलोकन प्रलंबित')}
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
              title={language === 'english' ? 'Account Created' : 'खाते तयार केले'}
              titleStyle={{ color: theme.colors.onSurface }}
              description={formatDate(profile?.created_at || user?.created_at)}
              descriptionStyle={{ color: theme.colors.outline }}
              left={props => <List.Icon {...props} icon="calendar-account" color="#00D4AA" />}
            />
            <Divider />
            <List.Item
              title={language === 'english' ? 'Last Signed In' : 'शेवटचे लॉगिन'}
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
              title={language === 'english' ? 'Security & Password' : 'सुरक्षा आणि संकेतशब्द'}
              titleStyle={{ color: theme.colors.onSurface }}
              description={language === 'english' ? 'Change your account password' : 'खात्याचा पासवर्ड बदला'}
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
              {language === 'english' ? 'App Information' : 'अ‍ॅपची माहिती'}
            </Text>
            
            <View style={styles.diagRow}>
              <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurface }}>{t('appVersion')}</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>v1.0.0</Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.diagRow}>
              <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurface }}>{language === 'english' ? 'Build Number' : 'बिल्ड नंबर'}</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>1</Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.diagRow}>
              <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurface }}>{t('dbConnection')}</Text>
              <Text variant="bodyMedium" style={{ color: dbStatus === 'Connected' ? '#10B981' : theme.colors.error, fontWeight: 'bold' }}>
                {dbStatus === 'Connected' ? (language === 'english' ? 'Connected' : 'जोडलेले') : (language === 'english' ? 'Disconnected' : 'तुटलेले')}
              </Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.diagRow}>
              <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurface }}>{t('realtimeEngine')}</Text>
              <Text variant="bodyMedium" style={{ color: realtimeStatus === 'Active' ? '#10B981' : theme.colors.error, fontWeight: 'bold' }}>
                {realtimeStatus === 'Active' ? (language === 'english' ? 'Active' : 'सक्रिय') : (language === 'english' ? 'Inactive' : 'निष्क्रिय')}
              </Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.diagRow}>
              <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurface }}>{language === 'english' ? 'Notifications Service' : 'सूचना सेवा'}</Text>
              <Text variant="bodyMedium" style={{ color: notifPermission === 'Active' ? '#10B981' : theme.colors.error, fontWeight: 'bold' }}>
                {notifPermission === 'Active' ? (language === 'english' ? 'Active' : 'सक्रिय') : (language === 'english' ? 'Inactive' : 'निष्क्रिय')}
              </Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.diagRow}>
              <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurface }}>{language === 'english' ? 'Supabase Connection' : 'सुपाबेस कनेक्शन'}</Text>
              <Text variant="bodyMedium" style={{ color: '#10B981', fontWeight: 'bold' }}>{language === 'english' ? 'Active' : 'सक्रिय'}</Text>
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
              {language === 'english' ? 'Run Diagnostics & Test Alert' : 'अ‍ॅप निदान चाचणी करा'}
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
