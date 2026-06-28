import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { useTheme } from 'react-native-paper';
// @ts-ignore
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth-context';

export default function AdminLayout() {
  const theme = useTheme();
  const { user, profile, loading } = useAuth();

  if (loading) return null;

  // Protect route
  if (!user || profile?.role !== 'admin') {
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
        tabBarActiveTintColor: theme.colors.primary, // Emerald green for admin
        tabBarInactiveTintColor: theme.colors.outline,
        tabBarIcon: ({ color, size }) => {
          let iconName: any = 'home';
          if (route.name === 'index') iconName = 'view-dashboard';
          else if (route.name === 'residents') iconName = 'account-group';
          else if (route.name === 'announcements') iconName = 'bullhorn';
          else if (route.name === 'sos') iconName = 'alert-decagram';
          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ tabBarLabel: 'Dashboard' }} />
      <Tabs.Screen name="residents" options={{ tabBarLabel: 'Residents' }} />
      <Tabs.Screen name="announcements" options={{ tabBarLabel: 'Announcements' }} />
      <Tabs.Screen name="sos" options={{ tabBarLabel: 'SOS' }} />
    </Tabs>
  );
}
