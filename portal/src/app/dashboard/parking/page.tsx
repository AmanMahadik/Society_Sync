'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import { 
  Shield, Moon, Sun, Laptop, Plus, RefreshCw, 
  Trash2, Check, X, Ban, Car, Compass, Calendar, 
  User, CheckCircle, Clock, ToggleLeft, ToggleRight
} from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  wing: string;
  flat_number: string;
}

interface ParkingSlot {
  id: string;
  slot_number: string;
  is_available: boolean;
  society_id: string;
}

interface ParkingRequest {
  id: string;
  user_id: string;
  slot_id: string;
  date: string;
  time_slot: 'morning' | 'afternoon' | 'evening' | 'overnight';
  vehicle_number: string;
  visitor_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  created_at: string;
}

export default function ParkingDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [society, setSociety] = useState<any>(null);
  
  // Data lists
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [requests, setRequests] = useState<ParkingRequest[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, Profile>>({});

  // Dropdown states
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Theme settings state
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');

  // Request filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Theme Matcher Helper
  const applyTheme = (mode: 'light' | 'dark' | 'system') => {
    if (typeof window === 'undefined') return;
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    
    let resolvedMode = mode;
    if (mode === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      resolvedMode = systemTheme;
    }
    
    root.classList.add(resolvedMode);
    localStorage.setItem('theme', mode);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' || 'dark';
      setTheme(savedTheme);
      applyTheme(savedTheme);
    }
  }, []);

  const handleThemeChange = (mode: 'light' | 'dark' | 'system') => {
    setTheme(mode);
    applyTheme(mode);
  };

  const getInitials = (name?: string) => {
    if (!name) return 'SA';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // Fetch admin profile
      const { data: currentProf } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (currentProf) {
        setAdminProfile(currentProf);
      }

      // Get society mapping
      const { data: adminMapping } = await supabase
        .from('society_admins')
        .select('society_id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      let targetSocietyId = adminMapping?.society_id;
      if (!targetSocietyId && currentProf?.society_id) {
        targetSocietyId = currentProf.society_id;
      }

      if (!targetSocietyId) {
        alert('Account not associated with any society.');
        router.push('/login');
        return;
      }

      // Fetch society details
      const { data: soc } = await supabase
        .from('societies')
        .select('*')
        .eq('id', targetSocietyId)
        .single();

      if (soc) {
        setSociety(soc);
      }

      // Fetch resident profiles mapping
      const { data: profsList } = await supabase
        .from('profiles')
        .select('id, full_name, wing, flat_number')
        .eq('society_id', targetSocietyId);
      
      const pMap: Record<string, Profile> = {};
      if (profsList) {
        profsList.forEach(p => {
          pMap[p.id] = p;
        });
        setProfilesMap(pMap);
      }

      // Fetch slots and requests
      await fetchParkingSlots(targetSocietyId);
      await fetchParkingRequests(targetSocietyId);

    } catch (e: any) {
      console.error(e);
      alert(`Load failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchParkingSlots = async (socId: string) => {
    const { data, error } = await supabase
      .from('parking_slots')
      .select('*')
      .eq('society_id', socId)
      .order('slot_number');

    if (error) {
      console.error('Error fetching slots:', error);
      throw error;
    }
    setSlots(data || []);
  };

  const fetchParkingRequests = async (socId: string) => {
    const { data, error } = await supabase
      .from('parking_requests')
      .select('*')
      .eq('society_id', socId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching requests:', error);
      throw error;
    }
    setRequests(data || []);
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleGenerateSlots = async () => {
    if (!society) return;
    const confirmGen = window.confirm('Generate default visitor slots V1 to V10 for your society?');
    if (!confirmGen) return;

    try {
      setLoading(true);
      const insertRows = Array.from({ length: 10 }, (_, i) => ({
        society_id: society.id,
        slot_number: `V${i + 1}`,
        is_available: true
      }));

      const { error } = await supabase
        .from('parking_slots')
        .insert(insertRows);

      if (error) throw error;
      await fetchParkingSlots(society.id);
      alert('Slots V1 to V10 generated successfully!');
    } catch (e: any) {
      alert(`Failed to generate slots: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSlotAvailability = async (slotId: string, currentVal: boolean) => {
    if (!society) return;
    try {
      const { error } = await supabase
        .from('parking_slots')
        .update({ is_available: !currentVal })
        .eq('id', slotId);

      if (error) throw error;
      await fetchParkingSlots(society.id);
    } catch (e: any) {
      alert(`Failed to update slot status: ${e.message}`);
    }
  };

  const handleApproveRequest = async (reqId: string, slotId: string) => {
    if (!society || !adminProfile) return;
    setActionLoadingId(reqId);

    try {
      // 1. Check if the slot is currently available
      const slot = slots.find(s => s.id === slotId);
      if (slot && !slot.is_available) {
        const override = window.confirm('This slot is currently marked as occupied. Approve this reservation anyway?');
        if (!override) {
          setActionLoadingId(null);
          return;
        }
      }

      // 2. Update request status to approved
      const { error: reqErr } = await supabase
        .from('parking_requests')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: adminProfile.id
        })
        .eq('id', reqId);

      if (reqErr) throw reqErr;

      // 3. Mark slot as occupied
      await supabase
        .from('parking_slots')
        .update({ is_available: false })
        .eq('id', slotId);

      // Refresh data
      await fetchParkingSlots(society.id);
      await fetchParkingRequests(society.id);
      alert('Parking reservation approved.');
    } catch (e: any) {
      alert(`Approval error: ${e.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCompleteRequest = async (reqId: string, slotId: string) => {
    if (!society) return;
    setActionLoadingId(reqId);

    try {
      // 1. Update request status to completed
      const { error: reqErr } = await supabase
        .from('parking_requests')
        .update({ status: 'completed' })
        .eq('id', reqId);

      if (reqErr) throw reqErr;

      // 2. Mark slot back to available
      await supabase
        .from('parking_slots')
        .update({ is_available: true })
        .eq('id', slotId);

      // Refresh data
      await fetchParkingSlots(society.id);
      await fetchParkingRequests(society.id);
      alert('Visitor vehicle cleared. Parking slot marked as available.');
    } catch (e: any) {
      alert(`Error updating request: ${e.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectRequest = async (reqId: string) => {
    if (!society) return;
    const confirmReject = window.confirm('Are you sure you want to reject this parking request?');
    if (!confirmReject) return;
    
    setActionLoadingId(reqId);
    try {
      const { error } = await supabase
        .from('parking_requests')
        .update({ status: 'rejected' })
        .eq('id', reqId);

      if (error) throw error;
      await fetchParkingRequests(society.id);
      alert('Parking request rejected.');
    } catch (e: any) {
      alert(`Rejection error: ${e.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredRequests = requests.filter(r => {
    if (statusFilter === 'all') return true;
    return r.status === statusFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <p className="text-muted-foreground text-sm flex items-center gap-2 animate-pulse">
          <RefreshCw className="h-4 w-4 animate-spin text-[#1D9E75]" /> Loading Parking Dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-[#1D9E75] selection:text-[#0b0e10]">
      {/* NAVBAR */}
      <header className="border-b border-border bg-background px-6 py-4 flex justify-between items-center relative z-50">
        <div className="flex items-center gap-3">
          {/* Hamburger Menu Icon for Mobile View */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-zinc-800/20 dark:hover:bg-zinc-100/10 focus:outline-none cursor-pointer"
            aria-label="Open menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>

          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="SocietySync Logo" className="h-7 w-7 rounded object-contain" />
            <span className="font-extrabold text-base tracking-tight">SocietySync</span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-[#0F6E56]/20 text-[#1D9E75] border border-[#1D9E75]/30">
            SOCIETY ADMIN
          </span>
        </div>
        
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-5 text-xs font-semibold uppercase tracking-wider">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">Overview</Link>
            <Link href="/dashboard/chanda" className="text-muted-foreground hover:text-foreground transition-colors">Billing</Link>
            <Link href="/dashboard/parking" className="text-[#1D9E75] transition-colors border-b-2 border-[#1D9E75] pb-1">Parking</Link>
            <Link href="/dashboard/forum" className="text-muted-foreground hover:text-foreground transition-colors">Forum</Link>
          </nav>

      {/* MOBILE NAVIGATION SIDE DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          {/* Backdrop overlay */}
          <div 
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          />
          
          {/* Drawer body container */}
          <div className="fixed top-0 left-0 bottom-0 w-72 max-w-[80vw] bg-card border-r border-border p-6 flex flex-col justify-between shadow-2xl transition-transform duration-300 transform translate-x-0 z-50 text-foreground">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex justify-between items-center pb-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <img src="/logo.png" alt="SocietySync Logo" className="h-7 w-7 rounded object-contain" />
                  <span className="font-extrabold text-base tracking-tight">SocietySync</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-zinc-800/20 dark:hover:bg-zinc-100/10 cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>

              {/* Links stack */}
              <nav className="flex flex-col gap-4 text-xs font-semibold uppercase tracking-wider">
                <Link 
                  href="/dashboard" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 px-4 rounded-lg transition-all text-muted-foreground hover:text-foreground hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5"
                >
                  Overview
                </Link>
                <Link 
                  href="/dashboard/chanda" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 px-4 rounded-lg transition-all text-muted-foreground hover:text-foreground hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5"
                >
                  Billing
                </Link>
                <Link 
                  href="/dashboard/parking" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 px-4 rounded-lg transition-all bg-[#0F6E56]/10 text-[#1D9E75] border border-[#1D9E75]/20 font-bold"
                >
                  Parking
                </Link>
                <Link 
                  href="/dashboard/forum" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 px-4 rounded-lg transition-all text-muted-foreground hover:text-foreground hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5"
                >
                  Forum
                </Link>
              </nav>
            </div>

            {/* Footer info */}
            <div className="border-t border-border pt-4 text-[10px] text-muted-foreground uppercase tracking-widest text-center font-bold">
              Society Admin Console
            </div>
          </div>
        </div>
      )}
          
          {/* Circular Admin Avatar Button */}
          <div className="relative">
            <button 
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="h-8 w-8 rounded-full bg-[#1D9E75] flex items-center justify-center font-extrabold text-xs text-white shadow-lg shadow-[#1D9E75]/20 hover:bg-[#15803d] overflow-hidden transition-all cursor-pointer"
            >
              {adminProfile?.google_picture_url ? (
                <img 
                  src={adminProfile.google_picture_url} 
                  alt="Admin Profile" 
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitials(adminProfile?.full_name)
              )}
            </button>

            {/* Profile & settings dropdown modal */}
            {profileDropdownOpen && (
              <div className="absolute right-0 mt-3 w-80 bg-card border border-border rounded-lg shadow-2xl p-5 space-y-4 text-xs z-50 text-foreground">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <h3 className="font-bold text-sm tracking-tight">Account & Settings</h3>
                  <button 
                    onClick={() => setProfileDropdownOpen(false)}
                    className="text-muted-foreground hover:text-foreground text-sm font-bold cursor-pointer"
                  >
                    ×
                  </button>
                </div>
                
                {/* Profile */}
                <div className="space-y-3">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Profile</span>
                  <div className="flex items-center gap-3 bg-background/50 border border-border p-3 rounded-lg">
                    <div className="h-10 w-10 rounded-full bg-[#1D9E75]/10 border border-[#1D9E75]/20 flex items-center justify-center font-bold text-[#1D9E75] text-sm overflow-hidden shrink-0">
                      {adminProfile?.google_picture_url ? (
                        <img 
                          src={adminProfile.google_picture_url} 
                          alt="Admin Profile" 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        getInitials(adminProfile?.full_name)
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground">{adminProfile?.full_name || 'Society Admin'}</h4>
                      <span className="text-[10px] text-[#1D9E75] font-semibold uppercase tracking-wider block bg-[#1D9E75]/10 border border-[#1D9E75]/20 px-2 py-0.5 rounded mt-1 max-w-fit">
                        Society Admin
                      </span>
                    </div>
                  </div>
                </div>

                {/* Verification / Society Details */}
                <div className="space-y-3">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Society Registry</span>
                  <div className="bg-background/50 border border-border p-3 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Society Name:</span>
                      <span className="text-foreground font-bold">{society?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Verification:</span>
                      <span className={`${society?.status === 'active' ? 'text-[#1D9E75]' : 'text-amber-500'} font-bold`}>
                        {society?.status === 'active' ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Society Code:</span>
                      <span className="text-foreground font-mono font-bold">{society?.society_code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">City / State:</span>
                      <span className="text-foreground font-bold">{society?.city}, {society?.state}</span>
                    </div>
                  </div>
                </div>

                {/* Theme Selector inside Dropdown */}
                <div className="space-y-3">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Theme</span>
                  <div className="grid grid-cols-3 gap-2 bg-background border border-border rounded p-1">
                    <button
                      onClick={() => handleThemeChange('light')}
                      className={`py-1 text-[10px] font-bold rounded transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        theme === 'light' 
                          ? 'bg-card text-foreground border border-border shadow-sm' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Sun className="h-3.5 w-3.5" />
                      Light
                    </button>
                    <button
                      onClick={() => handleThemeChange('dark')}
                      className={`py-1 text-[10px] font-bold rounded transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        theme === 'dark' 
                          ? 'bg-card text-foreground border border-border shadow-sm' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Moon className="h-3.5 w-3.5" />
                      Dark
                    </button>
                    <button
                      onClick={() => handleThemeChange('system')}
                      className={`py-1 text-[10px] font-bold rounded transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        theme === 'system' 
                          ? 'bg-card text-foreground border border-border shadow-sm' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Laptop className="h-3.5 w-3.5" />
                      System
                    </button>
                  </div>
                </div>

                {/* Sign Out Button */}
                <button
                  onClick={() => { supabase.auth.signOut(); router.push('/login'); }}
                  className="w-full py-2 bg-[#993C1D]/10 text-[#dc2626] border border-[#dc2626]/30 hover:bg-[#dc2626]/10 font-bold rounded text-center transition-all cursor-pointer block border-t"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* BODY CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">Visitor Parking Control</h2>
          <p className="text-muted-foreground text-xs">Monitor and approve visitor parking allocation and slot availability</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SLOTS ALLOCATION GRID */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-extrabold tracking-tight flex items-center gap-1.5">
                <Car className="h-4 w-4 text-[#1D9E75]" /> Visitor Slots
              </h3>
              {slots.length === 0 && (
                <button
                  onClick={handleGenerateSlots}
                  className="px-2.5 py-1 bg-[#1D9E75] hover:bg-[#15803d] text-white rounded text-[10px] font-bold transition-all cursor-pointer"
                >
                  Generate V1-V10
                </button>
              )}
            </div>

            {slots.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-xs border border-dashed border-border rounded-lg space-y-3">
                <p>No parking slots generated for this society yet.</p>
                <button
                  onClick={handleGenerateSlots}
                  className="px-3.5 py-2 bg-[#1D9E75]/10 text-[#1D9E75] border border-[#1D9E75]/20 hover:bg-[#1D9E75]/20 rounded font-bold transition-all cursor-pointer"
                >
                  Auto-Initialize Slots
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3">
                {slots.map(s => (
                  <div 
                    key={s.id} 
                    className="bg-background border border-border p-3 rounded-lg flex flex-col gap-2 relative overflow-hidden"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-xs font-mono">{s.slot_number}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold border ${
                        s.is_available 
                          ? 'bg-[#1D9E75]/10 text-[#1D9E75] border-[#1D9E75]/20' 
                          : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>
                        {s.is_available ? 'FREE' : 'OCCUPIED'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleToggleSlotAvailability(s.id, s.is_available)}
                      className="text-[10px] font-semibold text-muted-foreground hover:text-foreground text-left flex items-center gap-1.5 transition-colors cursor-pointer mt-1"
                    >
                      {s.is_available ? <ToggleLeft className="h-4 w-4 text-muted-foreground" /> : <ToggleRight className="h-4 w-4 text-[#1D9E75]" />}
                      Manual Toggle
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* REQUESTS LIST TABLE */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <h3 className="text-sm font-extrabold tracking-tight flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-[#1D9E75]" /> Parking Reservations
              </h3>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-background border border-border rounded px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-[#1D9E75] cursor-pointer"
              >
                <option value="all">All Requests</option>
                <option value="pending">Pending approvals</option>
                <option value="approved">Approved / Active</option>
                <option value="completed">Completed / Cleared</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-xs border border-dashed border-border rounded-lg">
                No visitor parking requests matching your search status.
              </div>
            ) : (
              <div className="overflow-x-auto border border-border rounded-lg bg-background/30">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-background/80 border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                      <th className="p-3">Resident</th>
                      <th className="p-3">Visitor Name</th>
                      <th className="p-3">Vehicle</th>
                      <th className="p-3">Date & Slot</th>
                      <th className="p-3">Assigned Slot</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredRequests.map(r => {
                      const resident = profilesMap[r.user_id];
                      const slot = slots.find(s => s.id === r.slot_id);
                      return (
                        <tr key={r.id} className="hover:bg-background/40 transition-colors">
                          <td className="p-3 font-semibold">
                            <div>{resident?.full_name || 'Resident'}</div>
                            {resident?.wing && (
                              <div className="text-[9px] text-muted-foreground font-mono">
                                Wing {resident.wing}-{resident.flat_number}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-muted-foreground">{r.visitor_name || 'N/A'}</td>
                          <td className="p-3 font-mono font-bold text-[10px]">{r.vehicle_number}</td>
                          <td className="p-3">
                            <div>{new Date(r.date).toLocaleDateString()}</div>
                            <div className="text-[9px] text-muted-foreground uppercase font-bold">{r.time_slot}</div>
                          </td>
                          <td className="p-3 font-mono font-bold text-[#1D9E75]">
                            {slot?.slot_number || 'Unallocated'}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border tracking-wider ${
                              r.status === 'approved' ? 'bg-[#1D9E75]/10 text-[#1D9E75] border-[#1D9E75]/20' :
                              r.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                              r.status === 'completed' ? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' :
                              'bg-red-500/10 text-red-500 border-red-500/20'
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex justify-center items-center gap-1.5">
                              {r.status === 'pending' && (
                                <>
                                  <button
                                    disabled={actionLoadingId === r.id || !r.slot_id}
                                    onClick={() => handleApproveRequest(r.id, r.slot_id)}
                                    className="p-1 rounded bg-[#1D9E75]/10 hover:bg-[#1D9E75]/20 text-[#1D9E75] border border-[#1D9E75]/20 hover:border-[#1D9E75]/30 cursor-pointer disabled:opacity-50"
                                    title="Approve & Allocate Slot"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    disabled={actionLoadingId === r.id}
                                    onClick={() => handleRejectRequest(r.id)}
                                    className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 hover:border-red-500/30 cursor-pointer"
                                    title="Reject Reservation"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                              {r.status === 'approved' && (
                                <button
                                  disabled={actionLoadingId === r.id}
                                  onClick={() => handleCompleteRequest(r.id, r.slot_id)}
                                  className="px-2 py-1 bg-zinc-500/10 hover:bg-zinc-500/20 border border-zinc-500/20 text-zinc-400 hover:text-white rounded text-[10px] font-bold cursor-pointer transition-all"
                                  title="Clear Vehicle / Vacate Slot"
                                >
                                  Clear / Departed
                                </button>
                              )}
                              {(r.status === 'completed' || r.status === 'rejected') && (
                                <span className="text-[10px] text-muted-foreground italic font-medium">Logged</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
