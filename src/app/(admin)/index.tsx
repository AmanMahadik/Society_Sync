import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl, Share, Alert } from 'react-native';
import { Text, Card, Button, useTheme, Avatar, IconButton, Divider } from 'react-native-paper';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { useRouter } from 'expo-router';

interface SocietyDetails {
  name: string;
  society_code: string;
  city: string;
}

export default function AdminDashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { signOut, profile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  
  const [society, setSociety] = useState<SocietyDetails | null>(null);
  const [stats, setStats] = useState({
    totalResidents: 0,
    activeSOS: 0,
    announcementsCount: 0
  });

  const fetchDashboardData = async () => {
    if (!profile?.society_id) return;
    try {
      // 1. Fetch society details
      const { data: soc, error: socError } = await supabase
        .from('societies')
        .select('name, society_code, city')
        .eq('id', profile.society_id)
        .single();
      
      if (!socError && soc) {
        setSociety(soc);
      }

      // 2. Fetch residents count (profiles with matching society_id and role = 'resident')
      const { count: resCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('society_id', profile.society_id)
        .eq('role', 'resident');

      // 3. Fetch active SOS alerts
      const { count: sosCount } = await supabase
        .from('sos_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('society_id', profile.society_id)
        .eq('status', 'active');

      // 4. Fetch announcements count
      const { count: annCount } = await supabase
        .from('announcements')
        .select('*', { count: 'exact', head: true })
        .eq('society_id', profile.society_id);

      setStats({
        totalResidents: resCount || 0,
        activeSOS: sosCount || 0,
        announcementsCount: annCount || 0
      });

    } catch (e) {
      console.error('Error loading admin dashboard stats:', e);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [profile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const handleShareCode = async () => {
    if (!society) return;
    try {
      await Share.share({
        message: `Join ${society.name} on SocietySync! Use the code ${society.society_code} during registration.`,
      });
    } catch (error) {
      Alert.alert('Share Failed', 'Could not open share sheet.');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
      }
    >
      {/* HEADER CONTROLLER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Avatar.Icon size={44} icon="account-tie" style={{ backgroundColor: theme.colors.primaryContainer }} color={theme.colors.primary} />
          <View>
            <Text variant="titleMedium" style={styles.boldText}>{society?.name || 'Society Admin'}</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
              📍 {society?.city || 'Admin Control Panel'}
            </Text>
          </View>
        </View>
        <IconButton icon="logout" iconColor={theme.colors.error} size={24} onPress={handleSignOut} />
      </View>

      {/* SHARE CODE WIDGET */}
      {society && (
        <Card style={[styles.codeCard, { backgroundColor: theme.colors.primaryContainer }]}>
          <Card.Content style={styles.codeCardContent}>
            <View>
              <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.8 }}>
                RESIDENT REGISTRATION CODE
              </Text>
              <Text variant="headlineMedium" style={[styles.codeText, { color: theme.colors.primary }]}>
                {society.society_code}
              </Text>
            </View>
            <Button
              mode="contained"
              onPress={handleShareCode}
              style={{ backgroundColor: theme.colors.primary }}
              textColor={theme.dark ? '#000000' : '#FFFFFF'}
              icon="share-variant"
            >
              Share
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* STATS MATRIX */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard} onPress={() => router.push('/(admin)/residents')}>
          <Card.Content style={styles.statContent}>
            <Avatar.Icon size={32} icon="account-group" style={{ backgroundColor: '#1A1A1A' }} color={theme.colors.primary} />
            <Text variant="headlineMedium" style={styles.statNumber}>{stats.totalResidents}</Text>
            <Text variant="labelSmall" style={{ color: theme.colors.outline }}>Total Residents</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard} onPress={() => router.push('/(admin)/sos')}>
          <Card.Content style={styles.statContent}>
            <Avatar.Icon size={32} icon="alarm-light" style={{ backgroundColor: '#1A1A1A' }} color={stats.activeSOS > 0 ? theme.colors.error : theme.colors.outline} />
            <Text variant="headlineMedium" style={[styles.statNumber, stats.activeSOS > 0 && { color: theme.colors.error }]}>
              {stats.activeSOS}
            </Text>
            <Text variant="labelSmall" style={{ color: stats.activeSOS > 0 ? theme.colors.error : theme.colors.outline, fontWeight: 'bold' }}>
              SOS Alerts
            </Text>
          </Card.Content>
        </Card>
      </View>

      <View style={styles.statsRow}>
        <Card style={styles.statCard} onPress={() => router.push('/(admin)/announcements')}>
          <Card.Content style={styles.statContent}>
            <Avatar.Icon size={32} icon="bullhorn" style={{ backgroundColor: '#1A1A1A' }} color={theme.colors.primary} />
            <Text variant="headlineMedium" style={styles.statNumber}>{stats.announcementsCount}</Text>
            <Text variant="labelSmall" style={{ color: theme.colors.outline }}>Announcements</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard} onPress={() => router.push('/(admin)/residents')}>
          <Card.Content style={styles.statContent}>
            <Avatar.Icon size={32} icon="shield-check" style={{ backgroundColor: '#1A1A1A' }} color={theme.colors.primary} />
            <Text variant="headlineMedium" style={styles.statNumber}>1</Text>
            <Text variant="labelSmall" style={{ color: theme.colors.outline }}>Society Admins</Text>
          </Card.Content>
        </Card>
      </View>

      {/* QUICK ACTIONS */}
      <Text variant="titleMedium" style={styles.sectionTitle}>Administrative Functions</Text>

      <Card style={styles.actionCard} onPress={() => router.push('/(admin)/residents')}>
        <Card.Content style={styles.actionContent}>
          <View style={styles.actionLeft}>
            <Avatar.Icon size={40} icon="account-cog" style={{ backgroundColor: '#1A1A1A' }} color={theme.colors.primary} />
            <View>
              <Text variant="titleMedium" style={styles.boldText}>Resident Directory</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.outline }}>Monitor society members and flat owners</Text>
            </View>
          </View>
          <IconButton icon="chevron-right" size={24} />
        </Card.Content>
      </Card>

      <Card style={styles.actionCard} onPress={() => router.push('/(admin)/announcements')}>
        <Card.Content style={styles.actionContent}>
          <View style={styles.actionLeft}>
            <Avatar.Icon size={40} icon="bullhorn-variant" style={{ backgroundColor: '#1A1A1A' }} color={theme.colors.primary} />
            <View>
              <Text variant="titleMedium" style={styles.boldText}>Broadcast Announcement</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.outline }}>Post details for residents to view</Text>
            </View>
          </View>
          <IconButton icon="chevron-right" size={24} />
        </Card.Content>
      </Card>

      <Card style={styles.actionCard} onPress={() => router.push('/(admin)/sos')}>
        <Card.Content style={styles.actionContent}>
          <View style={styles.actionLeft}>
            <Avatar.Icon size={40} icon="alert-box" style={{ backgroundColor: '#1A1A1A' }} color={theme.colors.primary} />
            <View>
              <Text variant="titleMedium" style={styles.boldText}>Active Emergency Channels</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.outline }}>Acknowledge and resolve security alarms</Text>
            </View>
          </View>
          <IconButton icon="chevron-right" size={24} />
        </Card.Content>
      </Card>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 48,
    paddingBottom: 80,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  boldText: {
    fontWeight: 'bold',
  },
  codeCard: {
    borderRadius: 12,
    elevation: 2,
  },
  codeCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  codeText: {
    fontFamily: 'monospace',
    fontWeight: 'bold',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    elevation: 1,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  statNumber: {
    fontWeight: 'bold',
    marginVertical: 4,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
  },
  actionCard: {
    borderRadius: 12,
    elevation: 1,
  },
  actionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
