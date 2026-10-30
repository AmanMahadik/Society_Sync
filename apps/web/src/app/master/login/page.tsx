'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import { Shield, Lock, Mail, ArrowRight, ShieldAlert, Eye, EyeOff } from 'lucide-react';

export default function MasterLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lockoutActive, setLockoutActive] = useState(false);
  const [lockoutExpiry, setLockoutExpiry] = useState<string | null>(null);

  // 2FA state hooks
  const [show2FAScreen, setShow2FAScreen] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [pendingToken, setPendingToken] = useState('');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('error') === 'unauthorized') {
        setErrorMsg('Unauthorized Account: Access restricted to authorized Master Administrators only.');
      }

      const expiry = localStorage.getItem('master_lockout_time');
      if (expiry) {
        const expiryTime = parseInt(expiry);
        if (Date.now() < expiryTime) {
          setLockoutActive(true);
          setLockoutExpiry(new Date(expiryTime).toLocaleString());
          setErrorMsg(`SECURITY BLOCK: This device is locked out from Master Admin access. Lockout expires at: ${new Date(expiryTime).toLocaleString()}`);
        } else {
          localStorage.removeItem('master_lockout_time');
          localStorage.removeItem('master_login_attempts');
        }
      }
    }
  }, []);

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/master/dashboard`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to authenticate with Google.');
      setLoading(false);
    }
  };

  const completeMasterLogin = async (session: any) => {
    await supabase.auth.setSession(session);

    // Check role = 'master_admin' using secure RPC helper or email check
    const { data: role, error: roleError } = await supabase.rpc('get_current_user_role');
    const isMasterEmail = session.user?.email?.trim().toLowerCase() === 'societysync5@gmail.com';

    if ((roleError || role !== 'master_admin') && !isMasterEmail) {
      // Sign out if they are not master admin to clear the session!
      await supabase.auth.signOut();
      throw new Error('Access Denied. Only seeded master admin accounts can log in here.');
    }

    // Reset lockout on successful login
    if (session.user?.email?.trim().toLowerCase() === 'societysync5@gmail.com') {
      localStorage.removeItem('master_login_attempts');
      localStorage.removeItem('master_lockout_time');
    }

    router.push('/master/dashboard');
  };

  const start2FAPolling = (token: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 150) { // Timeout after 5 minutes
        clearInterval(interval);
        setShow2FAScreen(false);
        setErrorMsg('Two-Factor Authentication request timed out. Please try again.');
        return;
      }

      try {
        const res = await fetch('/api/auth/complete-2fa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pendingToken: token })
        });
        const data = await res.json();
        
        if (data.status === 'success') {
          clearInterval(interval);
          setShow2FAScreen(false);
          setLoading(true);
          await completeMasterLogin(data.session);
        } else if (data.status === 'expired') {
          clearInterval(interval);
          setShow2FAScreen(false);
          setErrorMsg('Two-Factor Authentication request expired. Please try again.');
        }
      } catch (err) {
        console.error('Error polling 2FA status:', err);
      }
    }, 2000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    if (email.trim().toLowerCase() === 'societysync5@gmail.com') {
      const expiry = localStorage.getItem('master_lockout_time');
      if (expiry) {
        const expiryTime = parseInt(expiry);
        if (Date.now() < expiryTime) {
          setErrorMsg(`DEVICE LOCKED OUT: Access blocked due to previous failed attempts. Lockout expires at: ${new Date(expiryTime).toLocaleString()}`);
          setLockoutActive(true);
          return;
        }
      }
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      console.log('1. Calling /api/auth/login-2fa...');
      const res = await fetch('/api/auth/login-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const loginRes = await res.json();
      if (!res.ok) {
        throw new Error(loginRes.error || 'Authentication failed');
      }

      if (loginRes.status === '2fa_required') {
        setShow2FAScreen(true);
        setTwoFactorCode(loginRes.code);
        setPendingToken(loginRes.pendingToken);
        setLoading(false);
        start2FAPolling(loginRes.pendingToken);
        return;
      }

      // 2FA is disabled - proceed with standard login logic
      await completeMasterLogin(loginRes.session);

    } catch (err: any) {
      console.error(err);
      
      if (email.trim().toLowerCase() === 'societysync5@gmail.com') {
        const currentAttempts = parseInt(localStorage.getItem('master_login_attempts') || '0') + 1;
        localStorage.setItem('master_login_attempts', currentAttempts.toString());
        
        if (currentAttempts >= 3) {
          const lockoutTime = Date.now() + 24 * 60 * 60 * 1000; // 24-hour lockout
          localStorage.setItem('master_lockout_time', lockoutTime.toString());
          setLockoutActive(true);
          setLockoutExpiry(new Date(lockoutTime).toLocaleString());
          setErrorMsg(`SECURITY BLOCK: 3 failed login attempts detected. This device is locked out from Master Admin access for 24 hours. Lockout expires at: ${new Date(lockoutTime).toLocaleString()}`);
        } else {
          setErrorMsg(`Invalid master admin credentials. (Attempt ${currentAttempts} of 3 before device lockout)`);
        }
      } else {
        setErrorMsg(err.message || 'Invalid email or passcode.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col items-center justify-center p-6 selection:bg-red-500 selection:text-black">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl relative overflow-hidden">
        
        {/* LOGO & TITLE */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-3">
            <div className="h-9 w-9 rounded-lg bg-red-600/10 border border-red-600/30 flex items-center justify-center font-bold text-red-500 text-lg">
              <Shield className="h-5 w-5" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-white">SocietySync</span>
          </Link>
          <h2 className="text-sm font-bold text-red-500 tracking-wider uppercase mt-1">MASTER CONTROLLER PANEL</h2>
          <p className="text-zinc-500 text-xs mt-1">Authorised Superuser Access Only</p>
        </div>

        {/* ERROR DISPLAY */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-[#351515] border border-red-500/30 rounded-xl text-red-400 text-xs flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {show2FAScreen ? (
          <div className="space-y-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-600/10 flex items-center justify-center border border-red-600/20 mb-4 animate-pulse">
              <Lock className="h-6 w-6 text-red-500" />
            </div>
            
            <h2 className="text-lg font-bold text-white tracking-tight">Two-Factor Authentication</h2>
            
            <p className="text-xs text-zinc-400 leading-relaxed px-2">
              To verify your identity, please open your <strong>SocietySync Mobile App</strong> and authorize this login session.
            </p>
            
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-5 my-4">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-2">Portal Access Code</span>
              <span className="text-3xl font-extrabold tracking-widest text-red-500 font-mono">
                {twoFactorCode.slice(0, 3)} {twoFactorCode.slice(3)}
              </span>
            </div>

            <div className="flex flex-col gap-3.5 pt-4">
              <div className="flex items-center justify-center gap-2 text-zinc-500 text-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span>Waiting for mobile authorization...</span>
              </div>
              
              <button
                type="button"
                onClick={() => {
                  setShow2FAScreen(false);
                  setLoading(false);
                  setErrorMsg("Login cancelled.");
                }}
                className="text-xs text-zinc-500 hover:text-white transition-colors hover:underline mt-2 cursor-pointer"
              >
                ← Cancel & Return to Login
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase">Master Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="master@email.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-red-500 text-white"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-zinc-400 uppercase">Admin Passcode</label>
                <Link href="/master/forgot-password" style={{ fontSize: '11px' }} className="text-zinc-500 hover:text-red-400 transition-colors">
                  Forgot Passcode?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-10 py-3 text-sm focus:outline-none focus:border-red-500 text-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || lockoutActive}
              className="w-full py-3.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2 glow-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {lockoutActive ? 'ACCESS BLOCKED' : (loading ? 'Authenticating...' : 'ACCESS CONTROLLER')} <ArrowRight className="h-5 w-5" />
            </button>
          </form>
        )}

        <div className="flex items-center my-5">
          <div className="flex-1 border-t border-zinc-800/80"></div>
          <span className="px-3 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">OR</span>
          <div className="flex-1 border-t border-zinc-800/80"></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading || lockoutActive}
          className="w-full py-3.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="h-5 w-5 mr-1" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M5.266,9.765 C5.133,10.366 5.06,10.99 5.06,11.629 C5.06,12.267 5.133,12.891 5.266,13.493 L1.24,16.586 C0.449,15.106 0,13.419 0,11.629 C0,9.838 0.449,8.151 1.24,6.671 L5.266,9.765 Z"
            />
            <path
              fill="#FBBC05"
              d="M16.041,18.013 C14.951,18.816 13.566,19.297 12.029,19.297 C9.013,19.297 6.467,17.294 5.728,14.619 L1.702,17.713 C3.385,21.054 6.849,23.357 10.914,23.357 C13.979,23.357 16.691,22.358 18.743,20.656 L14.717,17.562 C14.675,17.596 16.041,18.013 16.041,18.013 Z"
            />
            <path
              fill="#4285F4"
              d="M23.52,11.834 C23.52,11.027 23.448,10.219 23.303,9.434 L12.029,9.434 L12.029,13.988 L18.49,13.988 C18.213,15.485 17.369,16.791 16.083,17.654 L20.109,20.747 C22.468,18.572 23.82,15.367 23.52,11.834 Z"
            />
            <path
              fill="#34A853"
              d="M12.029,4.56 C13.684,4.56 15.176,5.131 16.347,6.242 L19.829,2.761 C17.729,0.794 14.996,-0.203 12.029,-0.203 C6.849,-0.203 3.385,2.101 1.702,5.443 L5.728,8.536 C6.467,5.861 9.013,3.858 12.029,4.56 Z"
            />
          </svg>
          Sign in with Google
        </button>

        <div className="mt-8 border-t border-zinc-800 pt-6 flex flex-col gap-3 text-center text-xs">
          <Link href="/" className="text-zinc-500 hover:text-zinc-300">
            Return to Public Homepage
          </Link>
        </div>

        {/* Small background red glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full blur-2xl -z-10" />
      </div>
    </div>
  );
}
