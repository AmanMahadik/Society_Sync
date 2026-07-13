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
  admin_name: string;
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
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

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

  const handleResendEmail = async (soc: Society) => {
    setSendingEmailId(soc.id);
    try {
      const response = await fetch('/api/approve-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          adminEmail: soc.admin_email,
          adminName: 'Society Admin',
          societyName: soc.name,
          status: 'approved',
          societyCode: soc.society_code
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        alert(`Onboarding credentials email successfully sent to ${soc.admin_email}!`);
      } else {
        throw new Error(data.error || 'Failed to send email');
      }
    } catch (err: any) {
      console.error(err);
      alert(`Failed to send email: ${err.message || err}`);
    } finally {
      setSendingEmailId(null);
    }
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

      fetchSocieties();
    } catch (e) {
      console.error(e);
      alert('Error updating society status.');
    }
  };

  const handleDeleteSociety = async (societyCode: string, name: string) => {
    const soc = societies.find(s => s.society_code === societyCode);
    if (!soc) {
      alert("Society details not found.");
      return;
    }

    const confirmationCode = window.prompt(
      `WARNING: This will permanently delete the society "${name}" along with ALL its residents, admins, guards, bills, complaints, settings, and visitor history.\n\nTo confirm, type the society code "${societyCode}":`
    );

    if (confirmationCode === null) return; // user cancelled

    if (confirmationCode.trim() !== societyCode) {
      alert("Invalid society code entered. Deletion cancelled.");
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('delete_society_cascade', {
        target_society_code: societyCode
      });

      if (error) throw error;

      if (data === true) {
        // Trigger deletion email notification
        try {
          console.log(`Sending deletion notification email to ${soc.admin_email}`);
          const emailResponse = await fetch('/api/approve-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              adminEmail: soc.admin_email,
              adminName: soc.admin_name || 'Society Admin',
              societyName: soc.name,
              status: 'deleted'
            })
          });
          const emailData = await emailResponse.json();
          if (!emailResponse.ok || !emailData.success) {
            throw new Error(emailData.error || 'Failed to send email');
          }
        } catch (emailErr: any) {
          console.error('Failed to trigger deletion email API:', emailErr);
          alert(`Warning: Society deleted, but notification email failed to send: ${emailErr.message || emailErr}`);
        }

        alert(`Society "${name}" and all its users have been permanently deleted.`);
        fetchSocieties();
      } else {
        alert("Could not delete society. Check if the society code is correct.");
      }
    } catch (e: any) {
      console.error(e);
      alert(`Error deleting society: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  const filtered = societies.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.society_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <Link href="/master/dashboard" className="text-[#8a8f91] hover:text-[#f2f2f0] transition-colors">Requests</Link>
            <Link href="/master/societies" className="text-[#dc2626] transition-colors border-b-2 border-[#dc2626] pb-1">Societies</Link>
            <Link href="/master/users" className="text-[#8a8f91] hover:text-[#f2f2f0] transition-colors">Users</Link>
          </nav>
          <button 
            onClick={() => { supabase.auth.signOut(); router.push('/master/login'); }}
            className="text-xs font-semibold px-3 py-1.5 rounded bg-[#111517] hover:bg-[#1c2224] text-[#8a8f91] hover:text-[#f2f2f0] transition-all border border-[#1c2224] flex items-center gap-1.5"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* BODY CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Approved Societies</h2>
            <p className="text-[#8a8f91] text-xs">Manage system-wide housing complex registrations</p>
          </div>
          
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, code, or city..."
            className="max-w-xs w-full bg-[#111517] border border-[#1c2224] rounded-lg p-2.5 text-xs text-[#f2f2f0] focus:outline-none focus:border-[#dc2626]"
          />
        </div>

        {/* SOCIETIES LIST TABLE */}
        <div className="bg-[#111517] border border-[#1c2224] rounded-lg overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <div className="h-10 w-10 rounded-full border-2 border-[#1c2224] border-t-[#dc2626] animate-spin" />
              <span className="text-[#8a8f91] text-xs animate-pulse font-medium">Retrieving approved societies...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-[#8a8f91] text-xs">
              No registered societies found matching your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#1c2224] bg-[#0b0e10]/40 text-[#8a8f91] font-semibold uppercase tracking-wider">
                    <th className="p-4">Society Name</th>
                    <th className="p-4">Location</th>
                    <th className="p-4">Admin Email</th>
                    <th className="p-4 text-center">Society Code</th>
                    <th className="p-4 text-center">Units</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c2224]">
                  {filtered.map((soc) => (
                    <tr key={soc.id} className="hover:bg-[#0b0e10]/30 transition-colors">
                      <td className="p-4 font-bold text-[#f2f2f0]">{soc.name}</td>
                      <td className="p-4 text-[#8a8f91]">{soc.city}, {soc.state}</td>
                      <td className="p-4 text-[#f2f2f0]">{soc.admin_email}</td>
                      <td className="p-4 text-center font-mono text-xs text-[#1D9E75] font-bold">{soc.society_code}</td>
                      <td className="p-4 text-center text-[#f2f2f0]">{soc.total_units}</td>
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
                            className="px-2.5 py-1 rounded bg-[#0b0e10] border border-[#1c2224] hover:border-[#1D9E75]/30 text-[#1D9E75] text-[11px] font-bold flex items-center justify-center transition-all"
                          >
                            View Info
                          </Link>
                          <Link
                            href={`/master/credentials/${soc.id}`}
                            className="px-2.5 py-1 rounded bg-[#0b0e10] border border-[#1c2224] hover:border-zinc-700 text-zinc-350 text-[11px] font-bold flex items-center justify-center transition-all"
                          >
                            Credentials
                          </Link>
                          <button
                            onClick={() => handleResendEmail(soc)}
                            disabled={sendingEmailId === soc.id}
                            className="px-2.5 py-1 rounded bg-[#0b0e10] border border-[#1c2224] hover:border-[#1D9E75]/30 text-[#1D9E75] text-[11px] font-bold transition-all disabled:opacity-50"
                          >
                            {sendingEmailId === soc.id ? 'Sending...' : 'Send Email'}
                          </button>
                          <button
                            onClick={() => handleDeleteSociety(soc.society_code, soc.name)}
                            className="px-2.5 py-1 rounded bg-[#993C1D]/10 border border-[#993C1D]/20 hover:border-[#dc2626] hover:bg-[#dc2626]/10 text-[#dc2626] text-[11px] font-bold transition-all"
                          >
                            Delete
                          </button>
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
