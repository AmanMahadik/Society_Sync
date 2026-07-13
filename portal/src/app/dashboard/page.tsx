'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { Building2, Copy, Users, FileText, CheckCircle, Share2, LogOut, Trash2, Search, Filter, Map } from 'lucide-react';
import dynamic from 'next/dynamic';

const PDFPosterButton = dynamic(
  () => import('./PDFPosterButton'),
  { ssr: false, loading: () => <div className="w-full py-3 text-[#8a8f91] text-center text-xs">Loading PDF Generator...</div> }
);

interface Profile {
  id: string;
  full_name: string;
  wing: string;
  flat_number: string;
  role: string;
  status: string;
  phone?: string;
  created_at: string;
}

interface Society {
  id: string;
  name: string;
  society_code: string;
  city: string;
  state: string;
  status: string;
  lat?: string;
  lng?: string;
}

export default function SocietyAdminDashboard() {
  const router = useRouter();
  const [society, setSociety] = useState<Society | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapInitialized, setMapInitialized] = useState(false);
  
  // Roster Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Announcements / Notice Board states
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticePinned, setNoticePinned] = useState(false);
  const [noticeModal, setNoticeModal] = useState(false);

  const fetchDashboardData = async () => {
    console.log('fetchDashboardData: Component mounted, starting to fetch dashboard data...');
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      console.log('fetchDashboardData: supabase.auth.getSession() returned session:', session ? `User ID: ${session.user.id}` : 'null');
      
      if (!session) {
        console.warn('fetchDashboardData: No session found. Redirecting to /login...');
        router.push('/login');
        return;
      }

      let targetSocietyId = '';

      // 1. Try to fetch admin mapping by user_id
      console.log('fetchDashboardData: Fetching society_admins mapping by user_id...');
      const { data: adminMapping } = await supabase
        .from('society_admins')
        .select('society_id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (adminMapping) {
        console.log('fetchDashboardData: Found mapping by user_id. Society ID:', adminMapping.society_id);
        targetSocietyId = adminMapping.society_id;
      } else {
        console.log('fetchDashboardData: No mapping found by user_id. Trying fallback by email...');
        // Fallback A: Try to find mapping by email and auto-link it!
        if (session.user.email) {
          const { data: emailMapping } = await supabase
            .from('society_admins')
            .select('id, society_id')
            .eq('admin_email', session.user.email.trim().toLowerCase())
            .maybeSingle();

          if (emailMapping) {
            console.log('fetchDashboardData: Found mapping by email. Auto-linking user_id to society_admins ID:', emailMapping.id);
            // Auto-link user_id to this mapping row!
            await supabase
              .from('society_admins')
              .update({ user_id: session.user.id })
              .eq('id', emailMapping.id);
            
            targetSocietyId = emailMapping.society_id;
          }
        }

        // Fallback B: check profile society_id
        if (!targetSocietyId) {
          console.log('fetchDashboardData: No mapping found by email. Trying fallback by profiles society_id...');
          const { data: profile } = await supabase
            .from('profiles')
            .select('society_id')
            .eq('id', session.user.id)
            .maybeSingle();
          
          if (!profile || !profile.society_id) {
            console.error('fetchDashboardData: Security Error - No society associated with user account.');
            alert('Security Error: Your user account is not associated with any society.');
            router.push('/login');
            return;
          }
          console.log('fetchDashboardData: Found society_id in user profile:', profile.society_id);
          targetSocietyId = profile.society_id;
        }
      }

      // 2. Fetch society details
      console.log('fetchDashboardData: Fetching society details for ID:', targetSocietyId);
      const { data: soc, error: socError } = await supabase
        .from('societies')
        .select('*')
        .eq('id', targetSocietyId)
        .single();

      if (socError || !soc) {
        console.error('fetchDashboardData: Society fetch error:', socError);
        throw new Error('Society profile mismatch.');
      }
      console.log('fetchDashboardData: Society details successfully fetched:', soc.name);
      setSociety(soc);

      // 3. Fetch community members
      console.log('fetchDashboardData: Fetching community members...');
      const { data: profs, error: profsError } = await supabase
        .from('profiles')
        .select('*')
        .eq('society_id', soc.id)
        .order('created_at', { ascending: false });

      if (profsError) {
        console.error('fetchDashboardData: Profiles fetch error:', profsError);
        throw profsError;
      }
      console.log('fetchDashboardData: Members count fetched:', profs ? profs.length : 0);
      setProfiles(profs || []);

      // 3.5. Fetch Announcements
      const { data: notices, error: noticesErr } = await supabase
        .from('announcements')
        .select('*')
        .eq('society_id', soc.id)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (!noticesErr) {
        setAnnouncements(notices || []);
      }

    } catch (e: any) {
      console.error('fetchDashboardData: Dashboard load failed with exception:', e);
      alert(`Dashboard Load Error: ${e.message || JSON.stringify(e)}`);
      router.push('/login');
    } finally {
      console.log('fetchDashboardData: Finally block, setting loading to false.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // 4. Setup Realtime channel subscription for profiles inserts/updates/deletes (Live stats update!)
    const channel = supabase
      .channel('live-profiles-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (loading || !society) return;
    
    const initMap = () => {
      const L = (window as any).L;
      if (!L) {
        setTimeout(initMap, 100);
        return;
      }
      const initialLat = parseFloat(society.lat || '') || 18.5204;
      const initialLng = parseFloat(society.lng || '') || 73.8567;
      
      const container = document.getElementById('leaflet-map-dashboard');
      if (container && !mapInitialized) {
        container.innerHTML = '';
        const mapDiv = document.createElement('div');
        mapDiv.id = 'map-inner';
        mapDiv.style.width = '100%';
        mapDiv.style.height = '100%';
        container.appendChild(mapDiv);

        const map = L.map('map-inner', { zoomControl: false }).setView([initialLat, initialLng], 14);
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        const customIcon = L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });

        const marker = L.marker([initialLat, initialLng], { icon: customIcon }).addTo(map);
        marker.bindPopup(`
          <div style="color: #0b0e10; font-family: sans-serif; font-size: 12px; padding: 4px; line-height: 1.4; width: 180px;">
            <strong style="display: block; font-size: 13px; color: #1D9E75; margin-bottom: 2px;">🏢 ${society.name}</strong>
            <span style="font-size: 11px; color: #8a8f91;">Officially verified SocietySync Partner Community</span>
          </div>
        `).openPopup();

        setMapInitialized(true);
      }
    };

    const timer = setTimeout(initMap, 500);
    return () => clearTimeout(timer);
  }, [loading, society]);

  const handleSignOut = async () => {
    document.cookie = 'sb-auth-token=; path=/; max-age=0; SameSite=Lax';
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleRemoveMember = async (id: string, name: string) => {
    const currentSociety = society;
    if (!currentSociety) return;
    const confirmRemove = window.confirm(`Are you sure you want to remove ${name} from your society? They will lose access to chats, parking, and SOS queues.`);
    if (!confirmRemove) return;

    try {
      // Verify the member belongs to this society first
      const { data: member, error: fetchErr } = await supabase
        .from('profiles')
        .select('society_id')
        .eq('id', id)
        .single();

      if (fetchErr || !member || member.society_id !== currentSociety.id) {
        alert('Unauthorized: Member does not belong to your society.');
        return;
      }

      // Reset society links and set role/status back to default
      const { error } = await supabase
        .from('profiles')
        .update({
          society_id: null,
          status: 'pending',
          role: 'owner'
        })
        .eq('id', id)
        .eq('society_id', currentSociety.id);

      if (error) throw error;

      // Log action to audit logs
      const { data: { user } } = await supabase.auth.getUser();
      if (user && currentSociety) {
        await supabase.from('portal_audit_log').insert({
          action_type: 'member_removal',
          performed_by: user.id,
          society_id: currentSociety.id,
          old_value: name,
          new_value: 'Removed from Society'
        });
      }

      alert('Resident successfully removed.');
      fetchDashboardData();
    } catch (e) {
      console.error(e);
      alert('Error removing resident profile.');
    }
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!society || !noticeTitle.trim() || !noticeContent.trim()) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('announcements')
        .insert({
          society_id: society.id,
          created_by: session.user.id,
          title: noticeTitle.trim(),
          body: noticeContent.trim(),
          is_pinned: noticePinned
        });

      if (error) throw error;

      alert('Notice published successfully!');
      setNoticeTitle('');
      setNoticeContent('');
      setNoticePinned(false);
      setNoticeModal(false);
      fetchDashboardData();
    } catch (e: any) {
      alert(`Error publishing notice: ${e.message}`);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this notice?');
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Notice deleted.');
      fetchDashboardData();
    } catch (e: any) {
      alert(`Error deleting notice: ${e.message}`);
    }
  };

  const handleTogglePinNotice = async (id: string, currentPin: boolean) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_pinned: !currentPin })
        .eq('id', id);

      if (error) throw error;
      fetchDashboardData();
    } catch (e: any) {
      alert(`Error toggling pin: ${e.message}`);
    }
  };

  const copyToClipboard = () => {
    if (!society) return;
    navigator.clipboard.writeText(society.society_code);
    alert('Society Code copied to clipboard!');
  };

  const shareWhatsApp = () => {
    if (!society) return;
    const msg = `Join our society on SocietySync! Use code: ${society.society_code}\nDownload app: https://github.com/AmanMahadik/Society_Sync`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Filter roster list
  const filteredRoster = profiles.filter((prof) => {
    const matchesSearch = 
      prof.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${prof.wing}-${prof.flat_number}`.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || prof.role.toLowerCase() === roleFilter.toLowerCase();
    
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0e10] text-[#f2f2f0] flex items-center justify-center p-6">
        <p className="text-[#8a8f91] text-sm">Opening Society Dashboard...</p>
      </div>
    );
  }

  if (!society) return null;

  return (
    <div className="min-h-screen bg-[#0b0e10] text-[#f2f2f0] flex flex-col selection:bg-[#1D9E75] selection:text-[#0b0e10]">
      
      {/* NAVBAR */}
      <header className="border-b border-[#1c2224] bg-[#0b0e10] px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="SocietySync Logo" className="h-7 w-7 rounded object-contain" />
            <span className="font-extrabold text-base tracking-tight text-[#f2f2f0]">SocietySync</span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-[#0F6E56]/20 text-[#1D9E75] border border-[#1D9E75]/30">
            Society admin
          </span>
        </div>
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-5 text-xs font-semibold uppercase tracking-wider">
            <a href="/dashboard" className="text-[#1D9E75] transition-colors border-b-2 border-[#1D9E75] pb-1">Overview</a>
            <a href="/dashboard/chanda" className="text-[#8a8f91] hover:text-[#f2f2f0] transition-colors">Billing</a>
            <span className="text-zinc-800 cursor-not-allowed">Parking</span>
            <span className="text-zinc-800 cursor-not-allowed">Forum</span>
          </nav>
          <button 
            onClick={handleSignOut} 
            className="text-xs font-semibold px-3 py-1.5 rounded bg-[#111517] hover:bg-[#1c2224] text-[#8a8f91] hover:text-[#f2f2f0] transition-all border border-[#1c2224] flex items-center gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </div>
      </header>

      {/* PENDING REVIEW BANNER */}
      {society.status !== 'active' && (
        <div className="bg-[#854F0B]/10 border-b border-[#854F0B]/30 text-[#FAEEDA] px-6 py-3.5 text-xs md:text-sm font-semibold flex items-center justify-center gap-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#854F0B] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#854F0B]"></span>
          </span>
          <span>
            Your society registration is currently <strong className="text-amber-300">pending verification</strong> by the Master Admin. 
            Once verified, the society status will change to Active and residents can immediately begin onboarding using your code.
          </span>
        </div>
      )}

      {/* LIVE TICKER BAR */}
      <div className="border-b border-[#1c2224] bg-[#0b0e10] px-6 py-2.5 flex items-center gap-4 overflow-x-auto text-[11px] font-semibold text-[#8a8f91] select-none whitespace-nowrap">
        <div className="flex items-center gap-1.5 mr-2 text-[#1D9E75]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1D9E75] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1D9E75]"></span>
          </span>
          <span className="uppercase tracking-widest text-[10px] font-bold">Live</span>
        </div>
        <span>Residents {profiles.length}</span>
        <span className="text-zinc-800 font-normal">·</span>
        <span>Dues pending 12</span>
        <span className="text-zinc-800 font-normal">·</span>
        <span>Open complaints 3</span>
        <span className="text-zinc-800 font-normal">·</span>
        <span>Guards on duty {profiles.filter(p => p.role === 'guard').length || 1}</span>
        <span className="text-zinc-800 font-normal">·</span>
        <span>Guests today 9</span>
        <span className="text-zinc-800 font-normal">·</span>
        <span>SOS alerts 0</span>
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* TOP LEVEL: MAP & SIDEBAR CONSOLE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* MAP ANCHOR (Takes ~65% / 2 cols on lg) */}
          <div className="lg:col-span-2 bg-[#111517] border border-[#1c2224] rounded-lg p-5 flex flex-col h-[400px]">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5 border border-transparent rounded-full">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1D9E75] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1D9E75]"></span>
                </span>
                <h3 className="text-xs font-bold text-[#f2f2f0] uppercase tracking-wider">
                  Operational Map — Pune Region
                </h3>
              </div>
              <span className="text-[10px] font-bold text-[#8a8f91] bg-[#1c2224]/30 px-2 py-0.5 rounded border border-[#1c2224]">
                Active Society Tracking
              </span>
            </div>
            
            <div className="flex-1 bg-[#0b0e10] rounded border border-[#1c2224] overflow-hidden relative">
              <div id="leaflet-map-dashboard" className="w-full h-full relative" style={{ zIndex: 1, filter: 'invert(90%) hue-rotate(185deg) brightness(85%) contrast(110%)' }} />
            </div>
          </div>

          {/* COMPACT SIDEBAR WIDGETS */}
          <div className="space-y-6 flex flex-col justify-between h-[400px]">
            
            {/* WIDGET 1: COLLECTIONS THIS MONTH */}
            <div className="bg-[#111517] border border-[#1c2224] rounded-lg p-5 flex-1 flex flex-col justify-between">
              <div>
                <span className="text-[9px] text-[#8a8f91] font-bold uppercase tracking-wider block">Collections this month</span>
                <span className="text-3xl font-extrabold text-[#f2f2f0] mt-1 block">₹4.82L</span>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-[#1D9E75]">
                <span>↑ 6.1% vs last month</span>
              </div>
            </div>

            {/* WIDGET 2: MAINTENANCE DUES */}
            <div className="bg-[#111517] border border-[#1c2224] rounded-lg p-4 flex-[2_2_0%] flex flex-col justify-between overflow-hidden">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[9px] text-[#8a8f91] font-bold uppercase tracking-wider">Maintenance dues</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-[#993C1D]/15 text-[#FAECE7] border border-[#993C1D]/30">
                  3 overdue
                </span>
              </div>
              
              <div className="space-y-2 overflow-y-auto pr-1 flex-1">
                <div className="flex justify-between items-center bg-[#0b0e10] p-2 rounded border border-[#1c2224] text-[11px]">
                  <span className="font-bold text-[#f2f2f0]">Flat B-204 · Mehta</span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-[#1D9E75]/15 text-[#1D9E75] border border-[#1D9E75]/30">Paid</span>
                </div>
                <div className="flex justify-between items-center bg-[#0b0e10] p-2 rounded border border-[#1c2224] text-[11px]">
                  <span className="font-bold text-[#f2f2f0]">Flat A-101 · Rao</span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-[#993C1D]/15 text-[#FAECE7] border border-[#993C1D]/30">Overdue</span>
                </div>
                <div className="flex justify-between items-center bg-[#0b0e10] p-2 rounded border border-[#1c2224] text-[11px]">
                  <span className="font-bold text-[#f2f2f0]">Flat C-310 · Iyer</span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-[#854F0B]/15 text-[#FAEEDA] border border-[#854F0B]/30">Pending</span>
                </div>
              </div>
            </div>

            {/* WIDGET 3: LIVE GATE ACTIVITY */}
            <div className="bg-[#111517] border border-[#1c2224] rounded-lg p-4 flex-1 flex flex-col justify-between">
              <span className="text-[9px] text-[#8a8f91] font-bold uppercase tracking-wider block mb-2">Live gate activity</span>
              
              <div className="space-y-1.5 flex-1 justify-center flex flex-col">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#f2f2f0] font-medium">Guest · A-101</span>
                  <span className="text-[#1D9E75] font-bold">Checked in</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#8a8f91]">Cab · B-204</span>
                  <span className="text-[#8a8f91] font-semibold">En route</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* BOTTOM LEVEL: ROSTER & BOARD */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COMMUNITY ROSTER (2/3 width) */}
          <div className="lg:col-span-2 bg-[#111517] border border-[#1c2224] rounded-lg overflow-hidden shadow-xl">
            
            {/* ROSTER HEADER */}
            <div className="p-4 bg-[#111517] border-b border-[#1c2224] flex flex-col sm:flex-row justify-between items-center gap-4">
              <h3 className="font-extrabold text-xs text-[#f2f2f0] uppercase tracking-wider flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-[#1D9E75]" /> Community Roster ({filteredRoster.length})
              </h3>
              
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="h-3.5 w-3.5 text-[#8a8f91] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name or flat..."
                    className="bg-[#0b0e10] border border-[#1c2224] rounded pl-9 pr-3 py-1.5 text-xs text-[#f2f2f0] placeholder-[#8a8f91] focus:outline-none focus:border-[#1D9E75] w-full"
                  />
                </div>

                <div className="relative">
                  <Filter className="h-3.5 w-3.5 text-[#8a8f91] absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="bg-[#0b0e10] border border-[#1c2224] rounded pl-9 pr-8 py-1.5 text-xs text-[#f2f2f0] focus:outline-none appearance-none cursor-pointer"
                  >
                    <option value="all">All Roles</option>
                    <option value="owner">Owner</option>
                    <option value="tenant">Tenant</option>
                    <option value="guard">Guard</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
            </div>

            {/* MEMBER TABLE */}
            {filteredRoster.length === 0 ? (
              <div className="p-12 text-center text-[#8a8f91] text-xs">
                No residents found matching search criteria.
              </div>
            ) : (
              <>
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#1c2224] bg-[#0b0e10]/40 text-[#8a8f91] font-semibold uppercase tracking-wider">
                        <th className="p-4">Resident Name</th>
                        <th className="p-4">Wing / Flat</th>
                        <th className="p-4">Community Role</th>
                        <th className="p-4 text-center">Joined On</th>
                        <th className="p-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1c2224]">
                      {filteredRoster.map((prof) => (
                        <tr key={prof.id} className="hover:bg-[#0b0e10]/30 transition-colors">
                          <td className="p-4 font-bold text-[#f2f2f0]">
                            {prof.full_name}
                            {prof.phone && (
                              <span className="block text-[#8a8f91] font-mono text-[9px] mt-0.5">{prof.phone}</span>
                            )}
                          </td>
                          <td className="p-4 text-[#f2f2f0] font-medium">
                            {prof.wing} — Flat {prof.flat_number}
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              prof.role === 'admin' ? 'bg-[#1D9E75]/10 text-[#1D9E75] border border-[#1D9E75]/20' :
                              (prof.role === 'guard' ? 'bg-[#854F0B]/10 text-[#FAEEDA] border border-[#854F0B]/20' : 'bg-[#1c2224] text-[#8a8f91]')
                            }`}>
                              {prof.role}
                            </span>
                          </td>
                          <td className="p-4 text-center text-[#8a8f91] text-xs">
                            {new Date(prof.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-center">
                            {prof.role !== 'admin' ? (
                              <button
                                onClick={() => handleRemoveMember(prof.id, prof.full_name)}
                                className="p-1.5 rounded bg-[#0b0e10] border border-[#1c2224] hover:border-[#993C1D]/50 text-[#8a8f91] hover:text-[#993C1D] transition-all"
                                title="Remove Resident"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <span className="text-[#8a8f91] text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View */}
                <div className="block md:hidden divide-y divide-[#1c2224]">
                  {filteredRoster.map((prof) => (
                    <div key={prof.id} className="p-4 space-y-3 bg-[#0b0e10]/10 hover:bg-[#0b0e10]/20 transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-[#f2f2f0] text-xs">{prof.full_name}</h4>
                          {prof.phone && (
                            <span className="text-[#8a8f91] font-mono text-[10px] block mt-0.5">{prof.phone}</span>
                          )}
                        </div>
                        <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                          prof.role === 'admin' ? 'bg-[#1D9E75]/10 text-[#1D9E75] border border-[#1D9E75]/20' :
                          (prof.role === 'guard' ? 'bg-[#854F0B]/10 text-[#FAEEDA] border border-[#854F0B]/20' : 'bg-[#1c2224] text-[#8a8f91]')
                        }`}>
                          {prof.role}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center text-xs text-[#8a8f91]">
                        <div>
                          <span className="text-[#8a8f91]">Unit:</span> {prof.wing} - {prof.flat_number}
                        </div>
                        <div>
                          <span className="text-[#8a8f91]">Joined:</span> {new Date(prof.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {prof.role !== 'admin' && (
                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => handleRemoveMember(prof.id, prof.full_name)}
                            className="px-3 py-1.5 rounded bg-[#0b0e10] border border-[#1c2224] hover:border-[#993C1D]/50 text-[#993C1D] text-[11px] font-bold flex items-center gap-1.5 transition-all w-full justify-center"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Remove Resident
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* SIDE CONSOLE: CODE SHARING & DIGITAL NOTICE BOARD (1/3 width) */}
          <div className="space-y-6">
            
            {/* CODE SHARE PANEL */}
            <div className="bg-[#111517] border border-[#1c2224] p-5 rounded-lg space-y-4">
              <h3 className="text-xs font-bold text-[#8a8f91] uppercase tracking-wider flex items-center gap-2">
                <Share2 className="h-3.5 w-3.5 text-[#1D9E75]" /> Society Code Sharing
              </h3>

              <div className="text-center bg-[#0b0e10] p-5 rounded border border-[#1c2224] relative space-y-4">
                <span className="text-[9px] font-bold text-[#8a8f91] uppercase tracking-wider block">Scan or Enter Code</span>
                <p className="text-2xl font-extrabold text-[#1D9E75] tracking-widest font-mono select-all">
                  {society.society_code}
                </p>
                
                <div className="flex justify-center p-2 bg-white rounded w-28 h-28 mx-auto">
                  <QRCodeSVG value={society.society_code} size={96} level="H" />
                </div>

                <div className="flex justify-center gap-2 pt-1">
                  <button 
                    onClick={copyToClipboard}
                    className="p-1.5 bg-[#111517] hover:bg-[#1c2224] rounded border border-[#1c2224] text-[#8a8f91] hover:text-[#f2f2f0] transition-all text-xs font-bold flex items-center gap-1"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </button>
                  <button 
                    onClick={shareWhatsApp}
                    className="p-1.5 bg-[#1D9E75]/10 hover:bg-[#1D9E75]/25 rounded border border-[#1D9E75]/20 text-[#1D9E75] transition-all text-xs font-bold flex items-center gap-1"
                  >
                    <Share2 className="h-3.5 w-3.5" /> WhatsApp
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-[#1c2224]">
                <PDFPosterButton societyName={society.name} societyCode={society.society_code} />
              </div>
            </div>

            {/* NOTICE BOARD MANAGER */}
            <div className="bg-[#111517] border border-[#1c2224] rounded-lg overflow-hidden">
              <div className="p-4 bg-[#111517] border-b border-[#1c2224] flex justify-between items-center">
                <h3 className="font-extrabold text-xs text-[#f2f2f0] uppercase tracking-wider flex items-center gap-2">
                  <FileText className="h-4.5 w-4.5 text-[#1D9E75]" /> Notice Board ({announcements.length})
                </h3>
                <button 
                  onClick={() => setNoticeModal(true)}
                  className="text-[10px] font-bold px-2 py-1 rounded bg-[#1D9E75] text-[#0b0e10] hover:bg-[#0F6E56] transition-all"
                >
                  Add Notice
                </button>
              </div>

              {announcements.length === 0 ? (
                <div className="p-8 text-center text-[#8a8f91] text-xs">
                  No active announcements. Click "Add Notice" to broadcast.
                </div>
              ) : (
                <div className="divide-y divide-[#1c2224]">
                  {announcements.map((notice) => (
                    <div key={notice.id} className="p-4 hover:bg-[#0b0e10]/10 transition-all flex justify-between items-start gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          {notice.is_pinned && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-[#854F0B]/10 text-[#FAEEDA] border border-[#854F0B]/20">
                              Pinned
                            </span>
                          )}
                          <h4 className="font-bold text-[#f2f2f0] text-xs">{notice.title}</h4>
                        </div>
                        <p className="text-[#8a8f91] text-[11px] leading-relaxed">{notice.body}</p>
                        <span className="text-[9px] text-[#8a8f91] block">
                          Published on {new Date(notice.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex gap-1.5 shrink-0">
                        <button 
                          onClick={() => handleTogglePinNotice(notice.id, notice.is_pinned)}
                          className={`px-1.5 py-0.5 rounded border text-[9px] font-bold transition-all ${
                            notice.is_pinned 
                              ? 'bg-[#854F0B]/10 border-[#854F0B]/20 text-[#FAEEDA] hover:bg-[#854F0B]/20' 
                              : 'bg-[#0b0e10] border-[#1c2224] text-[#8a8f91] hover:text-[#f2f2f0]'
                          }`}
                        >
                          Pin
                        </button>
                        <button 
                          onClick={() => handleDeleteNotice(notice.id)}
                          className="p-1 rounded bg-[#0b0e10] border border-[#1c2224] hover:border-[#993C1D]/40 text-[#8a8f91] hover:text-[#993C1D] transition-all"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      {/* NOTICE PUBLISH MODAL overlay */}
      {noticeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111517] border border-[#1c2224] max-w-md w-full rounded-lg overflow-hidden shadow-2xl p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[#f2f2f0] uppercase tracking-wider">Publish New Notice</h3>
              <p className="text-[#8a8f91] text-[10px] mt-0.5">This notice will appear instantly in the residents' mobile app notice board feed.</p>
            </div>

            <form onSubmit={handleCreateNotice} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-[#8a8f91] uppercase tracking-wider block">Notice Title</label>
                <input 
                  type="text" 
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  placeholder="e.g. Phase 2 Water Outage"
                  required
                  className="bg-[#0b0e10] border border-[#1c2224] rounded px-3 py-2 text-xs text-[#f2f2f0] focus:outline-none focus:border-[#1D9E75] w-full"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-[#8a8f91] uppercase tracking-wider block">Notice Details</label>
                <textarea 
                  value={noticeContent}
                  onChange={(e) => setNoticeContent(e.target.value)}
                  placeholder="Provide all relevant details here..."
                  rows={4}
                  required
                  className="bg-[#0b0e10] border border-[#1c2224] rounded px-3 py-2 text-xs text-[#f2f2f0] focus:outline-none focus:border-[#1D9E75] w-full resize-none"
                />
              </div>

              <div className="flex items-center justify-between py-2.5 border-y border-[#1c2224]">
                <div>
                  <span className="text-xs font-bold text-[#f2f2f0] block">Pin Notice?</span>
                  <span className="text-[9px] text-[#8a8f91] block">Pinned notices appear highlighted at the very top of the app feed.</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={noticePinned}
                  onChange={(e) => setNoticePinned(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#1D9E75] cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setNoticeModal(false)}
                  className="text-xs font-bold px-4 py-2 rounded bg-[#0b0e10] border border-[#1c2224] hover:bg-[#1c2224] transition-all text-[#8a8f91]"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="text-xs font-bold px-4 py-2 rounded bg-[#1D9E75] text-[#0b0e10] hover:bg-[#0F6E56] transition-all"
                >
                  Publish Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
