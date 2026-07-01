'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { Lock, Mail, ArrowRight, ShieldAlert, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('Failed to sign in. User session is invalid.');

      // Check user role from profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, status, society_id')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('User profile not registered or access denied.');
      }

      // Restrict access to Admins/Master Admins only (case-insensitive)
      const roleLower = (profile.role || '').toLowerCase();
      if (roleLower !== 'admin' && roleLower !== 'master_admin') {
        await supabase.auth.signOut();
        throw new Error('Access Denied. Only Society Administrators can access this portal.');
      }

      // Check society status if user is an admin
      if (roleLower === 'admin' && profile.society_id) {
        const { data: society, error: socError } = await supabase
          .from('societies')
          .select('status')
          .eq('id', profile.society_id)
          .single();

        if (!socError && society) {
          if (society.status === 'pending_verification') {
            router.push('/register/success');
            return;
          } else if (society.status === 'rejected') {
            setErrorMsg('Your society registration was rejected. Please contact support.');
            setLoading(false);
            return;
          }
        }
      }

      // Redirect to Admin dashboard
      router.push('/dashboard');

    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Invalid email or password.';
      setErrorMsg(msg);
      alert(`Login Failed: ${msg}`);
    } finally {
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
                onChange={(e) => setEmail(e.target.value)}
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

        <div className="mt-8 border-t border-zinc-800 pt-6 text-center text-xs text-zinc-500">
          Not yet registered?{' '}
          <Link href="/register" className="text-[#00d4aa] hover:underline font-medium">
            Register your society now
          </Link>
        </div>

        {/* Small background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00d4aa]/5 rounded-full blur-2xl -z-10" />
      </div>
    </div>
  );
}
