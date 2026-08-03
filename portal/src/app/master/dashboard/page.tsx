'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { Shield, CheckCircle2, AlertCircle, Users, Activity, FileText, Ban, Trash2, ShieldAlert, Moon, Sun, Laptop, Check, Mail, Award, User, Send, Megaphone } from 'lucide-react';

interface SocietyRequest {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  admin_name: string;
  admin_email: string;
  admin_phone: string;
  total_units: number;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
}

interface Society {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  society_code: string;
  admin_name: string;
  admin_email: string;
  admin_phone: string;
  total_units: number;
  status: 'active' | 'suspended';
  lat?: string;
  lng?: string;
  created_at: string;
}

export default function MasterDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'rejected' | 'suspended' | 'all_societies'>('pending');
  
  // Lists
  const [requests, setRequests] = useState<SocietyRequest[]>([]);
  const [societies, setSocieties] = useState<Society[]>([]);

  // Stats
  const [stats, setStats] = useState({
    totalSocieties: 0,
    pendingRequests: 0,
    activeSocieties: 0,
    globalUsers: 0
  });

  // Admin Profile info dropdown & dropdown status
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Theme settings state
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');

  // Broadcast Notification settings
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Leaflet map initialization state
  const [mapInitialized, setMapInitialized] = useState(false);

  // Load Leaflet resources dynamically on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        document.body.appendChild(script);
      }
    }
  }, []);

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

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // If handling OAuth callback redirect (PKCE code or Implicit token), wait briefly for Supabase to parse it
      const hasCode = typeof window !== 'undefined' && window.location.search.includes('code=');
      const hasHash = typeof window !== 'undefined' && window.location.hash.includes('access_token');
      if (hasCode || hasHash) {
        console.log('fetchData: Detected OAuth callback (code or hash), waiting for session...');
        for (let i = 0; i < 40; i++) {
          const { data } = await supabase.auth.getSession();
          if (data.session) break;
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Verify session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/master/login');
        return;
      }

      // Check role = master_admin using secure RPC helper or email authorization
      const { data: role, error: roleError } = await supabase.rpc('get_current_user_role');
      const isMasterEmail = session.user.email?.trim().toLowerCase() === 'societysync5@gmail.com';
      
      if ((roleError || role !== 'master_admin') && !isMasterEmail) {
        console.warn('fetchData: Unauthorized Master Admin attempt.');
        await supabase.auth.signOut();
        router.push('/master/login?error=unauthorized');
        return;
      }

      // Fetch logged in profile details
      let { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!profileData && session.user.email) {
        const { data: emailProf } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', session.user.email.trim().toLowerCase())
          .maybeSingle();
        if (emailProf) {
          profileData = emailProf;
        }
      }
      
      if (profileData) {
        setAdminProfile(profileData);
      }

      // Fetch all requests
      const { data: reqData, error: reqError } = await supabase
        .from('society_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (reqError) throw reqError;
      setRequests(reqData || []);

      // Fetch all societies
      const { data: socData, error: socError } = await supabase
        .from('societies')
        .select('*')
        .order('created_at', { ascending: false });

      if (socError) throw socError;
      setSocieties(socData || []);

      // Fetch users count
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const activeSocList = socData || [];
      const pendingReqList = reqData || [];

      setStats({
        totalSocieties: activeSocList.length,
        pendingRequests: pendingReqList.filter((r: any) => r.status === 'pending').length,
        activeSocieties: activeSocList.filter((s: any) => s.status === 'active').length,
        globalUsers: usersCount || 0
      });

    } catch (e) {
      console.error('Error fetching master dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Render Leaflet Map dynamically
  useEffect(() => {
    if (typeof window === 'undefined' || loading || societies.length === 0) return;

    const initMap = () => {
      const L = (window as any).L;
      if (!L) {
        setTimeout(initMap, 100);
        return;
      }
      
      const container = document.getElementById('leaflet-map-master');
      if (container && !mapInitialized) {
        container.innerHTML = '';
        const mapDiv = document.createElement('div');
        mapDiv.id = 'map-master-inner';
        mapDiv.style.width = '100%';
        mapDiv.style.height = '100%';
        container.appendChild(mapDiv);

        // Center on Pimpri-Chinchwad
        const centerLat = 18.6298;
        const centerLng = 73.7997;

        const map = L.map('map-master-inner', { zoomControl: false }).setView([centerLat, centerLng], 11);
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        societies.forEach((soc) => {
          if (!soc.lat || !soc.lng) return;
          const isActive = soc.status === 'active';
          
          const pulseIcon = L.divIcon({
            className: 'custom-leaflet-pulse-logo',
            html: `
              <div class="relative flex flex-col items-center justify-end w-[120px] h-[70px]">
                <div class="bg-[#dc2626] text-white flex items-center gap-1.5 px-2 py-0.5 rounded shadow-lg border border-white/10 text-[9px] font-extrabold uppercase tracking-wider mb-1 animate-bounce">
                  <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/></svg>
                  SocietySync
                </div>
                <div class="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-[#dc2626] -mt-1.5 mb-1.5"></div>
                <div class="relative flex h-3.5 w-3.5 justify-center items-center">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${isActive ? 'bg-[#1D9E75]' : 'bg-[#993C1D]'} opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-1.5 w-1.5 ${isActive ? 'bg-[#1D9E75]' : 'bg-[#993C1D]'} border border-white/20"></span>
                </div>
              </div>
            `,
            iconSize: [120, 70],
            iconAnchor: [60, 70]
          });

          const marker = L.marker([parseFloat(soc.lat), parseFloat(soc.lng)], { icon: pulseIcon }).addTo(map);
          marker.bindPopup(`
            <div style="color: #0b0e10; font-family: sans-serif; font-size: 12px; padding: 4px; line-height: 1.4; width: 180px;">
              <strong style="display: block; font-size: 13px; color: ${isActive ? '#1D9E75' : '#993C1D'}; margin-bottom: 2px;">🏢 ${soc.name}</strong>
              <span style="font-size: 10px; color: #8a8f91; display: block; margin-bottom: 4px;">${soc.address}</span>
              <span style="font-size: 9px; font-weight: bold; padding: 2px 5px; border-radius: 4px; display: inline-block; ${
                isActive 
                  ? 'background: rgba(29, 158, 117, 0.1); color: #1D9E75; border: 1px solid rgba(29, 158, 117, 0.3);' 
                  : 'background: rgba(153, 60, 29, 0.1); color: #993C1D; border: 1px solid rgba(153, 60, 29, 0.3);'
              }">
                ${isActive ? 'Active Community' : 'Suspended / Offline'}
              </span>
            </div>
          `);
        });

        setMapInitialized(true);
      }
    };

    const timer = setTimeout(initMap, 600);
    return () => clearTimeout(timer);
  }, [societies, loading, mapInitialized]);

  useEffect(() => {
    fetchData();
  }, []);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    setSendingBroadcast(true);

    try {
      const activeAdmins = societies.filter(s => s.status === 'active' && s.admin_email);
      if (activeAdmins.length === 0) {
        alert('No active societies to broadcast to.');
        setSendingBroadcast(false);
        return;
      }

      let successCount = 0;
      for (const soc of activeAdmins) {
        try {
          const response = await fetch('/api/approve-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              adminEmail: soc.admin_email,
              adminName: soc.admin_name || 'Society Admin',
              societyName: soc.name,
              status: 'broadcast',
              broadcastMessage: broadcastMessage
            })
          });
          if (response.ok) successCount++;
        } catch (err) {
          console.error(`Failed to send broadcast email to ${soc.admin_email}:`, err);
        }
      }

      alert(`Broadcast notification successfully sent to ${successCount} active society administrators!`);
      setBroadcastMessage('');
    } catch (err: any) {
      alert(`Broadcast failed: ${err.message || err}`);
    } finally {
      setSendingBroadcast(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/master/login');
  };

  const handleToggleSuspension = async (id: string, currentStatus: 'active' | 'suspended') => {
    const soc = societies.find(s => s.id === id);
    if (!soc) {
      alert('Error: Society details not found.');
      return;
    }

    const nextStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    const actionLabel = currentStatus === 'suspended' ? 'activate' : 'suspend';
    
    const confirmAction = window.confirm(`Are you sure you want to ${actionLabel} this society?`);
    if (!confirmAction) return;

    try {
      const { error } = await supabase
        .from('societies')
        .update({ status: nextStatus })
        .eq('id', id);

      if (error) throw error;
      alert(`Society has been successfully set to ${nextStatus}.`);

      // Trigger suspension or reactivation email notification
      try {
        console.log(`Sending ${nextStatus === 'suspended' ? 'suspension' : 'reactivation'} email to ${soc.admin_email}`);
        const emailResponse = await fetch('/api/approve-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            adminEmail: soc.admin_email,
            adminName: soc.admin_name || 'Society Admin',
            societyName: soc.name,
            status: nextStatus === 'suspended' ? 'suspended' : 'activated'
          })
        });
        const emailData = await emailResponse.json();
        if (!emailResponse.ok || !emailData.success) {
          throw new Error(emailData.error || 'Failed to send email');
        }
      } catch (emailErr: any) {
        console.error('Failed to trigger email notification:', emailErr);
        alert(`Warning: Status updated in database, but notification email failed to send: ${emailErr.message || emailErr}`);
      }

      fetchData();
    } catch (e) {
      console.error(e);
      alert('Error updating society status.');
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-[#dc2626] selection:text-[#0b0e10]">
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
            <div className="h-7 w-7 rounded bg-[#dc2626] flex items-center justify-center font-bold text-white shadow-lg shadow-[#dc2626]/20">
              <Shield className="h-4 w-4" />
            </div>
            <span className="font-extrabold text-base tracking-tight">SocietySync</span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-red-950/20 text-red-500 border border-red-500/30">
            MASTER ADMIN
          </span>
        </div>
        
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-5 text-xs font-semibold uppercase tracking-wider">
            <Link href="/master/dashboard" className="text-[#dc2626] transition-colors border-b-2 border-[#dc2626] pb-1">Requests</Link>
            <Link href="/master/societies" className="text-muted-foreground hover:text-foreground transition-colors">Societies</Link>
            <Link href="/master/users" className="text-muted-foreground hover:text-foreground transition-colors">Users</Link>
            <Link href="/master/security" className="text-muted-foreground hover:text-foreground transition-colors">Security</Link>
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
                  <div className="h-7 w-7 rounded bg-[#dc2626] flex items-center justify-center font-bold text-white shadow-lg">
                    <Shield className="h-4 w-4" />
                  </div>
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
                  href="/master/dashboard" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 px-4 rounded-lg transition-all bg-[#dc2626]/10 text-[#dc2626] border border-[#dc2626]/20 font-bold"
                >
                  Requests
                </Link>
                <Link 
                  href="/master/societies" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 px-4 rounded-lg transition-all text-muted-foreground hover:text-foreground hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5"
                >
                  Societies
                </Link>
                <Link 
                  href="/master/users" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 px-4 rounded-lg transition-all text-muted-foreground hover:text-foreground hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5"
                >
                  Users
                </Link>
                <Link 
                  href="/master/security" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 px-4 rounded-lg transition-all text-muted-foreground hover:text-foreground hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5"
                >
                  Security
                </Link>
              </nav>
            </div>

            {/* Footer info */}
            <div className="border-t border-border pt-4 text-[10px] text-muted-foreground uppercase tracking-widest text-center font-bold">
              Master Control Board
            </div>
          </div>
        </div>
      )}
          
          {/* Circular Admin Avatar Button */}
          <div className="relative">
            <button 
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="h-8 w-8 rounded-full bg-[#dc2626] flex items-center justify-center font-extrabold text-xs text-white shadow-lg shadow-[#dc2626]/20 hover:bg-[#b91c1c] transition-all cursor-pointer"
            >
              MA
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
                    <div className="h-10 w-10 rounded-full bg-[#dc2626]/10 border border-[#dc2626]/20 flex items-center justify-center font-bold text-[#dc2626] text-sm">
                      MA
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground">{adminProfile?.full_name || 'Master Admin'}</h4>
                      <span className="text-[10px] text-red-500 font-semibold uppercase tracking-wider block bg-red-950/15 border border-red-500/20 px-2 py-0.5 rounded mt-1 max-w-fit">
                        Global Superuser
                      </span>
                    </div>
                  </div>
                </div>

                {/* Verification */}
                <div className="space-y-3">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Verification</span>
                  <div className="bg-background/50 border border-border p-3 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Registry Status:</span>
                      <span className="text-[#1D9E75] font-bold">Verified</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">OCR validation:</span>
                      <span className="text-[#1D9E75] font-bold">Active</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Clearance level:</span>
                      <span className="text-foreground font-mono font-bold">CDL-A</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Security Role:</span>
                      <span className="text-foreground font-bold">SysAdmin</span>
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
                      <Sun className="h-3 w-3" />
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
                      <Moon className="h-3 w-3" />
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
                      <Laptop className="h-3 w-3" />
                      System
                    </button>
                  </div>
                </div>

                {/* Security Console Link */}
                <Link
                  href="/master/security"
                  className="w-full py-2 bg-[#dc2626]/10 text-white border border-[#dc2626]/20 hover:bg-[#dc2626]/20 font-bold rounded text-center transition-all cursor-pointer block text-xs"
                >
                  🛡️ Security Console
                </Link>

                {/* Sign Out Button */}
                <button
                  onClick={handleSignOut}
                  className="w-full py-2 bg-red-950/20 text-[#dc2626] border border-[#dc2626]/30 hover:bg-[#dc2626]/10 font-bold rounded text-center transition-all cursor-pointer block border-t"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* SCROLLING MARQUEE REGISTRATION BAR */}
      <div className="w-full bg-[#0b0e10] border-b border-border">
        {React.createElement('marquee', {
          className: "text-[10px] text-[#dc2626] font-extrabold py-2 uppercase tracking-wider block bg-red-950/5",
          children: pendingRequests.length > 0 
            ? pendingRequests.map(r => `⚠️ Pending registration request: ${r.name} (${r.city}, ${r.state}) - ${r.total_units} flats | rep: ${r.admin_name} |`).join('    ') 
            : "System Online · No Pending Registration Requests at this moment · Registry Database Up-to-date"
        })}
      </div>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* STATS ROW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-card border border-border p-4 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider block">Total Societies</span>
              <span className="text-2xl font-extrabold mt-1 block">{stats.totalSocieties}</span>
            </div>
            <div className="h-8 w-8 bg-muted-foreground/10 rounded-full flex items-center justify-center border border-border">
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <div className="bg-card border border-border p-4 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider block">Pending Requests</span>
              <span className="text-2xl font-extrabold mt-1 text-yellow-500 block">{stats.pendingRequests}</span>
            </div>
            <div className="h-8 w-8 bg-yellow-500/10 rounded-full flex items-center justify-center border border-yellow-500/20">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </div>
          </div>

          <div className="bg-card border border-border p-4 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider block">Active Societies</span>
              <span className="text-2xl font-extrabold mt-1 text-[#1D9E75] block">{stats.activeSocieties}</span>
            </div>
            <div className="h-8 w-8 bg-[#1D9E75]/10 rounded-full flex items-center justify-center border border-[#1D9E75]/20">
              <CheckCircle2 className="h-4 w-4 text-[#1D9E75]" />
            </div>
          </div>

          <div className="bg-card border border-border p-4 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider block">Global App Users</span>
              <span className="text-2xl font-extrabold mt-1 text-blue-500 block">{stats.globalUsers}</span>
            </div>
            <div className="h-8 w-8 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20">
              <Users className="h-4 w-4 text-blue-500" />
            </div>
          </div>
        </div>

        {/* TWO COLUMN GRID LAYOUT (TransitOps Style) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT SIDE: MAP & REGISTRY ACTIONS (Takes 2 Columns) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* ACTIVE SOCIETIES MAP */}
            <div className="bg-card border border-border rounded-lg p-5 flex flex-col h-[450px]">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1D9E75] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1D9E75]"></span>
                  </span>
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    Operational Map — Active Societies
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-[#8a8f91] bg-secondary/35 px-2 py-0.5 rounded border border-border">
                  Traffic Controller Mode
                </span>
              </div>
              
              <div className="flex-1 bg-background rounded border border-border overflow-hidden relative shadow-inner">
                <div id="leaflet-map-master" className="w-full h-full relative" style={{ zIndex: 1, filter: 'invert(90%) hue-rotate(185deg) brightness(85%) contrast(110%)' }} />
              </div>

              {/* Map Legend */}
              <div className="flex justify-between items-center mt-3 text-[10px] text-muted-foreground border-t border-border/50 pt-2">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-flex h-2 w-2 rounded-full bg-[#1D9E75]"></span>
                    Active Community
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-flex h-2 w-2 rounded-full bg-[#993C1D]"></span>
                    Suspended / Offline
                  </span>
                </div>
                <span>Zoom / Pan to trace registered nodes</span>
              </div>
            </div>

            {/* REGISTRY DATABASE & TABS LIST */}
            <div className="bg-card border border-border rounded-lg overflow-hidden shadow-xl">
              <div className="flex border-b border-border bg-background/50 px-4 pt-3 gap-2 overflow-x-auto scrollbar-thin">
                {(['pending', 'active', 'rejected', 'suspended', 'all_societies'] as const).map((tab) => {
                  const label = tab === 'pending' ? 'Pending Requests' : 
                                tab === 'active' ? 'Active Societies' : 
                                tab === 'rejected' ? 'Rejected Requests' : 
                                tab === 'suspended' ? 'Suspended' : 'All Societies';
                  const isSelected = activeTab === tab;
                  const hasBadge = tab === 'pending' && stats.pendingRequests > 0;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 pb-2.5 cursor-pointer ${
                        isSelected ? 'border-[#dc2626] text-[#dc2626]' : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {label}
                      {hasBadge && (
                        <span className="h-4 w-4 bg-yellow-500 text-zinc-950 text-[10px] rounded-full flex items-center justify-center font-extrabold">
                          {stats.pendingRequests}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* TABLE DISPLAY */}
              <div className="p-1">
                {loading ? (
                  <div className="p-20 flex flex-col items-center justify-center gap-4">
                    <div className="h-10 w-10 rounded-full border-2 border-border border-t-[#dc2626] animate-spin" />
                    <span className="text-muted-foreground text-xs animate-pulse font-medium">Retrieving database registries...</span>
                  </div>
                ) : (
                  <div>
                    {/* PENDING / REJECTED REQUESTS */}
                    {(activeTab === 'pending' || activeTab === 'rejected') && (
                      <>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-border bg-background/40 text-muted-foreground font-semibold uppercase tracking-wider">
                                <th className="p-4">Society Request</th>
                                <th className="p-4">Location</th>
                                <th className="p-4">Admin Details</th>
                                <th className="p-4 text-center">Units</th>
                                <th className="p-4">Submitted At</th>
                                {activeTab === 'rejected' && <th className="p-4">Rejection Reason</th>}
                                <th className="p-4 text-center">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {requests
                                .filter(r => r.status === activeTab)
                                .map((req) => (
                                  <tr key={req.id} className="hover:bg-background/40 transition-colors">
                                    <td className="p-4 font-bold">{req.name}</td>
                                    <td className="p-4 text-muted-foreground">{req.city}, {req.state}</td>
                                    <td className="p-4">
                                      <span className="block font-medium">{req.admin_name}</span>
                                      <span className="block text-[10px] text-muted-foreground mt-0.5">{req.admin_email}</span>
                                    </td>
                                    <td className="p-4 text-center">{req.total_units}</td>
                                    <td className="p-4 text-muted-foreground">{new Date(req.created_at).toLocaleDateString()}</td>
                                    {activeTab === 'rejected' && <td className="p-4 text-red-500 font-semibold">{req.rejection_reason || 'N/A'}</td>}
                                    <td className="p-4 text-center">
                                      <Link 
                                        href={`/master/requests/${req.id}`}
                                        className="inline-flex px-3 py-1.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-bold rounded text-[10px] transition-all shadow-md shadow-[#dc2626]/20 uppercase tracking-wider cursor-pointer"
                                      >
                                        Review
                                      </Link>
                                    </td>
                                  </tr>
                                ))}
                              {requests.filter(r => r.status === activeTab).length === 0 && (
                                <tr>
                                  <td colSpan={activeTab === 'rejected' ? 7 : 6} className="p-8 text-center text-muted-foreground">
                                    No requests found under this filter.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}

                    {/* ACTIVE / SUSPENDED / ALL SOCIETIES */}
                    {(activeTab === 'active' || activeTab === 'suspended' || activeTab === 'all_societies') && (
                      <>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-border bg-background/40 text-muted-foreground font-semibold uppercase tracking-wider">
                                <th className="p-4">Society Name</th>
                                <th className="p-4">Location</th>
                                <th className="p-4">Admin Email</th>
                                <th className="p-4 text-center">Society Code</th>
                                <th className="p-4 text-center">Units</th>
                                <th className="p-4">Approved On</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-center">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {societies
                                .filter(s => {
                                  if (activeTab === 'all_societies') return true;
                                  return s.status === activeTab;
                                })
                                .map((soc) => (
                                  <tr key={soc.id} className="hover:bg-background/40 transition-colors">
                                    <td className="p-4 font-bold">{soc.name}</td>
                                    <td className="p-4 text-muted-foreground">{soc.city}, {soc.state}</td>
                                    <td className="p-4">{soc.admin_email}</td>
                                    <td className="p-4 text-center font-mono font-bold text-[#1D9E75]">{soc.society_code}</td>
                                    <td className="p-4 text-center">{soc.total_units}</td>
                                    <td className="p-4 text-muted-foreground">{new Date(soc.created_at).toLocaleDateString()}</td>
                                    <td className="p-4 text-center">
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                        soc.status === 'active' ? 'bg-[#1D9E75]/15 text-[#1D9E75] border border-[#1D9E75]/30' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                                      }`}>
                                        {soc.status}
                                      </span>
                                    </td>
                                    <td className="p-4 text-center">
                                      <div className="flex justify-center gap-2">
                                        <button
                                          onClick={() => handleToggleSuspension(soc.id, soc.status)}
                                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all border cursor-pointer ${
                                            soc.status === 'active' 
                                              ? 'bg-background border-border hover:border-red-500/30 text-red-400' 
                                              : 'bg-[#1D9E75]/10 border-[#1D9E75]/25 text-[#1D9E75] hover:bg-[#1D9E75]/20'
                                          }`}
                                        >
                                          {soc.status === 'active' ? 'Suspend' : 'Activate'}
                                        </button>
                                        <Link
                                          href={`/master/societies/${soc.id}/review`}
                                          className="px-2.5 py-1 rounded bg-background border border-border hover:border-[#1D9E75]/30 text-[#1D9E75] text-[10px] font-bold transition-all flex items-center justify-center cursor-pointer"
                                        >
                                          View Info
                                        </Link>
                                        <Link
                                          href={`/master/credentials/${soc.id}`}
                                          className="px-2.5 py-1 rounded bg-background border border-border hover:border-zinc-700 text-zinc-350 text-[10px] font-bold transition-all flex items-center justify-center cursor-pointer"
                                        >
                                          Credentials
                                        </Link>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              {societies.filter(s => {
                                if (activeTab === 'all_societies') return true;
                                return s.status === activeTab;
                              }).length === 0 && (
                                <tr>
                                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                                    No societies found under this filter.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            
          </div>

          {/* RIGHT SIDE: VIP / BROADCAST / THEME SETTINGS (Takes 1 Column) */}
          <div className="space-y-6">
            
            {/* VIP PRIORITY REQUESTS POP-UP CONSOLE */}
            <div className="bg-card border border-border rounded-lg p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-border pb-2">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-[#1D9E75]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    VIP Priority Requests
                  </h3>
                </div>
                <span className="h-5 w-5 bg-red-950/20 text-[#dc2626] text-[10px] rounded-full flex items-center justify-center font-extrabold border border-red-500/20">
                  {pendingRequests.length}
                </span>
              </div>
              
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {pendingRequests.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground text-center py-10 bg-background/30 border border-border/50 border-dashed rounded">
                    No priority requests pending database triggers.
                  </div>
                ) : (
                  pendingRequests.map((req) => (
                    <div key={req.id} className="bg-background border border-border rounded p-3 flex justify-between items-center gap-3">
                      <div className="truncate max-w-[70%]">
                        <strong className="block text-foreground text-xs leading-tight truncate">{req.name}</strong>
                        <span className="text-[10px] text-muted-foreground mt-0.5 block">{req.city}, {req.state} · {req.total_units} flats</span>
                        <span className="text-[9px] text-yellow-500 font-semibold block mt-1">Pending Approval</span>
                      </div>
                      <Link 
                        href={`/master/requests/${req.id}`}
                        className="py-1 px-3 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-[10px] font-bold uppercase rounded transition-all shrink-0 cursor-pointer"
                      >
                        Review
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* EMAIL BROADCAST CONSOLE */}
            <div className="bg-card border border-border rounded-lg p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <Mail className="h-4 w-4 text-[#1D9E75]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  System Broadcast Announcement
                </h3>
              </div>
              
              <form onSubmit={handleSendBroadcast} className="space-y-3">
                <span className="text-[10px] text-muted-foreground leading-relaxed block">
                  Compose a notification dispatch that will be formatted and emailed directly to all active housing complex administrators.
                </span>
                
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Enter important alert message or policy update here..."
                  className="w-full bg-background border border-border rounded p-2.5 text-xs text-foreground focus:outline-none focus:border-red-500 h-24 resize-none"
                  required
                />
                
                <button
                  type="submit"
                  disabled={sendingBroadcast || !broadcastMessage.trim()}
                  className="w-full py-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-bold rounded text-xs transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  {sendingBroadcast ? 'Dispatching...' : 'Dispatch Broadcast'}
                </button>
              </form>
            </div>

            {/* THEME SELECTOR WIDGET (TransitOps Style) */}
            <div className="bg-card border border-border rounded-lg p-5 space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">THEME</h3>
                <span className="text-[10px] text-muted-foreground mt-0.5 block">Customize interface appearance.</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 bg-background border border-border rounded p-1">
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`py-1.5 text-xs font-bold rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
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
                  className={`py-1.5 text-xs font-bold rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
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
                  className={`py-1.5 text-xs font-bold rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
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

          </div>
          
        </div>

      </main>
    </div>
  );
}
