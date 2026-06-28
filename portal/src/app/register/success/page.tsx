'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Clock, ArrowLeft, Smartphone } from 'lucide-react';

export default function RegisterSuccess() {
  const [societyName, setSocietyName] = useState('Your Residential Society');
  const [adminEmail, setAdminEmail] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem('last_registered_society_name');
      const savedEmail = localStorage.getItem('last_registered_admin_email');
      if (savedName) setSocietyName(savedName);
      if (savedEmail) setAdminEmail(savedEmail);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col items-center justify-center p-6 selection:bg-[#00d4aa] selection:text-[#09090b]">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center shadow-xl relative overflow-hidden">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-[#00d4aa]" />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
          Registration Received!
        </h1>
        
        <p className="text-[#00d4aa] font-bold text-lg mb-6">
          {societyName}
        </p>

        <p className="text-zinc-400 text-sm leading-relaxed mb-6">
          Thank you for registering. Your details are now pending physical verification by the Master Admin. We have sent a confirmation email to <span className="text-white font-medium">{adminEmail || 'your email'}</span>.
        </p>

        <div className="flex items-center gap-3 bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-left mb-8">
          <Clock className="h-5 w-5 text-amber-500 shrink-0" />
          <div>
            <h4 className="font-bold text-sm text-[#fafafa]">Estimated Review Timeline</h4>
            <p className="text-zinc-500 text-xs mt-0.5">1 — 3 business days. You will receive an email as soon as your Society Code is active.</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href="https://github.com/AmanMahadik/Society_Sync"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-[#00d4aa] text-zinc-950 font-bold rounded-lg hover:bg-[#00b390] transition-all flex items-center justify-center gap-2 glow-hover"
          >
            <Smartphone className="h-5 w-5" /> Download Resident App
          </a>
          <Link
            href="/"
            className="w-full py-3 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all rounded-lg font-medium flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" /> Return to Homepage
          </Link>
        </div>

        {/* Small background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00d4aa]/5 rounded-full blur-2xl -z-10" />
      </div>
    </div>
  );
}
