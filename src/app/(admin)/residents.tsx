import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, Alert } from 'react-native';
import { Text, Card, Searchbar, useTheme, Avatar, Divider, Button } from 'react-native-paper';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';

interface Resident {
  id: string;
  email: string;
  full_name: string;
  wing: string;
  flat_number: string;
  created_at: string;
}

export default function AdminResidentsScreen() {
  const theme = useTheme();
  const { profile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [residents, setResidents] = useState<Resident[]>([]);

  const fetchResidents = async () => {
    if (!profile?.society_id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, wing, flat_number, created_at')
        .eq('society_id', profile.society_id)
        .eq('role', 'resident')
        .order('wing', { ascending: true })
        .order('flat_number', { ascending: true });

      if (error) throw error;
      setResidents(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResidents();
  }, [profile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchResidents();
    setRefreshing(false);
  };

  const handleRemoveResident = (resident: Resident) => {
    Alert.alert(
      'Remove Resident',
      `Are you sure you want to remove ${resident.full_name || resident.email} from the society?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Unlink resident by setting their society_id to null
              const { error } = await supabase
                .from('profiles')
                .update({ society_id: null })
                .eq('id', resident.id);

              if (error) throw error;
              Alert.alert('Removed', 'Resident has been removed from this society.');
              fetchResidents();
            } catch (err) {
              console.error(err);
              Alert.alert('Error', 'Failed to remove resident.');
            }
          }
        }
      ]
    );
  };

  const filtered = residents.filter(r => 
    (r.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${r.wing}-${r.flat_number}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>Resident Directory</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
          Manage list of registered complex residents
        </Text>
      </View>

      <Searchbar
        placeholder="Search resident name or flat..."
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
                  <Avatar.Icon size={36} icon="account" style={{ backgroundColor: '#1A1A1A' }} color={theme.colors.primary} />
                  <View>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{item.full_name || 'No Name'}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.outline }}>{item.email}</Text>
                  </View>
                </View>
                <View style={[styles.flatBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                  <Text style={[styles.flatText, { color: theme.colors.primary }]}>
                    {item.wing}-{item.flat_number}
                  </Text>
                </View>
              </View>

              <Divider style={styles.divider} />

              <View style={styles.actions}>
                <Text variant="bodySmall" style={{ color: theme.colors.outline, alignSelf: 'center' }}>
                  Registered: {new Date(item.created_at).toLocaleDateString()}
                </Text>
                <Button
                  mode="text"
                  onPress={() => handleRemoveResident(item)}
                  textColor={theme.colors.error}
                  labelStyle={{ fontWeight: 'bold' }}
                >
                  Unlink
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>
              {loading ? 'Retrieving resident profiles...' : 'No residents found.'}
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
  flatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  flatText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
});
