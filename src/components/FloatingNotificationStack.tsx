import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '../lib/notification-context';
import { FloatingToast } from './FloatingToast';

export const FloatingNotificationStack: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { notifications, dismissNotification } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <View
      style={[
        styles.container,
        { top: insets.top + 8 }
      ]}
      pointerEvents="box-none"
    >
      {notifications.map((notif) => (
        <FloatingToast
          key={notif.id}
          notification={notif}
          onDismiss={() => dismissNotification(notif.id)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
    gap: 8,
    pointerEvents: 'box-none',
  },
});
