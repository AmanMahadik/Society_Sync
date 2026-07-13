'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { Shield, Ban, Activity, CheckCircle2, ChevronRight, Moon, Sun, Laptop, Mail, Award, User } from 'lucide-react';

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
  created_at: string;
}

export default function SocietiesListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

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

  const fetchSocieties = async () => {
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

      const { data, error } = await supabase
        .from('societies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSocieties(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSocieties();
  }, []);

  const handleResendEmail = async (soc: Society) => {
    setSendingEmailId(soc.id);
    try {
      const response = await fetch('/api/approve-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          adminEmail: soc.admin_email,
          adminName: 'Society Admin',
          societyName: soc.name,
          status: 'approved',
          societyCode: soc.society_code
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        alert(`Onboarding credentials email successfully sent to ${soc.admin_email}!`);
      } else {
        throw new Error(data.error || 'Failed to send email');
      }
    } catch (err: any) {
      console.error(err);
      alert(`Failed to send email: ${err.message || err}`);
    } finally {
      setSendingEmailId(null);
    }
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

      fetchSocieties();
    } catch (e) {
      console.error(e);
      alert('Error updating society status.');
    }
  };

  const handleDeleteSociety = async (societyCode: string, name: string) => {
    const soc = societies.find(s => s.society_code === societyCode);
    if (!soc) {
      alert("Society details not found.");
      return;
    }

    const confirmationCode = window.prompt(
      `WARNING: This will permanently delete the society "${name}" along with ALL its residents, admins, guards, bills, complaints, settings, and visitor history.\n\nTo confirm, type the society code "${societyCode}":`
    );

    if (confirmationCode === null) return; // user cancelled

    if (confirmationCode.trim() !== societyCode) {
      alert("Invalid society code entered. Deletion cancelled.");
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('delete_society_cascade', {
        target_society_code: societyCode
      });

      if (error) throw error;

      if (data === true) {
        // Trigger deletion email notification
        try {
          console.log(`Sending deletion notification email to ${soc.admin_email}`);
          const emailResponse = await fetch('/api/approve-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              adminEmail: soc.admin_email,
              adminName: soc.admin_name || 'Society Admin',
              societyName: soc.name,
              status: 'deleted'
            })
          });
          const emailData = await emailResponse.json();
          if (!emailResponse.ok || !emailData.success) {
            throw new Error(emailData.error || 'Failed to send email');
          }
        } catch (emailErr: any) {
          console.error('Failed to trigger deletion email API:', emailErr);
          alert(`Warning: Society deleted, but notification email failed to send: ${emailErr.message || emailErr}`);
        }

        alert(`Society "${name}" and all its users have been permanently deleted.`);
        fetchSocieties();
      } else {
        alert("Could not delete society. Check if the society code is correct.");
      }
    } catch (e: any) {
      console.error(e);
      alert(`Error deleting society: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  const filtered = societies.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.society_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.city.toLowerCase().includes(searchQuery.toLowerCase())
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
            <Link href="/master/societies" className="text-[#dc2626] transition-colors border-b-2 border-[#dc2626] pb-1">Societies</Link>
            <Link href="/master/users" className="text-muted-foreground hover:text-foreground transition-colors">Users</Link>
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
                  className="py-2.5 px-4 rounded-lg transition-all bg-[#dc2626]/10 text-[#dc2626] border border-[#dc2626]/20 font-bold"
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
            <h2 className="text-xl font-extrabold tracking-tight">Approved Societies</h2>
            <p className="text-muted-foreground text-xs">Manage system-wide housing complex registrations</p>
          </div>
          
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, code, or city..."
            className="max-w-xs w-full bg-card border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:border-[#dc2626]"
          />
        </div>

        {/* SOCIETIES LIST TABLE */}
        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <div className="h-10 w-10 rounded-full border-2 border-border border-t-[#dc2626] animate-spin" />
              <span className="text-muted-foreground text-xs animate-pulse font-medium">Retrieving approved societies...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-xs">
              No registered societies found matching your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-background/40 text-muted-foreground font-semibold uppercase tracking-wider">
                    <th className="p-4">Society Name</th>
                    <th className="p-4">Location</th>
                    <th className="p-4">Admin Email</th>
                    <th className="p-4 text-center">Society Code</th>
                    <th className="p-4 text-center">Units</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((soc) => (
                    <tr key={soc.id} className="hover:bg-background/40 transition-colors">
                      <td className="p-4 font-bold">{soc.name}</td>
                      <td className="p-4 text-muted-foreground">{soc.city}, {soc.state}</td>
                      <td className="p-4">{soc.admin_email}</td>
                      <td className="p-4 text-center font-mono text-xs text-[#1D9E75] font-bold">{soc.society_code}</td>
                      <td className="p-4 text-center">{soc.total_units}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          soc.status === 'active' ? 'bg-[#1D9E75]/15 text-[#1D9E75] border border-[#1D9E75]/30' : 'bg-[#993C1D]/15 text-[#FAECE7] border border-[#993C1D]/30'
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
                            className="px-2.5 py-1 rounded bg-background border border-border hover:border-[#1D9E75]/30 text-[#1D9E75] text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer"
                          >
                            View Info
                          </Link>
                          <Link
                            href={`/master/credentials/${soc.id}`}
                            className="px-2.5 py-1 rounded bg-background border border-border hover:border-zinc-700 text-zinc-350 text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer"
                          >
                            Credentials
                          </Link>
                          <button
                            onClick={() => handleResendEmail(soc)}
                            disabled={sendingEmailId === soc.id}
                            className="px-2.5 py-1 rounded bg-background border border-border hover:border-[#1D9E75]/30 text-[#1D9E75] text-[10px] font-bold transition-all disabled:opacity-50 cursor-pointer"
                          >
                            {sendingEmailId === soc.id ? 'Sending...' : 'Send Email'}
                          </button>
                          <button
                            onClick={() => handleDeleteSociety(soc.society_code, soc.name)}
                            className="px-2.5 py-1 rounded bg-[#993C1D]/10 border border-[#993C1D]/20 hover:border-[#dc2626] hover:bg-[#dc2626]/10 text-[#dc2626] text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
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
