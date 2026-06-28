import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Animated, Alert } from 'react-native';
import { Text, Button, useTheme, Avatar, TextInput, IconButton } from 'react-native-paper';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';

export default function ResidentSOSScreen() {
  const theme = useTheme();
  const { user, profile } = useAuth();
  
  const [activeSOS, setActiveSOS] = useState<any | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  // Pulse animation for trigger state
  const [pulseAnim] = useState(new Animated.Value(1));

  const checkActiveAlert = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('sos_alerts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!error && data) {
        setActiveSOS(data);
        startPulse();
      } else {
        setActiveSOS(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    checkActiveAlert();
  }, [user]);

  const startPulse = () => {
    pulseAnim.setValue(1);
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1000,
          useNativeDriver: true,
        })
      ])
    ).start();
  };

  const handleTriggerSOS = async () => {
    if (!user?.id || !profile?.society_id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sos_alerts')
        .insert({
          society_id: profile.society_id,
          user_id: user.id,
          wing: profile.wing || 'Unknown',
          flat_number: profile.flat_number || 'Unknown',
          description: description.trim() || 'Emergency Assistance Required',
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;
      
      setActiveSOS(data);
      startPulse();
      Alert.alert('Alarm Activated', 'Security and society admins have been notified of your emergency.');
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', 'Failed to trigger emergency alarm.');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveSOS = async () => {
    if (!activeSOS) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('sos_alerts')
        .update({ status: 'resolved' })
        .eq('id', activeSOS.id);

      if (error) throw error;

      setActiveSOS(null);
      setDescription('');
      pulseAnim.stopAnimation();
      Alert.alert('Alarm Resolved', 'The emergency SOS broadcast has been closed.');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to resolve emergency alert.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.error }]}>SOS Assistance</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
          Broadcast instant distress signals to security team and admins
        </Text>
      </View>

      <View style={styles.centerSection}>
        {activeSOS ? (
          // ACTIVE SOS PULSING SCREEN
          <View style={styles.alarmContainer}>
            <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}>
              <Avatar.Icon size={120} icon="alert-octagon" style={{ backgroundColor: '#351515' }} color="#FF3B30" />
            </Animated.View>
            <Text variant="headlineMedium" style={styles.activeTitle}>ALARM ACTIVE</Text>
            <Text variant="bodyMedium" style={[styles.activeSubtitle, { color: theme.colors.outline }]}>
              Security guards are tracking your location (Flat {profile?.wing}-{profile?.flat_number})
            </Text>

            <Button
              mode="contained"
              onPress={handleResolveSOS}
              loading={loading}
              disabled={loading}
              style={styles.resolveButton}
              textColor="#FFFFFF"
              buttonColor={theme.colors.primary}
            >
              I Am Safe Now (Resolve)
            </Button>
          </View>
        ) : (
          // TRIGGER SOS PANIC PANEL
          <View style={styles.panicContainer}>
            <IconButton
              icon="alert-octagon"
              iconColor="#FF3B30"
              size={120}
              onPress={handleTriggerSOS}
              style={styles.panicIconButton}
            />
            <Text variant="headlineSmall" style={styles.panicText}>TAP TO PANIC</Text>
            <Text variant="bodySmall" style={[styles.panicSubtitle, { color: theme.colors.outline }]}>
              Triggers instant emergency sirens across control decks
            </Text>

            <TextInput
              label="Add Comment (Optional)"
              placeholder="e.g. Medical issue, Intruder seen"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              style={styles.input}
              disabled={loading}
            />

            <Button
              mode="contained"
              onPress={handleTriggerSOS}
              loading={loading}
              disabled={loading}
              style={styles.triggerButton}
              buttonColor="#FF3B30"
              textColor="#FFFFFF"
              icon="alert"
            >
              Trigger Emergency Alarm
            </Button>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 48,
  },
  title: {
    fontWeight: 'bold',
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alarmContainer: {
    alignItems: 'center',
    gap: 16,
  },
  pulseCircle: {
    borderRadius: 999,
    padding: 8,
  },
  activeTitle: {
    fontWeight: 'bold',
    color: '#FF3B30',
    marginTop: 8,
  },
  activeSubtitle: {
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  resolveButton: {
    marginTop: 24,
    borderRadius: 8,
    width: 240,
    paddingVertical: 4,
  },
  panicContainer: {
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  panicIconButton: {
    backgroundColor: '#351515',
    margin: 0,
  },
  panicText: {
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  panicSubtitle: {
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 16,
  },
  input: {
    width: '100%',
    maxHeight: 52,
    marginBottom: 8,
  },
  triggerButton: {
    borderRadius: 8,
    width: '100%',
    paddingVertical: 6,
  },
});
