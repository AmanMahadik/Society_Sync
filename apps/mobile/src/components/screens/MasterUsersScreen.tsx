import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, TextInput as RNTextInput, Alert, TouchableOpacity } from 'react-native';
import { Text, Card, useTheme, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

export const MasterUsersScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, societies(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (e) {
      console.warn('Failed to fetch users:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const cycleRole = async (item: any) => {
    const roles = ['admin', 'guard', 'owner', 'renter'];
    const currentIndex = roles.indexOf(item.role);
    const nextIndex = (currentIndex + 1) % roles.length;
    const nextRole = roles[nextIndex];
    
    setActionId(item.id);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: nextRole })
        .eq('id', item.id);
      if (error) throw error;
      
      setUsers(prev => prev.map(u => u.id === item.id ? { ...u, role: nextRole } : u));
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update user role.');
    } finally {
      setActionId(null);
    }
  };

  const deleteUser = async (item: any) => {
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to permanently delete user account '${item.full_name || item.email}'? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionId(item.id);
            try {
              const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', item.id);
              if (error) throw error;
              
              setUsers(prev => prev.filter(u => u.id !== item.id));
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to delete user account.');
            } finally {
              setActionId(null);
            }
          }
        }
      ]
    );
  };

  const filtered = users.filter(u => 
    (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.societies?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.role || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>App Users Directory</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.outline }}>Audit global user ledgers and Aadhaar compliance status</Text>
      </View>

      <View style={styles.searchContainer}>
        <RNTextInput
          placeholder="Search users by name, email, society..."
          placeholderTextColor={theme.colors.outline}
          value={search}
          onChangeText={setSearch}
          style={[styles.searchInput, { 
            backgroundColor: theme.colors.elevation.level1, 
            color: theme.colors.onSurface,
            borderColor: theme.dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
          }]}
        />
        {loading && users.length === 0 && (
          <ActivityIndicator size="small" color="#EF4444" style={styles.loader} />
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        onRefresh={fetchUsers}
        refreshing={loading}
        ListEmptyComponent={
          !loading ? (
            <Text style={{ textAlign: 'center', marginVertical: 32, color: theme.colors.outline, fontSize: 13 }}>
              No app users found matching query.
            </Text>
          ) : null
        }
        renderItem={({ item }) => {
          let isVerified = false;
          if (item.bio) {
            try {
              const parsed = JSON.parse(item.bio);
              isVerified = !!(parsed && parsed.aadhaarNo);
            } catch {}
          }

          return (
            <Card style={[styles.card, { backgroundColor: theme.colors.elevation.level1 }]}>
              <Card.Content style={styles.cardContent}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 15, color: theme.colors.onSurface }}>
                    {item.full_name || 'N/A'}
                  </Text>
                  
                  {/* HIGH-CONTRAST VISIBLE VERIFICATION BADGE */}
                  <View 
                    style={{ 
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                      backgroundColor: isVerified ? 'rgba(56, 142, 60, 0.18)' : 'rgba(211, 47, 47, 0.18)',
                      borderWidth: 0.5,
                      borderColor: isVerified ? '#388E3C' : '#D32F2F',
                    }}
                  >
                    <Text 
                      style={{ 
                        color: isVerified ? '#4CAF50' : '#FF5252', 
                        fontSize: 9, 
                        fontWeight: 'bold' 
                      }}
                    >
                      {isVerified ? '✓ Verified' : '✗ Unverified'}
                    </Text>
                  </View>
                </View>
                
                <Text style={{ fontSize: 11, color: theme.colors.outline }}>
                  Email: <Text style={{ color: theme.colors.onSurfaceVariant }}>{item.email}</Text>
                </Text>
                <Text style={{ fontSize: 11, color: theme.colors.outline, marginTop: 2 }}>
                  Role: <Text style={{ color: '#EF4444', textTransform: 'uppercase', fontSize: 10, fontWeight: 'bold' }}>{item.role}</Text>
                  {item.wing && item.flat_number ? ` • Unit: ${item.wing}-${item.flat_number}` : ''}
                </Text>
                <Text style={{ fontSize: 11, color: theme.colors.outline, marginTop: 2, marginBottom: 14 }}>
                  Society: <Text style={{ color: theme.colors.onSurfaceVariant }}>{item.societies?.name || 'Unlinked / No Society'}</Text>
                </Text>

                {/* USER STYLED CUSTOM TOUCHABLE ACTION BUTTONS */}
                <View style={{ flexDirection: 'row', gap: 6, borderTopWidth: 0.5, borderTopColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', paddingTop: 10 }}>
                  <TouchableOpacity
                    onPress={() => cycleRole(item)}
                    disabled={actionId === item.id}
                    style={[styles.actionBtn, { borderColor: 'rgba(255,255,255,0.12)' }]}
                  >
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.colors.onSurface }}>
                      🔄 Cycle Role
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => deleteUser(item)}
                    disabled={actionId === item.id}
                    style={[styles.actionBtn, { borderColor: 'rgba(211,47,47,0.25)' }]}
                  >
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#FF5252' }}>
                      🗑 Delete Account
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card.Content>
            </Card>
          );
        }}
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
  actionBtn: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
});
