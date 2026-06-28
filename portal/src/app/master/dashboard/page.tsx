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
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Error updating society status.');
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col selection:bg-[#00d4aa] selection:text-[#09090b]">
      {/* NAVBAR */}
      <header className="border-b border-zinc-800 bg-zinc-950 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-red-600 flex items-center justify-center font-bold text-white">
            <Shield className="h-5 w-5" />
          </div>
          <span className="font-extrabold text-lg tracking-tight">
            SocietySync <span className="text-red-500 text-xs uppercase tracking-wider font-bold ml-1">Master</span>
          </span>
        </div>
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link href="/master/dashboard" className="text-red-500 hover:text-red-400">Requests</Link>
          <Link href="/master/societies" className="text-zinc-400 hover:text-white">Societies</Link>
          <Link href="/master/users" className="text-zinc-400 hover:text-white">Users</Link>
        </nav>
        <button 
          onClick={handleSignOut} 
          className="text-xs font-bold px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-all border border-zinc-800"
        >
          Sign Out
        </button>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-8">
        
        {/* STATS WIDGETS */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl relative overflow-hidden">
            <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Total Societies</h4>
            <p className="text-3xl font-extrabold mt-2 text-white">{stats.totalSocieties}</p>
            <Activity className="h-6 w-6 text-zinc-700 absolute right-6 top-6" />
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl relative overflow-hidden">
            <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Pending Requests</h4>
            <p className="text-3xl font-extrabold mt-2 text-yellow-500">{stats.pendingRequests}</p>
            <AlertCircle className="h-6 w-6 text-yellow-500/20 absolute right-6 top-6" />
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl relative overflow-hidden">
            <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Active Societies</h4>
            <p className="text-3xl font-extrabold mt-2 text-[#00d4aa]">{stats.activeSocieties}</p>
            <CheckCircle2 className="h-6 w-6 text-[#00d4aa]/20 absolute right-6 top-6" />
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl relative overflow-hidden">
            <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Global App Users</h4>
            <p className="text-3xl font-extrabold mt-2 text-blue-500">{stats.globalUsers}</p>
            <Users className="h-6 w-6 text-blue-500/20 absolute right-6 top-6" />
          </div>
        </div>

        {/* TABS */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex border-b border-zinc-800 bg-zinc-950 px-4 pt-3 gap-2 overflow-x-auto">
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
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                    isSelected ? 'border-red-500 text-red-500' : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {label}
                  {hasBadge && (
                    <span className="h-4 w-4 bg-yellow-500 text-zinc-950 text-[10px] rounded-full flex items-center justify-center font-extrabold">
                      {stats.pendingRequests}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* TABLE DISPLAY */}
          {loading ? (
            <div className="p-12 text-center text-zinc-500 text-sm">
              Retrieving database registries...
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* PENDING / REJECTED REQUESTS */}
              {(activeTab === 'pending' || activeTab === 'rejected') && (
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 font-semibold text-xs uppercase tracking-wider">
                      <th className="p-4">Society Request</th>
                      <th className="p-4">Location</th>
                      <th className="p-4">Admin Details</th>
                      <th className="p-4 text-center">Units</th>
                      <th className="p-4">Submitted At</th>
                      {activeTab === 'rejected' && <th className="p-4">Rejection Reason</th>}
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {requests
                      .filter(r => r.status === activeTab)
                      .map((req) => (
                        <tr key={req.id} className="hover:bg-zinc-950/40 transition-colors">
                          <td className="p-4 font-bold text-white">{req.name}</td>
                          <td className="p-4 text-zinc-400">{req.city}, {req.state}</td>
                          <td className="p-4">
                            <span className="block text-zinc-300 font-medium">{req.admin_name}</span>
                            <span className="block text-[11px] text-zinc-500">{req.admin_email}</span>
                          </td>
                          <td className="p-4 text-center text-zinc-300">{req.total_units}</td>
                          <td className="p-4 text-zinc-500">{new Date(req.created_at).toLocaleDateString()}</td>
                          {activeTab === 'rejected' && <td className="p-4 text-red-400 text-xs">{req.rejection_reason || 'N/A'}</td>}
                          <td className="p-4 text-center">
                            <Link 
                              href={`/master/requests/${req.id}`}
                              className="inline-flex px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-xs transition-all"
                            >
                              Review Request
                            </Link>
                          </td>
                        </tr>
                      ))}
                    {requests.filter(r => r.status === activeTab).length === 0 && (
                      <tr>
                        <td colSpan={activeTab === 'rejected' ? 7 : 6} className="p-8 text-center text-zinc-500">
                          No requests found under this filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* ACTIVE / SUSPENDED / ALL SOCIETIES */}
              {(activeTab === 'active' || activeTab === 'suspended' || activeTab === 'all_societies') && (
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 font-semibold text-xs uppercase tracking-wider">
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
                  <tbody className="divide-y divide-zinc-800">
                    {societies
                      .filter(s => {
                        if (activeTab === 'all_societies') return true;
                        return s.status === activeTab;
                      })
                      .map((soc) => (
                        <tr key={soc.id} className="hover:bg-zinc-950/40 transition-colors">
                          <td className="p-4 font-bold text-white">{soc.name}</td>
                          <td className="p-4 text-zinc-400">{soc.city}, {soc.state}</td>
                          <td className="p-4 text-zinc-300">{soc.admin_email}</td>
                          <td className="p-4 text-center font-mono text-xs text-[#00d4aa]">{soc.society_code}</td>
                          <td className="p-4 text-center text-zinc-300">{soc.total_units}</td>
                          <td className="p-4 text-zinc-500">{new Date(soc.created_at).toLocaleDateString()}</td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              soc.status === 'active' ? 'bg-[#00d4aa]/15 text-[#00d4aa] border border-[#00d4aa]/30' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                            }`}>
                              {soc.status}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex justify-center gap-3">
                              <button
                                onClick={() => handleToggleSuspension(soc.id, soc.status)}
                                className={`px-2 py-1 rounded text-xs font-bold transition-all border ${
                                  soc.status === 'active' ? 'bg-zinc-900 border-zinc-800 hover:border-red-500/30 text-red-400' : 'bg-[#00d4aa]/10 border-[#00d4aa]/20 text-[#00d4aa] hover:border-[#00d4aa]'
                                }`}
                              >
                                {soc.status === 'active' ? 'Suspend' : 'Activate'}
                              </button>
                              <Link
                                href={`/master/credentials/${soc.id}`}
                                className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-bold"
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
                        <td colSpan={8} className="p-8 text-center text-zinc-500">
                          No societies found under this filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
