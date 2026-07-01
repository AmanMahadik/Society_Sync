import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useThemeContext } from '@/lib/theme-context';
import { PaperProvider } from 'react-native-paper';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { NotificationProvider } from '@/lib/notification-context';
import { GlobalSOSListener } from '@/components/GlobalSOSListener';
import { FloatingNotificationStack } from '@/components/FloatingNotificationStack';

function AppWithTheme() {
  const { theme } = useThemeContext();
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

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
    } else {
      const allowedScreens = ['settings', 'edit-profile', 'about', 'change-password'];
      const currentSegment = segments[0];
      const isAllowed = allowedScreens.includes(currentSegment);
      if (!inTabsGroup && !isAllowed) {
        router.replace('/(tabs)' as any);
      }
    }
  }, [user, profile, loading, segments]);

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
