import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, Alert, TextInput } from 'react-native';
import { Appbar, Card, Text, Button, useTheme, ActivityIndicator, HelperText } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
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

  useEffect(() => {
    fetchDetails();
  }, [campaignId, profile]);

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

      if (RazorpayCheckout) {
        const checkoutOptions = {
          key: orderData.keyId,
          order_id: orderData.orderId,
          amount: orderData.amount * 100,
          currency: 'INR',
          name: 'SocietySync',
          description: campaign.title,
          prefill: {
            name: profile?.full_name || '',
            email: profile?.email || '',
            contact: profile?.phone || '',
          },
          theme: { color: theme.colors.primary },
        };

        RazorpayCheckout.open(checkoutOptions)
          .then(async (data: any) => {
            await fetch('https://society-sync-portal.vercel.app/api/chanda/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: data.razorpay_order_id,
                razorpay_payment_id: data.razorpay_payment_id,
                razorpay_signature: data.razorpay_signature,
              }),
            });
            Alert.alert('Success', 'Payment initiated successfully! Receipt will be generated shortly.');
            router.push('/chanda-history' as any);
          })
          .catch((err: any) => {
            console.error('Checkout error:', err);
            Alert.alert('Payment Failed', err.description || 'Checkout was dismissed');
          });
      } else {
        Alert.alert(
          'Simulator Mode',
          'RazorpayCheckout native module is not installed. Simulate a successful payment?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Simulate Success',
              onPress: async () => {
                const mockWebhookData = {
                  event: 'payment.captured',
                  payload: {
                    payment: {
                      entity: {
                        order_id: orderData.orderId,
                        id: `pay_mock_${Math.random().toString(36).substring(2, 11)}`,
                        amount: orderData.amount * 100,
                      },
                    },
                  },
                };
                
                await fetch('https://society-sync-portal.vercel.app/api/chanda/webhook', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(mockWebhookData),
                });

                Alert.alert('Success', 'Mock payment verified! Receipt generated.');
                router.push('/chanda-history' as any);
              },
            },
          ]
        );
      }
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <Appbar.Header style={{ backgroundColor: theme.colors.elevation.level1 }} elevated>
        <Appbar.BackAction onPress={() => router.back()} color={theme.colors.onSurface} />
        <Appbar.Content title="Contribution Desk" titleStyle={{ fontWeight: 'bold' }} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={[styles.card, { backgroundColor: theme.colors.elevation.level1 }]}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.title}>{campaign.title}</Text>
            {campaign.description && (
              <Text variant="bodyMedium" style={[styles.desc, { color: theme.colors.onSurfaceVariant }]}>
                {campaign.description}
              </Text>
            )}
          </Card.Content>
        </Card>

        <Card style={[styles.card, { backgroundColor: theme.colors.elevation.level1 }]}>
          <Card.Content style={styles.amountCardContent}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 12 }}>Enter Contribution Amount</Text>
            
            <View style={[styles.amountInputRow, { borderBottomColor: theme.colors.primary }]}>
              <Text variant="headlineMedium" style={{ marginRight: 6 }}>₹</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder={campaign.min_amount.toString()}
                keyboardType="numeric"
                editable={!isFixed}
                style={[styles.input, { color: theme.colors.onSurface }]}
              />
            </View>
            <HelperText type="info" visible>
              {isFixed ? `Fixed contribution: ₹${campaign.suggested_amount}` : `Minimum amount: ₹${campaign.min_amount}`}
            </HelperText>

            <Button
              mode="contained"
              onPress={handlePayOnline}
              loading={paying}
              disabled={paying}
              style={styles.payButton}
              buttonColor={theme.colors.primary}
              textColor={theme.colors.onPrimary}
            >
              Pay Online (Razorpay)
            </Button>
          </Card.Content>
        </Card>

        {wing && (
          <Card style={[styles.card, { backgroundColor: theme.colors.elevation.level1 }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 8 }}>Offline Wing Collection</Text>
              
              {wing.collector_name ? (
                <>
                  <Text variant="bodyMedium" style={{ marginBottom: 4 }}>
                    Wing coordinator <Text style={{ fontWeight: 'bold' }}>{wing.collector_name}</Text> is collecting chanda for Wing {wing.name}.
                  </Text>
                  {wing.collector_upi_id && (
                    <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: theme.colors.primary, marginVertical: 6 }}>
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
                style={{ marginTop: 12 }}
                textColor={theme.colors.primary}
              >
                Log Coordinator Payment
              </Button>
            </Card.Content>
          </Card>
        )}

        {isCollector && (
          <Card style={[styles.card, { backgroundColor: theme.colors.elevation.level1, borderColor: theme.colors.primary + '50', borderWidth: 1 }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.primary, marginBottom: 8 }}>
                🛡️ Wing Collector Panel
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.outline, marginBottom: 12 }}>
                You are the coordinator for Wing {wing?.name}. Log entries or view submissions from this wing.
              </Text>

              <View style={styles.collectorActions}>
                <Button
                  mode="contained"
                  buttonColor={theme.colors.primary}
                  textColor={theme.colors.onPrimary}
                  onPress={() => router.push(`/chanda-log-entry?campaignId=${campaign.id}` as any)}
                  style={{ flex: 1 }}
                >
                  Log Collection
                </Button>
                <Button
                  mode="outlined"
                  textColor={theme.colors.primary}
                  onPress={() => router.push(`/chanda-my-entries?campaignId=${campaign.id}` as any)}
                  style={{ flex: 1 }}
                >
                  Track Collections
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}
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
