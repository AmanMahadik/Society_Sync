import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, TextInput, Button, Card, HelperText, useTheme, SegmentedButtons } from 'react-native-paper';
import { useAuth } from '../../lib/auth-context';
import { UserRole } from '../../lib/data-manager';

export const ProfileCompletionScreen: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const theme = useTheme();

  const [fullName, setFullName] = useState('');
  const [wing, setWing] = useState('');
  const [flatNumber, setFlatNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [societyName, setSocietyName] = useState('SocietySync Co-Op Housing');
  const [role, setRole] = useState<UserRole>('renter');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!fullName || !wing || !flatNumber || !phone || !societyName) {
      setError('Please fill in all details to complete your profile.');
      return;
    }

    if (phone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const { dataManager } = require('../../lib/data-manager');
      // Save details to public.profiles table
      await dataManager.updateProfileDetails(
        user.id,
        fullName,
        phone,
        flatNumber,
        wing.toUpperCase(),
        societyName
      );
      
      // Update role in profiles
      await dataManager.updateProfileRole(user.id, role);
      
      // Reload profile inside Auth context
      await refreshProfile();
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Error updating profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>Complete Profile</Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.outline }]}>
          One last step to register your flat in the society ledger
        </Text>
      </View>

      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          {error && (
            <HelperText type="error" visible={!!error} style={styles.errorText}>
              {error}
            </HelperText>
          )}

          <TextInput
            label="Full Name"
            placeholder="e.g. Amit Patel"
            value={fullName}
            onChangeText={setFullName}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="account" />}
          />

          <TextInput
            label="Phone Number"
            placeholder="10-digit mobile"
            value={phone}
            onChangeText={text => setPhone(text.replace(/[^0-9]/g, ''))}
            keyboardType="phone-pad"
            maxLength={10}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="phone" />}
          />

          <Text variant="labelLarge" style={styles.label}>Your Roster Rank</Text>
          <SegmentedButtons
            value={role}
            onValueChange={(val) => setRole(val as UserRole)}
            buttons={[
              { value: 'owner', label: 'Flat Owner', icon: 'home-key' },
              { value: 'renter', label: 'Renter / Tenant', icon: 'home-account' },
            ]}
            style={styles.segmentedButtons}
          />

          <View style={styles.row}>
            <TextInput
              label="Wing"
              placeholder="e.g. B"
              value={wing}
              onChangeText={setWing}
              mode="outlined"
              style={[styles.input, styles.halfInput]}
              autoCapitalize="characters"
            />
            <TextInput
              label="Flat Number"
              placeholder="e.g. 302"
              value={flatNumber}
              onChangeText={setFlatNumber}
              mode="outlined"
              keyboardType="numeric"
              style={[styles.input, styles.halfInput]}
            />
          </View>

          <TextInput
            label="Society Name"
            value={societyName}
            onChangeText={setSocietyName}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="city" />}
          />

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={styles.button}
            icon="check-circle"
          >
            Complete Setup & Join
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  card: {
    borderRadius: 16,
    elevation: 2,
  },
  cardContent: {
    padding: 12,
  },
  input: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  label: {
    marginBottom: 6,
    fontWeight: '500',
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    borderRadius: 8,
    paddingVertical: 4,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 8,
  },
});
