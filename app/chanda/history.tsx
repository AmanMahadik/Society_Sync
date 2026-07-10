import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl, Linking } from 'react-native';
import { Appbar, Card, Text, Badge, IconButton, useTheme, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { formatINR } from '@/lib/utils';

interface PaymentItem {
  id: string;
  campaignTitle: string;
  amount: number;
  channel: 'online' | 'offline';
  status: string;
  date: string;
  receiptUrl: string | null;
}

export default function PaymentHistoryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();

  const [history, setHistory] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    if (!user?.id) return;
    try {
      // 1. Fetch online payments
      const { data: onlineList, error: onlineErr } = await supabase
        .from('chanda_payments')
        .select('*, chanda_campaigns(title)')
        .eq('resident_id', user.id)
        .order('created_at', { ascending: false });

      if (onlineErr) throw onlineErr;

      // 2. Fetch offline contributions
      const { data: offlineList, error: offlineErr } = await supabase
        .from('chanda_offline_contributions')
        .select('*, chanda_campaigns(title)')
        .eq('resident_id', user.id)
        .order('created_at', { ascending: false });

      if (offlineErr) throw offlineErr;

      // 3. Map and merge
      const merged: PaymentItem[] = [
        ...(onlineList || []).map((p: any) => ({
          id: p.id,
          campaignTitle: p.chanda_campaigns?.title || 'Chanda',
          amount: Number(p.amount),
          channel: 'online' as const,
          status: p.status,
          date: p.paid_at || p.created_at,
          receiptUrl: p.receipt_url,
        })),
        ...(offlineList || []).map((o: any) => ({
          id: o.id,
          campaignTitle: o.chanda_campaigns?.title || 'Chanda',
          amount: Number(o.amount),
          channel: 'offline' as const,
          status: o.status,
          date: o.collected_at || o.created_at,
          receiptUrl: o.receipt_url,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setHistory(merged);
    } catch (error) {
      console.error('Error fetching contribution history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const handleDownloadReceipt = (id: string) => {
    const url = `https://society-sync-portal.vercel.app/api/chanda/receipt/${id}`;
    Linking.openURL(url).catch((err) => console.error('Failed to open receipt download URL:', err));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'verified':
        return '#10B981'; // Green
      case 'pending_verification':
      case 'pending':
        return '#F59E0B'; // Amber
      case 'failed':
      case 'rejected':
        return '#EF4444'; // Red
      case 'refunded':
        return '#3B82F6'; // Blue
      default:
        return theme.colors.outline;
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === 'pending_verification') return 'PENDING VERIFICATION';
    return status.toUpperCase();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <Appbar.Header style={{ backgroundColor: theme.colors.elevation.level1 }} elevated>
        <Appbar.BackAction onPress={() => router.back()} color={theme.colors.onSurface} />
        <Appbar.Content title="Contribution History" titleStyle={{ fontWeight: 'bold' }} />
      </Appbar.Header>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
          }
        >
          {history.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text variant="bodyLarge" style={{ color: theme.colors.outline, textAlign: 'center' }}>
                You have not made any contribution entries yet.
              </Text>
            </View>
          ) : (
            history.map((item) => (
              <Card key={item.id} style={[styles.card, { backgroundColor: theme.colors.elevation.level1 }]}>
                <Card.Content style={styles.cardContent}>
                  <View style={styles.headerRow}>
                    <View style={{ flex: 1 }}>
                      <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                        {item.campaignTitle}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 2 }}>
                        Date: {new Date(item.date).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text variant="titleLarge" style={[styles.amount, { color: theme.colors.primary }]}>
                      {formatINR(item.amount)}
                    </Text>
                  </View>

                  <View style={styles.footerRow}>
                    <View style={styles.badgeRow}>
                      <Badge 
                        style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '15', color: getStatusColor(item.status), borderColor: getStatusColor(item.status) + '30' }]}
                      >
                        {getStatusLabel(item.status)}
                      </Badge>
                      <Badge style={styles.channelBadge}>
                        {item.channel.toUpperCase()}
                      </Badge>
                    </View>

                    {(item.status === 'paid' || item.status === 'verified') && (
                      <IconButton
                        icon="download"
                        mode="contained-tonal"
                        containerColor={theme.colors.secondaryContainer}
                        iconColor={theme.colors.onSecondaryContainer}
                        size={20}
                        onPress={() => handleDownloadReceipt(item.id)}
                        style={{ margin: 0 }}
                      />
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
    gap: 12,
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
    borderColor: 'rgba(255,255,255,0.03)',
  },
  cardContent: {
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  amount: {
    fontWeight: 'bold',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 6,
    fontWeight: 'bold',
  },
  channelBadge: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#ccc',
    borderRadius: 6,
  },
});
