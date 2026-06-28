import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { useTheme } from 'react-native-paper';
// @ts-ignore
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth-context';

export default function MasterLayout() {
  const theme = useTheme();
  const { user, profile, loading } = useAuth();

  if (loading) return null;

  // Protect route
  if (!user || profile?.role !== 'master_admin') {
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
        tabBarActiveTintColor: '#FF3B30', // Authoritative red for master admin
        tabBarInactiveTintColor: theme.colors.outline,
        tabBarIcon: ({ color, size }) => {
          let iconName: any = 'shield-crown';
          if (route.name === 'index') iconName = 'shield-crown';
          else if (route.name === 'societies') iconName = 'office-building';
          else if (route.name === 'users') iconName = 'account-multiple';
          else if (route.name === 'sos') iconName = 'alarm-light';
          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ tabBarLabel: 'Dashboard' }} />
      <Tabs.Screen name="societies" options={{ tabBarLabel: 'Societies' }} />
      <Tabs.Screen name="users" options={{ tabBarLabel: 'Users' }} />
      <Tabs.Screen name="sos" options={{ tabBarLabel: 'SOS alerts' }} />
    </Tabs>
  );
}
