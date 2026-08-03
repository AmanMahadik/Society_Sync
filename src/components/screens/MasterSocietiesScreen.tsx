import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, TextInput as RNTextInput, Linking, Alert } from 'react-native';
import { Text, Card, Button, useTheme, ActivityIndicator, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

export const MasterSocietiesScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const [societies, setSocieties] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchSocieties = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('societies')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSocieties(data || []);
    } catch (e) {
      console.warn('Failed to fetch societies:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSocieties();
  }, []);

  const toggleStatus = async (item: any) => {
    const nextStatus = item.status === 'active' ? 'suspended' : 'active';
    setActionId(item.id);
    try {
      const { error } = await supabase
        .from('societies')
        .update({ status: nextStatus })
        .eq('id', item.id);
      if (error) throw error;
      
      // Update local state instantly
      setSocieties(prev => prev.map(s => s.id === item.id ? { ...s, status: nextStatus } : s));
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update status.');
    } finally {
      setActionId(null);
    }
  };

  const handleEmailAdmin = async (societyId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('society_id', societyId)
        .eq('role', 'admin')
        .limit(1);
        
      if (error) throw error;
      
      if (data && data[0]?.email) {
        Linking.openURL(`mailto:${data[0].email}?subject=SocietySync%20System%20Audit`);
      } else {
        Alert.alert('No Admin', 'No society administrator email record could be located.');
      }
    } catch (e: any) {
      Alert.alert('Error', 'Unable to initiate email client.');
    }
  };

  const deleteSociety = async (item: any) => {
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to permanently delete '${item.name}'? All flats, ledgers, and resident accounts will be severed from the registry.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionId(item.id);
            try {
              const { error } = await supabase
                .from('societies')
                .delete()
                .eq('id', item.id);
              if (error) throw error;
              
              setSocieties(prev => prev.filter(s => s.id !== item.id));
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to delete society.');
            } finally {
              setActionId(null);
            }
          }
        }
      ]
    );
  };

  const filtered = societies.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.society_code.toLowerCase().includes(search.toLowerCase()) ||
    s.city.toLowerCase().includes(search.toLowerCase()) ||
    s.state.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>Societies Directory</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.outline }}>Manage and audit all registered housing societies</Text>
      </View>

      <View style={styles.searchContainer}>
        <RNTextInput
          placeholder="Search by name, code, city..."
          placeholderTextColor={theme.colors.outline}
          value={search}
          onChangeText={setSearch}
          style={[styles.searchInput, { 
            backgroundColor: theme.colors.elevation.level1, 
            color: theme.colors.onSurface,
            borderColor: theme.dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
          }]}
        />
        {loading && societies.length === 0 && (
          <ActivityIndicator size="small" color="#EF4444" style={styles.loader} />
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        onRefresh={fetchSocieties}
        refreshing={loading}
        ListEmptyComponent={
          !loading ? (
            <Text style={{ textAlign: 'center', marginVertical: 32, color: theme.colors.outline, fontSize: 13 }}>
              No registered societies found.
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Card style={[styles.card, { backgroundColor: theme.colors.elevation.level1 }]}>
            <Card.Content style={styles.cardContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 16, color: theme.colors.onSurface }}>{item.name}</Text>
                  <Text style={{ fontSize: 11, color: theme.colors.outline, marginTop: 4 }}>
                    Code: <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>{item.society_code}</Text>
                  </Text>
                </View>
                
                {/* HIGH-CONTRAST VISIBLE STATUS BADGE */}
                <View 
                  style={{ 
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                    backgroundColor: item.status === 'active' ? 'rgba(56, 142, 60, 0.18)' : 'rgba(211, 47, 47, 0.18)',
                    borderWidth: 0.5,
                    borderColor: item.status === 'active' ? '#388E3C' : '#D32F2F',
                  }}
                >
                  <Text 
                    style={{ 
                      color: item.status === 'active' ? '#4CAF50' : '#FF5252', 
                      fontSize: 9, 
                      fontWeight: 'bold',
                      textTransform: 'uppercase'
                    }}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>

              <Text style={{ fontSize: 12, color: theme.colors.outline, marginBottom: 14 }}>
                Location: {item.city}, {item.state}
              </Text>

              {/* ACTION BUTTONS */}
              <View style={{ flexDirection: 'row', gap: 6, borderTopWidth: 0.5, borderTopColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', paddingTop: 10 }}>
                <Button
                  mode="outlined"
                  textColor={item.status === 'active' ? theme.colors.onSurface : '#4CAF50'}
                  style={{ flex: 1.2, borderRadius: 8, height: 32, justifyContent: 'center', borderColor: item.status === 'active' ? 'rgba(255,255,255,0.12)' : '#388E3C' }}
                  labelStyle={{ fontSize: 9.5, fontWeight: 'bold' }}
                  onPress={() => toggleStatus(item)}
                  disabled={actionId === item.id}
                  compact
                >
                  {item.status === 'active' ? 'Suspend' : 'Activate'}
                </Button>
                
                <Button
                  mode="outlined"
                  textColor={theme.colors.onSurface}
                  style={{ flex: 1.2, borderRadius: 8, height: 32, justifyContent: 'center', borderColor: 'rgba(255,255,255,0.12)' }}
                  labelStyle={{ fontSize: 9.5, fontWeight: 'bold' }}
                  onPress={() => handleEmailAdmin(item.id)}
                  compact
                  icon="email-outline"
                >
                  Email
                </Button>

                <Button
                  mode="outlined"
                  textColor="#FF5252"
                  style={{ flex: 0.8, borderRadius: 8, height: 32, justifyContent: 'center', borderColor: 'rgba(211,47,47,0.25)' }}
                  labelStyle={{ fontSize: 9.5, fontWeight: 'bold' }}
                  onPress={() => deleteSociety(item)}
                  disabled={actionId === item.id}
                  compact
                  icon="trash-can-outline"
                >
                  Delete
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  loader: {
    position: 'absolute',
    right: 26,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 16,
    marginBottom: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  cardContent: {
    padding: 14,
  },
});
