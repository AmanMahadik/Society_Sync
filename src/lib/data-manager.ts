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
  private useMock: boolean = true;
  private listeners: { [key: string]: Function[] } = {};

  constructor() {
    this.useMock = !isRealSupabaseConfigured();
    console.log(`SocietySync running in ${this.useMock ? 'DEMO/OFFLINE' : 'SUPABASE PRODUCTION'} mode.`);
    this.initializeMockData();
  }

  setMockMode(mock: boolean) {
    this.useMock = mock;
    this.initializeMockData();
  }

  isMockMode() {
    return this.useMock;
  }

  private async initializeMockData() {
    if (!this.useMock) return;
    try {
      const keys = ['profiles', 'events', 'transactions', 'dues', 'complaints', 'threads', 'messages', 'polls', 'poll_options', 'settings'];
      for (const key of keys) {
        const data = await AsyncStorage.getItem(`sync_mock_v2_${key}`);
        if (!data) {
          let initial: any = [];
          if (key === 'profiles') initial = INITIAL_DEMO_PROFILES;
          else if (key === 'events') initial = INITIAL_DEMO_EVENTS;
          else if (key === 'transactions') initial = INITIAL_DEMO_TXS;
          else if (key === 'dues') initial = INITIAL_DEMO_DUES;
          else if (key === 'complaints') initial = INITIAL_DEMO_COMPLAINTS;
          else if (key === 'threads') initial = INITIAL_DEMO_THREADS;
          else if (key === 'messages') initial = INITIAL_DEMO_MESSAGES;
          else if (key === 'polls') initial = INITIAL_DEMO_POLLS;
          else if (key === 'poll_options') initial = INITIAL_DEMO_POLL_OPTIONS;
          else if (key === 'settings') initial = INITIAL_DEMO_SETTINGS;
          await AsyncStorage.setItem(`sync_mock_v2_${key}`, JSON.stringify(initial));
        }
      }
    } catch (e) {
      console.error('Error initializing mock storage', e);
    }
  }

  private async getMockItems<T>(key: string): Promise<T[]> {
    const data = await AsyncStorage.getItem(`sync_mock_v2_${key}`);
    return data ? JSON.parse(data) : [];
  }

  private async saveMockItems<T>(key: string, items: T[]): Promise<void> {
    await AsyncStorage.setItem(`sync_mock_v2_${key}`, JSON.stringify(items));
    this.triggerListener(key, items);
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

  // ==========================================
  // 1. PROFILES / USER MANAGEMENT
  // ==========================================
  async getProfile(userId: string): Promise<Profile | null> {
    if (this.useMock) {
      const profiles = await this.getMockItems<Profile>('profiles');
      return profiles.find(p => p.id === userId) || null;
    } else {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) return null;
      return data;
    }
  }

  async getAllProfiles(): Promise<Profile[]> {
    if (this.useMock) {
      return this.getMockItems<Profile>('profiles');
    } else {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  }

  async registerProfile(profile: Profile): Promise<void> {
    if (this.useMock) {
      const profiles = await this.getMockItems<Profile>('profiles');
      const isFirst = profiles.length === 0;
      const newProfile: Profile = {
        ...profile,
        role: isFirst ? 'admin' : profile.role,
        status: isFirst ? 'approved' : profile.status
      };
      profiles.push(newProfile);
      await this.saveMockItems('profiles', profiles);
    } else {
      const { error } = await supabase
        .from('profiles')
        .upsert(profile);
      if (error) throw error;
    }
  }

  async updateProfileApproval(userId: string, approved: boolean): Promise<void> {
    const status: UserStatus = approved ? 'approved' : 'rejected';
    if (this.useMock) {
      const profiles = await this.getMockItems<Profile>('profiles');
      const updated = profiles.map(p => p.id === userId ? { ...p, status, approved_at: approved ? new Date().toISOString() : null } : p);
      await this.saveMockItems('profiles', updated);
    } else {
      const { error } = await supabase
        .from('profiles')
        .update({ status, approved_at: approved ? new Date().toISOString() : null })
        .eq('id', userId);
      if (error) throw error;
    }
  }

  async updateProfileRole(userId: string, role: UserRole): Promise<void> {
    if (this.useMock) {
      const profiles = await this.getMockItems<Profile>('profiles');
      const updated = profiles.map(p => p.id === userId ? { ...p, role } : p);
      await this.saveMockItems('profiles', updated);
    } else {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId);
      if (error) throw error;
    }
  }

  async updateProfileDetails(userId: string, fullName: string, phone: string, flat: string, wing: string, society: string): Promise<void> {
    if (this.useMock) {
      const profiles = await this.getMockItems<Profile>('profiles');
      const updated = profiles.map(p => 
        p.id === userId 
          ? { ...p, full_name: fullName, phone, flat_number: flat, wing, society_name: society } 
          : p
      );
      await this.saveMockItems('profiles', updated);
    } else {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, phone, flat_number: flat, wing, society_name: society })
        .eq('id', userId);
      if (error) throw error;
    }
  }

  // ==========================================
  // 2. FESTIVAL LEDGER EVENTS
  // ==========================================
  async getEvents(): Promise<Event[]> {
    if (this.useMock) {
      const events = await this.getMockItems<Event>('events');
      const txs = await this.getMockItems<Transaction>('transactions');
      
      // Dynamically calculate balances in local mock mode
      return events.map(event => {
        const eventTxs = txs.filter(t => t.event_id === event.id);
        const totalIncome = eventTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = eventTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        return {
          ...event,
          total_income: totalIncome,
          total_expense: totalExpense,
          balance: totalIncome - totalExpense
        };
      });
    } else {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  }

  async createEvent(name: string, description: string, date: string, creatorId: string): Promise<Event> {
    const newEvent: Event = {
      id: this.useMock ? `event-${Date.now()}` : undefined as any,
      name,
      description,
      event_date: date,
      total_income: 0,
      total_expense: 0,
      balance: 0,
      created_by: creatorId,
      is_active: true
    };

    if (this.useMock) {
      const events = await this.getMockItems<Event>('events');
      events.push(newEvent);
      await this.saveMockItems('events', events);
      return newEvent;
    } else {
      const { data, error } = await supabase
        .from('events')
        .insert(newEvent)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  }

  // ==========================================
  // 3. TRANSACTIONS
  // ==========================================
  async getTransactions(eventId: string): Promise<Transaction[]> {
    if (this.useMock) {
      const txs = await this.getMockItems<Transaction>('transactions');
      const profiles = await this.getMockItems<Profile>('profiles');
      return txs
        .filter(t => t.event_id === eventId)
        .map(t => {
          const recorder = profiles.find(p => p.id === t.recorded_by);
          return {
            ...t,
            recorded_by_name: recorder?.full_name || 'Admin'
          };
        }).sort((a, b) => new Date(b.recorded_at!).getTime() - new Date(a.recorded_at!).getTime());
    } else {
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
  }

  async addTransaction(tx: Omit<Transaction, 'id' | 'recorded_at'>): Promise<Transaction> {
    const newTx: Transaction = {
      ...tx,
      id: this.useMock ? `tx-${Date.now()}` : undefined as any,
      recorded_at: new Date().toISOString()
    };

    if (this.useMock) {
      const txs = await this.getMockItems<Transaction>('transactions');
      txs.push(newTx);
      await this.saveMockItems('transactions', txs);
      
      // Trigger event list recalculation
      const events = await this.getMockItems<Event>('events');
      this.triggerListener('events', events);
      
      return newTx;
    } else {
      // Real database insert
      const { data, error } = await supabase
        .from('transactions')
        .insert(newTx)
        .select()
        .single();
      if (error) throw error;
      
      // Update the event table aggregate values (Supabase real database recalculation)
      const eventTxs = await this.getTransactions(tx.event_id);
      const totalIncome = eventTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
      const totalExpense = eventTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
      await supabase
        .from('events')
        .update({ total_income: totalIncome, total_expense: totalExpense })
        .eq('id', tx.event_id);
        
      return data;
    }
  }

  // ==========================================
  // 4. MAINTENANCE DUES
  // ==========================================
  async getMaintenanceDues(): Promise<MaintenanceDue[]> {
    if (this.useMock) {
      const dues = await this.getMockItems<MaintenanceDue>('dues');
      const settings = await this.getSocietySettings();
      const lateFeePercent = settings?.late_fee_percentage || 2.0;

      // Apply dynamic late fee calculations to overdue items in local mode
      return dues.map(due => {
        let status = due.status;
        let interest = due.interest_charged;

        if (status !== 'paid') {
          const isOverdue = new Date() > new Date(due.due_date);
          if (isOverdue) {
            status = 'overdue';
            // Calculate 2% interest on outstanding amount
            interest = Number((due.amount * (lateFeePercent / 100)).toFixed(2));
          } else {
            status = 'pending';
            interest = 0;
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
        // Sort highest outstanding dues first (amount + interest - paid_amount)
        const aOutstanding = a.amount + a.interest_charged - a.paid_amount;
        const bOutstanding = b.amount + b.interest_charged - b.paid_amount;
        return bOutstanding - aOutstanding;
      });
    } else {
      const { data, error } = await supabase
        .from('maintenance_dues')
        .select('*');
      if (error) throw error;
      
      // Compute late fees on live DB rows if they are overdue and unpaid
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
  }

  async addMaintenanceDue(due: Omit<MaintenanceDue, 'id' | 'interest_charged'>): Promise<MaintenanceDue> {
    const newDue: MaintenanceDue = {
      ...due,
      id: this.useMock ? `due-${Date.now()}` : undefined as any,
      interest_charged: 0
    };

    if (this.useMock) {
      const dues = await this.getMockItems<MaintenanceDue>('dues');
      // Enforce unique composite constraint
      const exists = dues.some(d => d.wing === due.wing && d.flat_number === due.flat_number && d.month === due.month);
      if (exists) throw new Error('Dues already exist for this flat and month!');
      dues.push(newDue);
      await this.saveMockItems('dues', dues);
      return newDue;
    } else {
      const { data, error } = await supabase
        .from('maintenance_dues')
        .insert(newDue)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  }

  async markDuesPaid(dueId: string): Promise<void> {
    if (this.useMock) {
      const dues = await this.getMockItems<MaintenanceDue>('dues');
      const updated = dues.map(due => 
        due.id === dueId 
          ? { 
              ...due, 
              status: 'paid' as any, 
              paid_amount: due.amount + due.interest_charged, 
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } 
          : due
      );
      await this.saveMockItems('dues', updated);
    } else {
      const { data: dueData } = await supabase.from('maintenance_dues').select('*').eq('id', dueId).single();
      if (dueData) {
        // Calculate dynamic interest on the fly
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
  }

  // ==========================================
  // 5. SMART PARKING
  // ==========================================
  async getParkingBookings(date: string): Promise<ParkingRequest[]> {
    if (this.useMock) {
      const requests = await this.getMockItems<ParkingRequest>('bookings');
      const profiles = await this.getMockItems<Profile>('profiles');
      return requests
        .filter(r => r.date === date)
        .map(req => {
          const user = profiles.find(p => p.id === req.user_id);
          return {
            ...req,
            user_name: user?.full_name || 'Resident',
            user_flat: `${user?.wing || ''}-${user?.flat_number || ''}`
          };
        });
    } else {
      const { data, error } = await supabase
        .from('parking_requests')
        .select('*, user:profiles(full_name, flat_number, wing), slot:parking_slots(slot_number)')
        .eq('date', date);
      if (error) throw error;
      
      return (data || []).map((item: any) => ({
        ...item,
        slot_number: item.slot?.slot_number,
        user_name: item.user?.full_name,
        user_flat: `${item.user?.wing || ''}-${item.user?.flat_number || ''}`
      }));
    }
  }

  async requestParkingBooking(user_id: string, slotNum: string, date: string, time_slot: ParkingTimeSlot, vehicle: string, visitor: string): Promise<ParkingRequest> {
    if (this.useMock) {
      const bookings = await this.getMockItems<ParkingRequest>('bookings');
      // Check overlap
      const isOccupied = bookings.some(b => b.date === date && b.slot_number === slotNum && b.time_slot === time_slot && b.status === 'approved');
      if (isOccupied) {
        throw new Error('This slot is already booked/occupied for this time slot!');
      }

      const newRequest: ParkingRequest = {
        id: `book-${Date.now()}`,
        user_id,
        slot_id: `slot-${slotNum}`,
        slot_number: slotNum,
        date,
        time_slot,
        vehicle_number: vehicle.toUpperCase(),
        visitor_name: visitor,
        status: 'pending'
      };

      bookings.push(newRequest);
      await this.saveMockItems('bookings', bookings);
      return newRequest;
    } else {
      // Get slot ID first
      const { data: slotData } = await supabase.from('parking_slots').select('id').eq('slot_number', slotNum).single();
      if (!slotData) throw new Error('Slot does not exist!');

      // Check overlap in live db
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
      return data;
    }
  }

  async updateParkingRequestStatus(requestId: string, status: ParkingStatus, adminId: string): Promise<void> {
    if (this.useMock) {
      const bookings = await this.getMockItems<ParkingRequest>('bookings');
      const updated = bookings.map(b => 
        b.id === requestId 
          ? { ...b, status, approved_by: adminId, approved_at: new Date().toISOString() } 
          : b
      );
      await this.saveMockItems('bookings', updated);
    } else {
      const { error } = await supabase
        .from('parking_requests')
        .update({ status, approved_by: adminId, approved_at: new Date().toISOString() })
        .eq('id', requestId);
      if (error) throw error;
    }
  }

  // ==========================================
  // 6. SOS COMPLAINTS
  // ==========================================
  async getComplaints(): Promise<Complaint[]> {
    if (this.useMock) {
      const complaints = await this.getMockItems<Complaint>('complaints');
      const profiles = await this.getMockItems<Profile>('profiles');
      return complaints.map(c => {
        const sender = profiles.find(p => p.id === c.user_id);
        return {
          ...c,
          user_name: sender?.full_name || 'Resident'
        };
      }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      const { data, error } = await supabase
        .from('complaints')
        .select('*, user:profiles(full_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((item: any) => ({
        ...item,
        user_name: item.user?.full_name
      }));
    }
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

    if (this.useMock) {
      const complaints = await this.getMockItems<Complaint>('complaints');
      const fullComplaint = { ...newComplaint, id: `comp-${Date.now()}` } as Complaint;
      complaints.push(fullComplaint);
      await this.saveMockItems('complaints', complaints);
      return fullComplaint;
    } else {
      const { data, error } = await supabase
        .from('complaints')
        .insert(newComplaint)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  }

  async acknowledgeComplaint(complaintId: string, adminId: string): Promise<void> {
    if (this.useMock) {
      const complaints = await this.getMockItems<Complaint>('complaints');
      const updated = complaints.map(c => 
        c.id === complaintId 
          ? { ...c, status: 'acknowledged' as ComplaintStatus, acknowledged_by: adminId, acknowledged_at: new Date().toISOString() } 
          : c
      );
      await this.saveMockItems('complaints', updated);
    } else {
      const { error } = await supabase
        .from('complaints')
        .update({ status: 'acknowledged', acknowledged_by: adminId, acknowledged_at: new Date().toISOString() })
        .eq('id', complaintId);
      if (error) throw error;
    }
  }

  async resolveComplaint(complaintId: string): Promise<void> {
    if (this.useMock) {
      const complaints = await this.getMockItems<Complaint>('complaints');
      const updated = complaints.map(c => 
        c.id === complaintId 
          ? { ...c, status: 'resolved' as ComplaintStatus, resolved_at: new Date().toISOString() } 
          : c
      );
      await this.saveMockItems('complaints', updated);
    } else {
      const { error } = await supabase
        .from('complaints')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', complaintId);
      if (error) throw error;
    }
  }

  // ==========================================
  // 7. CHAT & VOTING POLLS
  // ==========================================
  async getChatThreads(): Promise<ChatThread[]> {
    if (this.useMock) {
      return this.getMockItems<ChatThread>('threads');
    } else {
      const { data, error } = await supabase
        .from('chat_threads')
        .select('*')
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  }

  async createChatThread(title: string, category: any, creatorId: string): Promise<ChatThread> {
    const newThread: ChatThread = {
      id: this.useMock ? `thread-${Date.now()}` : undefined as any,
      title,
      category,
      created_by: creatorId,
      is_archived: false,
      created_at: new Date().toISOString()
    };

    if (this.useMock) {
      const threads = await this.getMockItems<ChatThread>('threads');
      threads.push(newThread);
      await this.saveMockItems('threads', threads);
      return newThread;
    } else {
      const { data, error } = await supabase
        .from('chat_threads')
        .insert(newThread)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  }

  async getChatMessages(threadId: string): Promise<ChatMessage[]> {
    if (this.useMock) {
      const messages = await this.getMockItems<ChatMessage>('messages');
      const profiles = await this.getMockItems<Profile>('profiles');
      return messages
        .filter(m => m.thread_id === threadId)
        .map(m => {
          const sender = profiles.find(p => p.id === m.user_id);
          return {
            ...m,
            sender_name: sender?.full_name || 'Resident',
            sender_role: sender?.role || 'renter',
            sender_flat: sender ? `${sender.wing}-${sender.flat_number}` : '?'
          };
        }).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*, sender:profiles(full_name, role, flat_number, wing)')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map((m: any) => ({
        ...m,
        sender_name: m.sender?.full_name,
        sender_role: m.sender?.role,
        sender_flat: m.sender ? `${m.sender.wing}-${m.sender.flat_number}` : '?'
      }));
    }
  }

  async sendChatMessage(threadId: string, userId: string, content: string): Promise<ChatMessage> {
    const newMsg: ChatMessage = {
      id: this.useMock ? `msg-${Date.now()}` : undefined as any,
      thread_id: threadId,
      user_id: userId,
      content,
      is_pinned: false,
      created_at: new Date().toISOString()
    };

    if (this.useMock) {
      const messages = await this.getMockItems<ChatMessage>('messages');
      messages.push(newMsg);
      await this.saveMockItems('messages', messages);
      return newMsg;
    } else {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert(newMsg)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  }

  async pinMessage(messageId: string, isPinned: boolean): Promise<void> {
    if (this.useMock) {
      const messages = await this.getMockItems<ChatMessage>('messages');
      const updated = messages.map(m => m.id === messageId ? { ...m, is_pinned: isPinned } : m);
      await this.saveMockItems('messages', updated);
    } else {
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_pinned: isPinned })
        .eq('id', messageId);
      if (error) throw error;
    }
  }

  // ==========================================
  // 8. VOTING POLLS
  // ==========================================
  async getPolls(threadId: string, userId: string): Promise<Poll[]> {
    if (this.useMock) {
      const polls = await this.getMockItems<Poll>('polls');
      const options = await this.getMockItems<PollOption>('poll_options');
      const votes = await AsyncStorage.getItem('sync_mock_poll_votes');
      const localVotes = votes ? JSON.parse(votes) : [];

      return polls
        .filter(p => p.thread_id === threadId)
        .map(poll => {
          const pollOptions = options.filter(o => o.poll_id === poll.id);
          const userHasVoted = localVotes.some((v: any) => v.poll_id === poll.id && v.user_id === userId);
          return {
            ...poll,
            options: pollOptions,
            hasVoted: userHasVoted
          };
        });
    } else {
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
  }

  async createPoll(threadId: string, title: string, description: string, creatorId: string, optionTexts: string[]): Promise<Poll> {
    if (this.useMock) {
      const polls = await this.getMockItems<Poll>('polls');
      const options = await this.getMockItems<PollOption>('poll_options');
      
      const pollId = `poll-${Date.now()}`;
      const newPoll: Poll = {
        id: pollId,
        title,
        description,
        thread_id: threadId,
        created_by: creatorId,
        status: 'active',
        created_at: new Date().toISOString()
      };

      const newOptions = optionTexts.map((txt, idx) => ({
        id: `opt-${pollId}-${idx}`,
        poll_id: pollId,
        option_text: txt,
        vote_count: 0
      }));

      polls.push(newPoll);
      options.push(...newOptions);

      await this.saveMockItems('polls', polls);
      await this.saveMockItems('poll_options', options);

      return {
        ...newPoll,
        options: newOptions,
        hasVoted: false
      };
    } else {
      // Live Supabase inserts
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
  }

  async voteInPoll(pollId: string, optionId: string, userId: string): Promise<void> {
    if (this.useMock) {
      const votesKey = 'sync_mock_poll_votes';
      const votesStr = await AsyncStorage.getItem(votesKey);
      const votes = votesStr ? JSON.parse(votesStr) : [];

      // Ensure single vote
      const alreadyVoted = votes.some((v: any) => v.poll_id === pollId && v.user_id === userId);
      if (alreadyVoted) throw new Error('You have already voted in this poll!');

      votes.push({ poll_id: pollId, option_id: optionId, user_id: userId });
      await AsyncStorage.setItem(votesKey, JSON.stringify(votes));

      // Increment vote count
      const options = await this.getMockItems<PollOption>('poll_options');
      const updated = options.map(o => o.id === optionId ? { ...o, vote_count: o.vote_count + 1 } : o);
      await this.saveMockItems('poll_options', updated);
    } else {
      // Real database atomic transactions
      const { error } = await supabase
        .from('poll_votes')
        .insert({ poll_id: pollId, option_id: optionId, user_id: userId });
      if (error) throw error;

      // Increment poll option vote tally (managed securely server-side or via atomic increment)
      const { data: opt } = await supabase.from('poll_options').select('vote_count').eq('id', optionId).single();
      if (opt) {
        await supabase
          .from('poll_options')
          .update({ vote_count: Number(opt.vote_count) + 1 })
          .eq('id', optionId);
      }
    }
  }

  // ==========================================
  // 9. SOCIETY SETTINGS
  // ==========================================
  async getSocietySettings(): Promise<SocietySettings | null> {
    if (this.useMock) {
      const data = await AsyncStorage.getItem('sync_mock_v2_settings');
      return data ? JSON.parse(data) : INITIAL_DEMO_SETTINGS;
    } else {
      const { data, error } = await supabase
        .from('society_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data;
    }
  }

  async updateSocietySettings(settings: Omit<SocietySettings, 'id'>): Promise<void> {
    if (this.useMock) {
      const current = await this.getSocietySettings();
      const updated = { ...current, ...settings };
      await AsyncStorage.setItem('sync_mock_v2_settings', JSON.stringify(updated));
    } else {
      // Upsert society settings
      const current = await this.getSocietySettings();
      const payload = current ? { id: current.id, ...settings } : settings;
      const { error } = await supabase
        .from('society_settings')
        .upsert(payload);
      if (error) throw error;
    }
  }
}

export const dataManager = new DataManager();
