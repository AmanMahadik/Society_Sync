import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Card, HelperText, useTheme, SegmentedButtons } from 'react-native-paper';
import { useAuth } from '../../lib/auth-context';
import { UserRole } from '../../lib/data-manager';
import { supabase } from '../../lib/supabase';

// Safely require expo-camera to prevent runtime crashes on older binary builds without the native module compiled.
let CameraView: any = null;
let useCameraPermissionsHook: any = () => [null, async () => ({ granted: false })];
let isCameraAvailable = false;

try {
  const ExpoCamera = require('expo-camera');
  CameraView = ExpoCamera.CameraView;
  useCameraPermissionsHook = ExpoCamera.useCameraPermissions;
  isCameraAvailable = !!CameraView;
} catch (e) {
  console.warn('expo-camera native module is not available in this binary.');
}

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onNavigateToLogin }) => {
  const { signUp } = useAuth();
  const theme = useTheme();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('owner');
  const [wing, setWing] = useState('');
  const [flatNumber, setFlatNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Society Code Verification States
  const [societyCode, setSocietyCode] = useState('');
  const [societyDetails, setSocietyDetails] = useState<{ id: string; name: string; city: string; state: string } | null>(null);
  const [societyValidated, setSocietyValidated] = useState(false);
  const [validatingCode, setValidatingCode] = useState(false);
  const [showConfirmationCard, setShowConfirmationCard] = useState(false);

  // QR Scanning States & Permissions
  const [scanningQR, setScanningQR] = useState(false);
  const [permission, requestPermission] = useCameraPermissionsHook();

  const startQRScanner = async () => {
    if (!isCameraAvailable) {
      Alert.alert('Scanner Unavailable', 'QR Scanning is not supported on this app version. Please type the society code manually.');
      return;
    }
    if (!permission || !permission.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to scan QR codes.');
        return;
      }
    }
    setScanningQR(true);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (!data) return;
    let code = data.trim();
    const match = code.match(/SS-[A-Z]{2}-\d{2}-[A-Z]{2}-\d{4}/i) || code.match(/SS-[A-Z]{2}-\d{4}/i);
    if (match) {
      code = match[0].toUpperCase();
    } else {
      const clean = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (clean.length >= 14) {
        code = `SS-${clean.substring(2, 4)}-${clean.substring(4, 6)}-${clean.substring(6, 8)}-${clean.substring(8, 12)}`;
      } else if (clean.length >= 8) {
        code = clean.substring(0, 2) + '-' + clean.substring(2, 4) + '-' + clean.substring(4, 8);
      }
    }
    setSocietyCode(code);
    setScanningQR(false);
    setError(null);
  };

  const handleValidateSocietyCode = async () => {
    if (!societyCode.trim()) {
      setError('Please enter your society code.');
      return;
    }
    
    setError(null);
    setValidatingCode(true);
    setShowConfirmationCard(false);

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
      setShowConfirmationCard(true);
    } catch (e) {
      setError('Connection error while validating code.');
    } finally {
      setValidatingCode(false);
    }
  };

  const handleRegister = async () => {
    const isGuard = role === 'guard';
    if (!fullName || !email || !password || !confirmPassword || !phone || (!isGuard && (!wing || !flatNumber))) {
      setError('Please fill in all the fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!societyDetails) {
      setError('Please validate your society code first.');
      return;
    }
    
    setError(null);
    setLoading(true);

    try {
      // 1. Prevent cross-society registration
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('society_id, society_code')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (existingProfile?.society_id) {
        if (existingProfile.society_id !== societyDetails.id) {
          setError('This email is already registered with a different society. Please contact your Society Admin or use a different email.');
          setLoading(false);
          return;
        }
      }

      const finalWing = isGuard ? 'Gate' : wing.trim().toUpperCase();
      const finalFlat = isGuard ? 'Guard' : flatNumber.trim();

      // 2. SignUp directly with selected role (the DB trigger will override to 'admin' if first user)
      const { error: signUpError } = await signUp(
        email, 
        password, 
        fullName, 
        role, 
        finalWing, 
        finalFlat, 
        phone,
        societyDetails.id,
        societyCode.trim().toUpperCase(),
        societyDetails.name
      );

      if (signUpError) {
        setError(signUpError);
      }
    } catch (e: any) {
      setError(e.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  if (scanningQR) {
    return (
      <View style={StyleSheet.absoluteFillObject}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={handleBarcodeScanned}
        />
        <View style={{ position: 'absolute', bottom: 40, left: 20, right: 20 }}>
          <Button 
            mode="contained" 
            buttonColor="#FF3B30" 
            textColor="#FFFFFF"
            onPress={() => setScanningQR(false)}
          >
            Cancel Scan
          </Button>
        </View>
      </View>
    );
  }

  if (!societyValidated) {
    return (
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>Welcome to SocietySync</Text>
          <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.outline }]}>
            Enter your unique 10-character Society Code to join your housing complex
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
                if (clean.length > 8) {
                  formatted = clean.substring(0, 2) + '-' + clean.substring(2, 4) + '-' + clean.substring(4, 6) + '-' + clean.substring(6, 8) + '-' + clean.substring(8, 12);
                } else if (clean.length > 4) {
                  formatted = clean.substring(0, 2) + '-' + clean.substring(2, 4) + '-' + clean.substring(4, 8);
                } else if (clean.length > 2) {
                  formatted = clean.substring(0, 2) + '-' + clean.substring(2);
                }
                setSocietyCode(formatted);
                setError(null);
              }}
              mode="outlined"
              style={styles.input}
              activeOutlineColor={theme.colors.primary}
              autoCapitalize="characters"
              left={<TextInput.Icon icon="key" />}
              right={<TextInput.Icon icon="qrcode-scan" onPress={startQRScanner} />}
            />

            {showConfirmationCard && societyDetails && (
              <Card style={[styles.infoCard, { backgroundColor: theme.colors.primaryContainer, marginVertical: 12, borderRadius: 12 }]}>
                <Card.Content style={styles.infoContent}>
                  <Text variant="titleMedium" style={{ color: theme.colors.onPrimaryContainer, fontWeight: 'bold' }}>
                    ✅ {societyDetails.name}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 2 }}>
                    📍 {societyDetails.city}, {societyDetails.state}
                  </Text>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer, marginTop: 8 }}>
                    Is this your society? Tap Continue to proceed with registration.
                  </Text>
                </Card.Content>
              </Card>
            )}

            {showConfirmationCard ? (
              <View style={{ gap: 8, marginTop: 8 }}>
                <Button
                  mode="contained"
                  onPress={() => setSocietyValidated(true)}
                  buttonColor={theme.colors.primary}
                  textColor={theme.dark ? '#09090b' : '#ffffff'}
                  style={[styles.button, { borderRadius: 28 }]}
                  labelStyle={{ fontWeight: 'bold' }}
                >
                  Yes, Continue
                </Button>
                <Button
                  mode="text"
                  onPress={() => {
                    setShowConfirmationCard(false);
                    setSocietyDetails(null);
                    setSocietyCode('');
                  }}
                  textColor={theme.colors.primary}
                >
                  Enter Different Code
                </Button>
              </View>
            ) : (
              <Button
                mode="contained"
                onPress={handleValidateSocietyCode}
                loading={validatingCode}
                disabled={validatingCode}
                buttonColor={theme.colors.primary}
                textColor={theme.dark ? '#09090b' : '#ffffff'}
                style={[styles.button, { borderRadius: 28 }]}
                labelStyle={{ fontWeight: 'bold' }}
              >
                Validate Code
              </Button>
            )}

            <Button
              mode="text"
              onPress={onNavigateToLogin}
              style={styles.textButton}
              textColor={theme.colors.primary}
            >
              Already registered? Sign In
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>Register Flat</Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.outline }]}>
          Registering in {societyDetails?.name}
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
            activeOutlineColor={theme.colors.primary}
            left={<TextInput.Icon icon="account" />}
          />

          <TextInput
            label="Email Address"
            value={email}
            onChangeText={(text) => setEmail(text.replace(/\s/g, ''))}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            activeOutlineColor={theme.colors.primary}
            left={<TextInput.Icon icon="email" />}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            mode="outlined"
            style={styles.input}
            activeOutlineColor={theme.colors.primary}
            left={<TextInput.Icon icon="lock" />}
            right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword(!showPassword)} />}
          />

          <TextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            mode="outlined"
            style={styles.input}
            activeOutlineColor={theme.colors.primary}
            left={<TextInput.Icon icon="lock-check" />}
            right={<TextInput.Icon icon={showConfirmPassword ? "eye-off" : "eye"} onPress={() => setShowConfirmPassword(!showConfirmPassword)} />}
          />

          <Text variant="labelLarge" style={styles.label}>Register As</Text>
          <SegmentedButtons
            value={role}
            onValueChange={(val) => setRole(val as UserRole)}
            buttons={[
              { value: 'owner', label: 'Owner', icon: 'home-lock' },
              { value: 'renter', label: 'Tenant', icon: 'home-account' },
              { value: 'guard', label: 'Guard', icon: 'shield-account' },
            ]}
            style={styles.segmentedButtons}
          />

          {role !== 'guard' && (
            <View style={styles.row}>
              <TextInput
                label="Wing"
                placeholder="e.g. E"
                value={wing}
                onChangeText={setWing}
                mode="outlined"
                style={[styles.input, styles.halfInput]}
                activeOutlineColor={theme.colors.primary}
                autoCapitalize="characters"
              />
              <TextInput
                label="Flat Number"
                placeholder="e.g. 503"
                value={flatNumber}
                onChangeText={setFlatNumber}
                mode="outlined"
                keyboardType="numeric"
                activeOutlineColor={theme.colors.primary}
                style={[styles.input, styles.halfInput]}
              />
            </View>
          )}

          <TextInput
            label="Phone Number"
            placeholder="10-digit mobile"
            value={phone}
            onChangeText={phone => setPhone(phone.replace(/[^0-9]/g, ''))}
            keyboardType="phone-pad"
            mode="outlined"
            style={styles.input}
            activeOutlineColor={theme.colors.primary}
            left={<TextInput.Icon icon="phone" />}
          />

          <Card style={[styles.infoCard, { backgroundColor: theme.colors.primaryContainer, borderRadius: 12 }]}>
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
            buttonColor={theme.colors.primary}
            textColor={theme.dark ? '#09090b' : '#ffffff'}
            style={[styles.button, { borderRadius: 28 }]}
            labelStyle={{ fontWeight: 'bold' }}
          >
            Submit Registration
          </Button>

          <Button
            mode="text"
            onPress={() => setSocietyValidated(false)}
            style={styles.textButton}
            textColor={theme.colors.primary}
          >
            Change Society Code
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
