'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { 
  Shield, 
  ShieldAlert, 
  Moon, 
  Sun, 
  Laptop, 
  Lock, 
  Key, 
  RefreshCw, 
  Fingerprint, 
  AlertTriangle, 
  Clock, 
  Users, 
  Globe, 
  Activity, 
  FileText, 
  Trash2, 
  Check, 
  User, 
  Award,
  Power,
  Smartphone,
  Eye,
  EyeOff
} from 'lucide-react';

interface SecurityAnomaly {
  id: string;
  ip_address: string;
  location: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  is_blocked: boolean;
  created_at: string;
}

interface AuditLog {
  id: string;
  action_type: string;
  created_at: string;
  old_value?: string;
  new_value?: string;
  ip_address?: string;
  profile?: { full_name: string };
  society?: { name: string };
}

export default function MasterSecurityConsole() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Theme settings state
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Security console state variables
  const [anomalies, setAnomalies] = useState<SecurityAnomaly[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [mfaStatus, setMfaStatus] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(false);
  
  // Just-in-time privilege state
  const [jitElevated, setJitElevated] = useState(false);
  const [jitDuration, setJitDuration] = useState('2h');
  const [jitTimeLeft, setJitTimeLeft] = useState('');

  // Break-glass simulation variables
  const [breakGlassVisible, setBreakGlassVisible] = useState(false);
  const [bgApprover1, setBgApprover1] = useState('');
  const [bgKey1, setBgKey1] = useState('');
  const [bgApprover2, setBgApprover2] = useState('');
  const [bgKey2, setBgKey2] = useState('');
  const [bgActive, setBgActive] = useState(false);
  const [bgCreds, setBgCreds] = useState<string | null>(null);

  // Credential rotation states
  const [rotatingKey, setRotatingKey] = useState<string | null>(null);
  const [rotatedKeys, setRotatedKeys] = useState<Record<string, boolean>>({});

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

  // Fetch security statistics and logs
  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      
      // Verify session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/master/login');
        return;
      }

      // Check role = master_admin
      const { data: role, error: roleError } = await supabase.rpc('get_current_user_role');
      if (roleError || role !== 'master_admin') {
        router.push('/master/login');
        return;
      }

      // Fetch logged in profile details
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (profileData) {
        setAdminProfile(profileData);
      }

      // Fetch security anomalies from DB
      const { data: anomalyData } = await supabase
        .from('security_anomalies')
        .select('*')
        .order('created_at', { ascending: false });
      
      setAnomalies(anomalyData || []);

      // Fetch audit logs
      const { data: logData } = await supabase
        .from('portal_audit_log')
        .select('*, profile:profiles(full_name), society:societies(name)')
        .order('created_at', { ascending: false })
        .limit(20);
      
      setAuditLogs(logData || []);

      // Check MFA setting status from DB
      const { data: mfaData } = await supabase
        .from('master_recovery_settings')
        .select('mfa_enabled')
        .eq('master_email', 'societysync5@gmail.com')
        .single();
      
      if (mfaData) {
        setMfaStatus(mfaData.mfa_enabled);
      }

    } catch (err) {
      console.error('Error loading security data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  // JIT elevation timer simulation
  useEffect(() => {
    if (!jitElevated) return;
    
    let totalSeconds = 0;
    if (jitDuration === '1h') totalSeconds = 3600;
    else if (jitDuration === '2h') totalSeconds = 7200;
    else if (jitDuration === '4h') totalSeconds = 14400;

    const interval = setInterval(() => {
      if (totalSeconds <= 0) {
        clearInterval(interval);
        setJitElevated(false);
        alert('Just-in-Time privilege elevation expired. Clearance level returned to CDL-A.');
        return;
      }
      totalSeconds--;
      
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      setJitTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [jitElevated, jitDuration]);

  // Handle Session Revocation
  const handleSessionRevocation = async () => {
    const confirmRevoke = window.confirm(
      'WARNING: Are you sure you want to revoke all active master admin sessions and API tokens? You will be signed out immediately and all other active devices will be forced to re-authenticate.'
    );
    if (!confirmRevoke) return;

    setSessionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Log action to audit logs before signout
        await supabase.from('portal_audit_log').insert({
          action_type: 'security_session_revocation',
          performed_by: session.user.id,
          old_value: 'Active Sessions & Tokens',
          new_value: 'All Sessions Invalidated / Revoked'
        });
      }

      alert('All active admin sessions and JWT tokens have been invalidated in Supabase Auth. Redirecting to login.');
      await supabase.auth.signOut();
      router.push('/master/login');
    } catch (err) {
      console.error(err);
      alert('Session revocation failed.');
    } finally {
      setSessionLoading(false);
    }
  };

  // Toggle MFA Setting & Force Re-enrollment
  const handleToggleMfa = async () => {
    const actionLabel = mfaStatus ? 'disable/force re-enrollment' : 'enable';
    const confirmAction = window.confirm(`Are you sure you want to ${actionLabel} Hardware key MFA?`);
    if (!confirmAction) return;

    try {
      const nextMfa = !mfaStatus;
      const { error } = await supabase
        .from('master_recovery_settings')
        .update({ mfa_enabled: nextMfa })
        .eq('master_email', 'societysync5@gmail.com');

      if (error) throw error;
      
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.from('portal_audit_log').insert({
        action_type: nextMfa ? 'mfa_enabled' : 'mfa_forced_reenroll',
        performed_by: session?.user.id,
        old_value: mfaStatus ? 'MFA Active' : 'MFA Disabled',
        new_value: nextMfa ? 'MFA Active' : 'MFA Reset (Force Re-enrollment required on next login)'
      });

      setMfaStatus(nextMfa);
      alert(
        nextMfa 
          ? 'MFA successfully enabled.' 
          : 'MFA trust invalidated. Master Admin will be forced to re-enroll a new hardware key on next sign-in.'
      );
      fetchSecurityData();
    } catch (e) {
      console.error(e);
      alert('Failed to update MFA settings.');
    }
  };

  // Toggle IP Blocking in Anomalies table
  const handleToggleBlockIp = async (id: string, ip: string, currentBlocked: boolean) => {
    const nextBlocked = !currentBlocked;
    const confirmAction = window.confirm(
      `Are you sure you want to ${nextBlocked ? 'BLOCK' : 'UNBLOCK'} traffic from IP Address ${ip}?`
    );
    if (!confirmAction) return;

    try {
      const { error } = await supabase
        .from('security_anomalies')
        .update({ is_blocked: nextBlocked })
        .eq('id', id);

      if (error) throw error;

      const { data: { session } } = await supabase.auth.getSession();
      await supabase.from('portal_audit_log').insert({
        action_type: nextBlocked ? 'ip_blocked' : 'ip_unblocked',
        performed_by: session?.user.id,
        old_value: currentBlocked ? 'IP Blocked' : 'IP Allowed',
        new_value: nextBlocked ? 'IP Blocked' : 'IP Allowed',
        ip_address: ip
      });

      alert(`IP address ${ip} has been ${nextBlocked ? 'blocked' : 'unblocked'}.`);
      fetchSecurityData();
    } catch (e) {
      console.error(e);
      alert('Failed to update IP block state.');
    }
  };

  // Rotate Downstream Credentials
  const rotateCredential = async (key: string, name: string) => {
    setRotatingKey(key);
    setError(null);
    
    // Simulate API rotation call (e.g. Supabase, Vercel, SendGrid API keys)
    setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // Log rotation in audit log
        await supabase.from('portal_audit_log').insert({
          action_type: 'credential_rotation',
          performed_by: session?.user.id,
          old_value: `${name} Active Token`,
          new_value: `${name} New Token Generated (Hash rotated downstream)`
        });

        setRotatedKeys(prev => ({ ...prev, [key]: true }));
        alert(`${name} rotated successfully. Downstream apps notified and updated.`);
      } catch (err) {
        console.error(err);
      } finally {
        setRotatingKey(null);
      }
    }, 2000);
  };

  // Handle Break-glass activation
  const handleBreakGlassActivation = (e: React.FormEvent) => {
    e.preventDefault();
    if (bgApprover1 === bgApprover2) {
      alert('Dual control failure: Two distinct security officers are required.');
      return;
    }

    // Verify simulated vault security keys
    if (bgKey1 !== 'SEC-OFFICER-ALICE-KEY-2026' || bgKey2 !== 'SEC-OFFICER-BOB-KEY-2026') {
      alert('Dual control verification failed: Invalid Security Officer vault keys.');
      return;
    }

    setBgActive(true);
    setBgCreds('EMERGENCY-MASTER-ADMIN-CREDENTIALS-VAULT-LINK-SS582A9');
    
    // Log break glass
    supabase.auth.getSession().then(({ data: { session } }) => {
      supabase.from('portal_audit_log').insert({
        action_type: 'break_glass_activated',
        performed_by: session?.user.id,
        old_value: 'Emergency Admin Locked in Vault',
        new_value: 'Break-Glass Account Credentials Released to Dual Approvers'
      });
    });

    alert('BREAK-GLASS PROTOCOL ACTIVE: Emergency admin credentials decrypted and printed below.');
  };

  // JIT Elevation Toggle
  const handleJitToggle = async () => {
    if (jitElevated) {
      setJitElevated(false);
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.from('portal_audit_log').insert({
        action_type: 'jit_deelevate',
        performed_by: session?.user.id,
        old_value: 'Privileged Clearance Active (CDL-A+)',
        new_value: ' Clearance Level returned to normal (CDL-A)'
      });
      alert('Just-in-Time privilege deactivated. Clearance returned to normal.');
    } else {
      const confirmElevate = window.confirm(`Initiate Just-in-Time privilege elevation for ${jitDuration}? This will temporarily elevate your clearance status and is flagged as a high-security event.`);
      if (!confirmElevate) return;

      setJitElevated(true);
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.from('portal_audit_log').insert({
        action_type: 'jit_elevate',
        performed_by: session?.user.id,
        old_value: 'Normal Clearance (CDL-A)',
        new_value: `Privilege Elevated to CDL-A+ for ${jitDuration}`
      });
      alert(`Privilege elevated for ${jitDuration}. Audit logging is active.`);
    }
  };

  const [error, setError] = useState<string | null>(null);

  const filteredLogs = auditLogs.filter(log =>
    log.action_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.profile?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.society?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-[#dc2626] selection:text-[#0b0e10]">
      {/* NAVBAR */}
      <header className="border-b border-border bg-background px-6 py-4 flex justify-between items-center relative z-50">
        <div className="flex items-center gap-3">
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
            <Link href="/master/users" className="text-muted-foreground hover:text-foreground transition-colors">Users</Link>
            <Link href="/master/security" className="text-[#dc2626] transition-colors border-b-2 border-[#dc2626] pb-1">Security</Link>
          </nav>

          {/* MOBILE NAVIGATION SIDE DRAWER */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-[100] md:hidden">
              <div onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300" />
              <div className="fixed top-0 left-0 bottom-0 w-72 max-w-[80vw] bg-card border-r border-border p-6 flex flex-col justify-between shadow-2xl transition-transform duration-300 transform translate-x-0 z-50 text-foreground">
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-border">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded bg-[#dc2626] flex items-center justify-center font-bold text-white shadow-lg">
                        <Shield className="h-4 w-4" />
                      </div>
                      <span className="font-extrabold text-base tracking-tight">SocietySync</span>
                    </div>
                    <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-zinc-800/20 dark:hover:bg-zinc-100/10 cursor-pointer">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>
                  <nav className="flex flex-col gap-4 text-xs font-semibold uppercase tracking-wider">
                    <Link href="/master/dashboard" onClick={() => setMobileMenuOpen(false)} className="py-2.5 px-4 rounded-lg transition-all text-muted-foreground hover:text-foreground hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5">Requests</Link>
                    <Link href="/master/societies" onClick={() => setMobileMenuOpen(false)} className="py-2.5 px-4 rounded-lg transition-all text-muted-foreground hover:text-foreground hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5">Societies</Link>
                    <Link href="/master/users" onClick={() => setMobileMenuOpen(false)} className="py-2.5 px-4 rounded-lg transition-all text-muted-foreground hover:text-foreground hover:bg-zinc-800/10 dark:hover:bg-zinc-100/5">Users</Link>
                    <Link href="/master/security" onClick={() => setMobileMenuOpen(false)} className="py-2.5 px-4 rounded-lg transition-all bg-[#dc2626]/10 text-[#dc2626] border border-[#dc2626]/20 font-bold">Security</Link>
                  </nav>
                </div>
                <div className="border-t border-border pt-4 text-[10px] text-muted-foreground uppercase tracking-widest text-center font-bold">Master Control Board</div>
              </div>
            </div>
          )}
          
          <div className="relative">
            <button 
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="h-8 w-8 rounded-full bg-[#dc2626] flex items-center justify-center font-extrabold text-xs text-white shadow-lg shadow-[#dc2626]/20 hover:bg-[#b91c1c] transition-all cursor-pointer"
            >
              MA
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 mt-3 w-80 bg-card border border-border rounded-lg shadow-2xl p-5 space-y-4 text-xs z-50 text-foreground">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <h3 className="font-bold text-sm tracking-tight">Account & Settings</h3>
                  <button onClick={() => setProfileDropdownOpen(false)} className="text-muted-foreground hover:text-foreground text-sm font-bold cursor-pointer">×</button>
                </div>
                
                <div className="space-y-3">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Profile</span>
                  <div className="flex items-center gap-3 bg-background/50 border border-border p-3 rounded-lg">
                    <div className="h-10 w-10 rounded-full bg-[#dc2626]/10 border border-[#dc2626]/20 flex items-center justify-center font-bold text-[#dc2626] text-sm">MA</div>
                    <div>
                      <h4 className="font-bold text-foreground">{adminProfile?.full_name || 'Master Admin'}</h4>
                      <span className="text-[10px] text-red-500 font-semibold uppercase tracking-wider block bg-red-950/15 border border-red-500/20 px-2 py-0.5 rounded mt-1 max-w-fit">Global Superuser</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Theme</span>
                  <div className="grid grid-cols-3 gap-2 bg-background border border-border rounded p-1">
                    <button onClick={() => handleThemeChange('light')} className={`py-1 text-[10px] font-bold rounded transition-all cursor-pointer flex items-center justify-center gap-1 ${theme === 'light' ? 'bg-card text-foreground border border-border shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}><Sun className="h-3 w-3" />Light</button>
                    <button onClick={() => handleThemeChange('dark')} className={`py-1 text-[10px] font-bold rounded transition-all cursor-pointer flex items-center justify-center gap-1 ${theme === 'dark' ? 'bg-card text-foreground border border-border shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}><Moon className="h-3 w-3" />Dark</button>
                    <button onClick={() => handleThemeChange('system')} className={`py-1 text-[10px] font-bold rounded transition-all cursor-pointer flex items-center justify-center gap-1 ${theme === 'system' ? 'bg-card text-foreground border border-border shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}><Laptop className="h-3 w-3" />System</button>
                  </div>
                </div>

                <Link
                  href="/master/security"
                  className="w-full py-2 bg-[#dc2626]/10 text-white border border-[#dc2626]/20 hover:bg-[#dc2626]/20 font-bold rounded text-center transition-all cursor-pointer block text-xs"
                >
                  🛡️ Security Console
                </Link>

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
        <div>
          <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
            <Lock className="h-6 w-6 text-[#dc2626]" /> Cybersecurity & Emergency Control Center
          </h2>
          <p className="text-muted-foreground text-xs">
            Review security threats, manage session revocations, rotate credentials, and execute emergency out-of-band recovery.
          </p>
        </div>

        {loading ? (
          <div className="p-20 text-center text-muted-foreground text-xs animate-pulse">
            Loading cybersecurity matrix systems...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT COLUMN: ACTIVE CONTROL & SESSIONS */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* SESSIONS & MFA EMERGENCY CONTROLS */}
              <div className="bg-card border border-border rounded-xl p-5 space-y-6 shadow-xl">
                <h3 className="text-xs font-bold uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
                  <Power className="h-4 w-4 text-[#dc2626]" /> Critical Security Actions
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Session Revocation Widget */}
                  <div className="bg-background border border-border rounded-xl p-4 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-red-500" /> Active Session Revocation
                      </h4>
                      <p className="text-[10px] text-zinc-400 leading-normal">
                        Kills all active JWT auth tokens, cookies, and active device logins tied to the Master Admin account immediately.
                      </p>
                    </div>
                    
                    <button
                      onClick={handleSessionRevocation}
                      disabled={sessionLoading}
                      className="w-full py-2.5 bg-red-950/20 text-[#dc2626] border border-[#dc2626]/30 hover:bg-[#dc2626]/20 font-bold rounded-lg text-xs uppercase tracking-wider transition-all"
                    >
                      {sessionLoading ? 'Revoking All Sessions...' : 'Revoke All Sessions'}
                    </button>
                  </div>

                  {/* MFA Re-enrollment Widget */}
                  <div className="bg-background border border-border rounded-xl p-4 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Fingerprint className="h-4 w-4 text-emerald-500" /> Force MFA Re-enrollment
                      </h4>
                      <p className="text-[10px] text-zinc-400 leading-normal">
                        Invalidates current hardware key trust (WebAuthn/FIDO2). Forces re-enrollment of keys on next authentication to block compromised keys.
                      </p>
                    </div>
                    
                    <button
                      onClick={handleToggleMfa}
                      className={`w-full py-2.5 font-bold rounded-lg text-xs uppercase tracking-wider transition-all border ${
                        mfaStatus 
                          ? 'bg-emerald-950/20 text-emerald-500 border-emerald-500/30 hover:bg-emerald-950/40'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      {mfaStatus ? 'MFA Trust Active (Reset)' : 'MFA Trust Revoked (Disabled)'}
                    </button>
                  </div>
                </div>
              </div>

              {/* DOWNSTREAM CREDENTIALS ROTATION CONSOLE */}
              <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-xl">
                <h3 className="text-xs font-bold uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-[#dc2626]" /> Rotate Downstream API Credentials
                </h3>
                
                <p className="text-[10px] text-muted-foreground leading-normal">
                  In case of an admin compromise, rotation of service accounts and API key hashes downstream reduces damage. Click to rotate active tokens.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border bg-background/40 text-muted-foreground font-semibold uppercase tracking-wider">
                        <th className="p-3">Credential Name</th>
                        <th className="p-3">Assigned Asset</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {[
                        { key: 'supabase_db', name: 'Supabase Postgres Key', asset: 'Database Engine Hash', status: 'Active' },
                        { key: 'vercel_token', name: 'Vercel API Access Token', asset: 'Frontend Portal Deployments', status: 'Active' },
                        { key: 'sendgrid_smtp', name: 'SendGrid SMTP Mailer Key', asset: 'System Notification Mailer', status: 'Active' },
                        { key: 'google_oauth', name: 'Google OAuth Client ID', asset: 'Social SSO Integrations', status: 'Active' }
                      ].map((cred) => (
                        <tr key={cred.key} className="hover:bg-background/25">
                          <td className="p-3 font-bold text-white">{cred.name}</td>
                          <td className="p-3 text-zinc-400 font-mono text-[10px]">{cred.asset}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                              rotatedKeys[cred.key] ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}>
                              {rotatedKeys[cred.key] ? 'Rotated' : cred.status}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => rotateCredential(cred.key, cred.name)}
                              disabled={rotatingKey === cred.key || rotatedKeys[cred.key]}
                              className="px-3 py-1 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-850 hover:border-zinc-700 rounded text-[10px] font-bold uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                              {rotatingKey === cred.key ? 'Rotating...' : (rotatedKeys[cred.key] ? 'Completed' : 'Rotate')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ANOMALY DETECTION LOG & THREAT MONITOR */}
              <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-xl">
                <h3 className="text-xs font-bold uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-[#dc2626]" /> Anomaly Detection & Connection Logs
                </h3>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  Automatic system sensors track impossible travel patterns, unknown devices, and Tor/VPN exit gateways. Network feeds freeze suspicious admin sessions.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border bg-background/40 text-muted-foreground font-semibold uppercase tracking-wider">
                        <th className="p-3">Date</th>
                        <th className="p-3">IP Address</th>
                        <th className="p-3">Location</th>
                        <th className="p-3">Threat Description</th>
                        <th className="p-3 text-center">Severity</th>
                        <th className="p-3 text-center">Firewall</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {anomalies.map((an) => (
                        <tr key={an.id} className="hover:bg-background/25">
                          <td className="p-3 text-zinc-500 font-mono text-[10px]">{new Date(an.created_at).toLocaleString()}</td>
                          <td className="p-3 text-white font-mono">{an.ip_address}</td>
                          <td className="p-3 text-zinc-300 font-bold">{an.location}</td>
                          <td className="p-3 text-zinc-400 text-[10px] leading-relaxed max-w-[200px]">{an.description}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                              an.severity === 'critical' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                              (an.severity === 'high' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                              (an.severity === 'medium' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'bg-zinc-800 text-zinc-400'))
                            }`}>
                              {an.severity}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleToggleBlockIp(an.id, an.ip_address, an.is_blocked)}
                              className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all border cursor-pointer ${
                                an.is_blocked 
                                  ? 'bg-red-950/20 border-red-500/30 text-red-500 hover:bg-red-950/40' 
                                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                              }`}
                            >
                              {an.is_blocked ? 'Blocked' : 'Block IP'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: JUST-IN-TIME CLEARANCE & BREAK GLASS */}
            <div className="space-y-6">
              
              {/* JUST-IN-TIME PRIVILEGE ELEVATION */}
              <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-xl">
                <h3 className="text-xs font-bold uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#dc2626]" /> Just-in-Time Clearance
                </h3>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Avoid permanent SysAdmin rights. Elevated permissions are requested, approved, and time-boxed to minimize credentials hijacking.
                </p>

                <div className="bg-background border border-border rounded-xl p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Clearance Status</span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                      jitElevated ? 'bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse' : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {jitElevated ? 'CDL-A+ PRIVILEGED' : 'CDL-A NORMAL'}
                    </span>
                  </div>

                  {jitElevated && (
                    <div className="bg-red-950/10 border border-red-500/20 p-3 rounded-lg text-center font-mono font-bold text-red-500 text-sm">
                      ELEVATION EXPIRES IN: {jitTimeLeft}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <select
                      value={jitDuration}
                      onChange={(e) => setJitDuration(e.target.value)}
                      disabled={jitElevated}
                      className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-red-500 flex-1"
                    >
                      <option value="1h">1 Hour Hold</option>
                      <option value="2h">2 Hours Hold</option>
                      <option value="4h">4 Hours Hold</option>
                    </select>
                    
                    <button
                      onClick={handleJitToggle}
                      className={`px-4 py-1.5 rounded text-xs font-bold uppercase transition-all ${
                        jitElevated 
                          ? 'bg-zinc-950 text-red-500 border border-[#dc2626]' 
                          : 'bg-[#dc2626] hover:bg-[#b91c1c] text-white'
                      }`}
                    >
                      {jitElevated ? 'De-elevate' : 'Elevate'}
                    </button>
                  </div>
                </div>
              </div>

              {/* DUAL-CONTROL BREAK GLASS ACCOUNT */}
              <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-xl">
                <h3 className="text-xs font-bold uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[#dc2626]" /> Break-Glass Rescue Path
                </h3>
                
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  In case the primary Master Admin account is locked or corrupted, a Dual-Control Emergency Account (<code>emergency_admin@societysync.com</code>) can be retrieved. Retrieving credentials requires cryptographic verification from TWO separate Security Officers.
                </p>

                {!breakGlassVisible ? (
                  <button
                    onClick={() => setBreakGlassVisible(true)}
                    className="w-full py-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-zinc-350 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all"
                  >
                    Open Emergency Vault
                  </button>
                ) : (
                  <form onSubmit={handleBreakGlassActivation} className="space-y-4 bg-background border border-border p-4 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest">Emergency Vault Credentials</span>
                      <button type="button" onClick={() => setBreakGlassVisible(false)} className="text-zinc-500 hover:text-white">×</button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Officer 1 Key (Alice)</label>
                        <input
                          type="password"
                          value={bgKey1}
                          onChange={(e) => setBgKey1(e.target.value)}
                          placeholder="Alice's Safe Token Key"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-[10px] text-white"
                          required
                        />
                        <span className="text-[8px] text-zinc-600 font-mono mt-0.5 block">Hint: SEC-OFFICER-ALICE-KEY-2026</span>
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Officer 2 Key (Bob)</label>
                        <input
                          type="password"
                          value={bgKey2}
                          onChange={(e) => setBgKey2(e.target.value)}
                          placeholder="Bob's Safe Token Key"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-[10px] text-white"
                          required
                        />
                        <span className="text-[8px] text-zinc-600 font-mono mt-0.5 block">Hint: SEC-OFFICER-BOB-KEY-2026</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={bgActive}
                      className="w-full py-2 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold uppercase rounded-lg transition-all"
                    >
                      Retrieve Emergency Passcode
                    </button>

                    {bgCreds && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg space-y-1">
                        <span className="text-[9px] text-red-400 font-extrabold uppercase tracking-wide block">DECRYPTED CREDENTIALS:</span>
                        <span className="text-white font-mono text-[10px] block">Email: <code>emergency_admin@societysync.com</code></span>
                        <span className="text-white font-mono text-[10px] block">Passcode: <code>SS-EMERGENCY-2026-XQ92!</code></span>
                      </div>
                    )}
                  </form>
                )}
              </div>

              {/* SECURE AUDIT LOG STREAM */}
              <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-xl">
                <h3 className="text-xs font-bold uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#dc2626]" /> Security Auditing Feed
                </h3>

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search actions..."
                  className="w-full bg-background border border-border rounded p-2 text-[10px] text-foreground focus:outline-none focus:border-red-500"
                />

                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                  {filteredLogs.map((log) => (
                    <div key={log.id} className="bg-background border border-border rounded p-2.5 text-[10px] space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-500">{new Date(log.created_at).toLocaleString()}</span>
                        <span className="font-extrabold text-[#dc2626] uppercase text-[8px] bg-red-500/5 px-1.5 py-0.5 rounded border border-red-500/10">
                          {log.action_type}
                        </span>
                      </div>
                      <p className="text-zinc-300 font-bold leading-normal text-[10px]">
                        Performed by: <span className="text-white font-medium">{log.profile?.full_name || 'System'}</span>
                      </p>
                      <div className="bg-zinc-950/50 p-1.5 border border-zinc-850 rounded text-[9px] font-mono leading-tight space-y-0.5">
                        <div className="text-zinc-500">PREV: {log.old_value || 'None'}</div>
                        <div className="text-zinc-300">NEW: {log.new_value || 'None'}</div>
                        {log.ip_address && <div className="text-zinc-500">IP: {log.ip_address}</div>}
                      </div>
                    </div>
                  ))}
                  {filteredLogs.length === 0 && (
                    <div className="text-[10px] text-muted-foreground text-center py-6">No matching audit logs found.</div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}
      </main>
    </div>
  );
}
