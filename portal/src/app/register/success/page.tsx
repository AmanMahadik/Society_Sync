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

        <div className="flex items-center gap-3 bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-left mb-4">
          <Clock className="h-5 w-5 text-amber-500 shrink-0" />
          <div>
            <h4 className="font-bold text-sm text-[#fafafa]">Estimated Review Timeline</h4>
            <p className="text-zinc-500 text-xs mt-0.5">1 — 3 business days. You will receive an email as soon as your Society Code is active.</p>
          </div>
        </div>

        {/* VIP registration notice */}
        <div className="flex items-center gap-3 bg-emerald-950/15 p-4 rounded-xl border border-[#00d4aa]/20 text-left mb-8">
          <div className="h-5 w-5 text-[#00d4aa] flex items-center justify-center font-bold text-xs bg-[#00d4aa]/10 rounded-full shrink-0 border border-[#00d4aa]/25">★</div>
          <div>
            <h4 className="font-bold text-sm text-[#00d4aa]">VIP Registration</h4>
            <p className="text-zinc-400 text-xs mt-0.5">For immediate activation, contact us at <a href="mailto:societysync5@gmail.com" className="text-[#00d4aa] hover:underline font-semibold">societysync5@gmail.com</a>.</p>
          </div>
        </div>

        {/* APP INSTALLATION DETAILS */}
        <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800 text-center mb-6">
          <p className="text-xs text-zinc-400 font-semibold mb-3 uppercase tracking-wider">Install Mobile App Preview</p>
          <div className="flex justify-center mb-3">
            <div className="bg-white p-2 rounded-lg inline-block">
              <img src="/qr_code.png" alt="App Download QR Code" className="h-32 w-32 object-contain" />
            </div>
          </div>
          <p className="text-[11px] text-zinc-500 max-w-xs mx-auto mb-3">
            Scan the QR code with your mobile camera to load in Expo Go or download standalone app.
          </p>
          <a
            href="https://expo.dev/accounts/aman1611/projects/society-sync/builds/83da809f-7ae0-4cd1-ba99-559bdab33899"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex py-2.5 px-5 bg-[#00d4aa] text-zinc-950 font-bold text-xs rounded-lg hover:bg-[#00b390] transition-all items-center gap-1.5 glow-hover"
          >
            <Smartphone className="h-4 w-4" /> Download Standalone Build
          </a>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="w-full py-3 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all rounded-lg font-medium flex items-center justify-center gap-1.5 text-sm"
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
