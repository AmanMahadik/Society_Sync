'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';
import { Building2, Copy, Users, FileText, CheckCircle, Share2, LogOut, Trash2, Search, Filter } from 'lucide-react';

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

// PDF Document Stylesheet
const pdfStyles = StyleSheet.create({
  page: {
    padding: 50,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    fontFamily: 'Helvetica',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subHeader: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 40,
  },
  card: {
    borderWidth: 2,
    borderColor: '#00a383',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    width: '100%',
    marginBottom: 30,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  code: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#00a383',
    letterSpacing: 3,
  },
  box: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    width: '100%',
  },
  boxTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 10,
  },
  step: {
    fontSize: 11,
    color: '#334155',
    marginBottom: 6,
    lineHeight: 1.4,
  },
  footer: {
    marginTop: 'auto',
    fontSize: 9,
    color: '#94a3b8',
    textAlign: 'center',
  }
});

// A4 Poster Document Generator
const PosterDocument = ({ societyName, societyCode }: { societyName: string; societyCode: string }) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.header}>{societyName}</Text>
      <Text style={pdfStyles.subHeader}>Welcome to the Digital Housing Community</Text>
      
      <View style={pdfStyles.card}>
        <Text style={pdfStyles.codeLabel}>Our Official Society Code</Text>
        <Text style={pdfStyles.code}>{societyCode}</Text>
      </View>

      <View style={pdfStyles.box}>
        <Text style={pdfStyles.boxTitle}>Quick Onboarding Instructions:</Text>
        <Text style={pdfStyles.step}>1. Download the SocietySync mobile app from the Play Store or App Store.</Text>
        <Text style={pdfStyles.step}>2. Open the app, tap Sign Up, and enter the unique Society Code above.</Text>
        <Text style={pdfStyles.step}>3. Enter your flat coordinates and complete your profile authentication.</Text>
      </View>

      <Text style={pdfStyles.footer}>Powered by SocietySync © {new Date().getFullYear()}</Text>
    </Page>
  </Document>
);

export default function SocietyAdminDashboard() {
  const router = useRouter();
  const [society, setSociety] = useState<Society | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Roster Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      let targetSocietyId = '';

      const { data: adminMapping } = await supabase
        .from('society_admins')
        .select('society_id')
        .eq('user_id', session.user.id)
        .single();

      if (adminMapping) {
        targetSocietyId = adminMapping.society_id;
      } else {
        // Fallback: check profile society_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('society_id')
          .eq('id', session.user.id)
          .single();
        
        if (!profile || !profile.society_id) {
          router.push('/login');
          return;
        }
        targetSocietyId = profile.society_id;
      }

      // 2. Fetch society details
      const { data: soc, error: socError } = await supabase
        .from('societies')
        .select('*')
        .eq('id', targetSocietyId)
        .single();

      if (socError || !soc) throw new Error('Society profile mismatch.');
      setSociety(soc);

      // 3. Fetch community members
      const { data: profs, error: profsError } = await supabase
        .from('profiles')
        .select('*')
        .eq('society_id', soc.id)
        .order('created_at', { ascending: false });

      if (profsError) throw profsError;
      setProfiles(profs || []);

    } catch (e) {
      console.error(e);
      router.push('/login');
    } finally {
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
          society_code: null,
          society_name: null,
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
              <PDFDownloadLink
                document={<PosterDocument societyName={society.name} societyCode={society.society_code} />}
                fileName={`${society.name.replace(/\s+/g, '_')}_SocietyCode_Poster.pdf`}
                className="w-full py-3 bg-[#00d4aa]/15 border border-[#00d4aa]/30 hover:border-[#00d4aa] text-[#00d4aa] hover:bg-[#00d4aa]/25 text-center font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-2"
              >
                {({ loading: pdfLoading }) => (pdfLoading ? 'Preparing PDF...' : 'DOWNLOAD PRINTABLE A4 POSTER')}
              </PDFDownloadLink>
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
        </div>

      </main>
    </div>
  );
}
