import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, Alert } from 'react-native';
import { Text, Card, Button, Searchbar, useTheme, Avatar, Divider } from 'react-native-paper';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';

interface Society {
  id: string;
  name: string;
  city: string;
  state: string;
  pincode: string;
  society_code: string;
  admin_email: string;
  total_units: number;
  status: 'active' | 'suspended';
}

export default function MasterSocietiesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [societies, setSocieties] = useState<Society[]>([]);

  const fetchSocieties = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('societies')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setSocieties(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSocieties();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSocieties();
    setRefreshing(false);
  };

  const handleToggleStatus = async (society: Society) => {
    const nextStatus = society.status === 'active' ? 'suspended' : 'active';
    
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to set status of "${society.name}" to "${nextStatus}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('societies')
                .update({ status: nextStatus })
                .eq('id', society.id);

              if (error) throw error;
              Alert.alert('Success', `Society has been ${nextStatus === 'active' ? 'activated' : 'suspended'}.`);
              fetchSocieties();
            } catch (err) {
              console.error(err);
              Alert.alert('Error', 'Failed to update society status.');
            }
          }
        }
      ]
    );
  };

  const filtered = societies.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.society_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>Societies Registry</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
          System-wide housing complex directories
        </Text>
      </View>

      <Searchbar
        placeholder="Search by name, code, or city..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.search}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Avatar.Icon size={36} icon="office-building" style={{ backgroundColor: '#1A1A1A' }} color="#FF3B30" />
                  <View>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{item.name}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                      {item.city}, {item.state} — {item.pincode}
                    </Text>
                  </View>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: item.status === 'active' ? '#122C24' : '#351515' }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: item.status === 'active' ? '#00D4AA' : '#FF3B30' }
                  ]}>
                    {item.status}
                  </Text>
                </View>
              </View>

              <Divider style={styles.divider} />

              <View style={styles.detailsGrid}>
                <View>
                  <Text variant="labelSmall" style={{ color: theme.colors.outline }}>SOCIETY CODE</Text>
                  <Text variant="bodyMedium" style={styles.codeText}>{item.society_code}</Text>
                </View>
                <View>
                  <Text variant="labelSmall" style={{ color: theme.colors.outline }}>ADMIN EMAIL</Text>
                  <Text variant="bodyMedium" style={{ fontWeight: '500' }}>{item.admin_email}</Text>
                </View>
                <View>
                  <Text variant="labelSmall" style={{ color: theme.colors.outline }}>TOTAL UNITS</Text>
                  <Text variant="bodyMedium" style={{ fontWeight: '500' }}>{item.total_units} Units</Text>
                </View>
              </View>

              <View style={styles.actions}>
                <Button
                  mode="outlined"
                  onPress={() => handleToggleStatus(item)}
                  textColor={item.status === 'active' ? '#FF3B30' : '#00D4AA'}
                  style={[styles.button, { borderColor: item.status === 'active' ? '#FF3B30' : '#00D4AA' }]}
                >
                  {item.status === 'active' ? 'Suspend Complex' : 'Activate Complex'}
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>
              {loading ? 'Fetching directories...' : 'No societies found.'}
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
  search: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
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
  detailsGrid: {
    gap: 8,
  },
  codeText: {
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: '#00D4AA',
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
