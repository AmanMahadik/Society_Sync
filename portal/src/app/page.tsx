'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, Wallet, Car, MessageSquare, CheckCircle, ArrowRight, Smartphone, Map } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PuneSociety {
  name: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  isMock?: boolean;
}

export default function LandingPage() {
  const [dbSocieties, setDbSocieties] = useState<PuneSociety[]>([]);
  const [mapInitialized, setMapInitialized] = useState(false);

  // Load Leaflet resources dynamically on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        document.body.appendChild(script);
      }
    }
  }, []);

  // Fetch active societies from Supabase database
  useEffect(() => {
    const fetchSocieties = async () => {
      try {
        const { data, error } = await supabase
          .from('societies')
          .select('name, address, city, state, lat, lng')
          .eq('status', 'active');
        
        if (!error && data) {
          const parsed: PuneSociety[] = data
            .filter((s: any) => s.lat && s.lng)
            .map((s: any) => ({
              name: s.name,
              address: s.address,
              city: s.city,
              state: s.state,
              lat: parseFloat(s.lat) || 18.5204,
              lng: parseFloat(s.lng) || 73.8567,
              isMock: false
            }));
          setDbSocieties(parsed);
        }
      } catch (err) {
        console.error("Error fetching societies for landing map:", err);
      }
    };
    fetchSocieties();
  }, []);

  // Seed default premium Pune societies for display alongside real ones
  const defaultPuneSocieties: PuneSociety[] = [
    { name: "Marvel Zephyr", address: "Kharadi, Pune", city: "Pune", state: "Maharashtra", lat: 18.5539, lng: 73.9482, isMock: true },
    { name: "Eon Homes", address: "Hinjawadi Phase 3, Pune", city: "Pune", state: "Maharashtra", lat: 18.5812, lng: 73.6872, isMock: true },
    { name: "Amanora Park Town", address: "Hadapsar, Pune", city: "Pune", state: "Maharashtra", lat: 18.5198, lng: 73.9317, isMock: true },
    { name: "Blue Ridge", address: "Hinjawadi Phase 1, Pune", city: "Pune", state: "Maharashtra", lat: 18.5831, lng: 73.7432, isMock: true },
    { name: "Megapolis Sunway", address: "Hinjawadi Phase 3, Pune", city: "Pune", state: "Maharashtra", lat: 18.5775, lng: 73.6890, isMock: true },
    { name: "Windward Ranch", address: "Baner, Pune", city: "Pune", state: "Maharashtra", lat: 18.5679, lng: 73.7915, isMock: true }
  ];

  // Combine real database societies with the default premium seed markers
  const allSocietiesMap = [...defaultPuneSocieties, ...dbSocieties];

  // Initialize and render Leaflet Map
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initMap = () => {
      const L = (window as any).L;
      if (!L) {
        setTimeout(initMap, 100);
        return;
      }
      
      const container = document.getElementById('leaflet-map-landing');
      if (container && !mapInitialized) {
        container.innerHTML = '';
        const mapDiv = document.createElement('div');
        mapDiv.id = 'map-landing-inner';
        mapDiv.style.width = '100%';
        mapDiv.style.height = '100%';
        container.appendChild(mapDiv);

        const map = L.map('map-landing-inner', { zoomControl: false }).setView([18.545, 73.83], 11.5);
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        const customIcon = L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [22, 36],
          iconAnchor: [11, 36],
          popupAnchor: [1, -30],
          shadowSize: [36, 36]
        });

        allSocietiesMap.forEach((soc) => {
          const marker = L.marker([soc.lat, soc.lng], { icon: customIcon }).addTo(map);
          marker.bindPopup(`
            <div style="color: #0b0e10; font-family: sans-serif; font-size: 12px; padding: 4px; line-height: 1.4; width: 180px;">
              <strong style="display: block; font-size: 13px; color: #1D9E75; margin-bottom: 2px;">🏢 ${soc.name}</strong>
              <span style="font-size: 10px; color: #8a8f91; display: block; margin-bottom: 4px;">${soc.address}</span>
              <span style="font-size: 9px; font-weight: bold; background: #1D9E75/10; color: #1D9E75; padding: 2px 4px; border-radius: 4px; border: 1px solid #1D9E75/30;">
                Verified Partner Community
              </span>
            </div>
          `);
        });

        setMapInitialized(true);
      }
    };

    const timer = setTimeout(initMap, 600);
    return () => clearTimeout(timer);
  }, [dbSocieties]);

  return (
    <div className="min-h-screen bg-[#0b0e10] text-[#f2f2f0] flex flex-col selection:bg-[#1D9E75] selection:text-[#0b0e10]">
      
      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-[#1c2224] bg-[#0b0e10]/80 backdrop-blur-md px-6 py-4 flex justify-between items-center w-full">
        <div className="max-w-7xl w-full mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="SocietySync Logo" className="h-8 w-8 rounded object-contain" />
            <span className="font-extrabold text-lg tracking-tight text-[#f2f2f0]">
              SocietySync
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-[#8a8f91]">
            <a href="#features" className="hover:text-[#1D9E75] transition-colors">Features</a>
            <a href="#community-map" className="hover:text-[#1D9E75] transition-colors">Live Map</a>
            <a href="#how-it-works" className="hover:text-[#1D9E75] transition-colors">How it Works</a>
            <Link href="/master/login" className="hover:text-[#1D9E75] transition-colors">Master Portal</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-xs font-bold px-3.5 py-2 rounded border border-[#1c2224] hover:bg-[#1c2224] transition-all text-[#f2f2f0]">
              Login
            </Link>
            <Link href="/register" className="text-xs font-bold bg-[#1D9E75] text-[#0b0e10] px-3.5 py-2 rounded hover:bg-[#0F6E56] transition-all flex items-center gap-1.5 shrink-0">
              <span>Register Society</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative flex-1 flex flex-col justify-center items-center px-6 py-24 max-w-5xl mx-auto text-center z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#1D9E75]/30 bg-[#1D9E75]/10 text-[#1D9E75] text-[10px] font-bold uppercase tracking-wider mb-8">
          <Smartphone className="h-3.5 w-3.5" /> Scoped Multi-Tenant Residential Suite
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl leading-tight sm:leading-none text-[#f2f2f0]">
          Manage Your Residential Society <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1D9E75] to-teal-300">Digitally & Securely</span>
        </h1>
        <p className="mt-6 text-[#8a8f91] text-base sm:text-lg max-w-2xl leading-relaxed">
          SocietySync is the unified dashboard that connects society administrators, security guards, and residents. Digitize billing campaigns, secure visitor parking, broadcast notice boards, and dispatch instant SOS alarms.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-md">
          <Link href="/register" className="w-full sm:w-auto px-8 py-3.5 bg-[#1D9E75] text-[#0b0e10] font-bold rounded text-sm hover:bg-[#0F6E56] transition-all flex items-center justify-center gap-2">
            Register Your Society <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="#features" className="w-full sm:w-auto px-8 py-3.5 border border-[#1c2224] hover:bg-[#111517] font-semibold rounded text-sm transition-all flex items-center justify-center text-[#8a8f91] hover:text-[#f2f2f0]">
            Explore Features
          </a>
        </div>

        {/* Floating gradient lights */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#1D9E75]/5 rounded-full blur-[120px] -z-10" />
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-20 border-t border-[#1c2224] bg-[#111517]/20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[10px] text-[#1D9E75] font-bold uppercase tracking-wider bg-[#1D9E75]/10 border border-[#1D9E75]/20 px-2 py-0.5 rounded-full">Operational Modules</span>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-[#f2f2f0] mt-3">
              Packed with Production-Grade Features
            </h2>
            <p className="mt-4 text-[#8a8f91] text-xs sm:text-sm max-w-xl mx-auto">
              Everything your residential housing complex needs, isolated and secured in one multi-tenant database environment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded border border-[#1c2224] bg-[#111517] hover:border-[#1D9E75]/30 transition-all flex flex-col gap-4">
              <div className="h-10 w-10 rounded bg-[#993C1D]/10 border border-[#993C1D]/20 flex items-center justify-center">
                <Shield className="h-5 w-5 text-[#993C1D]" />
              </div>
              <h3 className="font-bold text-base text-[#f2f2f0]">Emergency SOS</h3>
              <p className="text-[#8a8f91] text-xs leading-relaxed">
                Instant crisis triggers alert security guards with full-screen alarms and dispatch SMS push notifications to admins.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded border border-[#1c2224] bg-[#111517] hover:border-[#1D9E75]/30 transition-all flex flex-col gap-4">
              <div className="h-10 w-10 rounded bg-[#1D9E75]/10 border border-[#1D9E75]/20 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-[#1D9E75]" />
              </div>
              <h3 className="font-bold text-base text-[#f2f2f0]">Finance Ledger</h3>
              <p className="text-[#8a8f91] text-xs leading-relaxed">
                Approve chanda events, compile monthly maintenance bills (Razorpay), and download strict A4 financial reports.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded border border-[#1c2224] bg-[#111517] hover:border-[#1D9E75]/30 transition-all flex flex-col gap-4">
              <div className="h-10 w-10 rounded bg-[#1D9E75]/10 border border-[#1D9E75]/20 flex items-center justify-center">
                <Car className="h-5 w-5 text-[#1D9E75]" />
              </div>
              <h3 className="font-bold text-base text-[#f2f2f0]">Smart Parking</h3>
              <p className="text-[#8a8f91] text-xs leading-relaxed">
                Approve guest bookings in real-time, view checklist logs, and isolate slots by date and custom time blocks.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded border border-[#1c2224] bg-[#111517] hover:border-[#1D9E75]/30 transition-all flex flex-col gap-4">
              <div className="h-10 w-10 rounded bg-[#1D9E75]/10 border border-[#1D9E75]/20 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-[#1D9E75]" />
              </div>
              <h3 className="font-bold text-base text-[#f2f2f0]">Forum Chat</h3>
              <p className="text-[#8a8f91] text-xs leading-relaxed">
                Discuss community issues, cast votes in polls, pin warnings, and view messaging avatars on a scoped thread list.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* COMMUNITY MAP SECTION */}
      <section id="community-map" className="py-20 border-t border-[#1c2224] bg-[#0b0e10] px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#1D9E75]/30 bg-[#1D9E75]/10 text-[#1D9E75] text-[10px] font-bold uppercase tracking-wider mb-4">
              Community Directory
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-[#f2f2f0]">
              Active Societies in Pune Region
            </h2>
            <p className="mt-4 text-[#8a8f91] text-xs sm:text-sm max-w-xl mx-auto">
              See which residential communities have onboarded onto SocietySync to simplify operations and protect their gates.
            </p>
          </div>

          <div className="bg-[#111517] border border-[#1c2224] rounded-lg p-5 flex flex-col h-[500px] shadow-xl">
            <div className="flex-1 bg-[#0b0e10] rounded border border-[#1c2224] overflow-hidden relative">
              <div id="leaflet-map-landing" className="w-full h-full relative" style={{ zIndex: 1, filter: 'invert(90%) hue-rotate(185deg) brightness(85%) contrast(110%)' }} />
            </div>
            <div className="flex justify-between items-center mt-3 text-[11px] text-[#8a8f91]">
              <span>🟢 Pins indicate verified active residential societies</span>
              <span>Showing {allSocietiesMap.length} active communities</span>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-20 border-t border-[#1c2224] px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[10px] text-[#1D9E75] font-bold uppercase tracking-wider bg-[#1D9E75]/10 border border-[#1D9E75]/20 px-2 py-0.5 rounded-full">Onboarding Walkthrough</span>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-[#f2f2f0] mt-3">
              Easy Three-Step Onboarding
            </h2>
            <p className="mt-4 text-[#8a8f91] text-xs sm:text-sm max-w-xl mx-auto">
              How SocietySync simplifies the process of boarding thousands of complex residents.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center p-6 bg-[#111517] border border-[#1c2224] rounded-lg">
              <div className="h-12 w-12 rounded-full bg-[#0b0e10] border border-[#1c2224] text-[#1D9E75] flex items-center justify-center font-bold text-lg mb-4">
                1
              </div>
              <h4 className="font-bold text-base text-[#f2f2f0] mb-2">Register Online</h4>
              <p className="text-[#8a8f91] text-xs leading-relaxed">
                Fill the multi-step form, pin your society entrance on our coordinate locator, and upload your registration docs.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center p-6 bg-[#111517] border border-[#1c2224] rounded-lg">
              <div className="h-12 w-12 rounded-full bg-[#0b0e10] border border-[#1c2224] text-[#1D9E75] flex items-center justify-center font-bold text-lg mb-4">
                2
              </div>
              <h4 className="font-bold text-base text-[#f2f2f0] mb-2">Get Unique Code</h4>
              <p className="text-[#8a8f91] text-xs leading-relaxed">
                Once approved by the Master Admin, download your custom QR poster containing your unique Society Code.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center p-6 bg-[#111517] border border-[#1c2224] rounded-lg">
              <div className="h-12 w-12 rounded-full bg-[#0b0e10] border border-[#1c2224] text-[#1D9E75] flex items-center justify-center font-bold text-lg mb-4">
                3
              </div>
              <h4 className="font-bold text-base text-[#f2f2f0] mb-2">Invite & Launch</h4>
              <p className="text-[#8a8f91] text-xs leading-relaxed">
                Residents enter the code during app sign-up to join. All chats, SOS alarms, and bookings are immediately isolated!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-20 border-t border-[#1c2224] bg-[#111517]/10 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-[#f2f2f0]">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-6">
            <div className="p-6 rounded border border-[#1c2224] bg-[#111517]">
              <h4 className="font-bold text-sm text-[#f2f2f0]">What is a Society Code?</h4>
              <p className="mt-2 text-[#8a8f91] text-xs leading-relaxed">
                A Society Code is a unique ID (e.g. SS-MH-2847) generated upon successful registration verification. It isolates all database records and allows residents to auto-join the correct complex.
              </p>
            </div>

            <div className="p-6 rounded border border-[#1c2224] bg-[#111517]">
              <h4 className="font-bold text-sm text-[#f2f2f0]">How long does the verification review take?</h4>
              <p className="mt-2 text-[#8a8f91] text-xs leading-relaxed">
                The global Master Admin checks the registration certificate and maps location coordinates. This audit normally takes 1–3 business days.
              </p>
            </div>

            <div className="p-6 rounded border border-[#1c2224] bg-[#111517]">
              <h4 className="font-bold text-sm text-[#f2f2f0]">Can guards and residents self-register?</h4>
              <p className="mt-2 text-[#8a8f91] text-xs leading-relaxed">
                Residents can download the app and sign up using their society's active code. Guards, however, are added directly by the Society Admin via the web portal to prevent unauthorized guard accounts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-[#1c2224] bg-[#0b0e10] px-6 py-8 text-center text-xs text-[#8a8f91]">
        <div className="max-w-7xl w-full mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} SocietySync Inc. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="https://society-sync-info.vercel.app/#legal" className="hover:underline">Privacy Policy</a>
            <a href="https://society-sync-info.vercel.app/#legal" className="hover:underline">Terms & Conditions</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
