import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Role and Status types
export type UserRole = 'admin' | 'owner' | 'renter' | 'guard';
export type UserStatus = 'pending' | 'approved' | 'rejected';
export type ComplaintStatus = 'pending' | 'acknowledged' | 'resolved' | 'ignored';
export type ParkingTimeSlot = 'morning' | 'afternoon' | 'evening' | 'overnight';
export type ParkingStatus = 'pending' | 'approved' | 'rejected' | 'completed';

// 1. Profiles
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  flat_number: string;
  wing: string;
  role: UserRole;
  society_name: string;
  status: UserStatus;
  google_picture_url?: string | null;
  phone?: string | null;
  created_at?: string;
  approved_at?: string | null;
  notification_token?: string | null;
  vehicle_number?: string | null;
  bio?: string | null;
}

// 2. Events (Festival Ledger)
export interface Event {
  id: string;
  name: string;
  description?: string;
  event_date?: string;
  total_income: number;
  total_expense: number;
  balance: number;
  created_by?: string;
  created_at?: string;
  is_active: boolean;
}

// 3. Transactions (Income/Expense entries)
export interface Transaction {
  id: string;
  event_id: string;
  type: 'income' | 'expense';
  category: string; // e.g. 'Chandaa', 'Pandal', 'Sound System', 'Food'
  amount: number;
  description?: string;
  bill_image_url?: string | null;
  recorded_by: string;
  recorded_by_name?: string;
  recorded_at?: string;
}

// 4. Maintenance Dues
export interface MaintenanceDue {
  id: string;
  flat_number: string;
  wing: string;
  month: string; // First day of month (YYYY-MM-DD)
  amount: number;
  paid_amount: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  due_date: string;
  paid_at?: string | null;
  interest_charged: number;
  created_at?: string;
  updated_at?: string;
}

// 5. Parking Slots
export interface ParkingSlot {
  id: string;
  slot_number: string;
  is_available: boolean;
}

// 6. Parking Requests
export interface ParkingRequest {
  id: string;
  user_id: string;
  slot_id: string;
  slot_number?: string;
  date: string;
  time_slot: ParkingTimeSlot;
  vehicle_number: string;
  visitor_name?: string;
  status: ParkingStatus;
  created_at?: string;
  approved_at?: string | null;
  approved_by?: string | null;
  user_name?: string;
  user_flat?: string;
}

// 7. Complaints (SOS Alerts)
export interface Complaint {
  id: string;
  user_id: string;
  type: 'water_low' | 'motor_off' | 'electricity' | 'security' | 'other';
  wing: string;
  flat_number: string;
  description?: string;
  status: ComplaintStatus;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  acknowledged_by?: string | null;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  created_at: string;
  user_name?: string;
}

// 8. Chat Threads
export interface ChatThread {
  id: string;
  title: string;
  category: 'water-infrastructure' | 'budget' | 'events' | 'maintenance' | 'security' | 'general';
  created_by?: string;
  is_archived: boolean;
  created_at?: string;
}

// 9. Chat Messages
export interface ChatMessage {
  id: string;
  thread_id: string;
  user_id: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  sender_name?: string;
  sender_role?: UserRole;
  sender_flat?: string;
  sender_avatar?: string | null;
}

// 10. Voting Polls
export interface Poll {
  id: string;
  title: string;
  description?: string;
  thread_id: string;
  created_by: string;
  expires_at?: string;
  status: 'active' | 'closed';
  created_at?: string;
  options?: PollOption[];
  hasVoted?: boolean;
}

// 11. Poll Options
export interface PollOption {
  id: string;
  poll_id: string;
  option_text: string;
  vote_count: number;
}

// 12. Poll Votes
export interface PollVote {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
}

// 13. Society Settings
export interface SocietySettings {
  id: string;
  society_name: string;
  address?: string;
  maintenance_rate_per_sqft: number;
  late_fee_percentage: number;
  parking_slot_count: number;
  admin_contact?: string;
}

// Helper: Check if Supabase project keys are configured
const isRealSupabaseConfigured = () => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return (
    url && 
    key && 
    url !== 'https://your-supabase-project.supabase.co' && 
    key !== 'your-supabase-anon-key' &&
    !url.includes('placeholder')
  );
};

