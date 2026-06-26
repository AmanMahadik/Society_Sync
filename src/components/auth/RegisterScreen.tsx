import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, TextInput, Button, Card, HelperText, useTheme, SegmentedButtons } from 'react-native-paper';
import { useAuth } from '../../lib/auth-context';
import { UserRole } from '../../lib/data-manager';

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onNavigateToLogin }) => {
  const { signUp } = useAuth();
  const theme = useTheme();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('renter');
  const [wing, setWing] = useState('');
  const [flatNumber, setFlatNumber] = useState('');
  const [phone, setPhone] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!fullName || !email || !password || !wing || !flatNumber || !phone) {
      setError('Please fill in all the fields.');
      return;
    }
    
    setError(null);
    setLoading(true);
    const { error: signUpError } = await signUp(email, password, fullName, role, wing, flatNumber, phone);
    setLoading(false);
    
    if (signUpError) {
      setError(signUpError);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>Register Flat</Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.outline }]}>
          Join your digital housing society council
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
            value={fullName}
            onChangeText={setFullName}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="account" />}
          />

          <TextInput
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            left={<TextInput.Icon icon="email" />}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="lock" />}
          />

          <Text variant="labelLarge" style={styles.label}>Choose Your Role</Text>
          <SegmentedButtons
            value={role}
            onValueChange={(val) => setRole(val as UserRole)}
            buttons={[
              { value: 'owner', label: 'Flat Owner', icon: 'home-lock' },
              { value: 'renter', label: 'Renter / Tenant', icon: 'home-account' },
            ]}
            style={styles.segmentedButtons}
          />

          <View style={styles.row}>
            <TextInput
              label="Wing"
              placeholder="e.g. E"
              value={wing}
              onChangeText={setWing}
              mode="outlined"
              style={[styles.input, styles.halfInput]}
              autoCapitalize="characters"
            />
            <TextInput
              label="Flat Number"
              placeholder="e.g. 503"
              value={flatNumber}
              onChangeText={setFlatNumber}
              mode="outlined"
              keyboardType="numeric"
              style={[styles.input, styles.halfInput]}
            />
          </View>

          <TextInput
            label="Phone Number"
            placeholder="10-digit mobile"
            value={phone}
            onChangeText={phone => setPhone(phone.replace(/[^0-9]/g, ''))}
            keyboardType="phone-pad"
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="phone" />}
          />

          <Card style={[styles.infoCard, { backgroundColor: theme.colors.primaryContainer }]}>
            <Card.Content style={styles.infoContent}>
              <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, fontWeight: '500', textAlign: 'center' }}>
                ⚠️ Approval Required: After registration, you will need to be approved by the Society Secretary before you can access ledgers, chats, or parking bookings.
              </Text>
            </Card.Content>
          </Card>

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            Submit Registration
          </Button>

          <Button
            mode="text"
            onPress={onNavigateToLogin}
            style={styles.textButton}
          >
            Already registered? Sign In
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
    marginBottom: 20,
  },
  title: {
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
  },
  card: {
    borderRadius: 16,
    elevation: 2,
    marginBottom: 16,
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
    marginTop: 12,
    borderRadius: 8,
    paddingVertical: 4,
  },
  textButton: {
    marginTop: 8,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 8,
  },
  infoCard: {
    marginVertical: 8,
    borderRadius: 8,
  },
  infoContent: {
    padding: 8,
  },
});
