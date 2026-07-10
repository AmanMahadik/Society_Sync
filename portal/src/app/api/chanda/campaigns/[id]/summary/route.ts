import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../../../lib/supabaseServer';

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const origin = req.headers.get('origin') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
  };

  try {
    // 1. Fetch Campaign Details
    const { data: campaign, error: campErr } = await supabaseServer
      .from('chanda_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (campErr || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404, headers: corsHeaders });
    }

    // 2. Fetch Wings
    const { data: wings, error: wingsErr } = await supabaseServer
      .from('wings')
      .select('*')
      .eq('society_id', campaign.society_id);

    if (wingsErr) throw wingsErr;

    // 3. Fetch Payments
    const { data: payments, error: payErr } = await supabaseServer
      .from('chanda_payments')
      .select('*, profiles(full_name, phone, flat_number)')
      .eq('campaign_id', id)
      .eq('status', 'paid');

    if (payErr) throw payErr;

    // 4. Fetch Offline Contributions
    const { data: offlines, error: offErr } = await supabaseServer
      .from('chanda_offline_contributions')
      .select('*, profiles(full_name, phone, flat_number)')
      .eq('campaign_id', id);

    if (offErr) throw offErr;

    // 5. Aggregate Wing Wise
    const byWing = (wings || []).map((w: any) => {
      const wingPayments = payments.filter((p: any) => p.wing_id === w.id);
      const wingOfflines = offlines.filter((o: any) => o.wing_id === w.id);
      
      const onlineCollected = wingPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
      const offlineCollected = wingOfflines.filter((o: any) => o.status === 'verified').reduce((sum: number, o: any) => sum + Number(o.amount), 0);
      const pendingVerification = wingOfflines.filter((o: any) => o.status === 'pending_verification').reduce((sum: number, o: any) => sum + Number(o.amount), 0);
      
      const totalCollected = onlineCollected + offlineCollected;
      const target = campaign.wing_targets?.[w.id] || (campaign.target_amount ? (campaign.target_amount / (wings?.length || 1)) : null);
      const percentComplete = target ? Math.round((totalCollected / target) * 100) : 0;

      // Count flats contributed (flats list unique flat numbers)
      const contributedFlats = new Set([
        ...wingPayments.map((p: any) => p.profiles?.flat_number).filter(Boolean),
        ...wingOfflines.filter((o: any) => o.status === 'verified').map((o: any) => o.profiles?.flat_number || o.payer_name).filter(Boolean)
      ]);

      return {
        wingId: w.id,
        wingName: w.name,
        onlineCollected,
        offlineCollected,
        totalCollected,
        pendingVerification,
        target,
        percentComplete,
        contributorCount: wingPayments.length + wingOfflines.filter((o: any) => o.status === 'verified').length,
        flatsContributed: contributedFlats.size,
      };
    });

    const onlineTotal = payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    const offlineTotal = offlines.filter((o: any) => o.status === 'verified').reduce((sum: number, o: any) => sum + Number(o.amount), 0);
    const pendingTotal = offlines.filter((o: any) => o.status === 'pending_verification').reduce((sum: number, o: any) => sum + Number(o.amount), 0);
    const totalCollected = onlineTotal + offlineTotal;

    // Combine recent payments (sorted)
    const recent = [
      ...payments.map((p: any) => ({
        id: p.id,
        type: 'online',
        amount: Number(p.amount),
        residentName: p.profiles?.full_name || 'Resident',
        flat: p.profiles?.flat_number || 'N/A',
        time: p.paid_at || p.created_at,
        receiptNumber: p.receipt_number,
      })),
      ...offlines.filter((o: any) => o.status === 'verified').map((o: any) => ({
        id: o.id,
        type: 'offline',
        amount: Number(o.amount),
        residentName: o.profiles?.full_name || o.payer_name || 'Resident',
        flat: o.profiles?.flat_number || 'N/A',
        time: o.collected_at,
        receiptNumber: o.receipt_number,
      })),
    ].sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 20);

    return NextResponse.json({
      campaign,
      totalCollected,
      onlineTotal,
      offlineTotal,
      pendingTotal,
      byWing,
      recentPayments: recent,
    }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error fetching campaign summary:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}
