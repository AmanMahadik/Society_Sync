'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { Shield, Ban, Activity, CheckCircle2, ChevronRight } from 'lucide-react';

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

export default function SocietiesListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSocieties = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/master/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      if (!profile || profile.role !== 'master_admin') {
        router.push('/master/login');
        return;
      }

      const { data, error } = await supabase
        .from('societies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSocieties(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSocieties();
  }, []);

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
      fetchSocieties();
    } catch (e) {
      console.error(e);
      alert('Error updating society status.');
    }
  };

  const filtered = societies.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.society_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <Link href="/master/dashboard" className="text-zinc-400 hover:text-white">Requests</Link>
          <Link href="/master/societies" className="text-red-500 hover:text-red-400">Societies</Link>
          <Link href="/master/users" className="text-zinc-400 hover:text-white">Users</Link>
        </nav>
        <button 
          onClick={() => { supabase.auth.signOut(); router.push('/master/login'); }}
          className="text-xs font-bold px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-all border border-zinc-800"
        >
          Sign Out
        </button>
      </header>

      {/* BODY CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Approved Societies</h2>
            <p className="text-zinc-500 text-sm">Manage system-wide housing complex registrations</p>
          </div>
          
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, code, or city..."
            className="max-w-xs w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#00d4aa]"
          />
        </div>

        {/* SOCIETIES LIST TABLE */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-zinc-500 text-sm">
              Retrieving approved societies...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-sm">
              No registered societies found matching your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 font-semibold text-xs uppercase tracking-wider">
                    <th className="p-4">Society Name</th>
                    <th className="p-4">Location</th>
                    <th className="p-4">Admin Email</th>
                    <th className="p-4 text-center">Society Code</th>
                    <th className="p-4 text-center">Units</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filtered.map((soc) => (
                    <tr key={soc.id} className="hover:bg-zinc-950/40 transition-colors">
                      <td className="p-4 font-bold text-white">{soc.name}</td>
                      <td className="p-4 text-zinc-400">{soc.city}, {soc.state}</td>
                      <td className="p-4 text-zinc-300">{soc.admin_email}</td>
                      <td className="p-4 text-center font-mono text-xs text-[#00d4aa]">{soc.society_code}</td>
                      <td className="p-4 text-center text-zinc-300">{soc.total_units}</td>
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
                            className={`px-2.5 py-1 rounded text-xs font-bold transition-all border ${
                              soc.status === 'active' ? 'bg-zinc-900 border-zinc-800 hover:border-red-500/30 text-red-400' : 'bg-[#00d4aa]/10 border-[#00d4aa]/20 text-[#00d4aa] hover:border-[#00d4aa]'
                            }`}
                          >
                            {soc.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                          <Link
                            href={`/master/credentials/${soc.id}`}
                            className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-bold"
                          >
                            View Credentials
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
