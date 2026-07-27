'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, ArrowRight, Upload, MapPin, CheckCircle, ShieldAlert } from 'lucide-react';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
  'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 
  'Ladakh', 'Lakshadweep', 'Puducherry'
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Society details
    societyName: '',
    societyType: 'apartment',
    totalWings: '1',
    totalFlats: '1',
    estYear: new Date().getFullYear().toString(),
    regNumber: '',
    docUrl: '',

    // Step 2: Location
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: 'Maharashtra',
    pincode: '',
    lat: '19.0760', // Default Mumbai Lat
    lng: '72.8777', // Default Mumbai Lng
    placeId: 'ChIJVTPvIsjc5zsR1Sp1DsG1rGU', // Default place ID

    // Step 3: Admin Details
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    adminAltPhone: '',
    adminPassword: '',
    authorizedConsent: false
  });

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Form Field change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const cleanValue = name === 'adminEmail' ? value.replace(/\s/g, '') : value;
    setFormData(prev => ({ ...prev, [name]: cleanValue }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  // Step Nav validation
  const validateStep = (currentStep: number) => {
    setErrorMsg(null);
    if (currentStep === 1) {
      if (!formData.societyName.trim()) return 'Society Name is required.';
      if (!formData.regNumber.trim()) return 'Society Registration Number is required.';
      if (!uploadedFile) return 'Please upload your Society Registration Certificate.';
    }
    if (currentStep === 2) {
      if (!formData.addressLine1.trim()) return 'Address Line 1 is required.';
      if (!formData.city.trim()) return 'City is required.';
      if (!formData.pincode.trim()) return 'Pincode is required.';
      if (!/^\d{6}$/.test(formData.pincode.trim())) return 'Pincode must be exactly 6 digits.';
    }
    if (currentStep === 3) {
      if (!formData.adminName.trim()) return 'Admin Full Name is required.';
      if (!formData.adminEmail.trim()) return 'Admin Email is required.';
      if (!/\S+@\S+\.\S+/.test(formData.adminEmail)) return 'Please enter a valid email address.';
      if (!formData.adminPhone.trim()) return 'Mobile Number is required.';
      if (!/^\d{10}$/.test(formData.adminPhone.trim())) return 'Mobile Number must be 10 digits.';
      if (!formData.authorizedConsent) return 'You must check the authorization consent checkbox.';
    }
    return null;
  };

  const nextStep = () => {
    const err = validateStep(step);
    if (err) {
      setErrorMsg(err);
      return;
    }
    setStep(prev => prev + 1);
  };

  const prevStep = () => {
    setErrorMsg(null);
    setStep(prev => prev - 1);
  };

  // Mock File Upload directly to Supabase storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('File size exceeds the 5MB limit.');
      return;
    }

    setUploadedFile(file);
    setErrorMsg(null);
    setUploadProgress(true);

    try {
      // Simulate file upload or upload to Supabase storage 'society-docs' bucket
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 10)}_${Date.now()}.${fileExt}`;
      const filePath = `certs/${fileName}`;

      const { data, error } = await supabase.storage
        .from('society-docs')
        .upload(filePath, file, { upsert: true });

      if (error) {
        // Fallback to a mock local URL if bucket does not exist or has RLS restrictions
        setFormData(prev => ({
          ...prev,
          docUrl: `https://mock-storage.supabase.co/society-docs/${filePath}`
        }));
      } else {
        const { data: publicUrl } = supabase.storage
          .from('society-docs')
          .getPublicUrl(filePath);
        setFormData(prev => ({ ...prev, docUrl: publicUrl.publicUrl }));
      }
    } catch (err) {
      console.warn('File upload exception:', err);
    } finally {
      setUploadProgress(false);
    }
  };

  // Load Leaflet resources dynamically on client side
  useEffect(() => {
    if (step === 2 && typeof window !== 'undefined') {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!(window as any).L) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.onload = () => {
          setMapLoaded(true);
        };
        document.body.appendChild(script);
      } else {
        setMapLoaded(true);
      }
    }
  }, [step]);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (mapLoaded && step === 2 && typeof window !== 'undefined' && (window as any).L) {
      const L = (window as any).L;
      const initialLat = parseFloat(formData.lat) || 19.0760;
      const initialLng = parseFloat(formData.lng) || 72.8777;

      // Make sure the container is ready
      const container = document.getElementById('leaflet-map');
      if (!container) return;

      if (!mapRef.current) {
        const map = L.map('leaflet-map').setView([initialLat, initialLng], 15);
        mapRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        // Define a custom marker icon if default icons have path resolution issues in Next.js
        const defaultIcon = L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });

        const marker = L.marker([initialLat, initialLng], { 
          draggable: true,
          icon: defaultIcon
        }).addTo(map);
        markerRef.current = marker;

        marker.on('dragend', () => {
          const position = marker.getLatLng();
          setFormData(prev => ({
            ...prev,
            lat: position.lat.toFixed(6),
            lng: position.lng.toFixed(6)
          }));
        });

        map.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          setFormData(prev => ({
            ...prev,
            lat: lat.toFixed(6),
            lng: lng.toFixed(6)
          }));
        });
      } else {
        // Map is already initialized, just update marker and view if different
        if (markerRef.current) {
          const markerLatLng = markerRef.current.getLatLng();
          if (Math.abs(markerLatLng.lat - initialLat) > 0.0001 || Math.abs(markerLatLng.lng - initialLng) > 0.0001) {
            mapRef.current.setView([initialLat, initialLng]);
            markerRef.current.setLatLng([initialLat, initialLng]);
          }
        }
      }
    }

    return () => {
      if (step !== 2 && mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [mapLoaded, step, formData.lat, formData.lng]);

  // Geocode address using OpenStreetMap Nominatim API
  const locateAddressOnMap = async () => {
    const address = `${formData.addressLine1}, ${formData.city}, ${formData.state}, ${formData.pincode}`.trim();
    if (!address) {
      alert('Please fill out the address fields first.');
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        {
          headers: {
            'Accept-Language': 'en'
          }
        }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newLat = parseFloat(lat);
        const newLng = parseFloat(lon);

        setFormData(prev => ({
          ...prev,
          lat: newLat.toFixed(6),
          lng: newLng.toFixed(6)
        }));

        if (mapRef.current) {
          mapRef.current.setView([newLat, newLng], 16);
          if (markerRef.current) {
            markerRef.current.setLatLng([newLat, newLng]);
          }
        }
      } else {
        alert('Could not find this address coordinates on the map. You can still manually drag the marker to your location.');
      }
    } catch (err) {
      console.error('Error finding address coordinates:', err);
      alert('Error searching for address. Please try manual coordinates.');
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateStep(3);
    if (err) {
      setErrorMsg(err);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      // 0. Check if admin email is already registered
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', formData.adminEmail.trim().toLowerCase())
        .maybeSingle();

      if (existingProfile) {
        setErrorMsg('This admin email address is already registered in the system. Please use a different email or log in.');
        setLoading(false);
        return;
      }

      // 1. Check duplicate detection (Pincode + Name)
      const { data: existingSocieties, error: checkError } = await supabase
        .from('societies')
        .select('id, name')
        .eq('pincode', formData.pincode)
        .ilike('name', formData.societyName);

      if (!checkError && existingSocieties && existingSocieties.length > 0) {
        const confirmSub = window.confirm(
          `A society named "${formData.societyName}" already exists in the pincode ${formData.pincode}. Are you sure this is a different society?`
        );
        if (!confirmSub) {
          setLoading(false);
          return;
        }
      }

      // 2. Insert row into public.society_requests table (status = pending)
      const { error: reqError } = await supabase
        .from('society_requests')
        .insert({
          name: formData.societyName,
          address: formData.addressLine1 + (formData.addressLine2 ? ', ' + formData.addressLine2 : ''),
          state: formData.state,
          city: formData.city,
          pincode: formData.pincode,
          admin_name: formData.adminName,
          admin_email: formData.adminEmail,
          admin_phone: formData.adminPhone,
          admin_password: '',
          total_units: parseInt(formData.totalFlats) || 0,
          document_url: formData.docUrl,
          status: 'pending',
          lat: parseFloat(formData.lat) || 19.0760,
          lng: parseFloat(formData.lng) || 72.8777
        });

      if (reqError) throw reqError;

      // Save registration details to localStorage for success screen display
      if (typeof window !== 'undefined') {
        localStorage.setItem('last_registered_society_name', formData.societyName);
        localStorage.setItem('last_registered_admin_email', formData.adminEmail);
      }

      // Redirect directly to success page
      router.push('/register/success');

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred during registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col selection:bg-[#00d4aa] selection:text-[#09090b]">
      {/* NAVBAR */}
      <header className="border-b border-zinc-800 bg-[#09090b]/80 backdrop-blur-md px-6 py-4 flex justify-between items-center max-w-7xl w-full mx-auto">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="SocietySync Logo" className="h-8 w-8 rounded-lg object-contain" />
          <span className="font-bold text-base sm:text-lg tracking-tight">SocietySync</span>
        </Link>
        <Link href="/login" className="text-xs sm:text-sm text-zinc-400 hover:text-[#00d4aa] transition-colors">
          <span className="hidden sm:inline">Already registered? Login here</span>
          <span className="inline sm:hidden">Login</span>
        </Link>
      </header>

      {/* FORM BODY CONTAINER */}
      <main className="flex-1 flex flex-col justify-center py-12 px-6 max-w-2xl w-full mx-auto">
        {/* STEP HEADER PROGRESS INDICATOR */}
        <div className="mb-8">
          <div className="flex justify-between items-center text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            <span>Step {step} of 4</span>
            <span>
              {step === 1 && 'Society Details'}
              {step === 2 && 'Location & Pincode'}
              {step === 3 && 'Administrator Setup'}
              {step === 4 && 'Review Details'}
            </span>
          </div>
          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden mb-3">
            <div 
              className="h-full bg-[#00d4aa] transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
          {/* Quick jump to previously completed steps */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {[1, 2, 3, 4].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  if (s < step) {
                    setStep(s);
                    setErrorMsg(null);
                  }
                }}
                disabled={s >= step}
                className={`text-[10px] px-2 py-1 rounded transition-all font-semibold ${
                  s === step
                    ? 'bg-[#00d4aa]/25 text-[#00d4aa] border border-[#00d4aa]/30'
                    : s < step
                    ? 'bg-zinc-800/60 text-zinc-400 hover:text-white border border-zinc-700/40 hover:bg-zinc-700 cursor-pointer'
                    : 'bg-zinc-900/20 text-zinc-700 border border-transparent cursor-not-allowed'
                }`}
              >
                {s === 1 && '1. Details'}
                {s === 2 && '2. Location'}
                {s === 3 && '3. Admin'}
                {s === 4 && '4. Review'}
              </button>
            ))}
          </div>
        </div>

        {/* ERROR BOX */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-[#351515] border border-red-500/30 rounded-xl text-red-400 text-sm flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          {/* ================= STEP 1: SOCIETY DETAILS ================= */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white mb-4">Enter Society Profile</h2>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase">Society Name *</label>
                <input 
                  type="text" 
                  name="societyName"
                  value={formData.societyName}
                  onChange={handleChange}
                  placeholder="e.g. Green Crest Housing Society" 
                  className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-[#00d4aa] text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Society Type *</label>
                  <select 
                    name="societyType"
                    value={formData.societyType}
                    onChange={handleChange}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-[#00d4aa] text-white"
                  >
                    <option value="apartment">Apartment Complex</option>
                    <option value="villa">Gated Villa Community</option>
                    <option value="plotted">Plotted Colony</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Year of Establishment</label>
                  <input 
                    type="number" 
                    name="estYear"
                    value={formData.estYear}
                    onChange={handleChange}
                    min="1800"
                    max={new Date().getFullYear()}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-[#00d4aa] text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Total Wings / Blocks *</label>
                  <input 
                    type="number" 
                    name="totalWings"
                    value={formData.totalWings}
                    onChange={handleChange}
                    min="1"
                    className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-[#00d4aa] text-white"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Total Flats / Units *</label>
                  <input 
                    type="number" 
                    name="totalFlats"
                    value={formData.totalFlats}
                    onChange={handleChange}
                    min="1"
                    className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-[#00d4aa] text-white"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase">Govt. Registration Number (from your certificate) *</label>
                <input 
                  type="text" 
                  name="regNumber"
                  value={formData.regNumber}
                  onChange={handleChange}
                  placeholder="e.g. REG-MH-1029-2026" 
                  className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-[#00d4aa] text-white"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase">Upload Society Registration Certificate (PDF/Image) *</label>
                <div className="border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950 rounded-lg p-6 text-center cursor-pointer relative">
                  <input 
                    type="file" 
                    accept=".pdf,image/*" 
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="h-8 w-8 text-[#00d4aa] mx-auto mb-2" />
                  <p className="text-sm font-medium text-zinc-300">
                    {uploadProgress ? 'Uploading file...' : (uploadedFile ? uploadedFile.name : 'Choose file or drag & drop')}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">PDF or Image up to 5MB</p>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: LOCATION DETAILS ================= */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white mb-4">Specify Location Details</h2>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase">Address Line 1 *</label>
                <input 
                  type="text" 
                  name="addressLine1"
                  value={formData.addressLine1}
                  onChange={handleChange}
                  placeholder="Building name, Street Address" 
                  className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-[#00d4aa] text-white"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase">Address Line 2 (Optional)</label>
                <input 
                  type="text" 
                  name="addressLine2"
                  value={formData.addressLine2}
                  onChange={handleChange}
                  placeholder="Locality, Landmark" 
                  className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-[#00d4aa] text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase">City (RTO Registry City) *</label>
                  <input 
                    type="text" 
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="e.g. Pune, Pimpri-Chinchwad" 
                    className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-[#00d4aa] text-white"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase">State *</label>
                  <select 
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-[#00d4aa] text-white"
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Pincode *</label>
                  <input 
                    type="text" 
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    placeholder="6-digit Pincode" 
                    maxLength={6}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-[#00d4aa] text-white"
                    required
                  />
                </div>
              </div>

              {/* Live OpenStreetMap Interactive Map */}
              <div className="border border-zinc-800 bg-zinc-950 p-4 rounded-lg space-y-3">
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-5 w-5 text-[#00d4aa] shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-zinc-300">Interactive Location Picker (OpenStreetMap)</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">Drag the marker or click on the map to pin your society's main entrance. Or click the button below to search by the address you typed.</p>
                  </div>
                </div>

                <div className="w-full h-64 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 relative">
                  {!mapLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-500 bg-zinc-950/80 z-[1000]">
                      Loading OpenStreetMap...
                    </div>
                  )}
                  <div id="leaflet-map" className="w-full h-full" style={{ minHeight: '256px', zIndex: 1 }} />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={locateAddressOnMap}
                    disabled={searchLoading}
                    className="w-full py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all disabled:opacity-50"
                  >
                    {searchLoading ? 'Locating Address...' : '🔍 Locate Address on Map'}
                  </button>
                </div>

                <div className="pt-2 border-t border-zinc-900/60 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Entrance Coordinates</span>
                    <span className="text-[10px] text-zinc-500">(Drag marker to auto-fill)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Latitude</label>
                      <input 
                        type="text" 
                        name="lat"
                        value={formData.lat}
                        onChange={handleChange}
                        className="bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Longitude</label>
                      <input 
                        type="text" 
                        name="lng"
                        value={formData.lng}
                        onChange={handleChange}
                        className="bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: ADMINISTRATOR SETUP ================= */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white mb-4">Configure Admin Account</h2>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase">Admin Full Name *</label>
                <input 
                  type="text" 
                  name="adminName"
                  value={formData.adminName}
                  onChange={handleChange}
                  placeholder="First and Last Name" 
                  className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-[#00d4aa] text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Official Email Address *</label>
                  <input 
                    type="email" 
                    name="adminEmail"
                    value={formData.adminEmail}
                    onChange={handleChange}
                    placeholder="name@society.com" 
                    className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-[#00d4aa] text-white"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Mobile Number *</label>
                  <input 
                    type="tel" 
                    name="adminPhone"
                    value={formData.adminPhone}
                    onChange={handleChange}
                    placeholder="10-digit number" 
                    maxLength={10}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-[#00d4aa] text-white"
                    required
                  />
                </div>
              </div>





              <div className="flex items-start gap-3 mt-4">
                <input 
                  type="checkbox" 
                  name="authorizedConsent"
                  checked={formData.authorizedConsent}
                  onChange={handleCheckboxChange}
                  id="authorizedConsent"
                  className="h-4 w-4 rounded border-zinc-800 text-[#00d4aa] focus:ring-[#00d4aa] bg-zinc-950 mt-1"
                />
                <label htmlFor="authorizedConsent" className="text-xs text-zinc-400 leading-relaxed cursor-pointer select-none">
                  I confirm that I am the authorized administrator of this society and the details provided are accurate.
                </label>
              </div>
            </div>
          )}

          {/* ================= STEP 4: REVIEW & SUBMIT ================= */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white mb-4">Review Registration Details</h2>

              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl space-y-4">
                <div>
                  <h4 className="text-[10px] font-bold text-zinc-500 uppercase">Society Profile</h4>
                  <p className="text-base font-bold text-white mt-1">{formData.societyName}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Type: {formData.societyType.toUpperCase()} • Wing/Flat counts: {formData.totalWings} Wings / {formData.totalFlats} Flats</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Registration Number: {formData.regNumber}</p>
                </div>

                <Divider style={{ backgroundColor: '#27272a' }} />

                <div>
                  <h4 className="text-[10px] font-bold text-zinc-500 uppercase">Physical Address</h4>
                  <p className="text-sm text-zinc-300 mt-1">{formData.addressLine1}</p>
                  {formData.addressLine2 && <p className="text-sm text-zinc-300">{formData.addressLine2}</p>}
                  <p className="text-sm text-zinc-300">{formData.city}, {formData.state} — {formData.pincode}</p>
                </div>

                <Divider style={{ backgroundColor: '#27272a' }} />

                <div>
                  <h4 className="text-[10px] font-bold text-zinc-500 uppercase">Administrator Contact</h4>
                  <p className="text-sm text-zinc-300 mt-1">{formData.adminName}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Email: {formData.adminEmail} • Phone: {formData.adminPhone}</p>
                </div>
              </div>

              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-zinc-300 text-xs flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-[#00d4aa]" />
                <span>Everything is ready! Click Submit to register and launch verification.</span>
              </div>
            </div>
          )}

          {/* NAVIGATION BUTTONS */}
          <div className="flex justify-between items-center gap-4 mt-8 border-t border-zinc-800 pt-6">
            {step > 1 ? (
              <button 
                type="button" 
                onClick={prevStep}
                disabled={loading}
                className="px-5 py-2.5 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-sm text-zinc-400 hover:text-white transition-all flex items-center gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            ) : (
              <Link 
                href="/"
                className="px-5 py-2.5 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-sm text-zinc-400 hover:text-white transition-all flex items-center gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Home
              </Link>
            )}

            {step < 4 ? (
              <button 
                type="button" 
                onClick={nextStep}
                className="px-6 py-2.5 bg-[#00d4aa] text-zinc-950 font-bold rounded-lg text-sm hover:bg-[#00b390] transition-all flex items-center gap-1.5 glow-hover"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button 
                type="submit" 
                disabled={loading}
                className="px-8 py-3 bg-[#00d4aa] text-zinc-950 font-bold rounded-lg text-sm hover:bg-[#00b390] transition-all flex items-center gap-1.5 glow-hover"
              >
                {loading ? 'Submitting Registry...' : 'SUBMIT REGISTRATION'}
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}

const Divider = ({ style }: { style?: React.CSSProperties }) => (
  <div style={{ height: 1, backgroundColor: '#27272a', ...style }} />
);
