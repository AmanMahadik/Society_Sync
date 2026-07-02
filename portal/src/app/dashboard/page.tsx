'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { Building2, Copy, Users, FileText, CheckCircle, Share2, LogOut, Trash2, Search, Filter } from 'lucide-react';
import dynamic from 'next/dynamic';

const PDFPosterButton = dynamic(
  () => import('./PDFPosterButton'),
  { ssr: false, loading: () => <div className="w-full py-3 text-zinc-500 text-center text-xs">Loading PDF Generator...</div> }
);

interface Profile {
  id: string;
  full_name: string;
  wing: string;
  flat_number: string;
  role: string;
  status: string;
  phone?: string;
  created_at: string;
}

interface Society {
  id: string;
  name: string;
  society_code: string;
  city: string;
  state: string;
  status: string;
}

// PDF Document Generator moved to PDFPosterButton.tsx to prevent SSR/navigation crashes

export default function SocietyAdminDashboard() {
  const router = useRouter();
  const [society, setSociety] = useState<Society | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Roster Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Announcements / Notice Board states
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticePinned, setNoticePinned] = useState(false);
  const [noticeModal, setNoticeModal] = useState(false);

  const fetchDashboardData = async () => {
    console.log('fetchDashboardData: Component mounted, starting to fetch dashboard data...');
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      console.log('fetchDashboardData: supabase.auth.getSession() returned session:', session ? `User ID: ${session.user.id}` : 'null');
      
      if (!session) {
        console.warn('fetchDashboardData: No session found. Redirecting to /login...');
        router.push('/login');
        return;
      }

      let targetSocietyId = '';

      // 1. Try to fetch admin mapping by user_id
      console.log('fetchDashboardData: Fetching society_admins mapping by user_id...');
      const { data: adminMapping } = await supabase
        .from('society_admins')
        .select('society_id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (adminMapping) {
        console.log('fetchDashboardData: Found mapping by user_id. Society ID:', adminMapping.society_id);
        targetSocietyId = adminMapping.society_id;
      } else {
        console.log('fetchDashboardData: No mapping found by user_id. Trying fallback by email...');
        // Fallback A: Try to find mapping by email and auto-link it!
        if (session.user.email) {
          const { data: emailMapping } = await supabase
            .from('society_admins')
            .select('id, society_id')
            .eq('admin_email', session.user.email.trim().toLowerCase())
            .maybeSingle();

          if (emailMapping) {
            console.log('fetchDashboardData: Found mapping by email. Auto-linking user_id to society_admins ID:', emailMapping.id);
            // Auto-link user_id to this mapping row!
            await supabase
              .from('society_admins')
              .update({ user_id: session.user.id })
              .eq('id', emailMapping.id);
            
            targetSocietyId = emailMapping.society_id;
          }
        }

        // Fallback B: check profile society_id
        if (!targetSocietyId) {
          console.log('fetchDashboardData: No mapping found by email. Trying fallback by profiles society_id...');
          const { data: profile } = await supabase
            .from('profiles')
            .select('society_id')
            .eq('id', session.user.id)
            .maybeSingle();
          
          if (!profile || !profile.society_id) {
            console.error('fetchDashboardData: Security Error - No society associated with user account.');
            alert('Security Error: Your user account is not associated with any society.');
            router.push('/login');
            return;
          }
          console.log('fetchDashboardData: Found society_id in user profile:', profile.society_id);
          targetSocietyId = profile.society_id;
        }
      }

      // 2. Fetch society details
      console.log('fetchDashboardData: Fetching society details for ID:', targetSocietyId);
      const { data: soc, error: socError } = await supabase
        .from('societies')
        .select('*')
        .eq('id', targetSocietyId)
        .single();

      if (socError || !soc) {
        console.error('fetchDashboardData: Society fetch error:', socError);
        throw new Error('Society profile mismatch.');
      }
      console.log('fetchDashboardData: Society details successfully fetched:', soc.name);
      setSociety(soc);

      // 3. Fetch community members
      console.log('fetchDashboardData: Fetching community members...');
      const { data: profs, error: profsError } = await supabase
        .from('profiles')
        .select('*')
        .eq('society_id', soc.id)
        .order('created_at', { ascending: false });

      if (profsError) {
        console.error('fetchDashboardData: Profiles fetch error:', profsError);
        throw profsError;
      }
      console.log('fetchDashboardData: Members count fetched:', profs ? profs.length : 0);
      setProfiles(profs || []);

      // 3.5. Fetch Announcements
      const { data: notices, error: noticesErr } = await supabase
        .from('announcements')
        .select('*')
        .eq('society_id', soc.id)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (!noticesErr) {
        setAnnouncements(notices || []);
      }

    } catch (e: any) {
      console.error('fetchDashboardData: Dashboard load failed with exception:', e);
      alert(`Dashboard Load Error: ${e.message || JSON.stringify(e)}`);
      router.push('/login');
    } finally {
      console.log('fetchDashboardData: Finally block, setting loading to false.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // 4. Setup Realtime channel subscription for profiles inserts/updates/deletes (Live stats update!)
    const channel = supabase
      .channel('live-profiles-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSignOut = async () => {
    document.cookie = 'sb-auth-token=; path=/; max-age=0; SameSite=Lax';
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleRemoveMember = async (id: string, name: string) => {
    const currentSociety = society;
    if (!currentSociety) return;
    const confirmRemove = window.confirm(`Are you sure you want to remove ${name} from your society? They will lose access to chats, parking, and SOS queues.`);
    if (!confirmRemove) return;

    try {
      // Verify the member belongs to this society first
      const { data: member, error: fetchErr } = await supabase
        .from('profiles')
        .select('society_id')
        .eq('id', id)
        .single();

      if (fetchErr || !member || member.society_id !== currentSociety.id) {
        alert('Unauthorized: Member does not belong to your society.');
        return;
      }

      // Reset society links and set role/status back to default
      const { error } = await supabase
        .from('profiles')
        .update({
          society_id: null,
          status: 'pending',
          role: 'owner'
        })
        .eq('id', id)
        .eq('society_id', currentSociety.id);

      if (error) throw error;

      // Log action to audit logs
      const { data: { user } } = await supabase.auth.getUser();
      if (user && currentSociety) {
        await supabase.from('portal_audit_log').insert({
          action_type: 'member_removal',
          performed_by: user.id,
          society_id: currentSociety.id,
          old_value: name,
          new_value: 'Removed from Society'
        });
      }

      alert('Resident successfully removed.');
      fetchDashboardData();
    } catch (e) {
      console.error(e);
      alert('Error removing resident profile.');
    }
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!society || !noticeTitle.trim() || !noticeContent.trim()) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('announcements')
        .insert({
          society_id: society.id,
          created_by: session.user.id,
          title: noticeTitle.trim(),
          body: noticeContent.trim(),
          is_pinned: noticePinned
        });

      if (error) throw error;

      alert('Notice published successfully!');
      setNoticeTitle('');
      setNoticeContent('');
      setNoticePinned(false);
      setNoticeModal(false);
      fetchDashboardData();
    } catch (e: any) {
      alert(`Error publishing notice: ${e.message}`);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this notice?');
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Notice deleted.');
      fetchDashboardData();
    } catch (e: any) {
      alert(`Error deleting notice: ${e.message}`);
    }
  };

  const handleTogglePinNotice = async (id: string, currentPin: boolean) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_pinned: !currentPin })
        .eq('id', id);

      if (error) throw error;
      fetchDashboardData();
    } catch (e: any) {
      alert(`Error toggling pin: ${e.message}`);
    }
  };

  const copyToClipboard = () => {
    if (!society) return;
    navigator.clipboard.writeText(society.society_code);
    alert('Society Code copied to clipboard!');
  };

  const shareWhatsApp = () => {
    if (!society) return;
    const msg = `Join our society on SocietySync! Use code: ${society.society_code}\nDownload app: https://github.com/AmanMahadik/Society_Sync`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Filter roster list
  const filteredRoster = profiles.filter((prof) => {
    const matchesSearch = 
      prof.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${prof.wing}-${prof.flat_number}`.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || prof.role.toLowerCase() === roleFilter.toLowerCase();
    
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex items-center justify-center p-6">
        <p className="text-zinc-500 text-sm">Opening Society Dashboard...</p>
      </div>
    );
  }

  if (!society) return null;

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col selection:bg-[#00d4aa] selection:text-[#09090b]">
      
      {/* NAVBAR */}
      <header className="border-b border-zinc-800 bg-zinc-950 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="SocietySync Logo" className="h-8 w-8 rounded-lg object-contain" />
          <span className="font-extrabold text-lg tracking-tight">SocietySync <span className="text-[#00d4aa] text-xs font-bold uppercase tracking-wider ml-1">Admin</span></span>
        </div>
        <button 
          onClick={handleSignOut} 
          className="text-xs font-medium px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-all border border-zinc-800 flex items-center gap-1.5"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </header>

      {/* PENDING REVIEW BANNER */}
      {society.status !== 'active' && (
        <div className="bg-[#1c1605] border-b border-amber-500/20 text-amber-200 px-6 py-3.5 text-xs md:text-sm font-semibold flex items-center justify-center gap-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span>
            Your society registration is currently <strong className="text-amber-300">pending verification</strong> by the Master Admin. 
            Once verified, the society status will change to Active and residents can immediately begin onboarding using your code.
          </span>
        </div>
      )}

      {/* DASHBOARD LAYOUT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: STATS, SHARING & poster (1/3 width) */}
        <div className="space-y-6">
          
          {/* SOCIETY PROFILE SUMMARY */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#00d4aa]" /> Community Profile
            </h3>
            <div>
              <h2 className="text-xl font-bold text-white leading-tight">{society.name}</h2>
              <p className="text-zinc-400 text-xs mt-1">{society.city}, {society.state}</p>
            </div>
            
            <div className="flex items-center gap-6 bg-zinc-950 p-4 rounded-lg border border-zinc-800 justify-between">
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase block">Registered Users</span>
                <span className="text-2xl font-extrabold text-white mt-1 block">{profiles.length}</span>
              </div>
              <div className="h-10 w-10 bg-[#00d4aa]/10 rounded-full flex items-center justify-center border border-[#00d4aa]/20">
                <Users className="h-5 w-5 text-[#00d4aa]" />
              </div>
            </div>
          </div>

          {/* CODE SHARE PANEL */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-6">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Share2 className="h-4 w-4 text-[#00d4aa]" /> Society Code Sharing
            </h3>

            <div className="text-center bg-zinc-950 p-6 rounded-xl border border-zinc-800 relative space-y-4">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Scan or Enter Code</span>
              <p className="text-3xl font-extrabold text-[#00d4aa] tracking-widest font-mono select-all">
                {society.society_code}
              </p>
              
              {/* Client side QR renderer */}
              <div className="flex justify-center p-2 bg-white rounded-lg w-32 h-32 mx-auto">
                <QRCodeSVG value={society.society_code} size={112} level="H" />
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button 
                  onClick={copyToClipboard}
                  className="p-2 bg-zinc-900 hover:bg-zinc-850 rounded border border-zinc-800 text-zinc-300 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5"
                  title="Copy to Clipboard"
                >
                  <Copy className="h-4 w-4" /> Copy
                </button>
                <button 
                  onClick={shareWhatsApp}
                  className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 rounded border border-emerald-500/20 text-[#00d4aa] hover:text-[#00b390] transition-all text-xs font-bold flex items-center gap-1.5"
                >
                  <Share2 className="h-4 w-4" /> WhatsApp
                </button>
              </div>
            </div>

            {/* DOWNLOAD PDF poster */}
            <div className="pt-2 border-t border-zinc-850">
              <PDFPosterButton societyName={society.name} societyCode={society.society_code} />
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: MEMBER ROSTER MANAGEMENT (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
            
            {/* TABLE HEADER FILTER BAR */}
            <div className="p-4 bg-zinc-950/80 border-b border-zinc-800 flex flex-col sm:flex-row justify-between items-center gap-4">
              <h3 className="font-extrabold text-sm text-zinc-300 flex items-center gap-2">
                <Users className="h-5 w-5 text-[#00d4aa]" /> Community Roster ({filteredRoster.length})
              </h3>
              
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="h-4 w-4 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name or flat..."
                    className="bg-zinc-900 border border-zinc-850 rounded pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-655 focus:outline-none focus:border-[#00d4aa] w-full"
                  />
                </div>

                <div className="relative">
                  <Filter className="h-4 w-4 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="bg-zinc-900 border border-zinc-850 rounded pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none appearance-none"
                  >
                    <option value="all">All Roles</option>
                    <option value="owner">Owner</option>
                    <option value="tenant">Tenant</option>
                    <option value="guard">Guard</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
            </div>

            {/* MEMBER TABLE */}
            {filteredRoster.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 text-sm">
                No residents found matching search criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-zinc-850 bg-zinc-950/40 text-zinc-400 font-semibold text-xs uppercase tracking-wider">
                      <th className="p-4">Resident Name</th>
                      <th className="p-4">Wing / Flat</th>
                      <th className="p-4">Community Role</th>
                      <th className="p-4 text-center">Joined On</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850">
                    {filteredRoster.map((prof) => (
                      <tr key={prof.id} className="hover:bg-zinc-955/20 transition-colors">
                        <td className="p-4 font-bold text-white">
                          {prof.full_name}
                          {prof.phone && (
                            <span className="block text-zinc-500 font-mono text-[10px] mt-0.5">{prof.phone}</span>
                          )}
                        </td>
                        <td className="p-4 text-zinc-300 font-medium">
                          {prof.wing} — Flat {prof.flat_number}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            prof.role === 'admin' ? 'bg-[#00d4aa]/10 text-[#00d4aa] border border-[#00d4aa]/20' :
                            (prof.role === 'guard' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-zinc-800 text-zinc-300')
                          }`}>
                            {prof.role}
                          </span>
                        </td>
                        <td className="p-4 text-center text-zinc-500 text-xs">
                          {new Date(prof.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-center">
                          {prof.role !== 'admin' ? (
                            <button
                              onClick={() => handleRemoveMember(prof.id, prof.full_name)}
                              className="p-1 rounded bg-zinc-950 border border-zinc-850 hover:border-red-500/30 text-zinc-500 hover:text-red-500 transition-all"
                              title="Remove Resident"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : (
                            <span className="text-zinc-650 text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* NOTICE BOARD MANAGER CARD */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 bg-zinc-950/80 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="font-extrabold text-sm text-zinc-300 flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#00d4aa]" /> Digital Notice Board ({announcements.length})
              </h3>
              <button 
                onClick={() => setNoticeModal(true)}
                className="text-xs font-bold px-3 py-1.5 rounded bg-[#00d4aa] text-[#09090b] hover:bg-[#00b390] transition-all"
              >
                Add Notice
              </button>
            </div>

            {announcements.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 text-sm">
                No active announcements posted yet. Click "Add Notice" to broadcast.
              </div>
            ) : (
              <div className="divide-y divide-zinc-850">
                {announcements.map((notice) => (
                  <div key={notice.id} className="p-4 hover:bg-zinc-955/10 transition-all flex justify-between items-start gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        {notice.is_pinned && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            Pinned
                          </span>
                        )}
                        <h4 className="font-bold text-white text-sm">{notice.title}</h4>
                      </div>
                      <p className="text-zinc-400 text-xs leading-relaxed">{notice.body}</p>
                      <span className="text-[10px] text-zinc-500 block">
                        Published on {new Date(notice.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleTogglePinNotice(notice.id, notice.is_pinned)}
                        className={`p-1.5 rounded border text-xs font-medium transition-all ${
                          notice.is_pinned 
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20' 
                            : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-zinc-300'
                        }`}
                        title={notice.is_pinned ? "Unpin from App" : "Pin to App Top"}
                      >
                        Pin
                      </button>
                      <button 
                        onClick={() => handleDeleteNotice(notice.id)}
                        className="p-1.5 rounded bg-zinc-950 border border-zinc-850 hover:border-red-500/30 text-zinc-500 hover:text-red-500 transition-all"
                        title="Delete Notice"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </main>

      {/* NOTICE PUBLISH MODAL overlay */}
      {noticeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 max-w-md w-full rounded-xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white">Publish New Notice</h3>
              <p className="text-zinc-400 text-xs">This notice will appear instantly in the residents' mobile app notice board feed.</p>
            </div>

            <form onSubmit={handleCreateNotice} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Notice Title</label>
                <input 
                  type="text" 
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  placeholder="e.g. Phase 2 Water Outage"
                  required
                  className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00d4aa] w-full"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Notice Content / Details</label>
                <textarea 
                  value={noticeContent}
                  onChange={(e) => setNoticeContent(e.target.value)}
                  placeholder="Provide all relevant details here..."
                  rows={4}
                  required
                  className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00d4aa] w-full resize-none"
                />
              </div>

              <div className="flex items-center justify-between py-2 border-y border-zinc-850">
                <div>
                  <span className="text-xs font-bold text-white block">Pin Notice?</span>
                  <span className="text-[10px] text-zinc-500 block">Pinned notices appear highlighted at the very top.</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={noticePinned}
                  onChange={(e) => setNoticePinned(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#00d4aa] cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setNoticeModal(false)}
                  className="text-xs font-bold px-4 py-2 rounded bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 transition-all text-zinc-300"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="text-xs font-bold px-4 py-2 rounded bg-[#00d4aa] text-[#09090b] hover:bg-[#00b390] transition-all"
                >
                  Publish Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
