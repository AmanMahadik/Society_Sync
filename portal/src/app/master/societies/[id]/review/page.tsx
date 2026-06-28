'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../../lib/supabase';
import { Shield, ArrowLeft, CheckSquare, Square, CheckCircle, XCircle, Map, ExternalLink } from 'lucide-react';

interface Society {
  id: string;
  name: string;
  society_code?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  lat: number;
  lng: number;
  place_id?: string;
  admin_name: string;
  admin_email: string;
  admin_phone: string;
  total_wings: number;
  total_flats: number;
  society_type: string;
  registration_doc_url?: string;
  status: 'pending_verification' | 'active' | 'rejected' | 'suspended';
  created_at: string;
  rejection_reason?: string;
}

const STATE_CODES: { [key: string]: string } = {
  'Andhra Pradesh': 'AP', 'Arunachal Pradesh': 'AR', 'Assam': 'AS', 'Bihar': 'BR', 'Chhattisgarh': 'CG', 'Goa': 'GA', 'Gujarat': 'GJ', 
  'Haryana': 'HR', 'Himachal Pradesh': 'HP', 'Jharkhand': 'JH', 'Karnataka': 'KA', 'Kerala': 'KL', 'Madhya Pradesh': 'MP', 
  'Maharashtra': 'MH', 'Manipur': 'MN', 'Meghalaya': 'ML', 'Mizoram': 'MZ', 'Nagaland': 'NL', 'Odisha': 'OD', 'Punjab': 'PB', 
  'Rajasthan': 'RJ', 'Sikkim': 'SK', 'Tamil Nadu': 'TN', 'Telangana': 'TG', 'Tripura': 'TR', 'Uttar Pradesh': 'UP', 
  'Uttarakhand': 'UK', 'West Bengal': 'WB', 'Andaman and Nicobar Islands': 'AN', 'Chandigarh': 'CH', 
  'Dadra and Nagar Haveli and Daman and Diu': 'DN', 'Delhi': 'DL', 'Jammu and Kashmir': 'JK', 
  'Ladakh': 'LA', 'Lakshadweep': 'LD', 'Puducherry': 'PY'
};

