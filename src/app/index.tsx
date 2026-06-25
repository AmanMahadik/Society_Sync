import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, BottomNavigation, PaperProvider, MD3DarkTheme, Text } from 'react-native-paper';
import { AuthProvider, useAuth } from '../lib/auth-context';
import { LoginScreen } from '../components/auth/LoginScreen';
import { RegisterScreen } from '../components/auth/RegisterScreen';
import { ProfileCompletionScreen } from '../components/auth/ProfileCompletionScreen';
import { PendingApprovalScreen } from '../components/auth/PendingApprovalScreen';
import { HomeScreen } from '../components/screens/HomeScreen';
import { FinancesScreen } from '../components/screens/FinancesScreen';
import { ParkingScreen } from '../components/screens/ParkingScreen';
import { ChatScreen } from '../components/screens/ChatScreen';
import { ProfileScreen } from '../components/screens/ProfileScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Premium Branded Dark Theme matching SocietySync Design Specifications
const premiumDarkTheme = {
  ...MD3DarkTheme,
  dark: true,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#00D4AA',          // Emerald Green
    primaryContainer: '#122C24', // Subtle green background for containers
    background: '#0F0F0F',       // Sleek Dark Background
    surface: '#1E1E1E',          // Card Background
    surfaceVariant: '#252525',   // Slightly lighter surface
    onSurfaceVariant: '#FFFFFF',
    text: '#FFFFFF',             // White Text
    onSurface: '#FFFFFF',
    error: '#FF3B30',            // SOS Red
    errorContainer: '#351515',   // Subtle red container
    onErrorContainer: '#FFD1D1',
    secondary: '#FFD700',        // Finance Gold
    secondaryContainer: '#302A00',
    outline: '#888888',          // Outlines
    elevation: {
      level0: 'transparent',
      level1: '#1A1A1A',
      level2: '#222222',
      level3: '#2A2A2A',
      level4: '#323232',
      level5: '#3A3A3A',
    }
  }
};

// Main App Router Controller
const AppRouterController: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const theme = premiumDarkTheme; // Force premium dark theme across all screens

  // Navigation State between Login and Register
  const [isRegistering, setIsRegistering] = useState(false);

  // Bottom Tab Navigation State
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'home', title: 'Home', focusedIcon: 'home-city', unfocusedIcon: 'home-city-outline' },
    { key: 'finances', title: 'Finances', focusedIcon: 'wallet', unfocusedIcon: 'wallet-outline' },
    { key: 'parking', title: 'Parking', focusedIcon: 'car', unfocusedIcon: 'car-outline' },
    { key: 'chat', title: 'Chat', focusedIcon: 'forum', unfocusedIcon: 'forum-outline' },
    { key: 'profile', title: 'Profile', focusedIcon: 'account-circle', unfocusedIcon: 'account-circle-outline' },
  ]);

  // Scene mapping for tabs
  const renderScene = BottomNavigation.SceneMap({
    home: HomeScreen,
    finances: FinancesScreen,
    parking: ParkingScreen,
    chat: ChatScreen,
    profile: ProfileScreen,
  });

  // 1. Loading State Screen
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ color: theme.colors.primary, marginTop: 12, fontWeight: 'bold' }}>
          SocietySync
        </Text>
        <Text style={[styles.loadingText, { color: theme.colors.outline, marginTop: 4 }]}>
          Connecting to Digital Council...
        </Text>
      </View>
    );
  }

  // 2. Unauthenticated Stack (Login / Register)
  if (!user) {
    if (isRegistering) {
      return <RegisterScreen onNavigateToLogin={() => setIsRegistering(false)} />;
    }
    return <LoginScreen onNavigateToRegister={() => setIsRegistering(true)} />;
  }

  // 3. Onboarding Profile Completion Gate
  if (user && (!profile || !profile.flat_number || !profile.wing)) {
    return <ProfileCompletionScreen />;
  }

  // 4. Pending Admin Approval Screen
  if (profile && profile.status === 'pending') {
    return <PendingApprovalScreen />;
  }

  // Helper to dynamically set active tab color based on brand color system
  const getTabActiveColor = () => {
    switch (routes[index].key) {
      case 'home': return '#00D4AA';     // Emerald Green
      case 'finances': return '#FFD700'; // Gold
      case 'parking': return '#3B82F6';  // Blue
      case 'chat': return '#8B5CF6';     // Purple
      case 'profile': return '#06B6D4';  // Cyan
      default: return '#00D4AA';
    }
  };

  // 5. Authenticated & Approved - Main App Navigation
  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <BottomNavigation
        navigationState={{ index, routes }}
        onIndexChange={setIndex}
        renderScene={renderScene}
        barStyle={{ backgroundColor: theme.colors.elevation.level2 }}
        activeColor={getTabActiveColor()} // Dynamic brand tab color!
        inactiveColor={theme.colors.outline}
        shifting={true}
      />
    </SafeAreaProvider>
  );
};

// Root App entry point
export default function AppEntry() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={premiumDarkTheme}>
        <AuthProvider>
          <AppRouterController />
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
  },
});
