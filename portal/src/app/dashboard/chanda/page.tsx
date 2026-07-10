'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { 
  Building2, ArrowLeft, Coins, Calendar, Plus, Edit2, 
  Trash2, Download, Check, X, RefreshCw, BarChart2, Eye, 
  ExternalLink, UserCheck, AlertTriangle, LogOut, Settings, 
  FileSpreadsheet, FileText, IndianRupee, Heart
} from 'lucide-react';
import { formatINR } from '../../../lib/utils';

interface Campaign {
  id: string;
  society_id: string;
  title: string;
  description: string | null;
  target_amount: number | null;
  suggested_amount: number | null;
  min_amount: number;
  start_date: string;
  end_date: string | null;
  status: 'draft' | 'active' | 'closed' | 'cancelled';
  amount_type: 'fixed' | 'flexible';
  wing_targets: Record<string, number> | null;
  banner_url: string | null;
}

interface Wing {
  id: string;
  name: string;
  collector_user_id: string | null;
  collector_upi_id: string | null;
  collector_name: string | null;
  collector_phone: string | null;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

export default function ChandaDashboard() {
  const router = useRouter();
  const [societyId, setSocietyId] = useState<string>('');
  const [societyName, setSocietyName] = useState<string>('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [wings, setWings] = useState<Wing[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Campaign Details
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Form states
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    title: '',
    description: '',
    targetAmount: '',
    suggestedAmount: '',
    minAmount: '1',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    amountType: 'flexible' as 'fixed' | 'flexible',
  });

  // Wing collector edit state
  const [collectorEditModal, setCollectorEditModal] = useState(false);
  const [selectedWing, setSelectedWing] = useState<Wing | null>(null);
  const [collectorForm, setCollectorForm] = useState({
    collectorUserId: '',
    collectorUpiId: '',
    collectorName: '',
    collectorPhone: '',
  });