// INITIAL SEED DATA FOR DEMO OFFLINE MODE ONLY
// Placed inside local variables so it doesn't taint the real production Supabase db!
const INITIAL_DEMO_PROFILES: Profile[] = [
  { id: 'demo-admin', email: 'admin@societysync.demo', full_name: 'Rajesh Kumar (Secretary)', flat_number: '501', wing: 'A', role: 'admin', society_name: 'SocietySync Co-Op', status: 'approved', phone: '9876543210' },
  { id: 'demo-owner', email: 'owner@societysync.demo', full_name: 'Amit Patel', flat_number: '302', wing: 'B', role: 'owner', society_name: 'SocietySync Co-Op', status: 'approved', phone: '9876543211' },
  { id: 'demo-guard', email: 'guard@societysync.demo', full_name: 'Ramu Kaka (Guard)', flat_number: 'Gate', wing: 'G', role: 'guard', society_name: 'SocietySync Co-Op', status: 'approved', phone: '9876543212' },
  { id: 'demo-renter', email: 'renter@societysync.demo', full_name: 'Suresh Sharma', flat_number: '104', wing: 'C', role: 'renter', society_name: 'SocietySync Co-Op', status: 'approved', phone: '9876543213' },
  { id: 'demo-pending', email: 'pending@societysync.demo', full_name: 'Priya Singh', flat_number: '202', wing: 'E', role: 'owner', society_name: 'SocietySync Co-Op', status: 'pending', phone: '9876543214' }
];

const INITIAL_DEMO_EVENTS: Event[] = [
  { id: 'event-1', name: 'Ganesh Utsav 2026', description: 'Society festival celebration chanda and vendor bills', event_date: '2026-09-05', total_income: 85000, total_expense: 23000, balance: 62000, is_active: true },
  { id: 'event-2', name: 'Independence Day 2026', description: 'Flag hoisting and snacks distribution for residents', event_date: '2026-08-15', total_income: 15000, total_expense: 12000, balance: 3000, is_active: true }
];

