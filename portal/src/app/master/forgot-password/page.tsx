"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import { Shield, Mail, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function MasterForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`, // Redirects to password reset
      });

      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center shadow-xl">
          <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6 text-emerald-500">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold mb-2">Reset Link Dispatched</h2>
          <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
            If the account exists, password recovery instructions have been sent to <span className="text-white font-semibold">{email}</span>. 
            Please check your inbox.
          </p>
          <Link
            href="/master/login"
            className="inline-flex items-center justify-center gap-2 w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold py-3 px-4 rounded-lg transition-colors text-sm"
          >
            Return to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col items-center justify-center p-6 selection:bg-[#00d4aa] selection:text-[#09090b]">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl relative overflow-hidden">
        
        {/* LOGO & TITLE */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="h-9 w-9 rounded-lg bg-red-600/10 border border-red-600/30 flex items-center justify-center font-bold text-red-500 text-lg">
              <Shield className="h-5 w-5" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-white">SocietySync</span>
          </div>
          <h2 className="text-sm font-bold text-red-500 tracking-wider uppercase mt-1">FORGOT PASSCODE</h2>
          <p className="text-zinc-500 text-xs mt-1">Reset your Master Admin Credentials</p>
        </div>

        {/* ERROR DISPLAY */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-[#351515] border border-red-500/30 rounded-xl text-red-400 text-xs flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-6">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
          >
            {loading ? 'Sending link...' : 'Send Recovery Instructions'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="text-center mt-6">
          <Link href="/master/login" className="text-xs text-zinc-400 hover:text-red-400 transition-colors">
            Return to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
