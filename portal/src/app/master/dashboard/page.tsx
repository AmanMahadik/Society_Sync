'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { Shield, CheckCircle2, AlertCircle, Users, Activity, FileText, Ban, Trash2, ShieldAlert } from 'lucide-react';

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
  total_units: number;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
}

interface Society {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  society_code: string;
  admin_name: string;
  admin_email: string;
  admin_phone: string;
  total_units: number;
  status: 'active' | 'suspended';
  created_at: string;
}

export default function MasterDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'rejected' | 'suspended' | 'all_societies'>('pending');
  
  // Lists
  const [requests, setRequests] = useState<SocietyRequest[]>([]);
  const [societies, setSocieties] = useState<Society[]>([]);

  // Stats
  const [stats, setStats] = useState({
    totalSocieties: 0,
    pendingRequests: 0,
    activeSocieties: 0,
    globalUsers: 0
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      // Verify session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/master/login');
        return;
      }

      // Check role = master_admin using secure RPC helper
      const { data: role, error: roleError } = await supabase.rpc('get_current_user_role');
      
      if (roleError || role !== 'master_admin') {
        router.push('/master/login');
        return;
      }

      // Fetch all requests
      const { data: reqData, error: reqError } = await supabase
        .from('society_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (reqError) throw reqError;
      setRequests(reqData || []);

      // Fetch all societies
      const { data: socData, error: socError } = await supabase
        .from('societies')
        .select('*')
        .order('created_at', { ascending: false });

      if (socError) throw socError;
      setSocieties(socData || []);

      // Fetch users count
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const activeSocList = socData || [];
      const pendingReqList = reqData || [];

      setStats({
        totalSocieties: activeSocList.length,
        pendingRequests: pendingReqList.filter((r: any) => r.status === 'pending').length,
        activeSocieties: activeSocList.filter((s: any) => s.status === 'active').length,
        globalUsers: usersCount || 0
      });

    } catch (e) {
      console.error('Error fetching master dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/master/login');
  };

  const handleToggleSuspension = async (id: string, currentStatus: 'active' | 'suspended') => {
    const soc = societies.find(s => s.id === id);
    if (!soc) {
      alert('Error: Society details not found.');
      return;
    }

    const nextStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    const actionLabel = currentStatus === 'suspended' ? 'activate' : 'suspend';
    
    const confirmAction = window.confirm(`Are you sure you want to ${actionLabel} this society?`);
    if (!confirmAction) return;

    try {
      const { error } = await supabase
        .from('societies')
        .update({ status: nextStatus })
        .eq('id', id);

      if (error) throw error;
      alert(`Society has been successfully set to ${nextStatus}.`);

      // Trigger suspension or reactivation email notification
      try {
        console.log(`Sending ${nextStatus === 'suspended' ? 'suspension' : 'reactivation'} email to ${soc.admin_email}`);
        const emailResponse = await fetch('/api/approve-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            adminEmail: soc.admin_email,
            adminName: soc.admin_name || 'Society Admin',
            societyName: soc.name,
            status: nextStatus === 'suspended' ? 'suspended' : 'activated'
          })
        });
        const emailData = await emailResponse.json();
        if (!emailResponse.ok || !emailData.success) {
          throw new Error(emailData.error || 'Failed to send email');
        }
      } catch (emailErr: any) {
        console.error('Failed to trigger email notification:', emailErr);
        alert(`Warning: Status updated in database, but notification email failed to send: ${emailErr.message || emailErr}`);
      }

      fetchData();
    } catch (e) {
      console.error(e);
      alert('Error updating society status.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0e10] text-[#f2f2f0] flex flex-col selection:bg-[#dc2626] selection:text-[#0b0e10]">
      {/* NAVBAR */}
      <header className="border-b border-[#1c2224] bg-[#0b0e10] px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded bg-[#dc2626] flex items-center justify-center font-bold text-white shadow-lg shadow-[#dc2626]/20">
              <Shield className="h-4 w-4" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-[#f2f2f0]">SocietySync</span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-red-950/20 text-red-500 border border-red-500/30">
            Master admin
          </span>
        </div>
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-5 text-xs font-semibold uppercase tracking-wider">
            <Link href="/master/dashboard" className="text-[#dc2626] transition-colors border-b-2 border-[#dc2626] pb-1">Requests</Link>
            <Link href="/master/societies" className="text-[#8a8f91] hover:text-[#f2f2f0] transition-colors">Societies</Link>
            <Link href="/master/users" className="text-[#8a8f91] hover:text-[#f2f2f0] transition-colors">Users</Link>
          </nav>
          <button 
            onClick={handleSignOut} 
            className="text-xs font-semibold px-3 py-1.5 rounded bg-[#111517] hover:bg-[#1c2224] text-[#8a8f91] hover:text-[#f2f2f0] transition-all border border-[#1c2224] flex items-center gap-1.5"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* STATS WIDGETS */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          <div className="bg-[#111517] border border-[#1c2224] p-5 rounded-lg relative overflow-hidden flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#8a8f91] font-bold uppercase tracking-wider block">Total Societies</span>
              <span className="text-3xl font-extrabold mt-1 text-[#f2f2f0] block">{stats.totalSocieties}</span>
            </div>
            <div className="h-10 w-10 bg-[#8a8f91]/10 rounded-full flex items-center justify-center border border-[#8a8f91]/20">
              <Activity className="h-5 w-5 text-[#8a8f91]" />
            </div>
          </div>

          <div className="bg-[#111517] border border-[#1c2224] p-5 rounded-lg relative overflow-hidden flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#8a8f91] font-bold uppercase tracking-wider block">Pending Requests</span>
              <span className="text-3xl font-extrabold mt-1 text-yellow-500 block">{stats.pendingRequests}</span>
            </div>
            <div className="h-10 w-10 bg-yellow-500/10 rounded-full flex items-center justify-center border border-yellow-500/20">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            </div>
          </div>

          <div className="bg-[#111517] border border-[#1c2224] p-5 rounded-lg relative overflow-hidden flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#8a8f91] font-bold uppercase tracking-wider block">Active Societies</span>
              <span className="text-3xl font-extrabold mt-1 text-[#1D9E75] block">{stats.activeSocieties}</span>
            </div>
            <div className="h-10 w-10 bg-[#1D9E75]/10 rounded-full flex items-center justify-center border border-[#1D9E75]/20">
              <CheckCircle2 className="h-5 w-5 text-[#1D9E75]" />
            </div>
          </div>

          <div className="bg-[#111517] border border-[#1c2224] p-5 rounded-lg relative overflow-hidden flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#8a8f91] font-bold uppercase tracking-wider block">Global App Users</span>
              <span className="text-3xl font-extrabold mt-1 text-blue-500 block">{stats.globalUsers}</span>
            </div>
            <div className="h-10 w-10 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
          </div>
        </div>

        {/* TABS & DATA TABLE */}
        <div className="bg-[#111517] border border-[#1c2224] rounded-lg overflow-hidden shadow-xl">
          <div className="flex border-b border-[#1c2224] bg-[#0b0e10]/80 px-4 pt-3 gap-2 overflow-x-auto scrollbar-thin">
            {(['pending', 'active', 'rejected', 'suspended', 'all_societies'] as const).map((tab) => {
              const label = tab === 'pending' ? 'Pending Requests' : 
                            tab === 'active' ? 'Active Societies' : 
                            tab === 'rejected' ? 'Rejected Requests' : 
                            tab === 'suspended' ? 'Suspended' : 'All Societies';
              const isSelected = activeTab === tab;
              const hasBadge = tab === 'pending' && stats.pendingRequests > 0;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 pb-2.5 ${
                    isSelected ? 'border-[#dc2626] text-[#dc2626]' : 'border-transparent text-[#8a8f91] hover:text-[#f2f2f0]'
                  }`}
                >
                  {label}
                  {hasBadge && (
                    <span className="h-4 w-4 bg-yellow-500 text-[#0b0e10] text-[10px] rounded-full flex items-center justify-center font-extrabold">
                      {stats.pendingRequests}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* TABLE DISPLAY */}
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <div className="h-10 w-10 rounded-full border-2 border-[#1c2224] border-t-[#dc2626] animate-spin" />
              <span className="text-[#8a8f91] text-xs animate-pulse font-medium">Retrieving database registries...</span>
            </div>
          ) : (
            <div>
              {/* PENDING / REJECTED REQUESTS */}
              {(activeTab === 'pending' || activeTab === 'rejected') && (
                <>
                  {/* Desktop view */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#1c2224] bg-[#0b0e10]/40 text-[#8a8f91] font-semibold uppercase tracking-wider">
                          <th className="p-4">Society Request</th>
                          <th className="p-4">Location</th>
                          <th className="p-4">Admin Details</th>
                          <th className="p-4 text-center">Units</th>
                          <th className="p-4">Submitted At</th>
                          {activeTab === 'rejected' && <th className="p-4">Rejection Reason</th>}
                          <th className="p-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1c2224]">
                        {requests
                          .filter(r => r.status === activeTab)
                          .map((req) => (
                            <tr key={req.id} className="hover:bg-[#0b0e10]/30 transition-colors">
                              <td className="p-4 font-bold text-[#f2f2f0]">{req.name}</td>
                              <td className="p-4 text-[#8a8f91]">{req.city}, {req.state}</td>
                              <td className="p-4">
                                <span className="block text-[#f2f2f0] font-medium">{req.admin_name}</span>
                                <span className="block text-[10px] text-[#8a8f91] mt-0.5">{req.admin_email}</span>
                              </td>
                              <td className="p-4 text-center text-[#f2f2f0]">{req.total_units}</td>
                              <td className="p-4 text-[#8a8f91]">{new Date(req.created_at).toLocaleDateString()}</td>
                              {activeTab === 'rejected' && <td className="p-4 text-[#993C1D] text-xs font-semibold">{req.rejection_reason || 'N/A'}</td>}
                              <td className="p-4 text-center">
                                <Link 
                                  href={`/master/requests/${req.id}`}
                                  className="inline-flex px-3 py-1.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-bold rounded text-xs transition-all shadow-md shadow-[#dc2626]/20"
                                >
                                  Review Request
                                </Link>
                              </td>
                            </tr>
                          ))}
                        {requests.filter(r => r.status === activeTab).length === 0 && (
                          <tr>
                            <td colSpan={activeTab === 'rejected' ? 7 : 6} className="p-8 text-center text-[#8a8f91]">
                              No requests found under this filter.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile view */}
                  <div className="block md:hidden divide-y divide-[#1c2224]">
                    {requests
                      .filter(r => r.status === activeTab)
                      .map((req) => (
                        <div key={req.id} className="p-4 space-y-3 bg-[#0b0e10]/10">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-[#f2f2f0] text-xs leading-tight">{req.name}</h4>
                            <span className="text-[10px] text-[#8a8f91]">{new Date(req.created_at).toLocaleDateString()}</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs text-[#8a8f91]">
                            <div>
                              <span className="text-[#8a8f91] block">Location:</span>
                              <span className="text-[#f2f2f0]">{req.city}, {req.state}</span>
                            </div>
                            <div>
                              <span className="text-[#8a8f91] block">Units / Flats:</span>
                              <span className="text-[#f2f2f0]">{req.total_units}</span>
                            </div>
                          </div>

                          <div className="text-xs border-t border-[#1c2224] pt-2">
                            <span className="text-[#8a8f91] block">Admin Representative:</span>
                            <span className="text-[#f2f2f0] font-medium block">{req.admin_name}</span>
                            <span className="text-[#8a8f91] block mt-0.5">{req.admin_email}</span>
                          </div>

                          {activeTab === 'rejected' && (
                            <div className="p-2 bg-[#993C1D]/10 border border-[#993C1D]/20 rounded text-xs text-[#993C1D]">
                              <span className="font-bold block">Rejection Reason:</span>
                              {req.rejection_reason || 'N/A'}
                            </div>
                          )}

                          <div className="pt-1">
                            <Link 
                              href={`/master/requests/${req.id}`}
                              className="block text-center py-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-bold rounded text-xs transition-all w-full shadow-md shadow-[#dc2626]/20"
                            >
                              Review Request
                            </Link>
                          </div>
                        </div>
                      ))}
                    {requests.filter(r => r.status === activeTab).length === 0 && (
                      <div className="p-8 text-center text-[#8a8f91] text-xs">
                        No requests found under this filter.
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ACTIVE / SUSPENDED / ALL SOCIETIES */}
              {(activeTab === 'active' || activeTab === 'suspended' || activeTab === 'all_societies') && (
                <>
                  {/* Desktop view */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#1c2224] bg-[#0b0e10]/40 text-[#8a8f91] font-semibold uppercase tracking-wider">
                          <th className="p-4">Society Name</th>
                          <th className="p-4">Location</th>
                          <th className="p-4">Admin Email</th>
                          <th className="p-4 text-center">Society Code</th>
                          <th className="p-4 text-center">Units</th>
                          <th className="p-4">Approved On</th>
                          <th className="p-4 text-center">Status</th>
                          <th className="p-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1c2224]">
                        {societies
                          .filter(s => {
                            if (activeTab === 'all_societies') return true;
                            return s.status === activeTab;
                          })
                          .map((soc) => (
                            <tr key={soc.id} className="hover:bg-[#0b0e10]/30 transition-colors">
                              <td className="p-4 font-bold text-[#f2f2f0]">{soc.name}</td>
                              <td className="p-4 text-[#8a8f91]">{soc.city}, {soc.state}</td>
                              <td className="p-4 text-[#f2f2f0]">{soc.admin_email}</td>
                              <td className="p-4 text-center font-mono text-xs text-[#1D9E75] font-bold">{soc.society_code}</td>
                              <td className="p-4 text-center text-[#f2f2f0]">{soc.total_units}</td>
                              <td className="p-4 text-[#8a8f91]">{new Date(soc.created_at).toLocaleDateString()}</td>
                              <td className="p-4 text-center">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                  soc.status === 'active' ? 'bg-[#1D9E75]/15 text-[#1D9E75] border border-[#1D9E75]/30' : 'bg-[#993C1D]/15 text-[#FAECE7] border border-[#993C1D]/30'
                                }`}>
                                  {soc.status}
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex justify-center gap-2">
                                  <button
                                    onClick={() => handleToggleSuspension(soc.id, soc.status)}
                                    className={`px-2 py-1 rounded text-[11px] font-bold transition-all border ${
                                      soc.status === 'active' 
                                        ? 'bg-[#0b0e10] border-[#1c2224] hover:border-[#993C1D]/35 text-[#993C1D]' 
                                        : 'bg-[#1D9E75]/10 border-[#1D9E75]/25 text-[#1D9E75] hover:bg-[#1D9E75]/20'
                                    }`}
                                  >
                                    {soc.status === 'active' ? 'Suspend' : 'Activate'}
                                  </button>
                                  <Link
                                    href={`/master/societies/${soc.id}/review`}
                                    className="px-2.5 py-1 rounded bg-[#0b0e10] border border-[#1c2224] hover:border-[#1D9E75]/30 text-[#1D9E75] text-[11px] font-bold transition-all flex items-center justify-center"
                                  >
                                    View Info
                                  </Link>
                                  <Link
                                    href={`/master/credentials/${soc.id}`}
                                    className="px-2.5 py-1 rounded bg-[#0b0e10] border border-[#1c2224] hover:border-[#8a8f91]/30 text-[#f2f2f0] text-[11px] font-bold transition-all flex items-center justify-center"
                                  >
                                    Credentials
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          ))}
                        {societies.filter(s => {
                          if (activeTab === 'all_societies') return true;
                          return s.status === activeTab;
                        }).length === 0 && (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-[#8a8f91]">
                              No societies found under this filter.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile view */}
                  <div className="block md:hidden divide-y divide-[#1c2224]">
                    {societies
                      .filter(s => {
                        if (activeTab === 'all_societies') return true;
                        return s.status === activeTab;
                      })
                      .map((soc) => (
                        <div key={soc.id} className="p-4 space-y-3 bg-[#0b0e10]/10">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-bold text-[#f2f2f0] text-xs leading-tight">{soc.name}</h4>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shrink-0 ${
                              soc.status === 'active' ? 'bg-[#1D9E75]/15 text-[#1D9E75] border border-[#1D9E75]/30' : 'bg-[#993C1D]/15 text-[#FAECE7] border border-[#993C1D]/30'
                            }`}>
                              {soc.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs text-[#8a8f91]">
                            <div>
                              <span className="text-[#8a8f91] block">Location:</span>
                              <span className="text-[#f2f2f0]">{soc.city}, {soc.state}</span>
                            </div>
                            <div>
                              <span className="text-[#8a8f91] block">Units / Flats:</span>
                              <span className="text-[#f2f2f0]">{soc.total_units}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs border-t border-[#1c2224] pt-2">
                            <div>
                              <span className="text-[#8a8f91] block">Society Code:</span>
                              <span className="font-mono font-bold text-[#1D9E75]">{soc.society_code}</span>
                            </div>
                            <div>
                              <span className="text-[#8a8f91] block">Approved On:</span>
                              <span className="text-[#f2f2f0]">{new Date(soc.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div className="text-xs pt-1 text-[#8a8f91]">
                            <span className="text-[#8a8f91] block font-semibold">Admin Contact Email:</span>
                            <span className="text-[#f2f2f0]">{soc.admin_email}</span>
                          </div>

                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => handleToggleSuspension(soc.id, soc.status)}
                              className={`flex-1 py-2 rounded text-xs font-bold transition-all border text-center ${
                                soc.status === 'active' 
                                  ? 'bg-[#0b0e10] border-[#1c2224] hover:border-[#993C1D]/30 text-[#993C1D]' 
                                  : 'bg-[#1D9E75]/10 border-[#1D9E75]/25 text-[#1D9E75] hover:bg-[#1D9E75]/20'
                              }`}
                            >
                              {soc.status === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                            <Link
                              href={`/master/credentials/${soc.id}`}
                              className="flex-1 py-2 rounded bg-[#0b0e10] border border-[#1c2224] hover:bg-[#1c2224] text-[#f2f2f0] text-xs font-bold text-center block"
                            >
                              Credentials
                            </Link>
                          </div>
                        </div>
                      ))}
                    {societies.filter(s => {
                      if (activeTab === 'all_societies') return true;
                      return s.status === activeTab;
                        }).length === 0 && (
                      <div className="p-8 text-center text-[#8a8f91] text-xs">
                        No societies found under this filter.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
