import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Animated, Platform } from 'react-native';
import { ActivityIndicator, BottomNavigation, Text, useTheme, MD3DarkTheme } from 'react-native-paper';
import { useAuth } from '../lib/auth-context';
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
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Configure foreground floating notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00D4AA',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notifications!');
      return null;
    }
    
    // Get the Expo push token
    const token = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants?.expoConfig?.extra?.eas?.projectId,
    })).data;
    return token;
  } else {
    console.warn('Must use physical device for Push Notifications');
    return null;
  }
}

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
  const theme = useTheme();

  // Navigation State between Login and Register
  const [isRegistering, setIsRegistering] = useState(false);

  // Bottom Tab Navigation State
  const [index, setIndex] = useState(0);

  // Premium logo breathing/pulsing fade-in/out animation value
  const fadeAnim = React.useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0.35,
            duration: 1200,
            useNativeDriver: true,
          })
        ])
      ).start();
    }
  }, [loading]);

  // Register push token for notifications
  useEffect(() => {
    const savePushToken = async () => {
      if (user && profile) {
        try {
          const token = await registerForPushNotificationsAsync();
          if (token && profile.notification_token !== token) {
            await supabase
              .from('profiles')
              .update({ notification_token: token })
              .eq('id', user.id);
          }
        } catch (err) {
          console.warn('Error saving push token:', err);
        }
      }
    };
    savePushToken();
  }, [user, profile]);

  // Request critical permissions (Notifications, Camera, and Gallery) on startup after loading screen finishes
  useEffect(() => {
    const requestPermissionsOnStartup = async () => {
      try {
        // 1. Notifications Permission
        const { status: notifStatus } = await Notifications.getPermissionsAsync();
        if (notifStatus !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }

        // 2. Camera Permission (for profile pictures / finance receipts)
        const { status: cameraStatus } = await ImagePicker.getCameraPermissionsAsync();
        if (cameraStatus !== 'granted') {
          await ImagePicker.requestCameraPermissionsAsync();
        }

        // 3. Media Library / Gallery Permission (for picking photos / saving files)
        const { status: libraryStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
        if (libraryStatus !== 'granted') {
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        }
      } catch (error) {
        console.warn('Error requesting permissions on startup:', error);
      }
    };

    if (!loading) {
      requestPermissionsOnStartup();
    }
  }, [loading]);

  // Dynamically set routes based on user role to redirect them to the correct dashboard and screens
  const routes = React.useMemo(() => {
    const role = profile?.role || 'renter';
    switch (role) {
      case 'admin':
        return [
          { key: 'home', title: 'Admin Dash', focusedIcon: 'shield-home', unfocusedIcon: 'shield-home-outline' },
          { key: 'finances', title: 'Finances', focusedIcon: 'wallet', unfocusedIcon: 'wallet-outline' },
          { key: 'parking', title: 'Parking', focusedIcon: 'car', unfocusedIcon: 'car-outline' },
          { key: 'chat', title: 'Chat', focusedIcon: 'forum', unfocusedIcon: 'forum-outline' },
          { key: 'profile', title: 'Admin Profile', focusedIcon: 'account-circle', unfocusedIcon: 'account-circle-outline' },
        ];
      case 'guard':
        return [
          { key: 'home', title: 'Guard Panel', focusedIcon: 'shield-account', unfocusedIcon: 'shield-account-outline' },
          { key: 'parking', title: 'Gate Entry', focusedIcon: 'car', unfocusedIcon: 'car' },
          { key: 'profile', title: 'Profile', focusedIcon: 'account-circle', unfocusedIcon: 'account-circle-outline' },
        ];
      case 'owner':
        return [
          { key: 'home', title: 'Home', focusedIcon: 'home-city', unfocusedIcon: 'home-city-outline' },
          { key: 'finances', title: 'Finances', focusedIcon: 'wallet', unfocusedIcon: 'wallet-outline' },
          { key: 'parking', title: 'Parking', focusedIcon: 'car', unfocusedIcon: 'car-outline' },
          { key: 'chat', title: 'Chat', focusedIcon: 'forum', unfocusedIcon: 'forum-outline' },
          { key: 'profile', title: 'Profile', focusedIcon: 'account-circle', unfocusedIcon: 'account-circle-outline' },
        ];
      case 'renter':
      default:
        return [
          { key: 'home', title: 'Home', focusedIcon: 'home-city', unfocusedIcon: 'home-city-outline' },
          { key: 'finances', title: 'My Dues', focusedIcon: 'wallet', unfocusedIcon: 'wallet-outline' },
          { key: 'parking', title: 'Parking', focusedIcon: 'car', unfocusedIcon: 'car-outline' },
          { key: 'chat', title: 'Read Chat', focusedIcon: 'forum', unfocusedIcon: 'forum-outline' },
          { key: 'profile', title: 'Profile', focusedIcon: 'account-circle', unfocusedIcon: 'account-circle-outline' },
        ];
    }
  }, [profile]);

  // Safely adjust index if routes change
  useEffect(() => {
    if (index >= routes.length) {
      setIndex(0);
    }
  }, [routes]);

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
        <Animated.Image
          source={require('../../assets/images/logo.png')}
          style={[
            styles.loadingLogo,
            {
              opacity: fadeAnim,
              transform: [
                {
                  scale: fadeAnim.interpolate({
                    inputRange: [0.35, 1],
                    outputRange: [0.94, 1.06],
                  }),
                },
              ],
            },
          ]}
          resizeMode="contain"
        />
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

  const safeIndex = index < routes.length ? index : 0;

  // Helper to dynamically set active tab color based on brand color system
  const getTabActiveColor = () => {
    if (!routes[safeIndex]) return '#00D4AA';
    switch (routes[safeIndex].key) {
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
        navigationState={{ index: safeIndex, routes }}
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
  return <AppRouterController />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingLogo: {
    width: 110,
    height: 110,
    borderRadius: 22,
  },
  loadingText: {
    fontSize: 13,
  },
});
