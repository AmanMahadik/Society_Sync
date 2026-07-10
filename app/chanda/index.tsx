import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl } from 'react-native';
import { Appbar, Card, Text, Button, Badge, useTheme, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { formatINR } from '@/lib/utils';

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  target_amount: number | null;
  status: 'draft' | 'active' | 'closed' | 'cancelled';
  start_date: string;
  end_date: string | null;
}

export default function ChandaIndexScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { profile } = useAuth();
  
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCampaigns = async () => {
    if (!profile?.society_id) return;
    try {
      // Fetch active and closed/cancelled campaigns
      const { data, error } = await supabase
        .from('chanda_campaigns')
        .select('*')
        .eq('society_id', profile.society_id)
        .in('status', ['active', 'closed', 'cancelled'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [profile]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCampaigns();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return theme.colors.primary;
      case 'closed':
        return theme.colors.outline;
      case 'cancelled':
        return theme.colors.error;
      default:
        return theme.colors.backdrop;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <Appbar.Header style={{ backgroundColor: theme.colors.elevation.level1 }} elevated>
        <Appbar.BackAction onPress={() => router.back()} color={theme.colors.onSurface} />
        <Appbar.Content title="Chanda Campaigns" titleStyle={{ fontWeight: 'bold' }} />
        <Appbar.Action 
          icon="history" 
          onPress={() => router.push('/chanda/history' as any)} 
          color={theme.colors.onSurface} 
        />
      </Appbar.Header>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 10, color: theme.colors.outline }}>Loading campaigns...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
          }
        >
          {campaigns.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text variant="bodyLarge" style={{ color: theme.colors.outline, textAlign: 'center' }}>
                No active or past chanda campaigns found for your society.
              </Text>
            </View>
          ) : (
            campaigns.map((item) => (
              <Card 
                key={item.id} 
                style={[styles.card, { backgroundColor: theme.colors.elevation.level1 }]}
                onPress={() => item.status === 'active' && router.push(`/chanda/${item.id}` as any)}
              >
                <Card.Content style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text variant="titleMedium" style={styles.cardTitle}>
                      {item.title}
                    </Text>
                    <Badge 
                      style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15', color: getStatusColor(item.status), borderColor: getStatusColor(item.status) + '30' }]}
                    >
                      {item.status.toUpperCase()}
                    </Badge>
                  </View>
                  
                  {item.description && (
                    <Text variant="bodyMedium" style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
                      {item.description}
                    </Text>
                  )}

                  <View style={styles.cardFooter}>
                    <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                      Started: {new Date(item.start_date).toLocaleDateString()}
                    </Text>
                    {item.status === 'active' && (
                      <Button 
                        mode="contained" 
                        compact 
                        buttonColor={theme.colors.primary} 
                        textColor={theme.colors.onPrimary}
                      >
                        Contribute
                      </Button>
                    )}
                  </View>
                </Card.Content>
              </Card>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 6,
    fontWeight: 'bold',
  },
  description: {
    marginBottom: 16,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
});
