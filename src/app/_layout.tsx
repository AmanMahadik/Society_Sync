import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useThemeContext } from '../lib/theme-context';
import { PaperProvider } from 'react-native-paper';
import { AuthProvider } from '../lib/auth-context';
import { NotificationProvider } from '../lib/notification-context';
import { GlobalSOSListener } from '../components/GlobalSOSListener';
import { FloatingNotificationStack } from '../components/FloatingNotificationStack';

function AppWithTheme() {
  const { theme } = useThemeContext();
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
