import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Button, useTheme, Avatar, IconButton } from 'react-native-paper';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { useRouter } from 'expo-router';

export default function MasterDashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // System Stats
  const [stats, setStats] = useState({
    totalSocieties: 0,
    totalResidents: 0,
    activeSOS: 0,
    pendingRequests: 0,
  });

  const fetchSystemStats = async () => {
    try {
      const { count: socCount } = await supabase
        .from('societies')
        .select('*', { count: 'exact', head: true });

      const { count: resCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: sosCount } = await supabase
        .from('sos_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const { count: reqCount } = await supabase
        .from('society_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      setStats({
        totalSocieties: socCount || 0,
        totalResidents: resCount || 0,
        activeSOS: sosCount || 0,
        pendingRequests: reqCount || 0,
      });
    } catch (e) {
      console.error('Error fetching system stats:', e);
    }
  };

  useEffect(() => {
    fetchSystemStats();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSystemStats();
    setRefreshing(false);
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
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF3B30']} />
      }
    >
      {/* HEADER SECTION */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Avatar.Icon size={48} icon="shield-crown" style={{ backgroundColor: '#FF3B30' }} color="#FFFFFF" />
          <View style={styles.headerTextContainer}>
            <Text variant="titleLarge" style={styles.title}>System Control</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>Master Global Overseer</Text>
          </View>
        </View>
        <IconButton 
          icon="logout" 
          iconColor={theme.colors.error} 
          size={24} 
          onPress={handleSignOut} 
        />
      </View>

      {/* GOD VIEW STATS */}
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Avatar.Icon size={36} icon="office-building" style={{ backgroundColor: '#1A1A1A' }} color="#888888" />
            <Text variant="displayMedium" style={styles.statNumber}>{stats.totalSocieties}</Text>
            <Text variant="labelMedium" style={{ color: theme.colors.outline }}>Total Societies</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Avatar.Icon size={36} icon="account-multiple" style={{ backgroundColor: '#1A1A1A' }} color="#888888" />
            <Text variant="displayMedium" style={styles.statNumber}>{stats.totalResidents}</Text>
            <Text variant="labelMedium" style={{ color: theme.colors.outline }}>Registered Users</Text>
          </Card.Content>
        </Card>
      </View>

      <View style={styles.statsGrid}>
        {/* SOS ALERTS ACTIVE */}
        <Card 
          style={[styles.statCard, stats.activeSOS > 0 && { borderColor: '#FF3B30', borderWidth: 1 }]} 
          onPress={() => router.push('/(master)/sos')}
        >
          <Card.Content style={styles.statContent}>
            <Avatar.Icon size={36} icon="alert-octagon" style={{ backgroundColor: stats.activeSOS > 0 ? '#351515' : '#1A1A1A' }} color={stats.activeSOS > 0 ? '#FF3B30' : '#888888'} />
            <Text variant="displayMedium" style={[styles.statNumber, stats.activeSOS > 0 && { color: '#FF3B30' }]}>
              {stats.activeSOS}
            </Text>
            <Text variant="labelMedium" style={{ color: stats.activeSOS > 0 ? '#FF3B30' : theme.colors.outline, fontWeight: 'bold' }}>
              Active SOS Alarms
            </Text>
          </Card.Content>
        </Card>

        {/* PENDING PORTAL REQUESTS */}
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Avatar.Icon size={36} icon="clipboard-text-clock" style={{ backgroundColor: '#1A1A1A' }} color="#888888" />
            <Text variant="displayMedium" style={styles.statNumber}>{stats.pendingRequests}</Text>
            <Text variant="labelMedium" style={{ color: theme.colors.outline }}>Pending Approvals</Text>
          </Card.Content>
        </Card>
      </View>

      {/* QUICK LINK CONTROLS */}
      <Text variant="titleMedium" style={styles.sectionTitle}>System Directory Navigation</Text>

      <Card style={styles.actionCard} onPress={() => router.push('/(master)/societies')}>
        <Card.Content style={styles.actionContent}>
          <View style={styles.actionLeft}>
            <Avatar.Icon size={40} icon="home-group" style={{ backgroundColor: '#1A1A1A' }} color="#FF3B30" />
            <View style={styles.actionText}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>All Housing Societies</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.outline }}>View and suspend registered societies</Text>
            </View>
          </View>
          <IconButton icon="chevron-right" size={24} />
        </Card.Content>
      </Card>

      <Card style={styles.actionCard} onPress={() => router.push('/(master)/users')}>
        <Card.Content style={styles.actionContent}>
          <View style={styles.actionLeft}>
            <Avatar.Icon size={40} icon="account-cog" style={{ backgroundColor: '#1A1A1A' }} color="#FF3B30" />
            <View style={styles.actionText}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Global User Management</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.outline }}>Administer, promote, or demote user roles</Text>
            </View>
          </View>
          <IconButton icon="chevron-right" size={24} />
        </Card.Content>
      </Card>

      <Card style={styles.actionCard} onPress={() => router.push('/(master)/sos')}>
        <Card.Content style={styles.actionContent}>
          <View style={styles.actionLeft}>
            <Avatar.Icon size={40} icon="alarm-light" style={{ backgroundColor: '#1A1A1A' }} color="#FF3B30" />
            <View style={styles.actionText}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Global SOS Log</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.outline }}>Listen to emergency alarms system-wide</Text>
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
  headerTextContainer: {
    justifyContent: 'center',
  },
  title: {
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    elevation: 2,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  statNumber: {
    fontWeight: 'bold',
    marginVertical: 4,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginTop: 16,
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
  actionText: {
    justifyContent: 'center',
  },
});
