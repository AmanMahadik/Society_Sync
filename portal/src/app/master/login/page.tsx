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
      if (!data.user) throw new Error('Authentication session error.');

      // Check role = 'master_admin' using secure RPC helper
      const { data: role, error: roleError } = await supabase.rpc('get_current_user_role');

      if (roleError || role !== 'master_admin') {
        // Sign out if they are not master admin to clear the session!
        await supabase.auth.signOut();
        throw new Error('Access Denied. Only seeded master admin accounts can log in here.');
      }

      router.push('/master/dashboard');

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Invalid master admin credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col items-center justify-center p-6 selection:bg-[#00d4aa] selection:text-[#09090b]">
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

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase">Master Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="societysync5@gmail.com"
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
            disabled={loading}
            className="w-full py-3.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2 glow-hover"
          >
            {loading ? 'Authenticating...' : 'ACCESS CONTROLLER'} <ArrowRight className="h-5 w-5" />
          </button>
        </form>

        <div className="mt-8 border-t border-zinc-800 pt-6 flex flex-col gap-3 text-center text-xs">
          <Link href="/master/register" className="text-red-500/80 hover:text-red-400 font-semibold transition-colors">
            Register Master Account
          </Link>
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
