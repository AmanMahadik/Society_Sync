import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, Alert } from 'react-native';
import { Text, Card, Button, useTheme, Avatar, Divider } from 'react-native-paper';
import { supabase } from '../../lib/supabase';

interface SOSAlert {
  id: number;
  wing: string;
  flat_number: string;
  description?: string;
  status: 'active' | 'resolved';
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
  societies?: {
    name: string;
  };
}

export default function MasterSOSScreen() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<SOSAlert[]>([]);

  const fetchSOSAlerts = async () => {
    try {
      setLoading(true);
      // Fetch system-wide SOS alerts with user profile and society names
      const { data, error } = await supabase
        .from('sos_alerts')
        .select('*, profiles(full_name, email), societies(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSOSAlerts();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSOSAlerts();
    setRefreshing(false);
  };

  const handleResolveAlert = async (alertId: number) => {
    Alert.alert(
      'Resolve Alert',
      'Are you sure you want to mark this SOS alert as resolved?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resolve',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('sos_alerts')
                .update({ status: 'resolved' })
                .eq('id', alertId);

              if (error) throw error;
              Alert.alert('Success', 'SOS alert has been resolved.');
              fetchSOSAlerts();
            } catch (err) {
              console.error(err);
              Alert.alert('Error', 'Failed to resolve SOS alert.');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={[styles.title, { color: '#FF3B30' }]}>Global SOS Monitor</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
          System-wide active emergency channels
        </Text>
      </View>

      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id.toString()}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={[
            styles.card,
            item.status === 'active' && { borderColor: '#FF3B30', borderWidth: 1 }
          ]}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Avatar.Icon 
                    size={36} 
                    icon="alarm-light" 
                    style={{ backgroundColor: item.status === 'active' ? '#351515' : '#1A1A1A' }} 
                    color={item.status === 'active' ? '#FF3B30' : '#888888'} 
                  />
                  <View>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                      {item.profiles?.full_name || 'Anonymous Resident'}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                      Society: {item.societies?.name || 'Global'} • Flat: {item.wing}-{item.flat_number}
                    </Text>
                  </View>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: item.status === 'active' ? '#351515' : '#122C24' }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: item.status === 'active' ? '#FF3B30' : '#00D4AA' }
                  ]}>
                    {item.status}
                  </Text>
                </View>
              </View>

              <Divider style={styles.divider} />

              <Text variant="bodyMedium" style={styles.description}>
                Alert Description: <Text style={{ color: '#FFFFFF' }}>{item.description || 'No comment provided.'}</Text>
              </Text>

              <Text variant="bodySmall" style={[styles.time, { color: theme.colors.outline }]}>
                Triggered at: {new Date(item.created_at).toLocaleString()}
              </Text>

              {item.status === 'active' && (
                <View style={styles.actions}>
                  <Button
                    mode="contained"
                    onPress={() => handleResolveAlert(item.id)}
                    buttonColor="#FF3B30"
                    textColor="#FFFFFF"
                    style={styles.button}
                  >
                    Mark Resolved
                  </Button>
                </View>
              )}
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>
              {loading ? 'Retrieving SOS logs...' : 'No emergency alarms recorded.'}
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
    elevation: 3,
  },
  cardContent: {
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    marginVertical: 12,
  },
  description: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 8,
  },
  time: {
    fontSize: 11,
  },
  actions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    borderRadius: 6,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
});
