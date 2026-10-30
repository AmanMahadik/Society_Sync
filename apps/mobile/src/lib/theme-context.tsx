import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'dark' | 'light' | 'system';

export const premiumDarkTheme = {
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

export const premiumLightTheme = {
  ...MD3LightTheme,
  dark: false,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#00A383',          // Emerald Green (darker for light mode contrast)
    primaryContainer: '#E6F4F1', // Subtle green background
    background: '#F9F9F9',       // Premium Light Background
    surface: '#FFFFFF',          // White Card Background
    surfaceVariant: '#F1F5F9',   // Light slate surface
    onSurfaceVariant: '#1E293B', // Slate dark text
    text: '#1E293B',             // Dark Slate Text
    onSurface: '#1E293B',
    error: '#DC2626',            // SOS Red
    errorContainer: '#FEE2E2',   // Subtle red container
    onErrorContainer: '#991B1B',
    secondary: '#D97706',        // Finance Gold/Amber
    secondaryContainer: '#FEF3C7',
    outline: '#64748B',          // Outlines (Slate)
    elevation: {
      level0: 'transparent',
      level1: '#FFFFFF',
      level2: '#F8FAFC',
      level3: '#F1F5F9',
      level4: '#E2E8F0',
      level5: '#CBD5E1',
    }
  }
};

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  isDark: boolean;
  theme: typeof premiumDarkTheme | typeof premiumLightTheme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const systemScheme = useColorScheme();

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedMode = await AsyncStorage.getItem('sync_theme_mode');
        if (savedMode) {
          setThemeModeState(savedMode as ThemeMode);
        }
      } catch (e) {
        console.error('Failed to load theme preference', e);
      }
    };
    loadTheme();
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem('sync_theme_mode', mode);
    } catch (e) {
      console.error('Failed to save theme preference', e);
    }
  };

  const isDark = themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';
  const theme = isDark ? premiumDarkTheme : premiumLightTheme;

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, isDark, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};
