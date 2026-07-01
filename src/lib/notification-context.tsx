import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './auth-context';
import { supabase } from './supabase';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

export interface AppNotification {
  id: string;
  type: 'sos_full' | 'sos_info' | 'confirmation' | 'status_update' | 'parking_alert';
  message: string;
  subtext?: string;
  autoDismiss?: boolean;
  dismissAfterMs?: number;
  onAction?: () => void | Promise<void>;
  actionLabel?: string;
  color?: string;
  complaintId?: string | number;
  wing?: string;
  flat_number?: string;
  created_at: Date;
}

interface NotificationContextProps {
  notifications: AppNotification[];
  activeSOSCount: number;
  addNotification: (notification: Omit<AppNotification, 'id' | 'created_at'>) => void;
  dismissNotification: (id: string) => void;
  refreshSOSCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeSOSCount, setActiveSOSCount] = useState(0);

  // Play warning sound for emergencies
  const playAlertSound = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: false,
      });
      // Remote warning buzzer sound (alarm)
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://www.soundjay.com/buttons/sounds/button-10.mp3' }
      );
      await sound.playAsync();
      // Auto unload sound from memory after playing to prevent leaks
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
        }
      });
    } catch (e) {
      console.warn('Failed to play alert sound:', e);
    }
  }, []);

  // Trigger error feedback vibration on mobile devices
  const triggerHapticFeedback = useCallback(async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (e) {
      console.warn('Failed to trigger haptic feedback:', e);
    }
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback((n: Omit<AppNotification, 'id' | 'created_at'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newNotification: AppNotification = {
      ...n,
      id,
      created_at: new Date(),
    };

    setNotifications((prev) => {
      // Prevent duplicates of the same active complaint ID
      if (n.complaintId && prev.some((existing) => existing.complaintId === n.complaintId && existing.type === n.type)) {
        return prev;
      }
      return [...prev, newNotification];
    });

    // Play sound and vibration for security alarms
    if (n.type === 'sos_full' || n.type === 'sos_info') {
      playAlertSound();
      triggerHapticFeedback();
    }

    // Auto dismiss timer if set
    if (n.autoDismiss) {
      setTimeout(() => {
        dismissNotification(id);
      }, n.dismissAfterMs || 5000);
    }
  }, [playAlertSound, triggerHapticFeedback, dismissNotification]);

  const refreshSOSCount = useCallback(async () => {
    if (!user || !profile) {
      setActiveSOSCount(0);
      return;
    }
    // Only Guard and Admin track active emergency counts
    if (profile.role !== 'guard' && profile.role !== 'admin') {
      setActiveSOSCount(0);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('id')
        .eq('type', 'security')
        .eq('status', 'pending');
      
      if (!error && data) {
        setActiveSOSCount(data.length);
      }
    } catch (e) {
      console.warn('Error fetching active SOS count:', e);
    }
  }, [user, profile]);

  // Check active SOS alerts on session load or profile change
  useEffect(() => {
    refreshSOSCount();
    // Fallback polling for offline/realtime disconnect recovery
    const interval = setInterval(refreshSOSCount, 15000);
    return () => clearInterval(interval);
  }, [refreshSOSCount]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        activeSOSCount,
        addNotification,
        dismissNotification,
        refreshSOSCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
