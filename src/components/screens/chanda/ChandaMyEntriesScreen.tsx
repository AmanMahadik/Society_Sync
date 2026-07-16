import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl } from 'react-native';
import { Appbar, Card, Text, Badge, useTheme, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { formatINR } from '@/lib/utils';

interface OfflineEntry {
  id: string;
  payer_name: string | null;
  amount: number;
  collection_mode: string;
  upi_reference_id: string | null;
  status: 'pending_verification' | 'verified' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    flat_number: string;
  } | null;
}

export default function ChandaMyEntriesScreen() {
  const { campaignId } = useLocalSearchParams<{ campaignId: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();

  const [entries, setEntries] = useState<OfflineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEntries = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('chanda_offline_contributions')
        .select('*, profiles!resident_id(full_name, flat_number)')
        .eq('campaign_id', campaignId)
        .eq('entered_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [campaignId, user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEntries();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return '#10B981';
      case 'pending_verification':
        return '#F59E0B';
      case 'rejected':
        return '#EF4444';
      default:
        return theme.colors.outline;
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === 'pending_verification') return 'PENDING VERIFICATION';
    return status.toUpperCase();
  };

  const totalVerified = entries
    .filter((e) => e.status === 'verified')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const totalPending = entries
    .filter((e) => e.status === 'pending_verification')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['bottom']}>
        <Appbar.Header style={{ backgroundColor: theme.colors.elevation.level1 }} elevated>
          <Appbar.BackAction onPress={() => router.back()} color={theme.colors.onSurface} />
          <Appbar.Content title="My Collections" titleStyle={{ fontWeight: 'bold' }} />
        </Appbar.Header>

        {/* Soft brand glow backdrop */}
        <View 
          style={{
            position: 'absolute',
            top: 50,
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

        <View style={[styles.statsRow, { 
          backgroundColor: theme.colors.elevation.level1,
          borderBottomWidth: 1,
          borderBottomColor: theme.dark ? 'rgba(255, 255, 255, 0.05)' : '#E2E8F0',
          marginHorizontal: 16,
          marginTop: 16,
          borderRadius: 20,
          borderWidth: theme.dark ? 1 : 0,
          borderColor: 'rgba(255, 255, 255, 0.08)',
        }]}>
          <View style={styles.statBox}>
            <Text variant="bodySmall" style={{ color: theme.colors.outline, fontWeight: 'bold', letterSpacing: 0.5 }}>VERIFIED</Text>
            <Text variant="titleLarge" style={[styles.statVal, { color: '#00D4AA', fontWeight: 'bold' }]}>{formatINR(totalVerified)}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.dark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0' }]} />
          <View style={styles.statBox}>
            <Text variant="bodySmall" style={{ color: theme.colors.outline, fontWeight: 'bold', letterSpacing: 0.5 }}>PENDING</Text>
            <Text variant="titleLarge" style={[styles.statVal, { color: '#F59E0B', fontWeight: 'bold' }]}>{formatINR(totalPending)}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#00D4AA" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#00D4AA"]} />
            }
          >
            {entries.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text variant="bodyLarge" style={{ color: theme.colors.outline, textAlign: 'center' }}>
                  You have not logged any offline collections for this campaign yet.
                </Text>
              </View>
            ) : (
              entries.map((item) => (
                <Card 
                  key={item.id} 
                  style={[styles.card, { 
                    backgroundColor: theme.colors.elevation.level1,
                    borderRadius: 20, 
                    borderWidth: theme.dark ? 1 : 0, 
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                  }]}
                >
                  <Card.Content style={styles.cardContent}>
                    <View style={styles.headerRow}>
                      <View style={{ flex: 1 }}>
                        <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                          {item.profiles?.full_name || item.payer_name}
                        </Text>
                        {item.profiles?.flat_number && (
                          <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 2 }}>
                            Flat: {item.profiles.flat_number}
                          </Text>
                        )}
                      </View>
                      <Text variant="titleMedium" style={[styles.amount, { color: '#00D4AA', fontWeight: 'bold' }]}>
                        {formatINR(item.amount)}
                      </Text>
                    </View>

                    {item.upi_reference_id && (
                      <Text variant="bodySmall" style={[styles.refText, { color: theme.colors.outline, marginTop: 4 }]}>
                        UPI Ref: {item.upi_reference_id}
                      </Text>
                    )}

                    {item.status === 'rejected' && item.rejection_reason && (
                      <View style={[styles.reasonBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.25)', borderWidth: 1, borderRadius: 12, padding: 8, marginTop: 8 }]}>
                        <Text style={{ color: '#EF4444', fontSize: 12 }}>
                          Rejection Reason: {item.rejection_reason}
                        </Text>
                      </View>
                    )}

                    <View style={styles.footerRow}>
                      <Badge 
                        style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '15', color: getStatusColor(item.status), borderColor: getStatusColor(item.status) + '30' }]}
                      >
                        {getStatusLabel(item.status)}
                      </Badge>
                      <Badge style={styles.modeBadge}>
                        {item.collection_mode.toUpperCase()}
                      </Badge>
                    </View>
                  </Card.Content>
                </Card>
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statVal: {
    fontWeight: 'bold',
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: '60%',
    alignSelf: 'center',
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
  refText: {
    marginTop: 6,
    fontFamily: 'monospace',
    fontSize: 12,
  },
  reasonBox: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    marginTop: 10,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  badge: {
    borderWidth: 1,
    borderRadius: 6,
    fontWeight: 'bold',
  },
  modeBadge: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#ccc',
    borderRadius: 6,
  },
});
