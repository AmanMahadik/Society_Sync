import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { Appbar, Card, Text, Button, useTheme, ActivityIndicator, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { dataManager, Complaint } from '../../lib/data-manager';

export default function SOSDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchComplaintDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('complaints')
        .select('*, user:profiles!complaints_user_id_fkey(full_name)')
        .eq('id', id)
        .single();
      
      if (!error && data) {
        setComplaint({
          ...data,
          user_name: data.user?.full_name
        });
      }
    } catch (e) {
      console.error('Error fetching complaint details:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaintDetails();
  }, [id]);

  const handleAcknowledge = async () => {
    if (!complaint) return;
    try {
      setUpdating(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await dataManager.acknowledgeComplaint(String(complaint.id), user.id);
        await fetchComplaintDetails();
      }
    } catch (e) {
      console.error('Acknowledge error:', e);
    } finally {
      setUpdating(false);
    }
  };

  const handleResolve = async () => {
    if (!complaint) return;
    try {
      setUpdating(true);
      await dataManager.resolveComplaint(String(complaint.id));
      await fetchComplaintDetails();
    } catch (e) {
      console.error('Resolve error:', e);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return theme.colors.error;
      case 'acknowledged': return '#E28743'; // Orange
      case 'resolved': return '#388E3C'; // Green
      default: return theme.colors.outline;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      <Appbar.Header style={{ backgroundColor: theme.colors.elevation.level1 }} elevated>
        <Appbar.BackAction onPress={() => router.back()} color={theme.colors.onSurface} />
        <Appbar.Content title="Emergency Details" titleStyle={{ fontWeight: 'bold' }} />
      </Appbar.Header>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 12, color: theme.colors.outline }}>Loading alert details...</Text>
        </View>
      ) : !complaint ? (
        <View style={styles.loadingContainer}>
          <Text style={{ color: theme.colors.error }}>Emergency alert not found or access denied.</Text>
          <Button mode="contained" onPress={() => router.back()} style={{ marginTop: 16 }}>
            Go Back
          </Button>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card style={[styles.card, { backgroundColor: theme.colors.elevation.level1 }]}>
            <Card.Content>
              <View style={styles.headerRow}>
                <Text variant="titleLarge" style={[styles.alertTitle, { color: theme.colors.error }]}>
                  🚨 EMERGENCY SOS
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(complaint.status) }]}>
                  <Text style={styles.statusText}>{complaint.status.toUpperCase()}</Text>
                </View>
              </View>
              
              <Divider style={styles.divider} />
              
              <View style={styles.detailItem}>
                <Text variant="labelMedium" style={styles.label}>Location</Text>
                <Text variant="bodyLarge" style={styles.value}>
                  Wing {complaint.wing} — Flat {complaint.flat_number}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text variant="labelMedium" style={styles.label}>Raised By</Text>
                <Text variant="bodyLarge" style={styles.value}>
                  {complaint.user_name || 'Resident'}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text variant="labelMedium" style={styles.label}>Time Raised</Text>
                <Text variant="bodyLarge" style={styles.value}>
                  {new Date(complaint.created_at).toLocaleString()}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text variant="labelMedium" style={styles.label}>Description</Text>
                <Text variant="bodyMedium" style={[styles.value, styles.descriptionValue]}>
                  {complaint.description || 'Emergency services requested.'}
                </Text>
              </View>
            </Card.Content>
          </Card>

          {/* Action Triggers for Admin */}
          {complaint.status !== 'resolved' && (
            <Card style={[styles.actionsCard, { backgroundColor: theme.colors.elevation.level1 }]}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.actionsTitle}>Admin Actions</Text>
                <View style={styles.buttonRow}>
                  {complaint.status === 'pending' && (
                    <Button
                      mode="contained"
                      onPress={handleAcknowledge}
                      loading={updating}
                      disabled={updating}
                      buttonColor="#E28743"
                      textColor="#FFF"
                      style={styles.actionBtn}
                      icon="shield-check"
                    >
                      Acknowledge Help
                    </Button>
                  )}
                  <Button
                    mode="contained"
                    onPress={handleResolve}
                    loading={updating}
                    disabled={updating}
                    buttonColor="#388E3C"
                    textColor="#FFF"
                    style={styles.actionBtn}
                    icon="check-bold"
                  >
                    Mark Resolved
                  </Button>
                </View>
              </Card.Content>
            </Card>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderRadius: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 12,
  },
  detailItem: {
    marginBottom: 16,
  },
  label: {
    color: '#888888',
    marginBottom: 4,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontWeight: '500',
    fontSize: 15,
  },
  descriptionValue: {
    lineHeight: 22,
  },
  actionsCard: {
    borderRadius: 12,
  },
  actionsTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 8,
  },
});
