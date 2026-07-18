import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useThemeContext } from '@/lib/theme-context';
import { PaperProvider } from 'react-native-paper';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { NotificationProvider } from '@/lib/notification-context';
import { GlobalSOSListener } from '@/components/GlobalSOSListener';
import { FloatingNotificationStack } from '@/components/FloatingNotificationStack';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus, View, Text, StyleSheet, Animated } from 'react-native';
import { Button } from 'react-native-paper';
import { supabase } from '@/lib/supabase';

function AppWithTheme() {
  const { theme } = useThemeContext();
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // Biometric App Lock state
  const [isUnlocked, setIsUnlocked] = React.useState(false);
  const appState = React.useRef(AppState.currentState);

  const authenticate = async () => {
    try {
      // Check if user just logged in with biometrics on LoginScreen
      const justAuth = await AsyncStorage.getItem('just_authenticated_biometrics');
      if (justAuth && Date.now() - parseInt(justAuth) < 15000) {
        await AsyncStorage.removeItem('just_authenticated_biometrics');
        setIsUnlocked(true);
        return;
      }

      const enabled = await AsyncStorage.getItem('biometrics_enabled');
      if (enabled === 'true') {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (hasHardware && isEnrolled) {
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Unlock SocietySync',
            fallbackLabel: 'Use PIN/Password',
          });
          if (result.success) {
            setIsUnlocked(true);
          } else {
            setIsUnlocked(false);
          }
        } else {
          setIsUnlocked(true);
        }
      } else {
        setIsUnlocked(true);
      }
    } catch (e) {
      console.warn('Biometric auth failed:', e);
      setIsUnlocked(true); // Fail-safe fallback
    }
  };

  useEffect(() => {
    if (user && profile && profile.status === 'approved') {
      authenticate();
    } else {
      setIsUnlocked(true);
    }
  }, [user, profile]);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        const enabled = await AsyncStorage.getItem('biometrics_enabled');
        if (enabled === 'true' && user && profile && profile.status === 'approved') {
          setIsUnlocked(false);
          setTimeout(() => {
            authenticate();
          }, 300);
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [user, profile]);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const isProfileCompletion = segments[0] === 'profile-completion';
    const isPendingApproval = segments[0] === 'pending-approval';

    if (!user) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login' as any);
      }
    } else if (!profile) {
      if (!isProfileCompletion) {
        router.replace('/profile-completion' as any);
      }
    } else if (profile.status === 'pending' || profile.status === 'rejected') {
      if (!isPendingApproval) {
        router.replace('/pending-approval' as any);
      }
    } else if (isUnlocked) {
      if (!segments[0]) return;
      const allowedScreens = [
        'settings', 
        'edit-profile', 
        'about', 
        'change-password', 
        'chanda',
        'chanda-detail',
        'chanda-history',
        'chanda-log-entry',
        'chanda-my-entries'
      ];
      const currentSegment = segments[0];
      const isAllowed = allowedScreens.includes(currentSegment);
      if (!inTabsGroup && !isAllowed) {
        router.replace('/(tabs)' as any);
      }
    }
  }, [user, profile, loading, segments, isUnlocked]);

  if (user && profile && profile.status === 'approved' && !isUnlocked) {
    return (
      <PaperProvider theme={theme}>
        <View style={[styles.lockContainer, { backgroundColor: theme.colors.background }]}>
          <Animated.Image
            source={require('@/assets/images/logo.png')}
            style={styles.lockLogo}
            resizeMode="contain"
          />
          <Text style={[styles.lockTitle, { color: theme.colors.onBackground }]}>
            SocietySync Locked
          </Text>
          <Text style={[styles.lockSubtitle, { color: theme.colors.onSurfaceVariant }]}>
            Authenticate with biometrics to unlock the app and access your society dashboard.
          </Text>
          <Button 
            mode="contained" 
            onPress={authenticate} 
            style={styles.unlockButton}
            labelStyle={styles.unlockButtonText}
            buttonColor={theme.colors.primary}
          >
            Unlock App
          </Button>
          <Button 
            mode="text" 
            onPress={async () => {
              await supabase.auth.signOut();
              await AsyncStorage.removeItem('biometrics_enabled');
              setIsUnlocked(true);
            }} 
            textColor={theme.colors.error}
            style={styles.logoutButton}
          >
            Sign Out
          </Button>
        </View>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <NotificationProvider>
        <GlobalSOSListener />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="profile-completion" />
          <Stack.Screen name="pending-approval" />
          <Stack.Screen name="chanda" />
          <Stack.Screen name="chanda-detail" />
          <Stack.Screen name="chanda-history" />
          <Stack.Screen name="chanda-log-entry" />
          <Stack.Screen name="chanda-my-entries" />
        </Stack>
        <FloatingNotificationStack />
      </NotificationProvider>
    </PaperProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <AppWithTheme />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  lockContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  lockLogo: {
    width: 90,
    height: 90,
    marginBottom: 24,
  },
  lockTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  lockSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 280,
    lineHeight: 20,
  },
  unlockButton: {
    width: '100%',
    maxWidth: 260,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  unlockButtonText: {
    fontWeight: 'bold',
  },
  logoutButton: {
    marginTop: 8,
  },
});
