import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, TextInput, Button, Card, HelperText, useTheme, SegmentedButtons } from 'react-native-paper';
import { useAuth } from '../../lib/auth-context';
import { UserRole } from '../../lib/data-manager';
import { supabase } from '../../lib/supabase';

export const ProfileCompletionScreen: React.FC = () => {
  const { user, refreshProfile, signOut } = useAuth();
  const theme = useTheme();

  const [societyCode, setSocietyCode] = useState('');
  const [societyValidated, setSocietyValidated] = useState(false);
  const [validatingCode, setValidatingCode] = useState(false);
  const [societyDetails, setSocietyDetails] = useState<{ id: string; name: string; city: string; state: string } | null>(null);

  const [fullName, setFullName] = useState('');
  const [wing, setWing] = useState('');
  const [flatNumber, setFlatNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('renter');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleValidateCode = async () => {
    if (!societyCode.trim()) {
      setError('Please enter your society code.');
      return;
    }
    
    setError(null);
    setValidatingCode(true);

    try {
      const { data, error: queryError } = await supabase
        .from('societies')
        .select('id, name, status, city, state')
        .eq('society_code', societyCode.trim().toUpperCase())
        .single();

      if (queryError || !data) {
        setError('Society code not found. Please check with your Society Admin.');
        return;
      }

      if (data.status !== 'active') {
        setError('This society is not yet active. Please contact your Society Admin.');
        return;
      }

      setSocietyDetails(data);
      setSocietyValidated(true);
    } catch (e) {
      setError('Connection error while validating code.');
    } finally {
      setValidatingCode(false);
    }
  };

  const handleSubmit = async () => {
    const isGuard = role === 'guard';
    if (!fullName || (!isGuard && (!wing || !flatNumber)) || !phone || !societyDetails) {
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
      
      const finalWing = isGuard ? 'Gate' : wing.toUpperCase();
      const finalFlat = isGuard ? 'Guard' : flatNumber;

      // Save details including validated society_id and society_code
      await dataManager.updateProfileDetails(
        user.id,
        fullName,
        phone,
        finalFlat,
        finalWing,
        societyDetails.name,
        null,
        null,
        null,
        societyDetails.id,
        societyCode.trim().toUpperCase()
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

  if (!societyValidated) {
    return (
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>Join a Housing Complex</Text>
          <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.outline }]}>
            Enter your unique 10-character Society Code to connect your profile
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
              label="Enter Society Code"
              placeholder="e.g. SS-MH-2847"
              value={societyCode}
              onChangeText={(text) => {
                const clean = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
                let formatted = clean;
                if (clean.length > 2) {
                  formatted = clean.substring(0, 2) + '-' + clean.substring(2);
                }
                if (clean.length > 4) {
                  formatted = clean.substring(0, 2) + '-' + clean.substring(2, 4) + '-' + clean.substring(4, 8);
                }
                setSocietyCode(formatted);
                setError(null);
              }}
              mode="outlined"
              style={styles.input}
              autoCapitalize="characters"
              left={<TextInput.Icon icon="key" />}
            />

            <Button
              mode="contained"
              onPress={handleValidateCode}
              loading={validatingCode}
              disabled={validatingCode}
              style={styles.button}
              icon="check-decagram"
            >
              Validate Code
            </Button>

            <Button
              mode="text"
              onPress={signOut}
              textColor={theme.colors.error}
              style={{ marginTop: 8 }}
              icon="logout"
            >
              Cancel & Sign Out
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    );
  }

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

          {societyDetails && (
            <Card style={[styles.infoCard, { backgroundColor: theme.colors.primaryContainer, marginBottom: 16 }]}>
              <Card.Content style={styles.infoContent}>
                <Text variant="labelLarge" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                  ✅ Verified Society Details
                </Text>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', marginTop: 4, color: '#FFFFFF' }}>
                  {societyDetails.name}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 2 }}>
                  {societyDetails.city}, {societyDetails.state}
                </Text>
              </Card.Content>
            </Card>
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
              { value: 'owner', label: 'Flat Owner', icon: 'home-lock' },
              { value: 'renter', label: 'Renter / Tenant', icon: 'home-account' },
              { value: 'guard', label: 'Guard', icon: 'shield-account' },
            ]}
            style={styles.segmentedButtons}
          />

          {role !== 'guard' && (
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
          )}

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

          <Button
            mode="text"
            onPress={() => {
              setSocietyValidated(false);
              setSocietyCode('');
              setSocietyDetails(null);
            }}
            textColor={theme.colors.outline}
            style={{ marginTop: 8 }}
          >
            Change Society Code
          </Button>

          <Button
            mode="text"
            onPress={signOut}
            textColor={theme.colors.error}
            style={{ marginTop: 4 }}
            icon="logout"
          >
            Cancel & Sign Out
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
    marginTop: 4,
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
    fontWeight: 'bold',
  },
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E2F2B',
  },
  infoContent: {
    padding: 12,
  },
});
