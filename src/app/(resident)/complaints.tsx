import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, Alert } from 'react-native';
import { Text, Card, Button, TextInput, useTheme, Avatar, Divider, Portal, Dialog } from 'react-native-paper';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';

interface Complaint {
  id: number;
  title: string;
  description?: string;
  status: 'pending' | 'acknowledged' | 'resolved';
  created_at: string;
}

export default function ResidentComplaintsScreen() {
  const theme = useTheme();
  const { user, profile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  // Dialog form state
  const [dialogVisible, setDialogVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchComplaints = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('complaints')
        .select('id, title, description, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComplaints(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchComplaints();
    setRefreshing(false);
  };

  const handleLodgeComplaint = async () => {
    if (!title.trim() || !user?.id || !profile?.society_id) {
      Alert.alert('Incomplete Form', 'Please enter a title for your complaint.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('complaints')
        .insert({
          society_id: profile.society_id,
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          status: 'pending'
        });

      if (error) throw error;

      Alert.alert('Success', 'Your complaint has been submitted.');
      setTitle('');
      setDescription('');
      setDialogVisible(false);
      fetchComplaints();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to submit complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <View>
          <Text variant="headlineMedium" style={styles.title}>My Complaints</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
            Lodge and track ticket resolutions
          </Text>
        </View>
        <Button
          mode="contained"
          onPress={() => setDialogVisible(true)}
          style={styles.addButton}
          icon="plus-circle"
        >
          Lodge
        </Button>
      </View>

      <FlatList
        data={complaints}
        keyExtractor={(item) => item.id.toString()}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Avatar.Icon 
                    size={32} 
                    icon="file-document-edit" 
                    style={{ backgroundColor: '#1A1A1A' }} 
                    color={theme.colors.primary} 
                  />
                  <View>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{item.title}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                      Filed on: {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View style={[
                  styles.statusBadge,
                  { 
                    backgroundColor: item.status === 'resolved' ? '#122C24' : 
                                     (item.status === 'acknowledged' ? '#1A2E35' : '#302A00') 
                  }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { 
                      color: item.status === 'resolved' ? '#00D4AA' : 
                             (item.status === 'acknowledged' ? '#4DABF7' : '#FFD700') 
                    }
                  ]}>
                    {item.status}
                  </Text>
                </View>
              </View>

              <Divider style={styles.divider} />

              <Text variant="bodyMedium" style={styles.bodyText}>
                {item.description || 'No description provided.'}
              </Text>
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>
              {loading ? 'Retrieving tickets...' : 'No complaints filed yet.'}
            </Text>
          </View>
        }
      />

      {/* LODGE DIALOG */}
      <Portal>
        <Dialog
          visible={dialogVisible}
          onDismiss={() => setDialogVisible(false)}
          style={{ backgroundColor: theme.colors.elevation.level3 }}
        >
          <Dialog.Title style={{ fontWeight: 'bold' }}>Lodge a Complaint</Dialog.Title>
          <Dialog.Content style={{ gap: 12 }}>
            <TextInput
              label="Title / Category"
              placeholder="e.g. Elevator Malfunction, Water Leakage"
              value={title}
              onChangeText={setTitle}
              mode="outlined"
            />
            <TextInput
              label="Detailed Description"
              placeholder="Describe the issue with location..."
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              multiline
              numberOfLines={4}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)} textColor={theme.colors.outline}>Cancel</Button>
            <Button
              onPress={handleLodgeComplaint}
              loading={submitting}
              disabled={submitting || !title.trim()}
              textColor={theme.colors.primary}
              labelStyle={{ fontWeight: 'bold' }}
            >
              Submit Ticket
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
  },
  addButton: {
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
