'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { Shield, ArrowLeft, CheckCircle2, AlertCircle, FileText, Ban, CheckSquare, Square, XCircle } from 'lucide-react';

interface SocietyRequest {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  admin_name: string;
  admin_email: string;
  admin_phone: string;
  admin_password?: string;
  total_units: number;
  document_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
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

export default function ReviewRequestPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [request, setRequest] = useState<SocietyRequest | null>(null);
  
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('Invalid documents');
  const [customRejectText, setCustomRejectText] = useState('');

  // 4-point verification checklist
  const [checklist, setChecklist] = useState({
    nameMatches: false,
    validLocation: false,
    authenticDoc: false,
    validAdmin: false
  });

  const toggleChecklist = (key: keyof typeof checklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const fetchRequest = async () => {
    if (!params?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('society_requests')
        .select('*')
        .eq('id', parseInt(params.id))
        .single();
      
      if (error) throw error;
      setRequest(data);
    } catch (e) {
      console.error('Error fetching request details:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequest();
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
    if (!request) return;

    // Check if checklist is fully checked
    const isReady = checklist.nameMatches && checklist.validLocation && checklist.authenticDoc && checklist.validAdmin;
    if (!isReady) {
      const confirmForce = window.confirm('Your verification checklist is incomplete. Are you sure you want to approve this society?');
      if (!confirmForce) return;
    }

    setSubmitting(true);
    try {
      // 1. Generate Society Code and use applicant's password
      const code = await generateUniqueSocietyCode(request.state);
      const adminPassword = request.admin_password || 'Admin@123';

      // 2. Call Transactional Database RPC function
      const { data: adminUserId, error: rpcError } = await supabase.rpc('approve_society_request', {
        req_id: request.id,
        gen_code: code,
        gen_password: adminPassword
      });

      if (rpcError) throw rpcError;

      alert('Society has been approved successfully! Proceeding to view credentials.');
      
      // Redirect directly to credentials retrieval page
      router.push(`/master/credentials/${request.id}`);

    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error occurred while executing approval.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!request) return;
    setSubmitting(true);
    try {
      const finalReason = rejectReason === 'Other' ? customRejectText : rejectReason;
      
      const { error } = await supabase
        .from('society_requests')
        .update({
          status: 'rejected',
          rejection_reason: finalReason
        })
        .eq('id', request.id);

      if (error) throw error;

      alert('Society registration request has been rejected.');
      setShowRejectModal(false);
      fetchRequest();
    } catch (err) {
      console.error(err);
      alert('Error saving rejection status.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex items-center justify-center p-6">
        <p className="text-zinc-500 text-sm">Loading verification files...</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-red-500">Registry request file not found.</p>
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
          <span className="font-extrabold text-base tracking-tight">Review Verification File</span>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
          request.status === 'approved' ? 'bg-[#00d4aa]/15 text-[#00d4aa] border border-[#00d4aa]/30' :
          (request.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20')
        }`}>
          {request.status}
        </span>
      </header>

      {/* BODY CONTROLLER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* PROFILE CARD */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
            <h3 className="text-base font-bold text-white uppercase tracking-wider border-b border-zinc-800 pb-2">Society Profile</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-xs text-zinc-500 uppercase font-semibold">Society Name</span>
                <span className="font-bold text-white mt-0.5 block">{request.name}</span>
              </div>
              <div>
                <span className="block text-xs text-zinc-500 uppercase font-semibold">Residential Address</span>
                <span className="text-zinc-300 mt-0.5 block">{request.address}</span>
              </div>
              <div>
                <span className="block text-xs text-zinc-500 uppercase font-semibold">City / State</span>
                <span className="text-zinc-300 mt-0.5 block">{request.city}, {request.state} — {request.pincode}</span>
              </div>
              <div>
                <span className="block text-xs text-zinc-500 uppercase font-semibold">Total Residential Units</span>
                <span className="text-zinc-300 mt-0.5 block">{request.total_units} Units</span>
              </div>
            </div>
          </div>

          {/* ADMIN CARD */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
            <h3 className="text-base font-bold text-white uppercase tracking-wider border-b border-zinc-800 pb-2">Admin Profile</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-xs text-zinc-500 uppercase font-semibold">Admin Full Name</span>
                <span className="font-bold text-white mt-0.5 block">{request.admin_name}</span>
              </div>
              <div>
                <span className="block text-xs text-zinc-500 uppercase font-semibold">Official Email</span>
                <span className="text-zinc-300 mt-0.5 block">{request.admin_email}</span>
              </div>
              <div>
                <span className="block text-xs text-zinc-500 uppercase font-semibold">Mobile Phone</span>
                <span className="text-zinc-300 mt-0.5 block">{request.admin_phone}</span>
              </div>
            </div>
          </div>

          {/* DOCUMENTS */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
            <h3 className="text-base font-bold text-white uppercase tracking-wider border-b border-zinc-800 pb-2">Housing Documents</h3>
            {request.document_url ? (
              <a 
                href={request.document_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg hover:border-zinc-700 flex items-center justify-between text-sm hover:bg-zinc-900/40 transition-all text-[#00d4aa] font-bold"
              >
                <span>View Registration Certificate PDF / Image</span>
              </a>
            ) : (
              <p className="text-sm text-red-400">No documents uploaded.</p>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-6 sticky top-24">
            <h3 className="text-base font-bold text-white uppercase tracking-wider border-b border-zinc-800 pb-2">Verification Audit</h3>
            
            {/* CHECKLIST */}
            <div className="space-y-4">
              <button onClick={() => toggleChecklist('nameMatches')} className="w-full flex items-start gap-3 text-left group">
                {checklist.nameMatches ? <CheckSquare className="h-5 w-5 text-[#00d4aa] shrink-0 mt-0.5" /> : <Square className="h-5 w-5 text-zinc-700 group-hover:text-zinc-500 shrink-0 mt-0.5" />}
                <div>
                  <h4 className="text-xs font-bold text-white">Name Verification</h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Society name matches registration documentation.</p>
                </div>
              </button>

              <button onClick={() => toggleChecklist('validLocation')} className="w-full flex items-start gap-3 text-left group">
                {checklist.validLocation ? <CheckSquare className="h-5 w-5 text-[#00d4aa] shrink-0 mt-0.5" /> : <Square className="h-5 w-5 text-zinc-700 group-hover:text-zinc-500 shrink-0 mt-0.5" />}
                <div>
                  <h4 className="text-xs font-bold text-white">Address Validity</h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Pincode and city correspond to physical location boundaries.</p>
                </div>
              </button>

              <button onClick={() => toggleChecklist('authenticDoc')} className="w-full flex items-start gap-3 text-left group">
                {checklist.authenticDoc ? <CheckSquare className="h-5 w-5 text-[#00d4aa] shrink-0 mt-0.5" /> : <Square className="h-5 w-5 text-zinc-700 group-hover:text-zinc-500 shrink-0 mt-0.5" />}
                <div>
                  <h4 className="text-xs font-bold text-white">Certificate Authenticity</h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Housing certificate looks authentic and un-tampered.</p>
                </div>
              </button>

              <button onClick={() => toggleChecklist('validAdmin')} className="w-full flex items-start gap-3 text-left group">
                {checklist.validAdmin ? <CheckSquare className="h-5 w-5 text-[#00d4aa] shrink-0 mt-0.5" /> : <Square className="h-5 w-5 text-zinc-700 group-hover:text-zinc-500 shrink-0 mt-0.5" />}
                <div>
                  <h4 className="text-xs font-bold text-white">Admin Details</h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Secretary details verified.</p>
                </div>
              </button>
            </div>

            {/* ACTION TRIGGERS */}
            {request.status === 'pending' && (
              <div className="flex flex-col gap-3 pt-4 border-t border-zinc-800">
                <button
                  onClick={handleApprove}
                  disabled={submitting}
                  className="w-full py-3 bg-[#00d4aa] hover:bg-[#00b390] text-zinc-950 font-bold rounded-lg text-sm transition-all flex items-center justify-center gap-1.5 glow-hover"
                >
                  {submitting ? 'Processing Approval...' : 'APPROVE REGISTRATION'}
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={submitting}
                  className="w-full py-3 bg-[#ff3b30]/10 border border-[#ff3b30]/20 hover:border-[#ff3b30] text-[#ff3b30] font-bold rounded-lg text-sm transition-all"
                >
                  REJECT REGISTRATION
                </button>
              </div>
            )}

            {/* REJECTION CARD */}
            {request.status === 'rejected' && (
              <div className="p-4 bg-[#351515] border border-red-500/30 rounded-lg">
                <h4 className="text-xs font-bold text-red-500">REJECTION REASON</h4>
                <p className="text-xs text-red-300 mt-1">{request.rejection_reason || 'No reason specified.'}</p>
              </div>
            )}
          </div>
        </div>

      </main>

      {/* REJECTION MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-[#09090b]/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-1.5"><XCircle className="h-5 w-5 text-red-500" /> Reject Request</h3>
            
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
