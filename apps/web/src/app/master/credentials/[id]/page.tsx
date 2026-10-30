'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { Shield, ArrowLeft, Key, Copy, Check } from 'lucide-react';

interface SocietyAdminCreds {
  admin_email: string;
  generated_password: string;
  society_code: string;
}

export default function CredentialsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [creds, setCreds] = useState<SocietyAdminCreds | null>(null);

  const fetchCredentials = async () => {
    if (!params?.id) return;
    try {
      setLoading(true);

      // 1. Fetch request email first
      const { data: request, error: reqError } = await supabase
        .from('society_requests')
        .select('admin_email')
        .eq('id', parseInt(params.id))
        .single();

      if (reqError || !request) {
        // Fallback: If id is a UUID, try to query society_admins directly
        const { data: directCreds, error: directError } = await supabase
          .from('society_admins')
          .select('admin_email, generated_password, society_code')
          .eq('society_id', params.id)
          .single();

        if (!directError && directCreds) {
          setCreds(directCreds);
          setLoading(false);
          return;
        }
        throw reqError || new Error('Credentials not found.');
      }

      // 2. Fetch credentials using admin_email
      const { data: adminCreds, error: credsError } = await supabase
        .from('society_admins')
        .select('admin_email, generated_password, society_code')
        .eq('admin_email', request.admin_email)
        .single();

      if (credsError) throw credsError;
      setCreds(adminCreds);

    } catch (e) {
      console.error('Error fetching credentials:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, [params?.id]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex items-center justify-center p-6">
        <p className="text-zinc-500 text-sm">Retrieving generated credentials...</p>
      </div>
    );
  }

  if (!creds) {
    return (
      <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-red-500">Credentials file not found.</p>
        <Link href="/master/dashboard" className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded text-xs font-bold">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col selection:bg-[#00d4aa] selection:text-[#09090b]">
      {/* NAVBAR */}
      <header className="border-b border-zinc-800 bg-zinc-950 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/master/dashboard" className="text-zinc-400 hover:text-white transition-all">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="font-extrabold text-base tracking-tight">Generated Credentials</span>
        </div>
      </header>

      {/* BODY DISPLAY */}
      <main className="flex-1 max-w-md w-full mx-auto p-6 flex flex-col justify-center items-center">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full space-y-6 shadow-xl relative overflow-hidden">
          
          <div className="text-center">
            <div className="h-12 w-12 rounded-full bg-[#00d4aa]/10 border border-[#00d4aa]/30 flex items-center justify-center mx-auto mb-4 text-[#00d4aa]">
              <Key className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Society Approved!</h2>
            <p className="text-zinc-500 text-xs mt-1">Copy and share these credentials with the Society Admin</p>
          </div>

          <div className="space-y-4 pt-4 border-t border-zinc-800">
            {/* Admin Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Admin Login Email</label>
              <div className="flex bg-zinc-950 border border-zinc-800 rounded-lg p-3 justify-between items-center">
                <span className="text-zinc-300 text-sm font-medium">{creds.admin_email}</span>
                <button 
                  onClick={() => copyToClipboard(creds.admin_email, 'email')}
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  {copiedKey === 'email' ? <Check className="h-4 w-4 text-[#00d4aa]" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Generated Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Generated Passcode</label>
              <div className="flex bg-zinc-950 border border-zinc-800 rounded-lg p-3 justify-between items-center">
                <span className="text-white font-mono text-sm font-bold">{creds.generated_password}</span>
                <button 
                  onClick={() => copyToClipboard(creds.generated_password, 'pass')}
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  {copiedKey === 'pass' ? <Check className="h-4 w-4 text-[#00d4aa]" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Unique Society Code */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Unique Society Code</label>
              <div className="flex bg-zinc-950 border border-zinc-800 rounded-lg p-3 justify-between items-center">
                <span className="text-[#00d4aa] font-mono text-sm font-bold">{creds.society_code}</span>
                <button 
                  onClick={() => copyToClipboard(creds.society_code, 'code')}
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  {copiedKey === 'code' ? <Check className="h-4 w-4 text-[#00d4aa]" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 text-center">
            <Link 
              href="/master/dashboard" 
              className="inline-flex w-full py-3 bg-[#00d4aa] hover:bg-[#00b390] text-zinc-950 font-bold rounded-lg text-sm justify-center items-center transition-all glow-hover"
            >
              Back to Dashboard
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}
