import React, { useEffect, useRef } from 'react';
import { Animated, View, useColorScheme } from 'react-native';
import { Tabs } from 'expo-router';
import { useTheme } from 'react-native-paper';
// @ts-ignore
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const getTabActiveColor = (routeName: string) => {
  switch (routeName) {
    case 'index': return '#00d4aa'; // Teal
    case 'chat': return '#3b82f6';  // Blue
    case 'finances': return '#ffd700'; // Yellow
    case 'parking': return '#f57c00'; // Orange
    case 'profile': return '#a855f7'; // Purple
    default: return '#00d4aa';
  }
};

function TabIcon({ name, size, color, focused, activeColor }: { name: string; size: number; color: string; focused: boolean; activeColor: string }) {
  const scaleValue = useRef(new Animated.Value(focused ? 1.05 : 1)).current;
  const opacityValue = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    if (focused) {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleValue, {
            toValue: 1.2,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.spring(scaleValue, {
            toValue: 1.05,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleValue, {
          toValue: 1.0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [focused]);

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: 32, width: 64 }}>
      {/* Capsule Pill Backdrop */}
      <Animated.View style={{
        position: 'absolute',
        width: 56,
        height: 28,
        borderRadius: 14,
        backgroundColor: activeColor + '18', // 10% opacity tint of active tab color
        opacity: opacityValue,
        transform: [{ scale: scaleValue }],
      }} />
      
      {/* Icon */}
      <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
        <MaterialCommunityIcons name={name} size={focused ? size + 1 : size} color={focused ? activeColor : color} />
      </Animated.View>
    </View>
  );
}

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
        tabBarActiveTintColor: getTabActiveColor(route.name),
        tabBarInactiveTintColor: theme.colors.outline,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: 'bold',
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName = 'home';
          if (route.name === 'index') {
            if (profile?.role === 'admin' || profile?.role === 'master_admin') {
              iconName = 'shield-home';
            } else if (profile?.role === 'guard') {
              iconName = 'shield-account';
            } else {
              iconName = 'home-city';
            }
          } else if (route.name === 'chat') {
            iconName = 'forum';
          } else if (route.name === 'finances') {
            iconName = 'cash-multiple';
          } else if (route.name === 'parking') {
            iconName = 'car-connected';
          } else if (route.name === 'profile') {
            iconName = 'account-circle';
          }
          const activeColor = getTabActiveColor(route.name);
          return <TabIcon name={iconName} size={size} color={color} focused={focused} activeColor={activeColor} />;
        },
      })}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          tabBarLabel: (profile?.role === 'admin' || profile?.role === 'master_admin') 
            ? 'Admin Dash' 
            : (profile?.role === 'guard' ? 'Guard Panel' : 'Home'),
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
