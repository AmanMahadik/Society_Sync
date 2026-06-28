import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, Alert } from 'react-native';
import { Text, Card, Button, TextInput, useTheme, Avatar, Divider, Portal, Dialog, IconButton } from 'react-native-paper';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';

interface Announcement {
  id: number;
  title: string;
  body: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

export default function AdminAnnouncementsScreen() {
  const theme = useTheme();
  const { user, profile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Modal form state
  const [dialogVisible, setDialogVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncements = async () => {
    if (!profile?.society_id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select('*, profiles(full_name)')
        .eq('society_id', profile.society_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [profile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnnouncements();
    setRefreshing(false);
  };

  const handlePostAnnouncement = async () => {
    if (!title.trim() || !body.trim() || !user || !profile?.society_id) {
      Alert.alert('Incomplete Form', 'Please fill in both title and announcement body.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('announcements')
        .insert({
          society_id: profile.society_id,
          title: title.trim(),
          body: body.trim(),
          created_by: user.id
        });

      if (error) throw error;
      
      Alert.alert('Success', 'Announcement posted successfully.');
      setTitle('');
      setBody('');
      setDialogVisible(false);
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to post announcement.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = (id: number) => {
    Alert.alert(
      'Delete Announcement',
      'Are you sure you want to delete this announcement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('announcements')
                .delete()
                .eq('id', id);

              if (error) throw error;
              Alert.alert('Deleted', 'Announcement has been deleted.');
              fetchAnnouncements();
            } catch (err) {
              console.error(err);
              Alert.alert('Error', 'Failed to delete announcement.');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <View>
          <Text variant="headlineMedium" style={styles.title}>Announcements</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
            Broadcast directives to society residents
          </Text>
        </View>
        <Button
          mode="contained"
          onPress={() => setDialogVisible(true)}
          style={styles.addButton}
          icon="plus"
        >
          New
        </Button>
      </View>

      <FlatList
        data={announcements}
        keyExtractor={(item) => item.id.toString()}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Avatar.Icon size={32} icon="bullhorn" style={{ backgroundColor: '#1A1A1A' }} color={theme.colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{item.title}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                      Posted by: {item.profiles?.full_name || 'Admin'} • {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <IconButton
                  icon="trash-can-outline"
                  iconColor={theme.colors.error}
                  size={20}
                  onPress={() => handleDeleteAnnouncement(item.id)}
                />
              </View>

              <Divider style={styles.divider} />

              <Text variant="bodyMedium" style={styles.bodyText}>
                {item.body}
              </Text>
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>
              {loading ? 'Retrieving bulletins...' : 'No announcements posted yet.'}
            </Text>
          </View>
        }
      />

      {/* CREATE DIALOG */}
      <Portal>
        <Dialog
          visible={dialogVisible}
          onDismiss={() => setDialogVisible(false)}
          style={{ backgroundColor: theme.colors.elevation.level3 }}
        >
          <Dialog.Title style={{ fontWeight: 'bold' }}>New Announcement</Dialog.Title>
          <Dialog.Content style={{ gap: 12 }}>
            <TextInput
              label="Title"
              placeholder="e.g. Water Cut Notice"
              value={title}
              onChangeText={setTitle}
              mode="outlined"
            />
            <TextInput
              label="Announcement Body"
              placeholder="Provide complete details..."
              value={body}
              onChangeText={setBody}
              mode="outlined"
              multiline
              numberOfLines={4}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)} textColor={theme.colors.outline}>Cancel</Button>
            <Button
              onPress={handlePostAnnouncement}
              loading={submitting}
              disabled={submitting || !title.trim() || !body.trim()}
              textColor={theme.colors.primary}
              labelStyle={{ fontWeight: 'bold' }}
            >
              Post Broadcast
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
    flex: 1,
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
