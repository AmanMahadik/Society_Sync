import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from 'react-native-paper';
// @ts-ignore
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const theme = useTheme();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  const isGuard = profile?.role === 'guard';
  const isMaster = profile?.role === 'master_admin';

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.elevation.level2,
          borderTopWidth: 0,
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.outline,
        tabBarIcon: ({ color, size }) => {
          let iconName = 'home';
          if (route.name === 'index') {
            iconName = 'view-dashboard';
          } else if (route.name === 'chat') {
            iconName = 'forum';
          } else if (route.name === 'finances') {
            iconName = 'cash-multiple';
          } else if (route.name === 'parking') {
            iconName = 'car-connected';
          } else if (route.name === 'profile') {
            iconName = 'account-circle';
          }
          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          tabBarLabel: 'Home',
        }} 
      />
      <Tabs.Screen 
        name="chat" 
        options={{ 
          tabBarLabel: 'Chat',
          href: (isGuard || isMaster) ? null : '/(tabs)/chat',
        }} 
      />
      <Tabs.Screen 
        name="finances" 
        options={{ 
          tabBarLabel: 'Finances',
          href: (isGuard || isMaster) ? null : '/(tabs)/finances',
        }} 
      />
      <Tabs.Screen 
        name="parking" 
        options={{ 
          tabBarLabel: 'Parking',
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          tabBarLabel: 'Profile',
        }} 
      />
    </Tabs>
  );
}
