/**
 * Enterprise Core Domain Types for SocietySync
 */

export type UserRole = 'resident' | 'security' | 'secretary' | 'admin' | 'master_admin' | 'municipal_viewer';

export type TicketCategory = 'water_low' | 'motor_off' | 'lift_failure' | 'security' | 'sanitation' | 'electricity' | 'other';

export type TicketStatus = 'pending' | 'in_progress' | 'resolved' | 'escalated_48h';

export interface SocietyProfile {
  id: string;
  society_code: string; // e.g. SS-MH-14-AA-0001
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  rto_code: string;
  latitude?: number;
  longitude?: number;
  total_flats: number;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface ComplaintTicket {
  id: string;
  society_id: string;
  user_id: string;
  category: TicketCategory;
  title: string;
  description: string;
  status: TicketStatus;
  sla_hours: number;
  created_at: string;
  escalated_at?: string;
  resolved_at?: string;
}

export interface SOSAlertPayload {
  id: string;
  society_id: string;
  user_id: string;
  flat_number: string;
  wing: string;
  triggered_at: string;
  acknowledged_by?: string;
  acknowledged_at?: string;
  status: 'active' | 'acknowledged' | 'closed';
}

export interface BuildingHealthScore {
  society_id: string;
  score: number; // 0 to 100
  water_uptime_pct: number;
  lift_uptime_pct: number;
  collection_compliance_pct: number;
  open_tickets_count: number;
  sos_incident_count: number;
  computed_at: string;
}

export interface LedgerTransaction {
  id: string;
  society_id: string;
  amount: number;
  type: 'credit' | 'debit';
  category: string;
  description: string;
  receipt_url?: string;
  hash: string;
  previous_hash: string;
  created_at: string;
}