const INITIAL_DEMO_TXS: Transaction[] = [
  { id: 'tx-1', event_id: 'event-1', type: 'income', category: 'Chandaa', amount: 50000, description: 'Chanda Collection Phase 1', recorded_by: 'demo-admin', recorded_at: new Date(Date.now() - 5 * 24 * 3600000).toISOString() },
  { id: 'tx-2', event_id: 'event-1', type: 'income', category: 'Chandaa', amount: 35000, description: 'Chanda Collection Phase 2', recorded_by: 'demo-admin', recorded_at: new Date(Date.now() - 4 * 24 * 3600000).toISOString() },
  { id: 'tx-3', event_id: 'event-1', type: 'expense', category: 'Pandal', amount: 15000, description: 'Wooden Stage & Backdrop Decoration', bill_image_url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400', recorded_by: 'demo-admin', recorded_at: new Date(Date.now() - 3 * 24 * 3600000).toISOString() },
  { id: 'tx-4', event_id: 'event-1', type: 'expense', category: 'Sound System', amount: 8000, description: 'Sound System & Mic Set Rental', bill_image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', recorded_by: 'demo-admin', recorded_at: new Date(Date.now() - 2 * 24 * 3600000).toISOString() }
];

const INITIAL_DEMO_DUES: MaintenanceDue[] = [
  { id: 'due-1', flat_number: '101', wing: 'A', month: '2026-06-01', amount: 3500, paid_amount: 0, status: 'overdue', due_date: '2026-06-10', interest_charged: 70, created_at: new Date().toISOString() },
  { id: 'due-2', flat_number: '302', wing: 'B', month: '2026-06-01', amount: 3500, paid_amount: 0, status: 'pending', due_date: '2026-07-10', interest_charged: 0, created_at: new Date().toISOString() },
  { id: 'due-3', flat_number: '404', wing: 'C', month: '2026-06-01', amount: 3500, paid_amount: 0, status: 'overdue', due_date: '2026-06-10', interest_charged: 70, created_at: new Date().toISOString() },
  { id: 'due-4', flat_number: '201', wing: 'D', month: '2026-06-01', amount: 3500, paid_amount: 3500, status: 'paid', due_date: '2026-06-10', paid_at: new Date().toISOString(), interest_charged: 0, created_at: new Date().toISOString() },
  { id: 'due-5', flat_number: '503', wing: 'E', month: '2026-06-01', amount: 3500, paid_amount: 0, status: 'pending', due_date: '2026-07-10', interest_charged: 0, created_at: new Date().toISOString() }
];

const INITIAL_DEMO_COMPLAINTS: Complaint[] = [
  { id: 'comp-1', user_id: 'demo-pending', type: 'water_low', wing: 'E', flat_number: '202', description: 'E Wing motor has been off since morning. Water pressure is extremely low.', status: 'pending', priority: 'high', created_at: new Date(Date.now() - 40 * 60000).toISOString() },
  { id: 'comp-2', user_id: 'demo-owner', type: 'electricity', wing: 'B', flat_number: '302', description: 'Phase cut reported in Wing B. Sump pump motor is tripped.', status: 'acknowledged', priority: 'emergency', acknowledged_by: 'demo-admin', acknowledged_at: new Date(Date.now() - 10 * 60000).toISOString(), created_at: new Date(Date.now() - 60 * 60000).toISOString() }
];

const INITIAL_DEMO_THREADS: ChatThread[] = [
  { id: 'thread-1', title: '#Water-Infrastructure', category: 'water-infrastructure', is_archived: false, created_at: new Date().toISOString() },
  { id: 'thread-2', title: '#Annual-Budget', category: 'budget', is_archived: false, created_at: new Date().toISOString() },
  { id: 'thread-3', title: '#Ganesh-Planning', category: 'events', is_archived: false, created_at: new Date().toISOString() },
  { id: 'thread-4', title: '#General-Debates', category: 'general', is_archived: false, created_at: new Date().toISOString() }
];

const INITIAL_DEMO_MESSAGES: ChatMessage[] = [
  { id: 'msg-1', thread_id: 'thread-1', user_id: 'demo-admin', content: 'Water tanker has been ordered for tomorrow morning. Motor cleaning scheduled this Saturday.', is_pinned: false, created_at: new Date(Date.now() - 3 * 3600000).toISOString() },
  { id: 'msg-2', thread_id: 'thread-1', user_id: 'demo-owner', content: 'Thanks Rajesh bhai! Hope the water pressure in E wing resolves after motor cleaning.', is_pinned: false, created_at: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: 'msg-3', thread_id: 'thread-3', user_id: 'demo-admin', content: 'Chanda collection will begin tomorrow. Target contribution is set at ₹2,500 per flat. Let us make Ganesh Utsav transparent!', is_pinned: true, created_at: new Date(Date.now() - 4 * 3600000).toISOString() }
];

const INITIAL_DEMO_POLLS: Poll[] = [
  { id: 'poll-1', title: 'Should we increase monthly maintenance by ₹300 for Lift AMC?', description: 'Current AMC vendor is sub-par. New vendor offers 24/7 support but charges more.', thread_id: 'thread-2', created_by: 'demo-admin', status: 'active', created_at: new Date().toISOString() }
];

const INITIAL_DEMO_POLL_OPTIONS: PollOption[] = [
  { id: 'opt-1', poll_id: 'poll-1', option_text: 'Yes, change vendor (Increase ₹300)', vote_count: 5 },
  { id: 'opt-2', poll_id: 'poll-1', option_text: 'No, keep old vendor (No increase)', vote_count: 2 }
];

const INITIAL_DEMO_SETTINGS: SocietySettings = {
  id: 'settings-1',
  society_name: 'SocietySync Co-Op Housing',
  address: 'Ganesh Nagar, Pune, Maharashtra',
  maintenance_rate_per_sqft: 3.50,
  late_fee_percentage: 2.00,
  parking_slot_count: 10,
  admin_contact: '9876543210'
};

class DataManager {
  private useMock: boolean = false;
  private listeners: { [key: string]: Function[] } = {};

  constructor() {
    this.useMock = false;
    console.log(`SocietySync running in SUPABASE PRODUCTION mode.`);
  }

  setMockMode(mock: boolean) {
    this.useMock = false;
  }

  isMockMode() {
    return false;
  }

  // Real-time Event simulation subscription
  subscribe(key: string, callback: Function) {
    if (!this.listeners[key]) {
      this.listeners[key] = [];
    }
    this.listeners[key].push(callback);
    return () => {
      this.listeners[key] = this.listeners[key].filter(cb => cb !== callback);
    };
  }

  private triggerListener(key: string, data: any) {
    if (this.listeners[key]) {
      this.listeners[key].forEach(cb => cb(data));
    }
  }

  // Real Notification helper
  async createNotification(userId: string, title: string, body: string, data: any = {}): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title,
          body,
          data: data || {},
          is_read: false
        });
      if (error) console.error('Error inserting notification:', error);

      // Fetch user push token and send system push notification via Expo
      const { data: recipientProfile } = await supabase
        .from('profiles')
        .select('notification_token')
        .eq('id', userId)
        .single();
      
      if (recipientProfile?.notification_token) {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: recipientProfile.notification_token,
            sound: 'default',
            title: title,
            body: body,
            data: data || {},
          }),
        });
      }
    } catch (e) {
      console.error('Notification insert catch:', e);
    }
  }

  // ==========================================
  // 1. PROFILES / USER MANAGEMENT
  // ==========================================
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) return null;
    return data;
  }

  async getAllProfiles(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async registerProfile(profile: Profile): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .upsert(profile);
    if (error) throw error;
  }

  async updateProfileApproval(userId: string, approved: boolean): Promise<void> {
    const status: UserStatus = approved ? 'approved' : 'rejected';
    const { error } = await supabase
      .from('profiles')
      .update({ status, approved_at: approved ? new Date().toISOString() : null })
      .eq('id', userId);
    if (error) throw error;

    await this.createNotification(
      userId,
      approved ? `🎉 Roster Approved!` : `⚠️ Roster Rejected`,
      approved 
        ? `Congratulations! Your resident profile has been APPROVED by the Society Secretary.` 
        : `Your resident profile registration has been rejected. Please contact the society office.`
    );
  }

  async updateProfileRole(userId: string, role: UserRole): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);
    if (error) throw error;
  }

  async updateProfileDetails(
    userId: string, 
    fullName: string, 
    phone: string, 
    flat: string, 
    wing: string, 
    society: string,
    vehicleNumber?: string | null,
    bio?: string | null,
    avatarUrl?: string | null
  ): Promise<void> {
    const updateData: any = { 
      full_name: fullName, 
      phone, 
      flat_number: flat, 
      wing, 
      society_name: society 
    };
    if (vehicleNumber !== undefined) updateData.vehicle_number = vehicleNumber;
    if (bio !== undefined) updateData.bio = bio;
    if (avatarUrl !== undefined) updateData.google_picture_url = avatarUrl;

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);
    if (error) throw error;
  }

  // ==========================================
  // 2. FESTIVAL LEDGER EVENTS
  // ==========================================
  async getEvents(): Promise<Event[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async createEvent(name: string, description: string, date: string, creatorId: string): Promise<Event> {
    const newEvent = {
      name,
      description,
      event_date: date,
      is_active: true,
      created_by: creatorId
    };
    const { data, error } = await supabase
      .from('events')
      .insert(newEvent)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // ==========================================
  // 3. TRANSACTIONS
  // ==========================================
  async getTransactions(eventId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, recorder:profiles(full_name)')
      .eq('event_id', eventId)
      .order('recorded_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((t: any) => ({
      ...t,
      recorded_by_name: t.recorder?.full_name
    }));
  }

  async addTransaction(tx: Omit<Transaction, 'id' | 'recorded_at'>): Promise<Transaction> {
    const newTx = {
      ...tx,
      recorded_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from('transactions')
      .insert(newTx)
      .select()
      .single();
    if (error) throw error;
    
    // Update the event table aggregate values
    const eventTxs = await this.getTransactions(tx.event_id);
    const totalIncome = eventTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = eventTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
    await supabase
      .from('events')
      .update({ total_income: totalIncome, total_expense: totalExpense })
      .eq('id', tx.event_id);
      
    return data;
  }

  async updateTransaction(txId: string, updatedFields: Partial<Omit<Transaction, 'id' | 'recorded_at' | 'event_id'>>, eventId: string): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .update(updatedFields)
      .eq('id', txId);
    if (error) throw error;

    // Recalculate event aggregates
    const eventTxs = await this.getTransactions(eventId);
    const totalIncome = eventTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = eventTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
    await supabase
      .from('events')
      .update({ total_income: totalIncome, total_expense: totalExpense })
      .eq('id', eventId);
  }

  async deleteTransaction(txId: string, eventId: string): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', txId);
    if (error) throw error;

    // Recalculate event aggregates
    const eventTxs = await this.getTransactions(eventId);
    const totalIncome = eventTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = eventTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
    await supabase
      .from('events')
      .update({ total_income: totalIncome, total_expense: totalExpense })
      .eq('id', eventId);
  }

  // ==========================================
  // 4. MAINTENANCE DUES
  // ==========================================
  async getMaintenanceDues(): Promise<MaintenanceDue[]> {
    const { data, error } = await supabase
      .from('maintenance_dues')
      .select('*');
    if (error) throw error;
    
    const settings = await this.getSocietySettings();
    const lateFeePercent = settings?.late_fee_percentage || 2.0;
    
    return (data || []).map((due: any) => {
      let status = due.status;
      let interest = Number(due.interest_charged);
      
      if (status !== 'paid') {
        const isOverdue = new Date() > new Date(due.due_date);
        if (isOverdue) {
          status = 'overdue';
          interest = Number((due.amount * (lateFeePercent / 100)).toFixed(2));
        }
      }
      return {
        ...due,
        status,
        interest_charged: interest
      };
    }).sort((a, b) => {
      if (a.status === 'paid' && b.status !== 'paid') return 1;
      if (a.status !== 'paid' && b.status === 'paid') return -1;
      const aOut = a.amount + a.interest_charged - a.paid_amount;
      const bOut = b.amount + b.interest_charged - b.paid_amount;
      return bOut - aOut;
    });
  }

  async addMaintenanceDue(due: Omit<MaintenanceDue, 'id' | 'interest_charged'>): Promise<MaintenanceDue> {
    const newDue = {
      ...due,
      interest_charged: 0
    };
    const { data, error } = await supabase
      .from('maintenance_dues')
      .insert(newDue)
      .select()
      .single();
    if (error) throw error;

    // Notify flat owner/renter of new dues
    try {
      const { data: residents } = await supabase
        .from('profiles')
        .select('id')
        .eq('wing', due.wing)
        .eq('flat_number', due.flat_number);
      
      if (residents) {
        for (const r of residents) {
          await this.createNotification(
            r.id,
            `💰 Maintenance Dues Recorded`,
            `New maintenance dues of ₹${due.amount.toLocaleString()} have been set for the month of ${due.month}. Due by ${due.due_date}.`
          );
        }
      }
    } catch (err) {
      console.error('Notification trigger error:', err);
    }

    return data;
  }

  async markDuesPaid(dueId: string): Promise<void> {
    const { data: dueData } = await supabase.from('maintenance_dues').select('*').eq('id', dueId).single();
    if (dueData) {
      const settings = await this.getSocietySettings();
      const lateFeePercent = settings?.late_fee_percentage || 2.0;
      const isOverdue = new Date() > new Date(dueData.due_date);
      const interest = isOverdue ? Number((dueData.amount * (lateFeePercent / 100)).toFixed(2)) : 0.00;

      const { error } = await supabase
        .from('maintenance_dues')
        .update({ 
          status: 'paid', 
          paid_amount: Number(dueData.amount) + interest, 
          interest_charged: interest,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', dueId);
      if (error) throw error;
    }
  }

  // ==========================================
  // 5. SMART PARKING
  // ==========================================
  async getParkingBookings(date: string): Promise<ParkingRequest[]> {
    const { data, error } = await supabase
      .from('parking_requests')
      .select('*, user:profiles!parking_requests_user_id_fkey(full_name, flat_number, wing), slot:parking_slots(slot_number)')
      .eq('date', date);
    if (error) throw error;
    
    return (data || []).map((item: any) => ({
      ...item,
      slot_number: item.slot?.slot_number,
      user_name: item.user?.full_name,
      user_flat: `${item.user?.wing || ''}-${item.user?.flat_number || ''}`
    }));
  }

  async requestParkingBooking(user_id: string, slotNum: string, date: string, time_slot: ParkingTimeSlot, vehicle: string, visitor: string): Promise<ParkingRequest> {
    const { data: slotData } = await supabase.from('parking_slots').select('id').eq('slot_number', slotNum).single();
    if (!slotData) throw new Error('Slot does not exist!');

    const { data: overlaps } = await supabase
      .from('parking_requests')
      .select('id')
      .eq('date', date)
      .eq('slot_id', slotData.id)
      .eq('time_slot', time_slot)
      .eq('status', 'approved');
      
    if (overlaps && overlaps.length > 0) {
      throw new Error('Slot already booked for this time window!');
    }

    const { data, error } = await supabase
      .from('parking_requests')
      .insert({
        user_id,
        slot_id: slotData.id,
        date,
        time_slot,
        vehicle_number: vehicle.toUpperCase(),
        visitor_name: visitor,
        status: 'pending'
      })
      .select()
      .single();
    if (error) throw error;

    // Notify all admins
    try {
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin');
      
      if (admins) {
        for (const a of admins) {
          await this.createNotification(
            a.id,
            `🚗 Parking Booking Requested`,
            `Visitor parking request submitted for Slot ${slotNum} on ${date} (${time_slot}) by Flat Host.`
          );
        }
      }
    } catch (err) {
      console.error('Notification trigger error:', err);
    }

    return data;
  }

  async updateParkingRequestStatus(requestId: string, status: ParkingStatus, adminId: string): Promise<void> {
    const { data, error } = await supabase
      .from('parking_requests')
      .update({ status, approved_by: adminId, approved_at: new Date().toISOString() })
      .eq('id', requestId)
      .select('*, slot:parking_slots(slot_number)');
      
    if (error) throw error;

    if (data && data.length > 0) {
      const record = data[0];
      const slotNum = record.slot?.slot_number || 'Visitor Slot';
      await this.createNotification(
        record.user_id,
        status === 'approved' ? `✅ Parking Approved` : `❌ Parking Rejected`,
        `Your visitor parking request for Slot ${slotNum} on ${record.date} (${record.time_slot}) has been ${status.toUpperCase()} by the Guard/Admin.`
      );
    }
  }

  // ==========================================
  // 6. SOS COMPLAINTS
  // ==========================================
  async getComplaints(): Promise<Complaint[]> {
    const { data, error } = await supabase
      .from('complaints')
      .select('*, user:profiles!complaints_user_id_fkey(full_name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((item: any) => ({
      ...item,
      user_name: item.user?.full_name
    }));
  }

  async raiseComplaint(userId: string, type: 'water_low' | 'motor_off' | 'electricity' | 'security' | 'other', wing: string, flat: string, description: string): Promise<Complaint> {
    const newComplaint: Omit<Complaint, 'id'> = {
      user_id: userId,
      type,
      wing,
      flat_number: flat,
      description,
      status: 'pending',
      priority: type === 'security' ? 'emergency' : 'high',
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('complaints')
      .insert(newComplaint)
      .select()
      .single();
    if (error) throw error;

    // Notify admins and guards
    try {
      const { data: staff } = await supabase
        .from('profiles')
        .select('id, role')
        .in('role', ['admin', 'guard']);
      
      if (staff) {
        for (const s of staff) {
          const isGuard = s.role === 'guard';
          const title = isGuard
            ? `🚨 SOS Crisis Alert: Flat ${wing}-${flat}`
            : `SOS Warning Registered: Flat ${wing}-${flat}`;
          
          const body = isGuard
            ? `${type.replace('_', ' ').toUpperCase()} crisis reported! Description: ${description}`
            : `A utility crisis warning was logged: ${description}`;

          await this.createNotification(s.id, title, body);
        }
      }
    } catch (err) {
      console.error('Notification trigger error:', err);
    }

    return data;
  }

  async acknowledgeComplaint(complaintId: string, adminId: string): Promise<void> {
    const { data, error } = await supabase
      .from('complaints')
      .update({ status: 'acknowledged', acknowledged_by: adminId, acknowledged_at: new Date().toISOString() })
      .eq('id', complaintId)
      .select()
      .single();
    if (error) throw error;

    if (data) {
      await this.createNotification(
        data.user_id,
        `📢 SOS Acknowledged`,
        `Your SOS regarding ${data.type.replace('_', ' ').toUpperCase()} has been acknowledged by the Security Desk.`
      );
    }
  }

  async resolveComplaint(complaintId: string, resolverId?: string): Promise<void> {
    const { data, error } = await supabase
      .from('complaints')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', complaintId)
      .select()
      .single();
    if (error) throw error;

    if (data) {
      // 1. Notify the resident who raised the SOS
      await this.createNotification(
        data.user_id,
        `✅ SOS Resolved`,
        `Your SOS crisis regarding ${data.type.replace('_', ' ').toUpperCase()} has been marked as RESOLVED.`
      );

      // 2. If the resolver is a Guard, send feedback (notification) as solved to all Admins
      if (resolverId) {
        try {
          const resolverProfile = await this.getProfile(resolverId);
          if (resolverProfile && resolverProfile.role === 'guard') {
            // Find all admins
            const { data: admins } = await supabase
              .from('profiles')
              .select('id')
              .eq('role', 'admin');
            
            if (admins) {
              for (const admin of admins) {
                await this.createNotification(
                  admin.id,
                  `🛡️ SOS Solved by Guard: Wing ${data.wing}`,
                  `Security Guard ${resolverProfile.full_name} has resolved the ${data.type.replace('_', ' ').toUpperCase()} crisis at Flat ${data.wing}-${data.flat_number}.`
                );
              }
            }
          }
        } catch (err) {
          console.error('Failed to notify admins of guard resolution:', err);
        }
      }
    }
  }

  // ==========================================
  // 7. CHAT & VOTING POLLS
  // ==========================================
  async getChatThreads(): Promise<ChatThread[]> {
    const { data, error } = await supabase
      .from('chat_threads')
      .select('*')
      .eq('is_archived', false)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async createChatThread(title: string, category: any, creatorId: string): Promise<ChatThread> {
    const newThread = {
      title,
      category,
      created_by: creatorId,
      is_archived: false,
      created_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from('chat_threads')
      .insert(newThread)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getChatMessages(threadId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*, sender:profiles(full_name, role, flat_number, wing, google_picture_url)')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map((m: any) => ({
      ...m,
      sender_name: m.sender?.full_name,
      sender_role: m.sender?.role,
      sender_flat: m.sender ? `${m.sender.wing}-${m.sender.flat_number}` : '?',
      sender_avatar: m.sender?.google_picture_url
    }));
  }

  async clearThreadMessages(threadId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('thread_id', threadId);
    if (error) throw error;
  }

  async sendChatMessage(threadId: string, userId: string, content: string): Promise<ChatMessage> {
    const newMsg = {
      thread_id: threadId,
      user_id: userId,
      content,
      is_pinned: false,
      created_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from('chat_messages')
      .insert(newMsg)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async pinMessage(messageId: string, isPinned: boolean): Promise<void> {
    const { error } = await supabase
      .from('chat_messages')
      .update({ is_pinned: isPinned })
      .eq('id', messageId);
    if (error) throw error;
  }

  // ==========================================
  // 8. VOTING POLLS
  // ==========================================
  async getPolls(threadId: string, userId: string): Promise<Poll[]> {
    const { data: pollsData, error: pollsError } = await supabase
      .from('polls')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false });
      
    if (pollsError) throw pollsError;
    
    const results: Poll[] = [];
    for (const poll of (pollsData || [])) {
      const { data: opts } = await supabase.from('poll_options').select('*').eq('poll_id', poll.id);
      const { data: myVote } = await supabase.from('poll_votes').select('id').eq('poll_id', poll.id).eq('user_id', userId);
      results.push({
        ...poll,
        options: opts || [],
        hasVoted: (myVote && myVote.length > 0)
      });
    }
    return results;
  }

  async createPoll(threadId: string, title: string, description: string, creatorId: string, optionTexts: string[]): Promise<Poll> {
    const { data: poll, error } = await supabase
      .from('polls')
      .insert({ thread_id: threadId, title, description, created_by: creatorId })
      .select()
      .single();
    if (error) throw error;

    const optsToInsert = optionTexts.map(txt => ({ poll_id: poll.id, option_text: txt }));
    const { data: insertedOpts } = await supabase.from('poll_options').insert(optsToInsert).select();

    return {
      ...poll,
      options: insertedOpts || [],
      hasVoted: false
    };
  }

  async voteInPoll(pollId: string, optionId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('poll_votes')
      .insert({ poll_id: pollId, option_id: optionId, user_id: userId });
    if (error) throw error;

    const { data: opt } = await supabase.from('poll_options').select('vote_count').eq('id', optionId).single();
    if (opt) {
      await supabase
        .from('poll_options')
        .update({ vote_count: Number(opt.vote_count) + 1 })
        .eq('id', optionId);
    }
  }

  // ==========================================
  // 9. SOCIETY SETTINGS
  // ==========================================
  async getSocietySettings(): Promise<SocietySettings | null> {
    const { data, error } = await supabase
      .from('society_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return data;
  }

  async updateSocietySettings(settings: Omit<SocietySettings, 'id'>): Promise<void> {
    const current = await this.getSocietySettings();
    if (current) {
      const { error } = await supabase
        .from('society_settings')
        .update(settings)
        .eq('id', current.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('society_settings')
        .insert(settings);
      if (error) throw error;
    }
  }
}

export const dataManager = new DataManager();
