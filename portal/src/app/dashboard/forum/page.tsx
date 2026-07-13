'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import { 
  Shield, Moon, Sun, Laptop, Plus, MessageSquare, 
  Send, User, Clock, AlertCircle, RefreshCw, Folder, 
  Lock, CheckCircle, ChevronRight, Pin
} from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  wing: string;
  flat_number: string;
  role: string;
}

interface Thread {
  id: string;
  society_id: string;
  title: string;
  category: 'water-infrastructure' | 'budget' | 'events' | 'maintenance' | 'security' | 'general';
  created_by: string;
  is_archived: boolean;
  created_at: string;
}

interface Message {
  id: string;
  thread_id: string;
  user_id: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
}

export default function ForumPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [society, setSociety] = useState<any>(null);
  
  // Data lists
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, Profile>>({});
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Form states
  const [newMessage, setNewMessage] = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadCategory, setNewThreadCategory] = useState<'water-infrastructure' | 'budget' | 'events' | 'maintenance' | 'security' | 'general'>('general');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dropdown states
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Theme settings state
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');

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

      // 1. Get society mapping
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

      // Get society details
      const { data: soc } = await supabase
        .from('societies')
        .select('*')
        .eq('id', targetSocietyId)
        .single();

      if (soc) {
        setSociety(soc);
      }

      // 2. Fetch profiles
      const { data: profsList } = await supabase
        .from('profiles')
        .select('id, full_name, wing, flat_number, role')
        .eq('society_id', targetSocietyId);
      
      const pMap: Record<string, Profile> = {};
      if (profsList) {
        profsList.forEach(p => {
          pMap[p.id] = p;
        });
        setProfiles(profsList);
        setProfilesMap(pMap);
      }

      // 3. Fetch Threads
      await fetchThreadsList(targetSocietyId);

    } catch (e: any) {
      console.error(e);
      alert(`Load failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchThreadsList = async (socId: string) => {
    const { data, error } = await supabase
      .from('chat_threads')
      .select('*')
      .eq('society_id', socId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching threads:', error);
      throw error;
    }
    setThreads(data || []);
  };

  const fetchMessagesList = async (threadId: string) => {
    try {
      setMessagesLoading(true);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (e: any) {
      console.error(e);
      alert(`Error loading messages: ${e.message}`);
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeThreadId) {
      fetchMessagesList(activeThreadId);
    } else {
      setMessages([]);
    }
  }, [activeThreadId]);

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThreadTitle.trim() || !society) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('chat_threads')
        .insert({
          society_id: society.id,
          title: newThreadTitle.trim(),
          category: newThreadCategory,
          created_by: session.user.id
        })
        .select()
        .single();

      if (error) throw error;

      setNewThreadTitle('');
      setCreateModal(false);
      await fetchThreadsList(society.id);
      if (data) {
        setActiveThreadId(data.id);
      }
    } catch (e: any) {
      alert(`Failed to create thread: ${e.message}`);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeThreadId || !society) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('chat_messages')
        .insert({
          society_id: society.id,
          thread_id: activeThreadId,
          user_id: session.user.id,
          content: newMessage.trim()
        });

      if (error) throw error;
      setNewMessage('');
      fetchMessagesList(activeThreadId);
    } catch (e: any) {
      alert(`Failed to send message: ${e.message}`);
    }
  };

  const filteredThreads = threads.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'water-infrastructure': return '💧 Water System';
      case 'budget': return '💼 Budget & Dues';
      case 'events': return '🎉 Cultural & Events';
      case 'maintenance': return '🛠️ Repairs & Assets';
      case 'security': return '🛡️ Guard & Gates';
      default: return '💬 General';
    }
  };

  const getCategoryBadgeColor = (cat: string) => {
    switch (cat) {
      case 'water-infrastructure': return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
      case 'budget': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'events': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'maintenance': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'security': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <p className="text-muted-foreground text-sm flex items-center gap-2 animate-pulse">
          <RefreshCw className="h-4 w-4 animate-spin text-[#1D9E75]" /> Loading Discussion Forum...
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
            <Link href="/dashboard/parking" className="text-muted-foreground hover:text-foreground transition-colors">Parking</Link>
            <Link href="/dashboard/forum" className="text-[#1D9E75] transition-colors border-b-2 border-[#1D9E75] pb-1">Forum</Link>
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
                  className="py-2.5 px-4 rounded-lg transition-all text-muted-foreground hover:text-foreground hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5"
                >
                  Parking
                </Link>
                <Link 
                  href="/dashboard/forum" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 px-4 rounded-lg transition-all bg-[#0F6E56]/10 text-[#1D9E75] border border-[#1D9E75]/20 font-bold"
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
              className="h-8 w-8 rounded-full bg-[#1D9E75] flex items-center justify-center font-extrabold text-xs text-white shadow-lg shadow-[#1D9E75]/20 hover:bg-[#15803d] transition-all cursor-pointer"
            >
              {getInitials(adminProfile?.full_name)}
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
                    <div className="h-10 w-10 rounded-full bg-[#1D9E75]/10 border border-[#1D9E75]/20 flex items-center justify-center font-bold text-[#1D9E75] text-sm">
                      {getInitials(adminProfile?.full_name)}
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
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col md:flex-row gap-6 overflow-hidden">
        {/* LEFT COLUMN: THREAD LIST */}
        <div className="w-full md:w-80 shrink-0 flex flex-col gap-4">
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-extrabold tracking-tight">Forum Board</h2>
              <button 
                onClick={() => setCreateModal(true)}
                className="px-2.5 py-1.5 bg-[#1D9E75] hover:bg-[#15803d] text-white rounded text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus className="h-3 w-3" /> New Thread
              </button>
            </div>
            
            <input 
              type="text" 
              placeholder="Search discussions..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded text-xs focus:outline-none focus:border-[#1D9E75]"
            />

            {/* Category Selector */}
            <div className="space-y-1.5">
              <span className="text-[9px] text-muted-foreground font-extrabold uppercase tracking-widest block">Filter Category</span>
              <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-background border border-border rounded text-xs focus:outline-none focus:border-[#1D9E75] cursor-pointer"
              >
                <option value="all">All Topics</option>
                <option value="general">💬 General discussions</option>
                <option value="water-infrastructure">💧 Water System</option>
                <option value="budget">💼 Budget & Dues</option>
                <option value="events">🎉 Cultural & Events</option>
                <option value="maintenance">🛠️ Repairs & Assets</option>
                <option value="security">🛡️ Guard & Gates</option>
              </select>
            </div>
          </div>

          {/* Active threads list */}
          <div className="flex-1 bg-card border border-border rounded-xl overflow-y-auto max-h-[450px] md:max-h-none p-3 space-y-2">
            {filteredThreads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">
                No active discussions found.
              </div>
            ) : (
              filteredThreads.map(t => {
                const isActive = t.id === activeThreadId;
                const author = profilesMap[t.created_by]?.full_name || 'Resident';
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveThreadId(t.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer flex flex-col gap-2 ${
                      isActive 
                        ? 'bg-[#1D9E75]/10 border-[#1D9E75] shadow-sm' 
                        : 'bg-background/40 hover:bg-background/80 border-border'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold border uppercase shrink-0 ${getCategoryBadgeColor(t.category)}`}>
                        {t.category === 'water-infrastructure' ? 'Water' : t.category}
                      </span>
                      <span className="text-[9px] text-muted-foreground font-mono shrink-0">
                        {new Date(t.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-xs text-foreground tracking-tight leading-tight line-clamp-2">
                      {t.title}
                    </h4>
                    <span className="text-[9px] text-muted-foreground font-semibold">
                      Started by: {author}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE THREAD CHAT FEED */}
        <div className="flex-1 bg-card border border-border rounded-xl flex flex-col overflow-hidden min-h-[400px]">
          {activeThreadId ? (
            <>
              {/* Active Thread Title & details */}
              {(() => {
                const thread = threads.find(t => t.id === activeThreadId);
                if (!thread) return null;
                const authorProfile = profilesMap[thread.created_by];
                return (
                  <div className="border-b border-border bg-background/50 p-4 flex justify-between items-center shrink-0">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold border uppercase tracking-wider ${getCategoryBadgeColor(thread.category)}`}>
                          {getCategoryLabel(thread.category)}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-sm text-foreground tracking-tight">
                        {thread.title}
                      </h3>
                      <span className="text-[9px] text-muted-foreground block">
                        Thread initialized by <strong className="text-foreground">{authorProfile?.full_name || 'Admin'}</strong> ({authorProfile?.wing ? `${authorProfile.wing}-${authorProfile.flat_number}` : 'Sysop'}) on {new Date(thread.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Chat messages feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/10">
                {messagesLoading ? (
                  <div className="text-center py-12 text-muted-foreground text-xs animate-pulse">
                    Retrieving dialogue logs...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-xs space-y-2">
                    <MessageSquare className="h-6 w-6 mx-auto opacity-50 text-muted-foreground" />
                    <p>No messages posted in this thread yet. Be the first to start the discussion!</p>
                  </div>
                ) : (
                  messages.map(m => {
                    const sender = profilesMap[m.user_id];
                    const isSelf = m.user_id === adminProfile?.id;
                    const senderInitials = getInitials(sender?.full_name);
                    return (
                      <div key={m.id} className={`flex gap-3 max-w-xl ${isSelf ? 'ml-auto flex-row-reverse' : ''}`}>
                        {/* Sender Avatar */}
                        <div className={`h-8 w-8 rounded-full shrink-0 flex items-center justify-center font-bold text-xs ${
                          isSelf 
                            ? 'bg-[#1D9E75]/20 text-[#1D9E75] border border-[#1D9E75]/30' 
                            : 'bg-border text-muted-foreground border border-border'
                        }`}>
                          {senderInitials}
                        </div>
                        
                        {/* Message body */}
                        <div className="space-y-1">
                          <div className={`flex items-center gap-2 text-[9px] text-muted-foreground ${isSelf ? 'justify-end' : ''}`}>
                            <span className="font-bold text-foreground">{sender?.full_name || 'Resident'}</span>
                            {sender?.wing && (
                              <span className="px-1 py-px bg-border rounded text-[8px]">
                                {sender.wing}-{sender.flat_number}
                              </span>
                            )}
                            <Clock className="h-2.5 w-2.5" />
                            <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          
                          <div className={`p-3 rounded-lg text-xs border ${
                            isSelf 
                              ? 'bg-[#1D9E75]/10 border-[#1D9E75]/30 text-foreground rounded-tr-none' 
                              : 'bg-card border-border text-foreground rounded-tl-none'
                          }`}>
                            {m.content}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Typing Form */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-border bg-background/50 flex gap-2 shrink-0">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Post comment or announcement to thread..."
                  className="flex-1 px-3 py-2 bg-background border border-border rounded text-xs focus:outline-none focus:border-[#1D9E75]"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 bg-[#1D9E75] hover:bg-[#15803d] disabled:opacity-50 text-white rounded font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" /> Send
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-border/40 flex items-center justify-center text-muted-foreground border border-border animate-pulse">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm">No Thread Selected</h3>
                <p className="text-muted-foreground text-xs max-w-sm mt-1 mx-auto leading-relaxed">
                  Welcome to the SocietySync Council Forum. Select a topic on the left sidebar to view historical dialogues, or create a new discussion thread.
                </p>
              </div>
              <button 
                onClick={() => setCreateModal(true)}
                className="px-4 py-2 bg-[#1D9E75] hover:bg-[#15803d] text-white rounded text-xs font-bold transition-all cursor-pointer"
              >
                + Initialize New Thread
              </button>
            </div>
          )}
        </div>
      </main>

      {/* CREATE THREAD MODAL */}
      {createModal && (
        <div className="fixed inset-0 z-50 bg-[#000000]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form 
            onSubmit={handleCreateThread}
            className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl p-6 space-y-4 text-foreground text-xs"
          >
            <div className="flex justify-between items-center border-b border-border pb-2.5">
              <h3 className="font-extrabold text-sm tracking-tight flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[#1D9E75]" /> Initialize Council Discussion
              </h3>
              <button 
                type="button"
                onClick={() => setCreateModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="font-bold text-muted-foreground block">Discussion Title</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Repairing Water Pipeline in Wing E"
                  value={newThreadTitle}
                  onChange={(e) => setNewThreadTitle(e.target.value)}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:border-[#1D9E75]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-muted-foreground block">Discussion Category</label>
                <select
                  value={newThreadCategory}
                  onChange={(e) => setNewThreadCategory(e.target.value as any)}
                  className="w-full px-2.5 py-2 bg-background border border-border rounded text-xs focus:outline-none focus:border-[#1D9E75] cursor-pointer"
                >
                  <option value="general">💬 General Chat / Notice</option>
                  <option value="water-infrastructure">💧 Water System</option>
                  <option value="budget">💼 Budget & Dues</option>
                  <option value="events">🎉 Cultural & Events</option>
                  <option value="maintenance">🛠️ Repairs & Assets</option>
                  <option value="security">🛡️ Guard & Gates</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <button 
                type="button"
                onClick={() => setCreateModal(false)}
                className="px-3.5 py-2 bg-background border border-border hover:bg-border text-muted-foreground font-bold rounded cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-4 py-2 bg-[#1D9E75] hover:bg-[#15803d] text-white font-bold rounded cursor-pointer"
              >
                Create Thread
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
