'use client';

import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // 2FA state hooks
  const [show2FAScreen, setShow2FAScreen] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [pendingToken, setPendingToken] = useState('');

  const completeUserLogin = async (session: any) => {
    await supabase.auth.setSession(session);
    
    document.cookie = `sb-auth-token=${session.access_token}; path=/; max-age=${session.expires_in}; SameSite=Lax`;
    console.log('Set sb-auth-token cookie for middleware.');

    // Check user role from profiles table
    console.log('3. Fetching user profile from profiles table...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, status, society_id')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError);
      throw new Error('User profile not registered or access denied.');
    }
    console.log('4. Profile details fetched successfully:', profile);

    // Restrict access to Admins/Master Admins only (case-insensitive)
    const roleLower = (profile.role || '').toLowerCase();
    if (roleLower !== 'admin' && roleLower !== 'master_admin') {
      console.warn('Access denied: Role is not Admin or Master Admin. Logging out...');
      await supabase.auth.signOut();
      throw new Error('Access Denied. Only Society Administrators can access this portal.');
    }

    // Check society status if user is an admin
    if (roleLower === 'admin' && profile.society_id) {
      console.log('5. User is Admin. Checking society status...');
      const { data: society, error: socError } = await supabase
        .from('societies')
        .select('status')
        .eq('id', profile.society_id)
        .single();

      if (socError) {
        console.error('Society fetch error:', socError);
      }
      
      if (!socError && society) {
        console.log('6. Society status retrieved:', society.status);
        if (society.status === 'pending_verification') {
          console.log('Redirecting to /register/success...');
          router.push('/register/success');
          return;
        } else if (society.status === 'rejected') {
          console.log('Society is rejected.');
          setErrorMsg('Your society registration was rejected. Please contact support.');
          setLoading(false);
          return;
        }
      }
    }

    console.log('7. Redirecting to /dashboard...');
    router.push('/dashboard');
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
          await completeUserLogin(data.session);
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

    setLoading(true);
    setErrorMsg(null);

    console.log('Login attempt started for:', email);

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
      await completeUserLogin(loginRes.session);
    } catch (err: any) {
      console.error('Login process caught exception:', err);
      const msg = err.message || 'Invalid email or password.';
      setErrorMsg(msg);
      alert(`Login Failed: ${msg}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col items-center justify-center p-6 selection:bg-[#00d4aa] selection:text-[#09090b]">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl relative overflow-hidden">
        {/* LOGO */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-3">
            <img src="/logo.png" alt="SocietySync Logo" className="h-10 w-10 rounded-lg object-contain" />
            <span className="font-extrabold text-2xl tracking-tight text-white">SocietySync</span>
          </Link>
          <p className="text-zinc-500 text-sm">Society Administrator Portal Login</p>
        </div>

        {/* ERROR DISPLAY */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-[#351515] border border-red-500/30 rounded-xl text-red-400 text-sm flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {show2FAScreen ? (
          <div className="space-y-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-[#00d4aa]/10 flex items-center justify-center border border-[#00d4aa]/20 mb-4 animate-pulse">
              <Lock className="h-6 w-6 text-[#00d4aa]" />
            </div>
            
            <h2 className="text-lg font-bold text-white tracking-tight">Two-Factor Authentication</h2>
            
            <p className="text-xs text-zinc-400 leading-relaxed px-2">
              To verify your identity, please open your <strong>SocietySync Mobile App</strong> and authorize this login session.
            </p>
            
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-5 my-4">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-2">Portal Access Code</span>
              <span className="text-3xl font-extrabold tracking-widest text-[#00d4aa] font-mono">
                {twoFactorCode.slice(0, 3)} {twoFactorCode.slice(3)}
              </span>
            </div>

            <div className="flex flex-col gap-3.5 pt-4">
              <div className="flex items-center justify-center gap-2 text-zinc-500 text-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00d4aa] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00d4aa]"></span>
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
          <form onSubmit={handleLogin} method="POST" className="space-y-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.replace(/\s/g, ''))}
                  placeholder="admin@society.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#00d4aa] text-white"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-zinc-400 uppercase">Password</label>
                <a href="#" className="text-xs text-zinc-500 hover:text-[#00d4aa] transition-all">Forgot password?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-12 py-3 text-sm focus:outline-none focus:border-[#00d4aa] text-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#00d4aa] text-zinc-950 font-bold rounded-lg hover:bg-[#00b390] transition-all flex items-center justify-center gap-2 glow-hover"
            >
              {loading ? 'Logging in...' : 'LOGIN TO DASHBOARD'} <ArrowRight className="h-5 w-5" />
            </button>
          </form>
        )}

        <div className="mt-8 border-t border-zinc-800 pt-6 text-center text-xs text-zinc-500 flex flex-col gap-3.5">
          <div>
            Not yet registered?{' '}
            <Link href="/register" className="text-[#00d4aa] hover:underline font-medium">
              Register your society now
            </Link>
          </div>
          <div>
            <Link href="/" className="text-zinc-500 hover:text-white transition-colors hover:underline">
              ← Return to Home Page
            </Link>
          </div>
        </div>

        {/* Small background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00d4aa]/5 rounded-full blur-2xl -z-10" />
      </div>
    </div>
  );
}
