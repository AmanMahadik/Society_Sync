import React, { useEffect, memo } from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
// @ts-ignore
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  interpolateColor,
  Extrapolation,
} from 'react-native-reanimated';

const AnimatedIcon = Animated.createAnimatedComponent(MaterialCommunityIcons);

// Brand colors mapping for active accent
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

const getTabIconName = (routeName: string, role?: string) => {
  if (routeName === 'index') {
    if (role === 'admin' || role === 'master_admin') return 'shield-home';
    if (role === 'guard') return 'shield-account';
    return 'home-city';
  }
  if (routeName === 'chat') return 'forum';
  if (routeName === 'finances') return 'wallet';
  if (routeName === 'parking') return 'car-connected';
  if (routeName === 'profile') return 'account-circle';
  return 'home';
};

// Premium spring configuration for smooth interactions (High damping, Medium stiffness, Low mass)
const premiumSpringConfig = {
  damping: 20,
  stiffness: 150,
  mass: 0.6,
};

// Reusable animated tab button with premium micro-interactions
const TabButton = memo(({
  isFocused,
  index,
  activeIndex,
  activeColor,
  inactiveColor,
  label,
  iconName,
  onPress,
}: {
  isFocused: boolean;
  index: number;
  activeIndex: Animated.SharedValue<number>;
  activeColor: string;
  inactiveColor: string;
  label: string;
  iconName: string;
  onPress: () => void;
}) => {
  const focusedProgress = useSharedValue(isFocused ? 1 : 0);
  const buttonScale = useSharedValue(1);

  // Sync focused state with spring
  useEffect(() => {
    focusedProgress.value = withSpring(isFocused ? 1 : 0, premiumSpringConfig);
  }, [isFocused]);

  // Press Scale Feedback
  const handlePressIn = () => {
    buttonScale.value = withSpring(0.94, { damping: 12, stiffness: 220 });
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1.0, premiumSpringConfig);
  };

  // Icon animation styles
  const animatedIconStyle = useAnimatedStyle(() => {
    const scale = interpolate(focusedProgress.value, [0, 1], [1.0, 1.15], Extrapolation.CLAMP);
    const translateY = interpolate(focusedProgress.value, [0, 1], [0, -7], Extrapolation.CLAMP);
    const rotate = interpolate(focusedProgress.value, [0, 1], [0, 2], Extrapolation.CLAMP);
    const color = interpolateColor(focusedProgress.value, [0, 1], [inactiveColor, activeColor]);
    const opacity = interpolate(focusedProgress.value, [0, 1], [0.65, 1.0], Extrapolation.CLAMP);

    return {
      transform: [
        { scale },
        { translateY },
        { rotate: `${rotate}deg` }
      ],
      color,
      opacity,
    };
  });

  // Label animation styles (fades in and slides up seamlessly)
  const animatedLabelStyle = useAnimatedStyle(() => {
    const opacity = interpolate(focusedProgress.value, [0.3, 1], [0, 1], Extrapolation.CLAMP);
    const translateY = interpolate(focusedProgress.value, [0, 1], [12, 0], Extrapolation.CLAMP);

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  // Button container feedback scale
  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
    };
  });

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
      style={styles.tabButton}
    >
      <Animated.View style={[styles.iconLabelContainer, animatedButtonStyle]}>
        <AnimatedIcon
          name={iconName}
          size={25}
          style={animatedIconStyle as any}
        />
        <Animated.Text 
          numberOfLines={1}
          style={[styles.label, { color: activeColor }, animatedLabelStyle]}
        >
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
});

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const containerWidth = useSharedValue(0);

  const visibleRoutes = state.routes.filter((route) => {
    const { options } = descriptors[route.key];
    
    // Explicitly filter out Chat and Finances for Guards and Master Admins
    const isGuard = profile?.role === 'guard';
    const isMaster = profile?.role === 'master_admin';
    if (isGuard || isMaster) {
      if (route.name === 'chat' || route.name === 'finances') {
        return false;
      }
    }
    
    return options.href !== null;
  });

  const activeRoute = state.routes[state.index];
  const activeDescriptor = descriptors[activeRoute.key];
  const tabBarStyle = activeDescriptor?.options?.tabBarStyle;

  const activeVisibleIndex = visibleRoutes.findIndex((r) => r.key === activeRoute.key);

  const activeIndex = useSharedValue(activeVisibleIndex >= 0 ? activeVisibleIndex : 0);

  // Animate the gliding transition with premium spring physics
  useEffect(() => {
    if (activeVisibleIndex >= 0) {
      activeIndex.value = withSpring(activeVisibleIndex, premiumSpringConfig);
    }
  }, [activeVisibleIndex]);

  const activeColors = visibleRoutes.map((route) => getTabActiveColor(route.name));
  const inputValues = visibleRoutes.map((_, i) => i);

  // Shared active pill indicator with organic morphing/stretching behavior
  const animatedPillStyle = useAnimatedStyle(() => {
    if (containerWidth.value === 0 || visibleRoutes.length === 0) return { opacity: 0 };

    const totalTabs = visibleRoutes.length;
    const tabWidth = containerWidth.value / totalTabs;
    const basePillWidth = 58; 

    // Stretch capsule horizontally based on movement offset speed
    const diff = activeIndex.value - activeVisibleIndex;
    const stretchX = 1 + Math.min(Math.abs(diff) * 0.45, 0.35); 
    const currentPillWidth = basePillWidth * stretchX;

    // Shift offset so the pill stretches symmetrically from the center
    const leftOffset = activeIndex.value * tabWidth + (tabWidth - currentPillWidth) / 2;

    const activeColor = interpolateColor(
      activeIndex.value,
      inputValues,
      activeColors
    );

    return {
      width: currentPillWidth,
      transform: [
        { translateX: leftOffset },
      ],
      backgroundColor: activeColor,
    };
  });

  const bottomInset = insets.bottom > 0 ? insets.bottom : 12;

  // Safe placement of conditional check after all hooks have executed
  // @ts-ignore
  if (tabBarStyle && tabBarStyle.display === 'none') {
    return null;
  }

  return (
    <View
      onLayout={(e) => {
        containerWidth.value = e.nativeEvent.layout.width;
      }}
      style={[
        styles.tabBarContainer,
        {
          bottom: bottomInset,
        },
      ]}
    >
      {/* Gliding & Morphing Capsule Pill Background */}
      <Animated.View style={[styles.pillBackground, animatedPillStyle]} />

      {/* Reusable Tab Buttons */}
      {visibleRoutes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = activeVisibleIndex === index;
        const activeColor = getTabActiveColor(route.name);
        const inactiveColor = '#8A8A8A';
        const iconName = getTabIconName(route.name, profile?.role);

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <TabButton
            key={route.key}
            isFocused={isFocused}
            index={index}
            activeIndex={activeIndex}
            activeColor={activeColor}
            inactiveColor={inactiveColor}
            label={label as string}
            iconName={iconName}
            onPress={onPress}
          />
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const { profile } = useAuth();

  const isGuard = profile?.role === 'guard';
  const isMaster = profile?.role === 'master_admin';

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel:
            profile?.role === 'admin' || profile?.role === 'master_admin'
              ? 'Admin Dash'
              : profile?.role === 'guard'
              ? 'Guard Panel'
              : 'Home',
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarLabel: 'Chat',
          href: isGuard || isMaster ? null : '/(tabs)/chat',
        }}
      />
      <Tabs.Screen
        name="finances"
        options={{
          tabBarLabel: 'Finances',
          href: isGuard || isMaster ? null : '/(tabs)/finances',
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

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 24,
    height: 74,
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
    zIndex: 1000,
  },
  pillBackground: {
    position: 'absolute',
    height: 42,
    borderRadius: 21,
    top: (74 - 42) / 2,
    opacity: 0.12, // soft glow active pill
    zIndex: 0,
  },
  tabButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  iconLabelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  label: {
    position: 'absolute',
    bottom: 12,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
