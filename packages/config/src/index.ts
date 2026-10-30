/**
 * Shared System Constants and Environment Configurations
 */

export const APP_CONFIG = {
  NAME: 'SocietySync',
  TAGLINE: 'Digital Governance & Basic-Service Assurance Platform',
  DEFAULT_SLA_HOURS: {
    LIFT: 24,
    WATER: 12,
    ELECTRICITY: 6,
    SECURITY: 2,
    DEFAULT: 48
  },
  ESCALATION_THRESHOLD_HOURS: 48,
  MICRO_PAYMENT_MIN: 100,
  MICRO_PAYMENT_MAX: 1000,
  SUPPORT_PHONE: '+91-20-35543099',
  GOVERNMENT_PORTAL_NAME: 'PCMC / SRA Urban Service Redressal'
} as const;

export const RTO_DISTRICT_CODES: Record<string, string> = {
  PUNE: 'MH-12',
  PIMPRI_CHINCHWAD: 'MH-14',
  MUMBAI_CENTRAL: 'MH-01',
  MUMBAI_WEST: 'MH-02',
  MUMBAI_EAST: 'MH-03',
  THANE: 'MH-04',
  NAGPUR: 'MH-31'
};
