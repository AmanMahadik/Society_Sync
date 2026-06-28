import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { Text, Card, useTheme, Avatar, Divider } from 'react-native-paper';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';

interface Announcement {
  id: number;
  title: string;
  body: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

export default function ResidentAnnouncementsScreen() {
  const theme = useTheme();
  const { profile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const fetchAnnouncements = async () => {
    if (!profile?.society_id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select('*, profiles(full_name)')
        .eq('society_id', profile.society_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [profile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnnouncements();
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>Bulletin Board</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
          Announcements from your society administration
        </Text>
      </View>

      <FlatList
        data={announcements}
        keyExtractor={(item) => item.id.toString()}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Avatar.Icon size={32} icon="bullhorn" style={{ backgroundColor: '#1A1A1A' }} color={theme.colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{item.title}</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                    Posted by: {item.profiles?.full_name || 'Admin'} • {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              <Divider style={styles.divider} />

              <Text variant="bodyMedium" style={styles.bodyText}>
                {item.body}
              </Text>
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>
              {loading ? 'Retrieving notices...' : 'No bulletins posted.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 48,
  },
  title: {
    fontWeight: 'bold',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 12,
    elevation: 2,
  },
  cardContent: {
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  divider: {
    marginVertical: 12,
  },
  bodyText: {
    lineHeight: 20,
    color: '#E0E0E0',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
});
