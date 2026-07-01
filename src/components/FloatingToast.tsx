import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, useWindowDimensions } from 'react-native';
import { Text, Card, Button, IconButton, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { AppNotification } from '../lib/notification-context';

interface FloatingToastProps {
  notification: AppNotification;
  onDismiss: () => void;
}

export const FloatingToast: React.FC<FloatingToastProps> = ({ notification, onDismiss }) => {
  const { type, message, subtext, autoDismiss, dismissAfterMs, onAction, actionLabel, color, complaintId } = notification;
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();

  // Entrance Slide & Fade Animation
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Pulsing Border Animation for Guard emergency alerts
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // Progress Bar for Auto-dismiss alerts
  const progressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance Animation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse Animation for guards
    if (type === 'sos_full') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }

    // Progress Bar Animation for auto-dismiss alerts
    if (autoDismiss && dismissAfterMs) {
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: dismissAfterMs,
        useNativeDriver: false,
      }).start();
    }
  }, [type, autoDismiss, dismissAfterMs]);

  // Interpolate pulse values into colors
  const pulseBorderColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 59, 48, 0.3)', 'rgba(255, 59, 48, 1)'],
  });

  const handleAction = async () => {
    if (type === 'sos_info' && complaintId) {
      // Deep link Admin directly to the custom SOS detail screen
      router.push(`/(admin)/sos-detail?id=${complaintId}` as any);
      onDismiss();
    } else if (onAction) {
      await onAction();
      onDismiss();
    }
  };

  // Responsive sizing width
  const isTablet = width >= 768;
  const toastWidth = isTablet ? 480 : '100%';
  const selfAlign = isTablet ? 'center' : 'auto';

  // Determine Toast Styles based on notification type
  const getToastConfig = () => {
    switch (type) {
      case 'sos_full':
        return {
          backgroundColor: '#351515',
          titleColor: '#FF3B30',
          textColor: '#FFD1D1',
          icon: 'bell-ring',
          iconColor: '#FF3B30',
        };
      case 'sos_info':
        return {
          backgroundColor: '#1A2332',
          titleColor: '#FFD700',
          textColor: '#E2E8F0',
          icon: 'shield-alert',
          iconColor: '#FFD700',
        };
      case 'confirmation':
        return {
          backgroundColor: '#1E4620',
          titleColor: '#81C784',
          textColor: '#E8F5E9',
          icon: 'check-circle',
          iconColor: '#81C784',
        };
      case 'parking_alert':
        return {
          backgroundColor: '#112233',
          titleColor: '#0EA5E9',
          textColor: '#E0F2FE',
          icon: 'car',
          iconColor: '#0EA5E9',
        };
      case 'status_update':
      default:
        return {
          backgroundColor: color ? `${color}25` : theme.colors.elevation.level3,
          titleColor: color || theme.colors.primary,
          textColor: theme.colors.onSurface,
          icon: 'information-outline',
          iconColor: color || theme.colors.primary,
        };
    }
  };

  const config = getToastConfig();

  return (
    <Animated.View
      style={[
        styles.toastWrapper,
        {
          width: toastWidth,
          alignSelf: selfAlign,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: config.backgroundColor,
            borderColor: type === 'sos_full' ? pulseBorderColor : (type === 'sos_info' ? '#FFD700' : 'transparent'),
            borderWidth: type === 'sos_full' || type === 'sos_info' ? 1.5 : 0,
          },
        ]}
      >
        <Card.Content style={styles.cardContent}>
          <View style={styles.toastHeader}>
            <View style={styles.toastTitleRow}>
              <IconButton
                icon={config.icon}
                iconColor={config.iconColor}
                size={20}
                style={styles.headerIcon}
              />
              <Text variant="titleMedium" style={[styles.title, { color: config.titleColor }]}>
                {message}
              </Text>
            </View>
            {type !== 'sos_full' && (
              <IconButton
                icon="close"
                iconColor={theme.colors.outline}
                size={16}
                style={styles.closeButton}
                onPress={onDismiss}
              />
            )}
          </View>

          {subtext && (
            <Text variant="bodyMedium" style={[styles.subtext, { color: config.textColor }]}>
              {subtext}
            </Text>
          )}

          {/* Action buttons footer */}
          {(type === 'sos_full' || actionLabel) && (
            <View style={styles.actionRow}>
              {type === 'sos_full' ? (
                <>
                  <Button
                    mode="outlined"
                    onPress={onDismiss}
                    textColor="#FFD1D1"
                    style={[styles.actionBtn, { borderColor: '#FF3B30' }]}
                    labelStyle={styles.btnLabel}
                    compact
                  >
                    DISMISS
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleAction}
                    buttonColor="#FF3B30"
                    textColor="#FFF"
                    style={styles.actionBtn}
                    labelStyle={[styles.btnLabel, { fontWeight: 'bold' }]}
                    compact
                  >
                    {actionLabel || 'ACKNOWLEDGE'}
                  </Button>
                </>
              ) : (
                <Button
                  mode="text"
                  onPress={handleAction}
                  textColor={config.titleColor}
                  labelStyle={[styles.btnLabel, { fontWeight: 'bold' }]}
                  style={{ alignSelf: 'flex-end', marginTop: 4 }}
                  compact
                >
                  {actionLabel}
                </Button>
              )}
            </View>
          )}
        </Card.Content>

        {/* Gold progress bar showing remaining auto-dismiss lifespan */}
        {autoDismiss && dismissAfterMs && (
          <Animated.View
            style={[
              styles.progressBar,
              {
                backgroundColor: config.titleColor,
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        )}
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 0,
  },
  cardContent: {
    padding: 12,
  },
  toastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  toastTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    margin: 0,
    marginRight: 8,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 14,
    flex: 1,
  },
  closeButton: {
    margin: 0,
    padding: 0,
  },
  subtext: {
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 32,
    marginBottom: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
    marginLeft: 32,
  },
  actionBtn: {
    borderRadius: 8,
  },
  btnLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  progressBar: {
    height: 3,
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
});
