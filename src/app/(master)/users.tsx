import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, Alert } from 'react-native';
import { Text, Card, Searchbar, useTheme, Avatar, Divider, Button, Menu, Portal, Dialog, RadioButton } from 'react-native-paper';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { UserRole } from '../../lib/data-manager';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  society_id?: string;
  wing?: string;
  flat_number?: string;
  created_at: string;
  societies?: {
    name: string;
  };
}

export default function MasterUsersScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);

  // Dialog state
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('resident');
  const [updating, setUpdating] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Fetch profiles with a join to societies
      const { data, error } = await supabase
        .from('profiles')
        .select('*, societies(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const openRoleDialog = (user: Profile) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setDialogVisible(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;
    if (selectedUser.role === selectedRole) {
      setDialogVisible(false);
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase.rpc('toggle_user_role', {
        target_user_id: selectedUser.id,
        new_role: selectedRole
      });

      if (error) throw error;
      
      Alert.alert('Success', `Role of ${selectedUser.full_name || selectedUser.email} has been updated to ${selectedRole}.`);
      setDialogVisible(false);
      fetchUsers();
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e.message || 'Failed to update user role.');
    } finally {
      setUpdating(false);
    }
  };

  const filtered = users.filter(u => 
    (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.societies?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>User Management</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
          System-wide member profile control
        </Text>
      </View>

      <Searchbar
        placeholder="Search name, email, or society..."
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
                  <Avatar.Icon 
                    size={36} 
                    icon={item.role === 'master_admin' ? 'crown' : (item.role === 'admin' ? 'account-tie' : 'account')} 
                    style={{ backgroundColor: '#1A1A1A' }} 
                    color="#FF3B30" 
                  />
                  <View style={{ flex: 1 }}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{item.full_name || 'No Name'}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.outline }}>{item.email}</Text>
                  </View>
                </View>
                <View style={[
                  styles.roleBadge,
                  { backgroundColor: item.role === 'master_admin' ? '#351515' : (item.role === 'admin' ? '#122C24' : '#1A1A1A') }
                ]}>
                  <Text style={[
                    styles.roleText,
                    { color: item.role === 'master_admin' ? '#FF3B30' : (item.role === 'admin' ? '#00D4AA' : '#888888') }
                  ]}>
                    {item.role}
                  </Text>
                </View>
              </View>

              <Divider style={styles.divider} />

              <View style={styles.detailsRow}>
                <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>
                  Society: <Text style={{ color: '#FFFFFF', fontWeight: '500' }}>
                    {item.role === 'master_admin' ? 'Global System' : (item.societies?.name || 'Unlinked / None')}
                  </Text>
                </Text>
                {item.wing && item.flat_number && (
                  <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>
                    Address: <Text style={{ color: '#FFFFFF', fontWeight: '500' }}>{item.wing}-{item.flat_number}</Text>
                  </Text>
                )}
              </View>

              <View style={styles.actions}>
                <Button
                  mode="contained-tonal"
                  onPress={() => openRoleDialog(item)}
                  style={styles.button}
                  labelStyle={{ fontSize: 12 }}
                >
                  Adjust Role
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>
              {loading ? 'Retrieving profiles...' : 'No users found.'}
            </Text>
          </View>
        }
      />

      {/* ROLE ADJUSTMENT DIALOG */}
      <Portal>
        <Dialog 
          visible={dialogVisible} 
          onDismiss={() => setDialogVisible(false)}
          style={{ backgroundColor: theme.colors.elevation.level3 }}
        >
          <Dialog.Title style={{ fontWeight: 'bold' }}>Change User Role</Dialog.Title>
          <Dialog.Content>
            {selectedUser && (
              <View style={{ marginBottom: 16 }}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{selectedUser.full_name}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>{selectedUser.email}</Text>
              </View>
            )}

            <RadioButton.Group onValueChange={(val) => setSelectedRole(val as UserRole)} value={selectedRole}>
              <View style={styles.radioOption}>
                <RadioButton value="resident" color="#FF3B30" />
                <Text variant="bodyLarge">Resident</Text>
              </View>
              <View style={styles.radioOption}>
                <RadioButton value="admin" color="#FF3B30" />
                <Text variant="bodyLarge">Society Admin</Text>
              </View>
              <View style={styles.radioOption}>
                <RadioButton value="master_admin" color="#FF3B30" />
                <Text variant="bodyLarge">Master Admin</Text>
              </View>
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)} textColor={theme.colors.outline}>Cancel</Button>
            <Button 
              onPress={handleUpdateRole} 
              loading={updating}
              disabled={updating}
              textColor="#FF3B30"
              labelStyle={{ fontWeight: 'bold' }}
            >
              Update
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  roleText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    marginVertical: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
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
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
});
