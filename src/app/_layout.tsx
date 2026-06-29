import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useThemeContext } from '../lib/theme-context';
import { PaperProvider } from 'react-native-paper';
import { AuthProvider } from '../lib/auth-context';
import { NotificationProvider } from '../lib/notification-context';
import { GlobalSOSListener } from '../components/GlobalSOSListener';
import { FloatingNotificationStack } from '../components/FloatingNotificationStack';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth-context';

function AppWithTheme() {
  const { theme } = useThemeContext();
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [hasLoggedIn, setHasLoggedIn] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (user && profile) {
      setHasLoggedIn(true);
      if (profile.role === 'master_admin') {
        router.replace('/(master)' as any);
      } else if (profile.role === 'admin') {
        router.replace('/(admin)' as any);
      } else {
        // Redirect owners, renters, guards, and default residents to (resident) workspace
        router.replace('/(resident)' as any);
      }
    } else if (!user && hasLoggedIn) {
      setHasLoggedIn(false);
      router.replace('/(auth)/login' as any);
    }
  }, [user, profile, loading, hasLoggedIn]);

  return (
    <PaperProvider theme={theme}>
      <NotificationProvider>
        <GlobalSOSListener />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(master)" />
          <Stack.Screen name="(admin)" />
          <Stack.Screen name="(resident)" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="about" />
          <Stack.Screen name="edit-profile" />
          <Stack.Screen name="change-password" />
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
