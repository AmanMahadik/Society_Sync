'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { Shield, User, Mail, ShieldAlert, Award, Moon, Sun, Laptop } from 'lucide-react';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'master_admin' | 'admin' | 'resident';
  society_id?: string;
  wing?: string;
  flat_number?: string;
  created_at: string;
  societies?: {
    name: string;
  };
}

export default function UsersListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Profile & settings drawer dropdown status
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

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/master/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (!profile || profile.role !== 'master_admin') {
        router.push('/master/login');
        return;
      }

      setAdminProfile(profile);

      // Fetch profiles with a join to societies to show their society name
      const { data, error } = await supabase
        .from('profiles')
        .select('*, societies(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, currentRole: string, newRole: 'master_admin' | 'admin' | 'resident') => {
    if (currentRole === newRole) return;
    
    const confirmChange = window.confirm(`Are you sure you want to change this user's role from "${currentRole}" to "${newRole}"?`);
    if (!confirmChange) return;

    setUpdatingId(userId);
    try {
      // Call secure security definer RPC function to change the user's role in the database
      const { error } = await supabase.rpc('toggle_user_role', {
        target_user_id: userId,
        new_role: newRole
      });

      if (error) throw error;

      alert(`Role successfully changed to ${newRole}!`);
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to update user role.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    const confirmDelete = window.confirm(`WARNING: Are you sure you want to permanently delete the user "${userEmail}"? This action CANNOT be undone and will delete all their profile info, flats, and auth data.`);
    if (!confirmDelete) return;

    const finalConfirm = window.prompt(`To confirm deletion, type the user's email address "${userEmail}":`);
    if (finalConfirm !== userEmail) {
      alert("Email mismatch. Deletion cancelled.");
      return;
    }

    setUpdatingId(userId);
    try {
      const { error } = await supabase.rpc('delete_user_permanently', {
        target_user_id: userId
      });

      if (error) throw error;

      alert(`User ${userEmail} and all their associated data have been permanently deleted.`);
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to delete user.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = users.filter(u => 
    (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.societies?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <Link href="/master/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">Requests</Link>
            <Link href="/master/societies" className="text-muted-foreground hover:text-foreground transition-colors">Societies</Link>
            <Link href="/master/users" className="text-[#dc2626] transition-colors border-b-2 border-[#dc2626] pb-1">Users</Link>
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
                  className="py-2.5 px-4 rounded-lg transition-all text-muted-foreground hover:text-foreground hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5"
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
                  className="py-2.5 px-4 rounded-lg transition-all bg-[#dc2626]/10 text-[#dc2626] border border-[#dc2626]/20 font-bold"
                >
                  Users
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

                {/* Sign Out Button */}
                <button
                  onClick={() => { supabase.auth.signOut(); router.push('/master/login'); }}
                  className="w-full py-2 bg-red-950/20 text-[#dc2626] border border-[#dc2626]/30 hover:bg-[#dc2626]/10 font-bold rounded text-center transition-all cursor-pointer block border-t"
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
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">User Administration</h2>
            <p className="text-muted-foreground text-xs">Control global application roles and access privileges</p>
          </div>
          
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or society..."
            className="max-w-xs w-full bg-card border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:border-[#dc2626]"
          />
        </div>

        {/* USERS TABLE */}
        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground text-xs">
              Retrieving user database profiles...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-xs">
              No registered user profiles found matching your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-background/40 text-muted-foreground font-semibold uppercase tracking-wider">
                    <th className="p-4">User Details</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Affiliated Society</th>
                    <th className="p-4">Flat Info</th>
                    <th className="p-4">Registered On</th>
                    <th className="p-4 text-center">User Role</th>
                    <th className="p-4 text-center">Update Role</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((user) => (
                    <tr key={user.id} className="hover:bg-background/40 transition-colors">
                      <td className="p-4 font-bold flex items-center gap-2">
                        <div className="h-7 w-7 rounded bg-background flex items-center justify-center border border-border text-muted-foreground shrink-0">
                          {user.role === 'master_admin' ? <Award className="h-4 w-4 text-[#dc2626]" /> : <User className="h-4 w-4" />}
                        </div>
                        {user.full_name || 'N/A'}
                      </td>
                      <td className="p-4 text-muted-foreground font-mono text-xs">{user.email}</td>
                      <td className="p-4">
                        {user.role === 'master_admin' ? (
                          <span className="text-muted-foreground italic">Global Superuser</span>
                        ) : (
                          user.societies?.name || <span className="text-[#854F0B] font-semibold">Unlinked / No Society</span>
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground font-mono text-xs">
                        {user.wing && user.flat_number ? `${user.wing}-${user.flat_number}` : 'N/A'}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          user.role === 'master_admin' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                          (user.role === 'admin' ? 'bg-[#1D9E75]/10 text-[#1D9E75] border border-[#1D9E75]/20' : 'bg-background text-muted-foreground border border-border')
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <select
                          value={user.role}
                          disabled={updatingId === user.id}
                          onChange={(e) => handleRoleChange(user.id, user.role, e.target.value as any)}
                          className="bg-background border border-border rounded px-2.5 py-1 text-xs text-foreground focus:outline-none focus:border-[#dc2626] cursor-pointer"
                        >
                          <option value="resident">Resident</option>
                          <option value="admin">Admin</option>
                          <option value="master_admin">Master Admin</option>
                        </select>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          disabled={updatingId === user.id || user.role === 'master_admin'}
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          className="px-3 py-1.5 bg-[#993C1D]/10 text-[#dc2626] border border-[#dc2626]/20 hover:bg-[#dc2626]/10 rounded text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
