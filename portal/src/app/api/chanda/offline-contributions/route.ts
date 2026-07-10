import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../lib/supabaseServer';

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    },
  });
}

// GET manual verification queue for admins
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
  };

  try {
    const url = new URL(req.url);
    const campaignId = url.searchParams.get('campaignId');
    const status = url.searchParams.get('status') || 'pending_verification';

    if (!campaignId) {
      return NextResponse.json({ error: 'Missing campaignId parameter' }, { status: 400, headers: corsHeaders });
    }

    const { data: contributions, error } = await supabaseServer
      .from('chanda_offline_contributions')
      .select('*, profiles(full_name, phone, flat_number), wings(name)')
      .eq('campaign_id', campaignId)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ contributions }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error fetching offline contributions:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}

// POST log offline entry (from Wing Collector or Admin)
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
  };

  try {
    const body = await req.json();
    const {
      campaignId,
      societyId,
      wingId,
      flatId,
      residentId,
      payerName,
      amount,
      collectionMode,
      collectorUpiId,
      upiReferenceId,
      proofUrl,
      collectedAt,
      enteredBy,
    } = body;

    if (!campaignId || !societyId || !wingId || !amount || !collectedAt || !enteredBy) {
      return NextResponse.json({ error: 'Missing required offline parameters' }, { status: 400, headers: corsHeaders });
    }

    const { data: contribution, error } = await supabaseServer
      .from('chanda_offline_contributions')
      .insert({
        campaign_id: campaignId,
        society_id: societyId,
        wing_id: wingId,
        flat_id: flatId || null,
        resident_id: residentId || null,
        payer_name: payerName || null,
        amount: Number(amount),
        collection_mode: collectionMode || 'upi',
        collector_upi_id: collectorUpiId || null,
        upi_reference_id: upiReferenceId || null,
        proof_url: proofUrl || null,
        collected_at: collectedAt,
        entered_by: enteredBy,
        status: 'pending_verification',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, contribution }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error logging offline contribution:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}