  // Rejection state
  const [rejectModal, setRejectModal] = useState(false);
  const [selectedContributionId, setSelectedContributionId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch initial profile & configs
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // 1. Get society mapping
      const { data: adminMapping } = await supabase
        .from('society_admins')
        .select('society_id, societies(name)')
        .eq('user_id', session.user.id)
        .maybeSingle();

      let targetSocietyId = adminMapping?.society_id;
      let targetSocietyName = (adminMapping?.societies as any)?.name || 'Society';

      if (!targetSocietyId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('society_id, societies(name)')
          .eq('id', session.user.id)
          .single();

        if (profile?.society_id) {
          targetSocietyId = profile.society_id;
          targetSocietyName = (profile.societies as any)?.name || 'Society';
        }
      }

      if (!targetSocietyId) {
        alert('Account not associated with any society.');
        router.push('/login');
        return;
      }

      setSocietyId(targetSocietyId);
      setSocietyName(targetSocietyName);

      // 2. Fetch Wings
      const { data: wingsList } = await supabase
        .from('wings')
        .select('*')
        .eq('society_id', targetSocietyId)
        .order('name');
      setWings(wingsList || []);

      // 3. Fetch Profiles for dropdown
      const { data: profilesList } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('society_id', targetSocietyId)
        .order('full_name');
      setProfiles(profilesList || []);

      // 4. Fetch campaigns
      await fetchCampaignsList(targetSocietyId);
    } catch (e: any) {
      console.error(e);
      alert(`Load failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaignsList = async (socId: string) => {
    const res = await fetch(`/api/chanda/campaigns?societyId=${socId}&isAdmin=true`);
    const data = await res.json();
    if (data.campaigns) {
      setCampaigns(data.campaigns);
    }
  };

  const fetchCampaignSummary = async (campaignId: string) => {
    try {
      setSummaryLoading(true);
      const res = await fetch(`/api/chanda/campaigns/${campaignId}/summary`);
      const data = await res.json();
      if (res.ok) {
        setSummaryData(data);
      } else {
        alert(data.error || 'Failed to fetch summary');
      }

      // Fetch pending offline queue
      const offRes = await fetch(`/api/chanda/offline-contributions?campaignId=${campaignId}&status=pending_verification`);
      const offData = await offRes.json();
      if (offRes.ok) {
        setOfflineQueue(offData.contributions || []);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedCampaignId) {
      fetchCampaignSummary(selectedCampaignId);
    } else {
      setSummaryData(null);
      setOfflineQueue([]);
    }
  }, [selectedCampaignId]);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/chanda/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          societyId,
          title: newCampaign.title,
          description: newCampaign.description,
          targetAmount: newCampaign.targetAmount ? Number(newCampaign.targetAmount) : null,
          suggestedAmount: newCampaign.suggestedAmount ? Number(newCampaign.suggestedAmount) : null,
          minAmount: Number(newCampaign.minAmount),
          startDate: newCampaign.startDate,
          endDate: newCampaign.endDate || null,
          amountType: newCampaign.amountType,
          createdBy: session.user.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('Campaign created as draft!');
        setCreateModal(false);
        setNewCampaign({
          title: '',
          description: '',
          targetAmount: '',
          suggestedAmount: '',
          minAmount: '1',
          startDate: new Date().toISOString().split('T')[0],
          endDate: '',
          amountType: 'flexible',
        });
        fetchCampaignsList(societyId);
      } else {
        alert(data.error || 'Error creating campaign');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleUpdateStatus = async (campaignId: string, newStatus: string) => {
    const confirmMsg = `Are you sure you want to change this campaign to ${newStatus}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/chanda/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          changedBy: session.user.id,
        }),
      });

      if (res.ok) {
        alert(`Campaign status updated to ${newStatus}!`);
        fetchCampaignsList(societyId);
        if (selectedCampaignId === campaignId) {
          fetchCampaignSummary(campaignId);
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update status');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this draft campaign?')) return;
    try {
      const res = await fetch(`/api/chanda/campaigns/${campaignId}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Campaign deleted successfully.');
        setSelectedCampaignId(null);
        fetchCampaignsList(societyId);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete campaign');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Offline Verification
  const handleVerifyOffline = async (id: string) => {
    if (!window.confirm('Verify this offline payment entry?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/chanda/offline-contributions/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'verified',
          verifiedBy: session?.user.id,
        }),
      });

      if (res.ok) {
        alert('Entry verified and receipt dispatched!');
        if (selectedCampaignId) fetchCampaignSummary(selectedCampaignId);
      } else {
        const err = await res.json();
        alert(err.error || 'Verification failed');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRejectOffline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContributionId || !rejectionReason.trim()) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/chanda/offline-contributions/${selectedContributionId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'rejected',
          verifiedBy: session?.user.id,
          rejectionReason: rejectionReason.trim(),
        }),
      });

      if (res.ok) {
        alert('Entry rejected and resident notified.');
        setRejectModal(false);
        setRejectionReason('');
        setSelectedContributionId(null);
        if (selectedCampaignId) fetchCampaignSummary(selectedCampaignId);
      } else {
        const err = await res.json();
        alert(err.error || 'Rejection failed');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Refund Trigger
  const handleIssueRefund = async (paymentId: string, amount?: number) => {
    const confirmMsg = amount 
      ? `Confirm refunding ₹${amount} for this online payment?`
      : 'Confirm issuing a full refund for this online payment?';
    
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/chanda/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount || undefined,
          reason: 'Admin requested refund via dashboard',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('Refund successfully initiated! Refreshing summary...');
        if (selectedCampaignId) fetchCampaignSummary(selectedCampaignId);
      } else {
        alert(data.error || 'Refund failed');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Collector configuration edit
  const handleOpenCollectorConfig = (wing: Wing) => {
    setSelectedWing(wing);
    setCollectorForm({
      collectorUserId: wing.collector_user_id || '',
      collectorUpiId: wing.collector_upi_id || '',
      collectorName: wing.collector_name || '',
      collectorPhone: wing.collector_phone || '',
    });
    setCollectorEditModal(true);
  };

  const handleUpdateWingCollector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWing) return;

    try {
      const { error } = await supabase
        .from('wings')
        .update({
          collector_user_id: collectorForm.collectorUserId || null,
          collector_upi_id: collectorForm.collectorUpiId.trim() || null,
          collector_name: collectorForm.collectorName.trim() || null,
          collector_phone: collectorForm.collectorPhone.trim() || null,
        })
        .eq('id', selectedWing.id);

      if (error) throw error;

      alert('Wing collector configuration updated!');
      setCollectorEditModal(false);
      
      // Refresh wings & summary
      const { data: wingsList } = await supabase
        .from('wings')
        .select('*')
        .eq('society_id', societyId)
        .order('name');
      setWings(wingsList || []);

      if (selectedCampaignId) fetchCampaignSummary(selectedCampaignId);
    } catch (e: any) {
      alert(e.message);
    }
  };

  // CSV Export
  const exportToCSV = () => {
    if (!summaryData?.recentPayments) return;

    const headers = ['Type', 'Resident Name', 'Flat/Wing', 'Amount (INR)', 'Receipt Number', 'Date'];
    const rows = summaryData.recentPayments.map((p: any) => [
      p.type.toUpperCase(),
      p.residentName,
      p.flat,
      p.amount,
      p.receiptNumber || 'N/A',
      new Date(p.time).toLocaleDateString(),
    ]);

    const csvContent = [headers, ...rows]
      .map((e) => e.map((val: any) => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `chanda_contributions_${selectedCampaignId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex items-center justify-center p-6">
        <p className="text-zinc-500 text-sm flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-[#00d4aa]" /> Loading Chanda Collection Dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col selection:bg-[#00d4aa] selection:text-[#09090b]">
      {/* NAVBAR */}
      <header className="border-b border-zinc-800 bg-zinc-950 px-6 py-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.push('/dashboard')}
            className="p-1.5 rounded bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all"
            title="Back to Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="SocietySync Logo" className="h-8 w-8 rounded-lg object-contain" />
            <span className="font-extrabold text-lg tracking-tight">
              SocietySync <span className="text-[#00d4aa] text-xs font-bold uppercase tracking-wider ml-1">Admin</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-4 ml-6">
            <a href="/dashboard" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">Roster & Notices</a>
            <a href="/dashboard/chanda" className="text-sm font-semibold text-[#00d4aa] transition-colors border-b-2 border-[#00d4aa] pb-1">Chanda Campaigns</a>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6 overflow-hidden">
        {/* ROW 1: HEADER & SELECTOR */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Collection Campaign Registry</span>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">{societyName} — Chanda Ledger</h1>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={selectedCampaignId || ''}
              onChange={(e) => setSelectedCampaignId(e.target.value || null)}
              className="bg-zinc-950 border border-zinc-800 rounded px-4 py-2 text-sm text-white focus:outline-none focus:border-[#00d4aa] flex-1 md:flex-initial"
            >
              <option value="">Select a Campaign...</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.status.toUpperCase()})
                </option>
              ))}
            </select>
            <button
              onClick={() => setCreateModal(true)}
              className="px-4 py-2 text-xs font-bold bg-[#00d4aa] text-[#09090b] hover:bg-[#00b390] rounded flex items-center gap-1.5 transition-all shadow-lg shadow-[#00d4aa]/10"
            >
              <Plus className="h-4 w-4" /> Create Campaign
            </button>
          </div>
        </div>

        {/* MIGRATION / INSTRUCTION ALERT */}
        {campaigns.length === 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center space-y-4 max-w-xl mx-auto mt-12">
            <Coins className="h-12 w-12 text-[#00d4aa] mx-auto opacity-70 animate-bounce" />
            <h3 className="text-lg font-bold text-white">No campaigns created yet</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Define a new campaign (like "Ganesh Utsav 2026") to start collecting community contributions. 
              Be sure to run the <code className="text-[#00d4aa] bg-zinc-950 px-1.5 py-0.5 rounded text-xs select-all">migration_chanda.sql</code> script in your Supabase SQL editor to initialize tables first.
            </p>
            <button
              onClick={() => setCreateModal(true)}
              className="px-5 py-2.5 text-xs font-bold bg-[#00d4aa] text-[#09090b] hover:bg-[#00b390] rounded transition-all"
            >
              Create First Campaign
            </button>
          </div>
        )}

        {/* CAMPAIGN SELECTED VIEW */}
        {selectedCampaignId && summaryData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto">
            {/* COL 1: DETAILS & STATS */}
            <div className="space-y-6">
              {/* CAMPAIGN CARD DETAILS */}
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-white leading-tight">{summaryData.campaign.title}</h2>
                    <p className="text-zinc-400 text-xs mt-1">{summaryData.campaign.description || 'No description provided.'}</p>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                    summaryData.campaign.status === 'active' ? 'bg-[#00d4aa]/10 text-[#00d4aa] border-[#00d4aa]/20' :
                    summaryData.campaign.status === 'draft' ? 'bg-zinc-850 text-zinc-400 border-zinc-700' : 'bg-red-500/10 text-red-500 border-red-500/20'
                  }`}>
                    {summaryData.campaign.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 py-2 border-y border-zinc-800 text-xs">
                  <div>
                    <span className="text-zinc-500 block">Min Contribution</span>
                    <span className="font-bold text-white mt-0.5 block">{formatINR(summaryData.campaign.min_amount)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Suggested Amount</span>
                    <span className="font-bold text-white mt-0.5 block">{summaryData.campaign.suggested_amount ? formatINR(summaryData.campaign.suggested_amount) : 'Flexible'}</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Centralized Progress</span>
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-[#00d4aa]">{formatINR(summaryData.totalCollected)}</span>
                    <span className="text-zinc-400">of {summaryData.campaign.target_amount ? formatINR(summaryData.campaign.target_amount) : '₹Unlimited'}</span>
                  </div>
                  {summaryData.campaign.target_amount && (
                    <div className="w-full bg-zinc-950 rounded-full h-2.5 border border-zinc-850 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-[#00d4aa] to-emerald-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, Math.round((summaryData.totalCollected / summaryData.campaign.target_amount) * 100))}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* ACTION BUTTONS FOR CAMPAIGN STATUS */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {summaryData.campaign.status === 'draft' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedCampaignId, 'active')}
                      className="px-3 py-2 bg-[#00d4aa] text-[#09090b] hover:bg-[#00b390] text-xs font-bold rounded flex-1 transition-all"
                    >
                      Activate Campaign
                    </button>
                  )}
                  {summaryData.campaign.status === 'active' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(selectedCampaignId, 'closed')}
                        className="px-3 py-2 bg-zinc-950 border border-zinc-850 hover:border-red-500/30 text-zinc-300 hover:text-red-400 text-xs font-bold rounded flex-1 transition-all"
                      >
                        Close Campaign
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(selectedCampaignId, 'cancelled')}
                        className="px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-bold rounded flex-1 transition-all"
                      >
                        Cancel Campaign
                      </button>
                    </>
                  )}
                  {summaryData.campaign.status === 'draft' && (
                    <button
                      onClick={() => handleDeleteCampaign(selectedCampaignId)}
                      className="p-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded text-red-500"
                      title="Delete Campaign"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* WING COLLECTORS MANAGEMENT LIST */}
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#00d4aa]" /> Wing Collectors Setup
                </h3>
                <p className="text-zinc-500 text-xs">Configure coordinators to collect chanda offline via their personal UPI IDs.</p>

                <div className="divide-y divide-zinc-850">
                  {wings.map((w) => (
                    <div key={w.id} className="py-3 flex justify-between items-center gap-4">
                      <div>
                        <span className="font-bold text-white text-sm block">{w.name}</span>
                        {w.collector_name ? (
                          <span className="text-zinc-400 text-xs mt-0.5 block">
                            {w.collector_name} ({w.collector_upi_id || 'No UPI'})
                          </span>
                        ) : (
                          <span className="text-zinc-600 text-xs mt-0.5 block italic">No coordinator assigned</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleOpenCollectorConfig(w)}
                        className="p-1.5 rounded bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all"
                        title="Configure Wing Collector"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* COL 2 & 3: WING CHART, VERIFICATION QUEUE, TRANSACTION LIST */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* STACKED WING WISE STATUS */}
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-[#00d4aa]" /> Wing-Wise Collection Overview
                </h3>

                <div className="space-y-4">
                  {summaryData.byWing.map((wingAgg: any) => {
                    const maxAmount = Math.max(1, wingAgg.target || wingAgg.totalCollected);
                    const onlinePercent = (wingAgg.onlineCollected / maxAmount) * 100;
                    const offlinePercent = (wingAgg.offlineCollected / maxAmount) * 100;

                    return (
                      <div key={wingAgg.wingId} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-white font-bold">{wingAgg.wingName}</span>
                          <span className="text-zinc-400">
                            {formatINR(wingAgg.totalCollected)} / {wingAgg.target ? formatINR(wingAgg.target) : 'Flexible'}
                          </span>
                        </div>
                        <div className="w-full bg-zinc-950 rounded-full h-3 border border-zinc-850 overflow-hidden flex">
                          <div 
                            className="bg-[#00d4aa] h-full" 
                            style={{ width: `${onlinePercent}%` }}
                            title={`Online: ${formatINR(wingAgg.onlineCollected)}`}
                          />
                          <div 
                            className="bg-emerald-600 h-full" 
                            style={{ width: `${offlinePercent}%` }}
                            title={`Offline: ${formatINR(wingAgg.offlineCollected)}`}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-zinc-500">
                          <span>Contributors: {wingAgg.contributorCount}</span>
                          <span>Online vs Offline Split</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* OFFLINE PENDING VERIFICATION QUEUE */}
              {offlineQueue.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
                  <div className="p-4 bg-zinc-950/80 border-b border-zinc-800 flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-zinc-300 flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-amber-500" /> Awaiting Verification Queue ({offlineQueue.length})
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs md:text-sm">
                      <thead>
                        <tr className="border-b border-zinc-850 bg-zinc-950/40 text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                          <th className="p-4">Payer / Resident</th>
                          <th className="p-4">Wing / Flat</th>
                          <th className="p-4">Amount</th>
                          <th className="p-4">Reference / Proof</th>
                          <th className="p-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-850">
                        {offlineQueue.map((item) => (
                          <tr key={item.id} className="hover:bg-zinc-955/20 transition-colors">
                            <td className="p-4">
                              <span className="font-bold text-white block">
                                {item.profiles?.full_name || item.payer_name}
                              </span>
                              <span className="text-[10px] text-zinc-500">Logged on {new Date(item.collected_at).toLocaleDateString()}</span>
                            </td>
                            <td className="p-4 text-zinc-300 font-medium">
                              {item.wings?.name} — {item.profiles?.flat_number || 'N/A'}
                            </td>
                            <td className="p-4 font-bold text-emerald-400">
                              {formatINR(item.amount)}
                            </td>
                            <td className="p-4">
                              <span className="text-zinc-400 block font-mono">{item.upi_reference_id || 'No Ref'}</span>
                              {item.proof_url && (
                                <a 
                                  href={item.proof_url} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="text-[#00d4aa] text-[10px] font-bold flex items-center gap-1 mt-1 hover:underline"
                                >
                                  View Proof <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleVerifyOffline(item.id)}
                                  className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[#00d4aa] hover:bg-emerald-500/20"
                                  title="Approve / Verify"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedContributionId(item.id);
                                    setRejectModal(true);
                                  }}
                                  className="p-1.5 rounded bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20"
                                  title="Reject"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TRANSACTIONS & CONTRIBUTIONS LIST */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
                <div className="p-4 bg-zinc-950/80 border-b border-zinc-800 flex justify-between items-center">
                  <h3 className="font-extrabold text-sm text-zinc-300 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#00d4aa]" /> Contribution Registry ({summaryData.recentPayments.length})
                  </h3>
                  <button
                    onClick={exportToCSV}
                    className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white rounded text-xs font-bold flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" /> Export CSV
                  </button>
                </div>

                {summaryData.recentPayments.length === 0 ? (
                  <div className="p-12 text-center text-zinc-500 text-sm">
                    No verified payments or collections logged yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs md:text-sm">
                      <thead>
                        <tr className="border-b border-zinc-850 bg-zinc-950/40 text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                          <th className="p-4">Resident</th>
                          <th className="p-4">Flat/Wing</th>
                          <th className="p-4">Amount</th>
                          <th className="p-4">Channel</th>
                          <th className="p-4">Receipt</th>
                          <th className="p-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-850">
                        {summaryData.recentPayments.map((item: any) => (
                          <tr key={item.id} className="hover:bg-zinc-955/20 transition-colors">
                            <td className="p-4">
                              <span className="font-bold text-white block">{item.residentName}</span>
                              <span className="text-[10px] text-zinc-500">{new Date(item.time).toLocaleDateString()}</span>
                            </td>
                            <td className="p-4 text-zinc-300 font-medium">
                              {item.flat}
                            </td>
                            <td className="p-4 font-bold text-white">
                              {formatINR(item.amount)}
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                item.type === 'online' ? 'bg-[#00d4aa]/10 text-[#00d4aa]' : 'bg-zinc-800 text-zinc-300'
                              }`}>
                                {item.type}
                              </span>
                            </td>
                            <td className="p-4">
                              {item.receiptNumber ? (
                                <a
                                  href={`/api/chanda/receipt/${item.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#00d4aa] font-bold hover:underline text-[11px] inline-flex items-center gap-0.5"
                                >
                                  Download <Download className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="text-zinc-600 italic">Generating...</span>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              {item.type === 'online' ? (
                                <button
                                  onClick={() => handleIssueRefund(item.id, item.amount)}
                                  className="text-xs font-semibold px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
                                >
                                  Refund
                                </button>
                              ) : (
                                <span className="text-zinc-650 text-xs">Manual Entry</span>
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
          </div>
        )}
      </main>

      {/* CREATE MODAL */}
      {createModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 max-w-md w-full rounded-xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white">Create Chanda Campaign</h3>
              <p className="text-zinc-400 text-xs">Define a campaign to collect community contributions.</p>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-400 uppercase block">Campaign Title</label>
                <input 
                  type="text" 
                  value={newCampaign.title}
                  onChange={(e) => setNewCampaign({ ...newCampaign, title: e.target.value })}
                  placeholder="e.g. Ganesh Utsav 2026"
                  required
                  className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00d4aa] w-full"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-400 uppercase block">Description</label>
                <textarea 
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                  placeholder="Provide festival details, events summary..."
                  rows={2}
                  className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00d4aa] w-full resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase block">Target Amount (INR)</label>
                  <input 
                    type="number" 
                    value={newCampaign.targetAmount}
                    onChange={(e) => setNewCampaign({ ...newCampaign, targetAmount: e.target.value })}
                    placeholder="e.g. 100000"
                    className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00d4aa] w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase block">Min Amount (INR)</label>
                  <input 
                    type="number" 
                    value={newCampaign.minAmount}
                    onChange={(e) => setNewCampaign({ ...newCampaign, minAmount: e.target.value })}
                    required
                    className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00d4aa] w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase block">Amount Type</label>
                  <select 
                    value={newCampaign.amountType}
                    onChange={(e) => setNewCampaign({ ...newCampaign, amountType: e.target.value as any })}
                    className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00d4aa] w-full"
                  >
                    <option value="flexible">Flexible</option>
                    <option value="fixed">Fixed</option>
                  </select>
                </div>
                {newCampaign.amountType === 'fixed' && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-400 uppercase block">Fixed Value (INR)</label>
                    <input 
                      type="number" 
                      value={newCampaign.suggestedAmount}
                      onChange={(e) => setNewCampaign({ ...newCampaign, suggestedAmount: e.target.value })}
                      required
                      placeholder="e.g. 500"
                      className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00d4aa] w-full"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase block">Start Date</label>
                  <input 
                    type="date" 
                    value={newCampaign.startDate}
                    onChange={(e) => setNewCampaign({ ...newCampaign, startDate: e.target.value })}
                    required
                    className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00d4aa] w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase block">End Date</label>
                  <input 
                    type="date" 
                    value={newCampaign.endDate}
                    onChange={(e) => setNewCampaign({ ...newCampaign, endDate: e.target.value })}
                    className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00d4aa] w-full"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setCreateModal(false)}
                  className="text-xs font-bold px-4 py-2 rounded bg-zinc-950 border border-zinc-850 text-zinc-300"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="text-xs font-bold px-4 py-2 rounded bg-[#00d4aa] text-[#09090b] hover:bg-[#00b390] transition-all"
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WING COLLECTOR EDIT MODAL */}
      {collectorEditModal && selectedWing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 max-w-md w-full rounded-xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white">Configure Wing Coordinator</h3>
              <p className="text-zinc-400 text-xs">Assign collector details for Wing {selectedWing.name}.</p>
            </div>

            <form onSubmit={handleUpdateWingCollector} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-400 uppercase block">Assign Resident User (Optional)</label>
                <select
                  value={collectorForm.collectorUserId}
                  onChange={(e) => setCollectorForm({ ...collectorForm, collectorUserId: e.target.value })}
                  className="bg-zinc-955 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00d4aa] w-full"
                >
                  <option value="">Choose resident profile...</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-400 uppercase block">Coordinator Name</label>
                <input 
                  type="text" 
                  value={collectorForm.collectorName}
                  onChange={(e) => setCollectorForm({ ...collectorForm, collectorName: e.target.value })}
                  placeholder="e.g. Yogesh Gore"
                  required
                  className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00d4aa] w-full"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-400 uppercase block">Coordinator Phone</label>
                <input 
                  type="text" 
                  value={collectorForm.collectorPhone}
                  onChange={(e) => setCollectorForm({ ...collectorForm, collectorPhone: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00d4aa] w-full"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-400 uppercase block">Collector UPI ID (For offline transfers)</label>
                <input 
                  type="text" 
                  value={collectorForm.collectorUpiId}
                  onChange={(e) => setCollectorForm({ ...collectorForm, collectorUpiId: e.target.value })}
                  placeholder="e.g. name@upi"
                  className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00d4aa] w-full"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setCollectorEditModal(false)}
                  className="text-xs font-bold px-4 py-2 rounded bg-zinc-950 border border-zinc-850 text-zinc-300"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="text-xs font-bold px-4 py-2 rounded bg-[#00d4aa] text-[#09090b] hover:bg-[#00b390] transition-all"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 max-w-md w-full rounded-xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white">Reject Offline Contribution</h3>
              <p className="text-zinc-400 text-xs">State the reason for rejecting this entry. This will be sent as a push notification.</p>
            </div>

            <form onSubmit={handleRejectOffline} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-400 uppercase block">Rejection Reason</label>
                <input 
                  type="text" 
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Reference ID mismatch / UTR not found"
                  required
                  className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00d4aa] w-full"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => {
                    setRejectModal(false);
                    setRejectionReason('');
                    setSelectedContributionId(null);
                  }}
                  className="text-xs font-bold px-4 py-2 rounded bg-zinc-950 border border-zinc-850 text-zinc-300"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="text-xs font-bold px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600 transition-all"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
