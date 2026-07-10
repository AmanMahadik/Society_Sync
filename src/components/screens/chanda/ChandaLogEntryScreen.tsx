import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, Alert, TextInput } from 'react-native';
import { Appbar, Button, Card, Text, useTheme, ActivityIndicator, List } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import * as ImagePicker from 'expo-image-picker';

interface WingResident {
  id: string;
  full_name: string;
  flat_number: string;
}

export default function ChandaLogEntryScreen() {
  const { campaignId } = useLocalSearchParams<{ campaignId: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { user, profile } = useAuth();

  const [residents, setResidents] = useState<WingResident[]>([]);
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null);
  
  const [wingId, setWingId] = useState<string>('');
  const [payerName, setPayerName] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'upi' | 'cash' | 'bank_transfer' | 'other'>('upi');
  const [refId, setRefId] = useState('');
  const [proofImage, setProofImage] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showResidentSelector, setShowResidentSelector] = useState(false);

  const [collectorUpiId, setCollectorUpiId] = useState<string | null>(null);

  const fetchWingResidents = async () => {
    if (!profile?.society_id || !profile?.wing) return;
    try {
      const wingSearchName = profile.wing.trim();
      const { data: wingData } = await supabase
        .from('wings')
        .select('id, collector_upi_id')
        .eq('society_id', profile.society_id)
        .or(`name.eq."${wingSearchName}",name.eq."Wing ${wingSearchName}"`)
        .maybeSingle();
      
      if (wingData) {
        setWingId(wingData.id);
        setCollectorUpiId(wingData.collector_upi_id || null);
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, flat_number')
        .eq('society_id', profile.society_id)
        .eq('wing', profile.wing)
        .eq('status', 'approved');

      if (error) throw error;
      setResidents(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWingResidents();
  }, [profile]);

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Denied', 'Media library access is required to upload transaction screenshots.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0].uri) {
      setProofImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    const payAmount = Number(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    if (!selectedResidentId && !payerName.trim()) {
      Alert.alert('Payer missing', 'Please select a resident or enter the payer\'s name.');
      return;
    }

    try {
      setSubmitting(true);
      let proofUrl = null;

      if (proofImage) {
        proofUrl = `https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400`;
      }

      const res = await fetch('https://society-sync-portal.vercel.app/api/chanda/offline-contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaignId,
          societyId: profile?.society_id,
          wingId: wingId,
          residentId: selectedResidentId || null,
          payerName: selectedResidentId ? null : payerName.trim(),
          amount: payAmount,
          collectionMode: mode,
          collectorUpiId: collectorUpiId,
          upiReferenceId: refId.trim() || null,
          proofUrl: proofUrl,
          collectedAt: new Date().toISOString().split('T')[0],
          enteredBy: user?.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        Alert.alert('Success', 'Offline collection entry logged. Awaiting admin verification.');
        router.back();
      } else {
        throw new Error(data.error || 'Failed to log entry');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectResident = (res: WingResident) => {
    setSelectedResidentId(res.id);
    setPayerName(res.full_name);
    setShowResidentSelector(false);
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <Appbar.Header style={{ backgroundColor: theme.colors.elevation.level1 }} elevated>
        <Appbar.BackAction onPress={() => router.back()} color={theme.colors.onSurface} />
        <Appbar.Content title="Log Collection" titleStyle={{ fontWeight: 'bold' }} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={[styles.card, { backgroundColor: theme.colors.elevation.level1 }]}>
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium" style={styles.label}>Select Payer / Resident</Text>
            
            <Button 
              mode="outlined" 
              onPress={() => setShowResidentSelector(!showResidentSelector)}
              style={styles.pickerButton}
              textColor={theme.colors.onSurface}
            >
              {payerName || 'Tap to select Resident...'}
            </Button>

            {showResidentSelector && (
              <Card style={{ backgroundColor: theme.colors.elevation.level2, marginVertical: 8 }}>
                <Card.Content style={{ padding: 0 }}>
                  <List.Item
                    title="Guest / Unregistered User"
                    description="Enter custom payer name manually below"
                    onPress={() => {
                      setSelectedResidentId(null);
                      setPayerName('');
                      setShowResidentSelector(false);
                    }}
                  />
                  {residents.map((r) => (
                    <List.Item
                      key={r.id}
                      title={`${r.full_name} (Flat ${r.flat_number})`}
                      onPress={() => handleSelectResident(r)}
                    />
                  ))}
                </Card.Content>
              </Card>
            )}

            {!selectedResidentId && (
              <View style={styles.inputGroup}>
                <Text variant="bodySmall" style={{ color: theme.colors.outline, marginBottom: 4 }}>Custom Payer Name</Text>
                <TextInput
                  value={payerName}
                  onChangeText={setPayerName}
                  placeholder="e.g. Ramesh Kumar"
                  placeholderTextColor={theme.colors.outline}
                  style={[styles.textInput, { color: theme.colors.onSurface, borderColor: theme.colors.outline + '40' }]}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text variant="titleMedium" style={styles.label}>Amount Collected (INR)</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="e.g. 500"
                keyboardType="numeric"
                placeholderTextColor={theme.colors.outline}
                style={[styles.textInput, { color: theme.colors.onSurface, borderColor: theme.colors.outline + '40' }]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text variant="titleMedium" style={styles.label}>Collection Mode</Text>
              <View style={styles.modeRow}>
                {['upi', 'cash', 'bank_transfer'].map((m) => (
                  <Button
                    key={m}
                    mode={mode === m ? 'contained' : 'outlined'}
                    onPress={() => setMode(m as any)}
                    compact
                    style={{ flex: 1 }}
                    buttonColor={mode === m ? theme.colors.primary : undefined}
                    textColor={mode === m ? theme.colors.onPrimary : theme.colors.primary}
                  >
                    {m.replace('_', ' ').toUpperCase()}
                  </Button>
                ))}
              </View>
            </View>

            {mode !== 'cash' && (
              <View style={styles.inputGroup}>
                <Text variant="titleMedium" style={styles.label}>Transaction / UTR Reference ID</Text>
                <TextInput
                  value={refId}
                  onChangeText={setRefId}
                  placeholder="e.g. 320914920231"
                  placeholderTextColor={theme.colors.outline}
                  style={[styles.textInput, { color: theme.colors.onSurface, borderColor: theme.colors.outline + '40' }]}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text variant="titleMedium" style={styles.label}>Proof / Receipt Screenshot (Optional)</Text>
              <Button
                mode="outlined"
                icon={proofImage ? "check" : "camera"}
                onPress={handlePickImage}
                style={{ marginTop: 6 }}
                textColor={theme.colors.primary}
              >
                {proofImage ? 'Screenshot Attached' : 'Attach Payment Proof'}
              </Button>
            </View>

            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting}
              style={{ marginTop: 24 }}
              buttonColor={theme.colors.primary}
              textColor={theme.colors.onPrimary}
            >
              Log Contribution
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
  },
  cardContent: {
    padding: 16,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  pickerButton: {
    marginVertical: 6,
    borderRadius: 6,
  },
  inputGroup: {
    marginTop: 16,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
});
