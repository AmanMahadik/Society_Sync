/**
 * Shared Design System & Token Definitions
 */

export const THEME_COLORS = {
  primary: '#1a56db',     // Enterprise Navy Blue
  success: '#0e9f6e',     // Compliance Green
  warning: '#d97706',     // Escalation Amber
  danger: '#e02424',      // Emergency SOS Red
  surface: '#f9fafb',     // Light Neutral Background
  card: '#ffffff',        // Card Surface
  textPrimary: '#111827', // High Contrast Text
  textSecondary: '#6b7280'// Muted Text
} as const;

export const BADGE_VARIANTS = {
  active: { bg: '#def7ec', text: '#03543f' },
  pending: { bg: '#fef08a', text: '#713f12' },
  escalated_48h: { bg: '#fde8e8', text: '#9b1c1c' },
  resolved: { bg: '#e1effe', text: '#1e429f' }
} as const;
