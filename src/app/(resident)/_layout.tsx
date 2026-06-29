import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { useTheme } from 'react-native-paper';
// @ts-ignore
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth-context';

export default function ResidentLayout() {
  const theme = useTheme();
  const { user, profile, loading } = useAuth();

  if (loading) return null;

  // Protect route
  if (!user || profile?.role !== 'resident') {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.elevation.level1,
          borderTopWidth: 0,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#00D4AA', // Emerald green for resident
        tabBarInactiveTintColor: theme.colors.outline,
        tabBarIcon: ({ color, size }) => {
          let iconName: any = 'home';
          if (route.name === 'index') iconName = 'home-city';
          else if (route.name === 'announcements') iconName = 'bullhorn';
          else if (route.name === 'complaints') iconName = 'message-alert';
          else if (route.name === 'sos') iconName = 'alert-octagon';
          else if (route.name === 'profile') iconName = 'account-circle';
          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ tabBarLabel: 'Home' }} />
      <Tabs.Screen name="announcements" options={{ tabBarLabel: 'Bulletins' }} />
      <Tabs.Screen name="complaints" options={{ tabBarLabel: 'Complaints' }} />
      <Tabs.Screen name="sos" options={{ tabBarLabel: 'SOS Trigger' }} />
      <Tabs.Screen name="profile" options={{ tabBarLabel: 'Profile' }} />
    </Tabs>
  );
}
