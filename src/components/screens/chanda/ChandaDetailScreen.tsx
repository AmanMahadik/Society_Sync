import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, Alert, TextInput, NativeModules } from 'react-native';
import { Appbar, Card, Text, Button, useTheme, ActivityIndicator, HelperText } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { formatINR } from '@/lib/utils';

// We import react-native-razorpay safely to prevent crashes in web/simulator environments
let RazorpayCheckout: any;
try {
  RazorpayCheckout = require('react-native-razorpay').default;
} catch (e) {
  console.warn('RazorpayCheckout native module not found, fallback mock payment enabled.');
}

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  target_amount: number | null;
  suggested_amount: number | null;
  min_amount: number;
  status: string;
  amount_type: 'fixed' | 'flexible';
}

interface Wing {
  id: string;
  name: string;
  collector_user_id: string | null;
  collector_upi_id: string | null;
  collector_name: string | null;
  collector_phone: string | null;
}

export default function ChandaDetailScreen() {
  const { campaignId } = useLocalSearchParams<{ campaignId: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { user, profile } = useAuth();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [wing, setWing] = useState<Wing | null>(null);
  const [flatId, setFlatId] = useState<string | null>(null);
  
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  const fetchDetails = async () => {
    try {
      const { data: camp, error: campErr } = await supabase
        .from('chanda_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campErr) throw campErr;
      setCampaign(camp);

      if (camp) {
        setAmount(camp.suggested_amount ? camp.suggested_amount.toString() : '');
      }

      if (profile?.wing) {
        const wingSearchName = profile.wing.trim();
        const { data: wingData } = await supabase
          .from('wings')
          .select('*')
          .eq('society_id', profile.society_id)
          .or(`name.eq."${wingSearchName}",name.eq."Wing ${wingSearchName}"`)
          .maybeSingle();

        setWing(wingData);

        if (wingData && profile?.flat_number) {
          const { data: flatData } = await supabase
            .from('flats')
            .select('id')
            .eq('wing_id', wingData.id)
            .eq('flat_number', profile.flat_number)
            .maybeSingle();
          
          setFlatId(flatData?.id || null);
        }
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', 'Failed to load campaign details');
    } finally {
      setLoading(false);
    }
  };

  const { status } = useLocalSearchParams<{ status?: string }>();

  useEffect(() => {
    fetchDetails();
  }, [campaignId, profile]);

  useEffect(() => {
    if (status === 'failed') {
      Alert.alert('Payment Failed', 'The payment process was not completed or failed. Please try again.');
      router.setParams({ status: undefined } as any);
    } else if (status === 'cancelled') {
      Alert.alert('Payment Cancelled', 'The payment process was cancelled.');
      router.setParams({ status: undefined } as any);
    }
  }, [status]);

  const handlePayOnline = async () => {
    const payAmount = Number(amount);
    if (!campaign || isNaN(payAmount) || payAmount < campaign.min_amount) {
      Alert.alert('Invalid Amount', `Please enter an amount of at least ₹${campaign?.min_amount || 1}`);
      return;
    }

    if (!wing) {
      Alert.alert('Wing Configuration missing', 'Your wing is not mapped in the system. Please contact the society admin.');
      return;
    }

    try {
      setPaying(true);

      const orderRes = await fetch('https://society-sync-portal.vercel.app/api/chanda/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          amount: payAmount,
          wingId: wing.id,
          flatId: flatId,
          residentId: user?.id,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Failed to create order');
      }

      // Redirect to unified Web Pay Desk
      const payUrl = `https://society-sync-portal.vercel.app/pay?orderId=${
        orderData.orderId
      }&keyId=${
        orderData.keyId
      }&amount=${
        orderData.amount
      }&name=${encodeURIComponent(profile?.full_name || '')}&email=${encodeURIComponent(
        profile?.email || ''
      )}&contact=${encodeURIComponent(
        profile?.phone || ''
      )}&campaignTitle=${encodeURIComponent(campaign.title)}`;

      await WebBrowser.openBrowserAsync(payUrl);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Payment process failed.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!campaign) return null;

  const isFixed = campaign.amount_type === 'fixed';
  const isCollector = wing?.collector_user_id === user?.id;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['bottom']}>
        <Appbar.Header style={{ backgroundColor: theme.colors.elevation.level1 }} elevated>
          <Appbar.BackAction onPress={() => router.back()} color={theme.colors.onSurface} />
          <Appbar.Content title="Contribution Desk" titleStyle={{ fontWeight: 'bold' }} />
        </Appbar.Header>

        {/* Soft brand glow backdrop */}
        <View 
          style={{
            position: 'absolute',
            top: 50,
            left: '50%',
            transform: [{ translateX: -150 }],
            width: 300,
            height: 300,
            borderRadius: 150,
            backgroundColor: '#00D4AA',
            opacity: theme.dark ? 0.04 : 0.02,
            pointerEvents: 'none',
          }}
        />

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card style={[styles.card, { 
            backgroundColor: theme.colors.elevation.level1,
            borderRadius: 20, 
            borderWidth: theme.dark ? 1 : 0, 
            borderColor: 'rgba(255, 255, 255, 0.08)',
          }]}>
            <Card.Content>
              <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>{campaign.title}</Text>
              {campaign.description && (
                <Text variant="bodyMedium" style={[styles.desc, { color: theme.colors.outline }]}>
                  {campaign.description}
                </Text>
              )}
            </Card.Content>
          </Card>

          <Card style={[styles.card, { 
            backgroundColor: theme.colors.elevation.level1,
            borderRadius: 20, 
            borderWidth: theme.dark ? 1 : 0, 
            borderColor: 'rgba(255, 255, 255, 0.08)',
          }]}>
            <Card.Content style={styles.amountCardContent}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 12, color: theme.colors.onSurface }}>Enter Contribution Amount</Text>
              
              <View style={[styles.amountInputRow, { borderBottomColor: '#00D4AA' }]}>
                <Text variant="headlineMedium" style={{ marginRight: 6, color: '#00D4AA', fontWeight: 'bold' }}>₹</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder={campaign.min_amount.toString()}
                  keyboardType="numeric"
                  editable={!isFixed}
                  style={[styles.input, { color: '#00D4AA' }]}
                />
              </View>
              <HelperText type="info" visible style={{ paddingLeft: 0 }}>
                {isFixed ? `Fixed contribution: ₹${campaign.suggested_amount}` : `Minimum amount: ₹${campaign.min_amount}`}
              </HelperText>

              <Button
                mode="contained"
                onPress={handlePayOnline}
                loading={paying}
                disabled={paying}
                style={[styles.payButton, { borderRadius: 28 }]}
                buttonColor="#00D4AA"
                textColor="#09090b"
                labelStyle={{ fontWeight: 'bold' }}
              >
                Pay Online (Razorpay)
              </Button>
            </Card.Content>
          </Card>

          {wing && (
            <Card style={[styles.card, { 
              backgroundColor: theme.colors.elevation.level1,
              borderRadius: 20, 
              borderWidth: theme.dark ? 1 : 0, 
              borderColor: 'rgba(255, 255, 255, 0.08)',
            }]}>
              <Card.Content>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 8, color: theme.colors.onSurface }}>Offline Wing Collection</Text>
                
                {wing.collector_name ? (
                  <>
                    <Text variant="bodyMedium" style={{ marginBottom: 4, color: theme.colors.outline }}>
                      Wing coordinator <Text style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>{wing.collector_name}</Text> is collecting chanda for Wing {wing.name}.
                    </Text>
                    {wing.collector_upi_id && (
                      <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: '#00D4AA', marginVertical: 6 }}>
                        UPI ID: {wing.collector_upi_id}
                      </Text>
                    )}
                    {wing.collector_phone && (
                      <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                        Phone: {wing.collector_phone}
                      </Text>
                    )}
                  </>
                ) : (
                  <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>
                    No coordinator assigned to Wing {wing.name} yet.
                  </Text>
                )}

                <Button
                  mode="outlined"
                  onPress={() => router.push(`/chanda-log-entry?campaignId=${campaign.id}` as any)}
                  style={{ marginTop: 12, borderRadius: 28, borderColor: '#00D4AA' }}
                  textColor="#00D4AA"
                  labelStyle={{ fontWeight: 'bold' }}
                >
                  Log Coordinator Payment
                </Button>
              </Card.Content>
            </Card>
          )}

          {isCollector && (
            <Card style={[styles.card, { 
              backgroundColor: theme.colors.elevation.level1, 
              borderColor: 'rgba(0, 212, 170, 0.25)', 
              borderWidth: 1,
              borderRadius: 20,
            }]}>
              <Card.Content>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', color: '#00D4AA', marginBottom: 8 }}>
                  🛡️ Wing Collector Panel
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline, marginBottom: 12 }}>
                  You are the coordinator for Wing {wing?.name}. Log entries or view submissions from this wing.
                </Text>

                <View style={styles.collectorActions}>
                  <Button
                    mode="contained"
                    buttonColor="#00D4AA"
                    textColor="#09090b"
                    onPress={() => router.push(`/chanda-log-entry?campaignId=${campaign.id}` as any)}
                    style={{ flex: 1, borderRadius: 28 }}
                    labelStyle={{ fontWeight: 'bold' }}
                  >
                    Log Collection
                  </Button>
                  <Button
                    mode="outlined"
                    textColor="#00D4AA"
                    onPress={() => router.push(`/chanda-my-entries?campaignId=${campaign.id}` as any)}
                    style={{ flex: 1, borderRadius: 28, borderColor: '#00D4AA' }}
                    labelStyle={{ fontWeight: 'bold' }}
                  >
                    Track Collections
                  </Button>
                </View>
              </Card.Content>
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
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
    gap: 16,
  },
  card: {
    borderRadius: 12,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  desc: {
    lineHeight: 20,
  },
  amountCardContent: {
    paddingVertical: 16,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    marginVertical: 12,
    paddingBottom: 4,
  },
  input: {
    fontSize: 28,
    fontWeight: 'bold',
    flex: 1,
    padding: 0,
  },
  payButton: {
    marginTop: 16,
  },
  collectorActions: {
    flexDirection: 'row',
    gap: 8,
  },
});
