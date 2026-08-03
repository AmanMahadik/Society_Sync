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

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/dashboard`;
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setErrorMsg(null);

    console.log('Login attempt started for:', email);

    try {
      console.log('1. Calling supabase.auth.signInWithPassword...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Supabase Auth error:', error);
        throw error;
      }
      if (!data.user) {
        throw new Error('Failed to sign in. User session is invalid.');
      }
      console.log('2. Supabase Auth successful. User ID:', data.user.id);

      if (data.session) {
        document.cookie = `sb-auth-token=${data.session.access_token}; path=/; max-age=${data.session.expires_in}; SameSite=Lax`;
        console.log('Set sb-auth-token cookie for middleware.');
      }

      // Check user role from profiles table
      console.log('3. Fetching user profile from profiles table...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, status, society_id')
        .eq('id', data.user.id)
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

      // Redirect to Admin dashboard
      console.log('7. Redirecting to /dashboard...');
      router.push('/dashboard');
      console.log('8. router.push(/dashboard) called.');
      

    } catch (err: any) {
      console.error('Login process caught exception:', err);
      const msg = err.message || 'Invalid email or password.';
      setErrorMsg(msg);
      alert(`Login Failed: ${msg}`);
    } finally {
      console.log('Login attempt finally block executed.');
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

        <div className="flex items-center my-5">
          <div className="flex-1 border-t border-zinc-800/80"></div>
          <span className="px-3 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">OR</span>
          <div className="flex-1 border-t border-zinc-800/80"></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-3.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
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
