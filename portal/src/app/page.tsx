'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Wallet, Car, MessageSquare, PlusCircle, CheckCircle, ArrowRight, Smartphone } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col selection:bg-[#00d4aa] selection:text-[#09090b]">
      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-[#09090b]/80 backdrop-blur-md px-6 py-4 flex justify-between items-center max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="SocietySync Logo" className="h-9 w-9 rounded-lg object-contain" />
          <span className="font-bold text-xl tracking-tight text-[#fafafa]">
            Society<span className="text-[#00d4aa]">Sync</span>
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
          <a href="#features" className="hover:text-[#00d4aa] transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-[#00d4aa] transition-colors">How it Works</a>
          <a href="#faq" className="hover:text-[#00d4aa] transition-colors">FAQs</a>
          <Link href="/master/login" className="hover:text-[#00d4aa] transition-colors">Master Portal</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium px-4 py-2 rounded-lg border border-zinc-800 hover:bg-zinc-900 transition-all">
            Login
          </Link>
          <Link href="/register" className="text-sm font-bold bg-[#00d4aa] text-zinc-950 px-4 py-2 rounded-lg hover:bg-[#00b390] transition-all flex items-center gap-1.5 glow-hover">
            Register Society <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative flex-1 flex flex-col justify-center items-center px-6 py-20 max-w-5xl mx-auto text-center z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#00d4aa]/30 bg-[#00d4aa]/10 text-[#00d4aa] text-xs font-semibold uppercase tracking-wider mb-8">
          <Smartphone className="h-3.5 w-3.5" /> Multi-Tenant Residential Suite
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl leading-tight sm:leading-none">
          Manage Your Residential Society <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00d4aa] to-emerald-400">Digitally & Securely</span>
        </h1>
        <p className="mt-6 text-zinc-400 text-lg sm:text-xl max-w-2xl leading-relaxed">
          SocietySync is the unified portal that connects society administrators, security guards, and residents. Digitize billing, secure parking, broadcast chats, and route instant SOS alarms.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-md">
          <Link href="/register" className="w-full sm:w-auto px-8 py-3.5 bg-[#00d4aa] text-zinc-950 font-bold rounded-lg text-base hover:bg-[#00b390] transition-all flex items-center justify-center gap-2 glow-hover">
            Get Your Society Started <ArrowRight className="h-5 w-5" />
          </Link>
          <a href="#how-it-works" className="w-full sm:w-auto px-8 py-3.5 border border-zinc-800 hover:bg-zinc-900 font-medium rounded-lg text-base transition-all flex items-center justify-center">
            How it Works
          </a>
        </div>

        {/* Floating gradient lights */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#00d4aa]/10 rounded-full blur-[120px] -z-10" />
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-20 border-t border-zinc-900 bg-zinc-950/40 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Packed with Production-Grade Features
            </h2>
            <p className="mt-4 text-zinc-400 text-base sm:text-lg max-w-xl mx-auto">
              Everything your residential housing complex needs, isolated and secured in one shared ecosystem.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-xl border border-zinc-900 bg-zinc-950/80 hover:border-zinc-800 transition-all flex flex-col gap-4">
              <div className="h-10 w-10 rounded-lg bg-[#ff3b30]/10 border border-[#ff3b30]/20 flex items-center justify-center">
                <Shield className="h-5 w-5 text-[#ff3b30]" />
              </div>
              <h3 className="font-bold text-lg text-[#fafafa]">Emergency SOS</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Instant crisis triggers alert security guards with full-screen alarms and dispatch notifications to admins.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-xl border border-zinc-900 bg-zinc-950/80 hover:border-zinc-800 transition-all flex flex-col gap-4">
              <div className="h-10 w-10 rounded-lg bg-[#ffd700]/10 border border-[#ffd700]/20 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-[#ffd700]" />
              </div>
              <h3 className="font-bold text-lg text-[#fafafa]">Finance Ledger</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Approve events, generate monthly maintenance billings, and export beautiful strict A4 financial audit reports.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-xl border border-zinc-900 bg-zinc-950/80 hover:border-zinc-800 transition-all flex flex-col gap-4">
              <div className="h-10 w-10 rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center">
                <Car className="h-5 w-5 text-[#3b82f6]" />
              </div>
              <h3 className="font-bold text-lg text-[#fafafa]">Smart Parking</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Approve guest bookings in real-time, view checklist logs, and isolate slots by date and custom time blocks.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-xl border border-zinc-900 bg-zinc-950/80 hover:border-zinc-800 transition-all flex flex-col gap-4">
              <div className="h-10 w-10 rounded-lg bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-[#8b5cf6]" />
              </div>
              <h3 className="font-bold text-lg text-[#fafafa]">Forum Chat</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Discuss community issues, cast votes in polls, pin warnings, and view messaging avatars on a scoped thread list.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-20 border-t border-zinc-900 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Easy Three-Step Onboarding
            </h2>
            <p className="mt-4 text-zinc-400 text-base sm:text-lg max-w-xl mx-auto">
              How SocietySync simplifies the process of boarding thousands of residents.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center p-6 bg-zinc-950/40 border border-zinc-950 rounded-xl">
              <div className="h-12 w-12 rounded-full bg-zinc-900 border border-zinc-800 text-[#00d4aa] flex items-center justify-center font-bold text-lg mb-4">
                1
              </div>
              <h4 className="font-bold text-lg mb-2">Register Online</h4>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Fill the multi-step form, pin your society entrance on Google Maps, and upload your registration docs.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center p-6 bg-zinc-950/40 border border-zinc-950 rounded-xl">
              <div className="h-12 w-12 rounded-full bg-zinc-900 border border-zinc-800 text-[#00d4aa] flex items-center justify-center font-bold text-lg mb-4">
                2
              </div>
              <h4 className="font-bold text-lg mb-2">Get Unique Code</h4>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Once approved by the Master Admin, download your custom QR poster containing your unique Society Code.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center p-6 bg-zinc-950/40 border border-zinc-950 rounded-xl">
              <div className="h-12 w-12 rounded-full bg-zinc-900 border border-zinc-800 text-[#00d4aa] flex items-center justify-center font-bold text-lg mb-4">
                3
              </div>
              <h4 className="font-bold text-lg mb-2">Invite & Launch</h4>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Residents enter the code during app sign-up to join. All chats, SOS alarms, and bookings are immediately isolated!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-20 border-t border-zinc-900 bg-zinc-950/40 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-6">
            <div className="p-6 rounded-xl border border-zinc-900 bg-zinc-950/80">
              <h4 className="font-bold text-base text-[#fafafa]">What is a Society Code?</h4>
              <p className="mt-2 text-zinc-400 text-sm leading-relaxed">
                A Society Code is a unique ID (e.g. SS-MH-2847) generated upon successful registration verification. It isolates all database records and allows residents to auto-join the correct complex.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-zinc-900 bg-zinc-950/80">
              <h4 className="font-bold text-base text-[#fafafa]">How long does the verification review take?</h4>
              <p className="mt-2 text-zinc-400 text-sm leading-relaxed">
                The global Master Admin checks the registration certificate and maps location coordinates. This physical audit normally takes 1–3 business days.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-zinc-900 bg-zinc-950/80">
              <h4 className="font-bold text-base text-[#fafafa]">Can guards and residents self-register?</h4>
              <p className="mt-2 text-zinc-400 text-sm leading-relaxed">
                Residents can download the app and sign up using their society's active code. Guards, however, are added directly by the Society Admin via the web portal to prevent unauthorized guard accounts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-zinc-900 bg-zinc-950 px-6 py-8 text-center text-sm text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} SocietySync Inc. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="https://amanmahadik.github.io/Society_Sync/#legal" className="hover:underline">Privacy Policy</a>
            <a href="https://amanmahadik.github.io/Society_Sync/#legal" className="hover:underline">Terms & Conditions</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
