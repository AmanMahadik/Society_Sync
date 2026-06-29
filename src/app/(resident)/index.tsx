import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, useTheme, Avatar, IconButton } from 'react-native-paper';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { useRouter } from 'expo-router';

interface SocietyDetails {
  name: string;
  city: string;
}

export default function ResidentHomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { signOut, profile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  
  const [society, setSociety] = useState<SocietyDetails | null>(null);
  const [counts, setCounts] = useState({
    activeThreads: 0,
    myDues: 0
  });

  const fetchResidentData = async () => {
    if (!profile?.society_id) return;
    try {
      // 1. Fetch society details
      const { data: soc } = await supabase
        .from('societies')
        .select('name, city')
        .eq('id', profile.society_id)
        .single();
      if (soc) setSociety(soc);

      // 2. Fetch chat threads count
      const { count: threadCount } = await supabase
        .from('chat_threads')
        .select('*', { count: 'exact', head: true })
        .eq('society_id', profile.society_id);
      
      // 3. Fetch user's unpaid maintenance dues count
      const { count: duesCount } = await supabase
        .from('maintenance')
        .select('*', { count: 'exact', head: true })
        .eq('society_id', profile.society_id)
        .eq('flat_number', profile.flat_number || '')
        .eq('wing', profile.wing || '')
        .eq('status', 'unpaid');

      setCounts({
        activeThreads: threadCount || 0,
        myDues: duesCount || 0
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchResidentData();
  }, [profile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchResidentData();
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
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
      }
    >
      {/* HEADER SECTION */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Avatar.Icon size={44} icon="home-city" style={{ backgroundColor: theme.colors.primaryContainer }} color={theme.colors.primary} />
          <View>
            <Text variant="titleMedium" style={styles.boldText}>{profile?.full_name || 'Resident'}</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
              Flat {profile?.wing}-{profile?.flat_number}
            </Text>
          </View>
        </View>
        <IconButton icon="logout" iconColor={theme.colors.error} size={24} onPress={handleSignOut} />
      </View>

      {/* SOCIETY CARD */}
      <Card style={styles.societyCard}>
        <Card.Content>
          <Text variant="labelSmall" style={{ color: theme.colors.outline, letterSpacing: 0.5 }}>
            MY HOUSING COMPLEX
          </Text>
          <Text variant="headlineSmall" style={[styles.boldText, { color: theme.colors.primary, marginTop: 4 }]}>
            {society?.name || 'SocietySync'}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.outline, marginTop: 2 }}>
            📍 {society?.city || 'Registered Community'}
          </Text>
        </Card.Content>
      </Card>

      {/* STATS MATRIX */}
      <View style={styles.grid}>
        <Card style={styles.gridCard} onPress={() => router.push('/(resident)/chat')}>
          <Card.Content style={styles.gridContent}>
            <Avatar.Icon size={32} icon="forum" style={{ backgroundColor: '#1A1A1A' }} color={theme.colors.primary} />
            <Text variant="headlineMedium" style={styles.gridNumber}>{counts.activeThreads}</Text>
            <Text variant="labelSmall" style={{ color: theme.colors.outline }}>Council Threads</Text>
          </Card.Content>
        </Card>

        <Card style={styles.gridCard} onPress={() => router.push('/(resident)/finances')}>
          <Card.Content style={styles.gridContent}>
            <Avatar.Icon size={32} icon="cash-multiple" style={{ backgroundColor: '#1A1A1A' }} color={theme.colors.primary} />
            <Text variant="headlineMedium" style={styles.gridNumber}>{counts.myDues}</Text>
            <Text variant="labelSmall" style={{ color: theme.colors.outline }}>Pending Dues</Text>
          </Card.Content>
        </Card>
      </View>

      {/* EMERGENCY BUTTON CARD */}
      <Card style={[styles.sosCard, { borderColor: theme.colors.error, borderWidth: 1 }]} onPress={() => router.push('/(resident)/sos')}>
        <Card.Content style={styles.sosContent}>
          <View style={styles.sosLeft}>
            <Avatar.Icon size={40} icon="alert-octagon" style={{ backgroundColor: '#351515' }} color={theme.colors.error} />
            <View>
              <Text variant="titleMedium" style={[styles.boldText, { color: theme.colors.error }]}>Emergency SOS Trigger</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.outline }}>Instantly alert management of crisis</Text>
            </View>
          </View>
          <IconButton icon="chevron-right" size={24} iconColor={theme.colors.error} />
        </Card.Content>
      </Card>

      {/* QUICK LINKS SECTION */}
      <Text variant="titleMedium" style={styles.sectionTitle}>Quick Services</Text>

      <Card style={styles.actionCard} onPress={() => router.push('/(resident)/chat')}>
        <Card.Content style={styles.actionContent}>
          <View style={styles.actionLeft}>
            <Avatar.Icon size={36} icon="forum" style={{ backgroundColor: '#1A1A1A' }} color={theme.colors.primary} />
            <View>
              <Text variant="titleMedium" style={styles.boldText}>Council Discussions</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.outline }}>Participate in debates and vote on proposals</Text>
            </View>
          </View>
          <IconButton icon="chevron-right" size={24} />
        </Card.Content>
      </Card>

      <Card style={styles.actionCard} onPress={() => router.push('/(resident)/finances')}>
        <Card.Content style={styles.actionContent}>
          <View style={styles.actionLeft}>
            <Avatar.Icon size={36} icon="cash-multiple" style={{ backgroundColor: '#1A1A1A' }} color={theme.colors.primary} />
            <View>
              <Text variant="titleMedium" style={styles.boldText}>Finances & Dues</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.outline }}>Track transactions, receipts, and maintenance fees</Text>
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
  boldText: {
    fontWeight: 'bold',
  },
  societyCard: {
    borderRadius: 12,
    elevation: 2,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
  },
  gridCard: {
    flex: 1,
    borderRadius: 12,
    elevation: 1,
  },
  gridContent: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  gridNumber: {
    fontWeight: 'bold',
    marginVertical: 4,
  },
  sosCard: {
    borderRadius: 12,
    elevation: 2,
  },
  sosContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sosLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
