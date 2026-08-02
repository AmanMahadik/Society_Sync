import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Card, HelperText, useTheme, SegmentedButtons } from 'react-native-paper';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
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

  const [aadhaarVerified, setAadhaarVerified] = useState(false);
  const [aadhaarName, setAadhaarName] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [verifyingAadhaar, setVerifyingAadhaar] = useState(false);

  const handleVerifyAadhaar = async () => {
    try {
      setVerifyingAadhaar(true);
      const redirectUrl = Linking.createURL('/');
      const authUrl = `https://society-sync-portal.vercel.app/verify-digilocker?userId=${user.id}&societyId=${societyDetails?.id || 'new'}&redirectUri=${encodeURIComponent(redirectUrl)}`;
      
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      
      if (result.type === 'success' && result.url) {
        const urlObj = Linking.parse(result.url);
        const { status, name, aadhaarNo } = urlObj.queryParams || {};
        
        if (status === 'success' && name && aadhaarNo) {
          setAadhaarVerified(true);
          setAadhaarName(decodeURIComponent(name as string));
          setAadhaarNumber(aadhaarNo as string);
          Alert.alert('✅ Aadhaar Verified', `Identity matches government records:\nName: ${decodeURIComponent(name as string)}`);
        } else {
          Alert.alert('❌ Verification Failed', 'DigiLocker did not return successful KYC credentials.');
        }
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert('Verification Error', e.message || 'An error occurred during identity verification.');
    } finally {
      setVerifyingAadhaar(false);
    }
  };

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

    if (!aadhaarVerified) {
      setError('Aadhaar identity verification is required to complete your profile.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const { dataManager } = require('../../lib/data-manager');
      
      const finalWing = isGuard ? 'Gate' : wing.toUpperCase();
      const finalFlat = isGuard ? 'Guard' : flatNumber;
      const verifiedFullName = `${fullName.trim()} (Aadhaar Verified: ${aadhaarName})`;

      // Save details including validated society_id and society_code
      await dataManager.updateProfileDetails(
        user.id,
        verifiedFullName,
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
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
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

        <ScrollView contentContainerStyle={[styles.container, { backgroundColor: 'transparent' }]}>
          <View style={styles.header}>
            <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onSurface }]}>Join a Housing Complex</Text>
            <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.outline }]}>
              Enter your unique 10-character Society Code to connect your profile
            </Text>
          </View>

          <Card style={[styles.card, { 
            borderRadius: 24, 
            borderWidth: theme.dark ? 1 : 0, 
            borderColor: 'rgba(255, 255, 255, 0.08)',
            backgroundColor: theme.colors.elevation.level1
          }]}>
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
                activeOutlineColor="#00D4AA"
                autoCapitalize="characters"
                left={<TextInput.Icon icon="key" />}
                right={<TextInput.Icon icon="qrcode-scan" onPress={startQRScanner} />}
              />

              <Button
                mode="contained"
                onPress={handleValidateCode}
                loading={validatingCode}
                disabled={validatingCode}
                buttonColor="#00D4AA"
                textColor="#09090b"
                style={[styles.button, { borderRadius: 28, paddingVertical: 2 }]}
                labelStyle={{ fontWeight: 'bold' }}
                icon="check-decagram"
              >
                Validate Code
              </Button>

              <Button
                mode="text"
                onPress={signOut}
                textColor={theme.colors.error}
                style={{ marginTop: 8 }}
                labelStyle={{ fontWeight: 'bold' }}
                icon="logout"
              >
                Cancel & Sign Out
              </Button>
            </Card.Content>
          </Card>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
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

      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: 'transparent' }]} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onSurface }]}>Complete Profile</Text>
          <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.outline }]}>
            One last step to register your flat in the society ledger
          </Text>
        </View>

        <Card style={[styles.card, { 
          borderRadius: 24, 
          borderWidth: theme.dark ? 1 : 0, 
          borderColor: 'rgba(255, 255, 255, 0.08)',
          backgroundColor: theme.colors.elevation.level1
        }]}>
          <Card.Content style={styles.cardContent}>
            {error && (
              <HelperText type="error" visible={!!error} style={styles.errorText}>
                {error}
              </HelperText>
            )}

            {societyDetails && (
              <Card style={[styles.infoCard, { backgroundColor: theme.colors.primaryContainer, marginBottom: 16, borderRadius: 12 }]}>
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
              activeOutlineColor="#00D4AA"
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
              activeOutlineColor="#00D4AA"
              left={<TextInput.Icon icon="phone" />}
            />

            <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurface, marginTop: 8 }]}>Your Roster Rank</Text>
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
                  activeOutlineColor="#00D4AA"
                  style={[styles.input, styles.halfInput]}
                  autoCapitalize="characters"
                />
                <TextInput
                  label="Flat Number"
                  placeholder="e.g. 302"
                  value={flatNumber}
                  onChangeText={setFlatNumber}
                  mode="outlined"
                  activeOutlineColor="#00D4AA"
                  keyboardType="numeric"
                  style={[styles.input, styles.halfInput]}
                />
              </View>
            )}

            {/* Aadhaar Verification Section */}
            <Card style={{ marginVertical: 12, backgroundColor: '#161618', borderWidth: 0.5, borderColor: '#333' }}>
              <Card.Content style={{ paddingVertical: 12 }}>
                <Text variant="titleSmall" style={{ fontWeight: 'bold', color: '#FFF', marginBottom: 4 }}>
                  🛡️ Aadhaar Identity Verification
                </Text>
                <Text variant="bodySmall" style={{ color: '#888', marginBottom: 12 }}>
                  Verify your identity using official government DigiLocker sandbox integration.
                </Text>

                {aadhaarVerified ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#0B1C1A', borderWidth: 1, borderColor: '#00D4AA33', padding: 12, borderRadius: 8 }}>
                    <Text style={{ fontSize: 20, marginRight: 8 }}>✅</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#00D4AA', fontWeight: 'bold', fontSize: 13 }}>Aadhaar Verified Successfully</Text>
                      <Text style={{ color: '#888', fontSize: 11 }}>Name: {aadhaarName} • UID: XXXX-XXXX-{aadhaarNumber.slice(-4)}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Button
                      mode="contained"
                      onPress={handleVerifyAadhaar}
                      loading={verifyingAadhaar}
                      disabled={verifyingAadhaar}
                      buttonColor="#00D4AA"
                      textColor="#09090b"
                      labelStyle={{ fontWeight: 'bold', fontSize: 11 }}
                      style={{ borderRadius: 8 }}
                      icon="shield-check"
                    >
                      Verify with DigiLocker
                    </Button>
                    <Text style={{ color: '#888', fontStyle: 'italic', fontSize: 10, flex: 1, marginLeft: 12, textAlign: 'right' }}>
                      Not verified. Please complete check.
                    </Text>
                  </View>
                )}
              </Card.Content>
            </Card>

            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              buttonColor="#00D4AA"
              textColor="#09090b"
              style={[styles.button, { borderRadius: 28, paddingVertical: 2 }]}
              labelStyle={{ fontWeight: 'bold' }}
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
              textColor="#00D4AA"
              labelStyle={{ fontWeight: 'bold' }}
              style={{ marginTop: 8 }}
            >
              Change Society Code
            </Button>

            <Button
              mode="text"
              onPress={signOut}
              textColor={theme.colors.error}
              labelStyle={{ fontWeight: 'bold' }}
              style={{ marginTop: 4 }}
              icon="logout"
            >
              Cancel & Sign Out
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
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
