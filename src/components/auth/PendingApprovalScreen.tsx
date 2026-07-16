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
      {/* Soft brand glow backdrop */}
      <View 
        style={{
          position: 'absolute',
          top: -100,
          left: '50%',
          transform: [{ translateX: -150 }],
          width: 300,
          height: 300,
          borderRadius: 150,
          backgroundColor: '#00D4AA',
          opacity: theme.dark ? 0.08 : 0.05,
        }}
      />

      <Card style={[styles.card, { 
        borderRadius: 24, 
        borderWidth: theme.dark ? 1 : 0, 
        borderColor: 'rgba(255, 255, 255, 0.08)',
        backgroundColor: theme.colors.elevation.level1
      }]}>
        <Card.Content style={styles.cardContent}>
          <View style={[styles.iconContainer, { backgroundColor: theme.dark ? 'rgba(0, 212, 170, 0.1)' : '#E6F4F1' }]}>
            <ActivityIndicator size="large" color="#00D4AA" />
          </View>
          
          <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>Approval Pending</Text>
          
          <Text variant="bodyMedium" style={[styles.description, { color: theme.colors.outline }]}>
            Your registration request has been submitted successfully.
          </Text>

          <Card style={[styles.detailsCard, { backgroundColor: theme.dark ? 'rgba(255, 255, 255, 0.03)' : '#F1F5F9', borderRadius: 16 }]}>
            <Card.Content style={styles.detailsContent}>
              <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>Resident: <Text style={[styles.value, { fontWeight: 'bold' }]}>{profile?.full_name}</Text></Text>
              <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>Flat Address: <Text style={[styles.value, { fontWeight: 'bold' }]}>Wing {profile?.wing || '?'}, Flat {profile?.flat_number || '?'}</Text></Text>
              <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>Requested Role: <Text style={[styles.value, { textTransform: 'capitalize', fontWeight: 'bold' }]}>{profile?.role}</Text></Text>
            </Card.Content>
          </Card>

          <Text variant="bodySmall" style={[styles.instruction, { color: theme.colors.outline }]}>
            For security and financial integrity, your society's Secretary/Chairman must verify your details before granting access.
          </Text>

          <Button
            mode="contained"
            onPress={handleCheckStatus}
            loading={checking}
            disabled={checking}
            style={[styles.button, { borderRadius: 28 }]}
            buttonColor="#00D4AA"
            textColor="#09090b"
            labelStyle={{ fontWeight: 'bold' }}
            icon="refresh"
          >
            Check Approval Status
          </Button>

          <Button
            mode="outlined"
            onPress={signOut}
            style={[styles.signOutButton, { borderRadius: 28, borderColor: theme.colors.outline }]}
            textColor={theme.dark ? '#FFFFFF' : theme.colors.onSurface}
            labelStyle={{ fontWeight: 'bold' }}
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
