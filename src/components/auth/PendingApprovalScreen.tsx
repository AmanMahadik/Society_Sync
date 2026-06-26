import React, { useState } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { Text, Button, Card, useTheme } from 'react-native-paper';
import { useAuth } from '../../lib/auth-context';

export const PendingApprovalScreen: React.FC = () => {
  const { profile, refreshProfile, signOut } = useAuth();
  const theme = useTheme();
  const [checking, setChecking] = useState(false);

  const handleCheckStatus = async () => {
    setChecking(true);
    // Simulate a brief check network lag
    await new Promise(resolve => setTimeout(resolve, 800));
    await refreshProfile();
    setChecking(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <View style={[styles.iconContainer, { backgroundColor: theme.colors.errorContainer }]}>
            <ActivityIndicator size="large" color={theme.colors.error} />
          </View>
          
          <Text variant="headlineSmall" style={styles.title}>Approval Pending</Text>
          
          <Text variant="bodyMedium" style={[styles.description, { color: theme.colors.outline }]}>
            Your registration request has been submitted successfully.
          </Text>

          <Card style={[styles.detailsCard, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Card.Content style={styles.detailsContent}>
              <Text variant="titleSmall">Resident: <Text style={styles.value}>{profile?.full_name}</Text></Text>
              <Text variant="titleSmall">Flat Address: <Text style={styles.value}>Wing {profile?.wing || '?'}, Flat {profile?.flat_number || '?'}</Text></Text>
              <Text variant="titleSmall">Requested Role: <Text style={[styles.value, { textTransform: 'capitalize' }]}>{profile?.role}</Text></Text>
            </Card.Content>
          </Card>

          <Text variant="bodySmall" style={styles.instruction}>
            For security and financial integrity, your society's Secretary/Chairman must verify your details before granting access.
          </Text>

          <Button
            mode="contained"
            onPress={handleCheckStatus}
            loading={checking}
            disabled={checking}
            style={styles.button}
            icon="refresh"
          >
            Check Approval Status
          </Button>

          <Button
            mode="outlined"
            onPress={signOut}
            style={styles.signOutButton}
            icon="logout"
          >
            Log Out & Switch User
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 20,
    elevation: 3,
  },
  cardContent: {
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    textAlign: 'center',
    marginBottom: 20,
  },
  detailsCard: {
    width: '100%',
    borderRadius: 12,
    marginBottom: 16,
  },
  detailsContent: {
    gap: 6,
    padding: 12,
  },
  value: {
    fontWeight: 'normal',
  },
  instruction: {
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  button: {
    width: '100%',
    borderRadius: 8,
    paddingVertical: 4,
    marginBottom: 12,
  },
  signOutButton: {
    width: '100%',
    borderRadius: 8,
  },
  tipCard: {
    width: '100%',
    marginBottom: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
});