export default function ReviewSocietyPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [society, setSociety] = useState<Society | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('Invalid documents');
  const [customRejectText, setCustomRejectText] = useState('');

  // Verification Checklist State
  const [checklist, setChecklist] = useState({
    nameMatches: false,
    validLocation: false,
    authenticDoc: false,
    validAdmin: false
  });

  const toggleChecklistItem = (key: keyof typeof checklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const fetchSociety = async () => {
    if (!params?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('societies')
        .select('*')
        .eq('id', params.id)
        .single();
      
      if (error) throw error;
      setSociety(data);
    } catch (e) {
      console.error('Error loading society details:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSociety();
  }, [params?.id]);

  const generateUniqueSocietyCode = async (stateName: string) => {
    const stateCode = STATE_CODES[stateName] || 'SS';
    let code = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 100) {
      attempts++;
      const randDigits = Math.floor(1000 + Math.random() * 9000).toString();
      code = `SS-${stateCode}-${randDigits}`;

      const { data } = await supabase
        .from('societies')
        .select('id')
        .eq('society_code', code);
      
      if (!data || data.length === 0) {
        isUnique = true;
      }
    }
    return code;
  };

  const handleApprove = async () => {
    if (!society) return;
    
    // Check if checklist is fully checked
    const isReady = checklist.nameMatches && checklist.validLocation && checklist.authenticDoc && checklist.validAdmin;
    if (!isReady) {
      const confirmForce = window.confirm('Your verification checklist is incomplete. Are you sure you want to approve this society?');
      if (!confirmForce) return;
    }

    setSubmitting(true);
    try {
      // 1. Generate Society Code
      const code = await generateUniqueSocietyCode(society.state);
      
      // 2. Update Society Status in DB
      const { error: socError } = await supabase
        .from('societies')
        .update({
          society_code: code,
          status: 'active',
          approved_at: new Date().toISOString()
        })
        .eq('id', society.id);

      if (socError) throw socError;

      // 3. Upsert Admin Profile and linked details (force role = 'admin', status = 'approved')
      const { error: upsertErr } = await supabase
        .from('profiles')
        .upsert({
          email: society.admin_email,
          role: 'admin',
          society_id: society.id,
          society_code: code,
          society_name: society.name,
          status: 'approved',
          full_name: society.admin_name,
          wing: 'HQ',
          flat_number: 'Admin'
        }, { onConflict: 'email' });

      if (upsertErr) throw upsertErr;

      // 3.5. Seed 10 parking slots V1-V10 for this society
      const slots = Array.from({ length: 10 }, (_, i) => ({
        slot_number: `V${i + 1}`,
        society_id: society.id,
        is_available: true
      }));

      const { error: slotErr } = await supabase
        .from('parking_slots')
        .insert(slots);

      if (slotErr) throw slotErr;

      // 4. Log Audit Log
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('portal_audit_log').insert({
          action_type: 'approval',
          performed_by: user.id,
          society_id: society.id,
          old_value: 'pending_verification',
          new_value: 'active'
        });
      }

      alert(`Society approved! Code is: ${code}`);
      fetchSociety();
    } catch (e) {
      console.error(e);
      alert('Approval processing error.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!society) return;
    setSubmitting(true);
    try {
      const finalReason = rejectReason === 'Other' ? customRejectText : rejectReason;
      
      // Update DB status to rejected
      const { error } = await supabase
        .from('societies')
        .update({
          status: 'rejected',
          rejection_reason: finalReason
        })
        .eq('id', society.id);

      if (error) throw error;

      // Log Audit Log
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('portal_audit_log').insert({
          action_type: 'rejection',
          performed_by: user.id,
          society_id: society.id,
          old_value: 'pending_verification',
          new_value: 'rejected'
        });
      }

      alert('Society registration rejected.');
      setShowRejectModal(false);
      fetchSociety();
    } catch (e) {
      console.error(e);
      alert('Rejection error.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex items-center justify-center p-6">
        <p className="text-zinc-500 text-sm">Loading verification file...</p>
      </div>
    );
  }

  if (!society) {
    return (
      <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-red-500">Registry file not found.</p>
        <Link href="/master/dashboard" className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded text-xs font-bold">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const mapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${society.lat},${society.lng}`;

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col selection:bg-[#00d4aa] selection:text-[#09090b]">
      {/* NAVBAR */}
      <header className="border-b border-zinc-800 bg-zinc-950 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/master/dashboard" className="text-zinc-400 hover:text-white transition-all">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="font-extrabold text-base tracking-tight">Review Verification File</span>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
          society.status === 'active' ? 'bg-[#00d4aa]/15 text-[#00d4aa] border border-[#00d4aa]/30' :
          (society.status === 'pending_verification' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20')
        }`}>
          {society.status}
        </span>
      </header>

      {/* DUAL PANEL LAYOUT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: REGISTRY DETAILS (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* PROFILE CARD */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
            <h3 className="text-base font-bold text-white uppercase tracking-wider border-b border-zinc-800 pb-2">Society Profile</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-xs text-zinc-500 uppercase font-semibold">Society Name</span>
                <span className="font-bold text-white mt-0.5 block">{society.name}</span>
              </div>
              <div>
                <span className="block text-xs text-zinc-500 uppercase font-semibold">Establishment Year</span>
                <span className="text-zinc-300 mt-0.5 block">{society.created_at ? new Date(society.created_at).getFullYear() : 'N/A'}</span>
              </div>
              <div>
                <span className="block text-xs text-zinc-500 uppercase font-semibold">Type</span>
                <span className="text-zinc-300 mt-0.5 block uppercase">{society.society_type}</span>
              </div>
              <div>
                <span className="block text-xs text-zinc-500 uppercase font-semibold">Registry Number</span>
                <span className="font-mono text-zinc-300 mt-0.5 block">{society.admin_phone}</span>
              </div>
              <div>
                <span className="block text-xs text-zinc-500 uppercase font-semibold">Total Wings</span>
                <span className="text-zinc-300 mt-0.5 block">{society.total_wings} Blocks</span>
              </div>
              <div>
                <span className="block text-xs text-zinc-500 uppercase font-semibold">Total Flats</span>
                <span className="text-zinc-300 mt-0.5 block">{society.total_flats} Flats</span>
              </div>
            </div>
          </div>

          {/* LOCATION DETAILS */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <h3 className="text-base font-bold text-white uppercase tracking-wider">Coordinates & Address</h3>
              <a 
                href={mapsSearchUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-xs font-bold text-[#00d4aa] hover:underline flex items-center gap-1"
              >
                Open Google Maps <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              {society.address_line1} {society.address_line2 ? `, ${society.address_line2}` : ''}<br />
              {society.city}, {society.state} — {society.pincode}
            </p>
            {/* Draggable location static map preview simulation */}
            <div className="h-60 bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-center overflow-hidden relative">
              <div className="absolute inset-0 bg-[#00d4aa]/5" />
              <div className="text-center p-6 z-10 space-y-3">
                <Map className="h-8 w-8 text-[#00d4aa] mx-auto" />
                <p className="text-xs text-zinc-400 max-w-sm">Entrance pinned at latitude: <span className="text-white font-mono">{society.lat}</span>, longitude: <span className="text-white font-mono">{society.lng}</span></p>
              </div>
            </div>
          </div>

          {/* UPLOADED FILE VIEW */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
            <h3 className="text-base font-bold text-white uppercase tracking-wider border-b border-zinc-800 pb-2">Uploaded Document</h3>
            {society.registration_doc_url ? (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-zinc-400">Government housing registration certificate certificate uploaded by admin.</p>
                <a 
                  href={society.registration_doc_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg hover:border-zinc-700 flex items-center justify-between text-sm hover:bg-zinc-900/40 transition-all"
                >
                  <span className="text-[#00d4aa] font-bold">View Registration Certificate PDF / Image</span>
                  <ExternalLink className="h-4 w-4 text-zinc-400" />
                </a>
              </div>
            ) : (
              <p className="text-sm text-red-400">No verification certificate uploaded.</p>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: VERIFICATION AUDIT (1/3 width) */}
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-6 sticky top-24">
            <h3 className="text-base font-bold text-white uppercase tracking-wider border-b border-zinc-800 pb-2">Verification Audit</h3>
            
            {/* CHECKLIST */}
            <div className="space-y-4">
              <button 
                onClick={() => toggleChecklistItem('nameMatches')}
                className="w-full flex items-start gap-3 text-left group"
              >
                {checklist.nameMatches ? (
                  <CheckSquare className="h-5 w-5 text-[#00d4aa] shrink-0 mt-0.5" />
                ) : (
                  <Square className="h-5 w-5 text-zinc-700 group-hover:text-zinc-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-xs font-bold text-white">Name Verification</h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Society name matches uploaded certificate exactly.</p>
                </div>
              </button>

              <button 
                onClick={() => toggleChecklistItem('validLocation')}
                className="w-full flex items-start gap-3 text-left group"
              >
                {checklist.validLocation ? (
                  <CheckSquare className="h-5 w-5 text-[#00d4aa] shrink-0 mt-0.5" />
                ) : (
                  <Square className="h-5 w-5 text-zinc-700 group-hover:text-zinc-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-xs font-bold text-white">Entrance Pin Location</h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Coordinates pinned on map match residential building gate boundaries.</p>
                </div>
              </button>

              <button 
                onClick={() => toggleChecklistItem('authenticDoc')}
                className="w-full flex items-start gap-3 text-left group"
              >
                {checklist.authenticDoc ? (
                  <CheckSquare className="h-5 w-5 text-[#00d4aa] shrink-0 mt-0.5" />
                ) : (
                  <Square className="h-5 w-5 text-zinc-700 group-hover:text-zinc-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-xs font-bold text-white">Certificate Authenticity</h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Housing certificate looks authentic, signed, and not forged.</p>
                </div>
              </button>

              <button 
                onClick={() => toggleChecklistItem('validAdmin')}
                className="w-full flex items-start gap-3 text-left group"
              >
                {checklist.validAdmin ? (
                  <CheckSquare className="h-5 w-5 text-[#00d4aa] shrink-0 mt-0.5" />
                ) : (
                  <Square className="h-5 w-5 text-zinc-700 group-hover:text-zinc-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-xs font-bold text-white">Admin Details</h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Society administrator credentials look verified and authentic.</p>
                </div>
              </button>
            </div>

            {/* ACTION TRIGGERS */}
            {society.status === 'pending_verification' && (
              <div className="flex flex-col gap-3 pt-4 border-t border-zinc-800">
                <button
                  onClick={handleApprove}
                  disabled={submitting}
                  className="w-full py-3 bg-[#00d4aa] hover:bg-[#00b390] text-zinc-950 font-bold rounded-lg text-sm transition-all flex items-center justify-center gap-1.5 glow-hover"
                >
                  {submitting ? 'Approving...' : 'APPROVE REGISTRATION'}
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={submitting}
                  className="w-full py-3 bg-[#ff3b30]/10 border border-[#ff3b30]/20 hover:border-[#ff3b30] text-[#ff3b30] font-bold rounded-lg text-sm transition-all flex items-center justify-center gap-1.5"
                >
                  REJECT REGISTRATION
                </button>
              </div>
            )}

            {/* REJECTION SHOW CARD */}
            {society.status === 'rejected' && (
              <div className="p-4 bg-[#351515] border border-red-500/30 rounded-lg">
                <h4 className="text-xs font-bold text-red-500">REJECTION LOG</h4>
                <p className="text-xs text-red-300 mt-1">{society.rejection_reason || 'No reason specified.'}</p>
              </div>
            )}

            {/* ACTIVE SHOW CARD */}
            {society.status === 'active' && (
              <div className="p-4 bg-[#00d4aa]/10 border border-[#00d4aa]/20 rounded-lg">
                <h4 className="text-xs font-bold text-[#00d4aa] uppercase tracking-wider">Active Credentials</h4>
                <div className="mt-2 space-y-1">
                  <span className="block text-[10px] text-zinc-500 font-bold uppercase">Society Code</span>
                  <span className="font-mono text-white text-lg font-bold">{society.society_code}</span>
                </div>
              </div>
            )}
          </div>
        </div>

      </main>

      {/* REJECTION MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-[#09090b]/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-1.5"><XCircle className="h-5 w-5 text-red-500" /> Reject Registration</h3>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase">Reason for Rejection</label>
              <select 
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:outline-none"
              >
                <option value="Invalid documents">Invalid documents</option>
                <option value="Duplicate registration">Duplicate registration</option>
                <option value="Incomplete information">Incomplete information</option>
                <option value="Location mismatch">Location mismatch</option>
                <option value="Other">Other (provide text)</option>
              </select>
            </div>

            {rejectReason === 'Other' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase">Specify Reason</label>
                <textarea
                  value={customRejectText}
                  onChange={(e) => setCustomRejectText(e.target.value)}
                  placeholder="Enter rejection details..."
                  className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:outline-none h-20"
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 border border-zinc-800 rounded text-xs font-bold hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button 
                onClick={handleRejectSubmit}
                disabled={submitting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
