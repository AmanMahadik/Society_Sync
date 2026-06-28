import React, { useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth-context';

export default function IndexRoute() {
  const theme = useTheme();
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  
  // Pulsing loading animation
  const fadeAnim = React.useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.4,
          duration: 1000,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/(auth)/login' as any);
    } else if (profile) {
      if (profile.role === 'master_admin') {
        router.replace('/(master)' as any);
      } else if (profile.role === 'admin') {
        router.replace('/(admin)' as any);
      } else if (profile.role === 'resident') {
        router.replace('/(resident)' as any);
      }
    }
  }, [user, profile, loading]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Animated.Image
        source={require('../../assets/images/logo.png')}
        style={[styles.logo, { opacity: fadeAnim }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 100,
  },
});
