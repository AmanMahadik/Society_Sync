import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../lib/supabaseServer';
import Razorpay from 'razorpay';

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    },
  });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
  };

  try {
    const body = await req.json();
    const { campaignId, amount, wingId, flatId, residentId } = body;

    if (!campaignId || !amount || !wingId || !residentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers: corsHeaders });
    }

    // 1. Verify campaign is active
    const { data: campaign, error: campErr } = await supabaseServer
      .from('chanda_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campErr || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404, headers: corsHeaders });
    }

    if (campaign.status !== 'active') {
      return NextResponse.json({ error: 'Campaign is not active' }, { status: 400, headers: corsHeaders });
    }

    if (Number(amount) < Number(campaign.min_amount)) {
      return NextResponse.json({ error: `Amount must be at least ₹${campaign.min_amount}` }, { status: 400, headers: corsHeaders });
    }

    if (campaign.amount_type === 'fixed' && Number(amount) !== Number(campaign.suggested_amount)) {
      return NextResponse.json({ error: `Campaign requires fixed amount of ₹${campaign.suggested_amount}` }, { status: 400, headers: corsHeaders });
    }

    // 2. Create Razorpay order
    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_12345';
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    let orderId = `order_mock_${Math.random().toString(36).substring(2, 11)}`;

    if (keySecret) {
      const razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });

      const order = await razorpay.orders.create({
        amount: Math.round(Number(amount) * 100), // paise
        currency: 'INR',
        receipt: `chanda_${campaignId}_${Date.now()}`,
        notes: {
          campaignId,
          societyId: campaign.society_id,
          wingId,
          residentId,
        },
      });
      orderId = order.id;
    } else {
      console.warn('RAZORPAY_KEY_SECRET not set, using mock order ID.');
    }

    // 3. Create chanda_payments row
    const { error: insertErr } = await supabaseServer
      .from('chanda_payments')
      .insert({
        campaign_id: campaignId,
        society_id: campaign.society_id,
        wing_id: wingId,
        flat_id: flatId || null,
        resident_id: residentId,
        amount: Number(amount),
        currency: 'INR',
        razorpay_order_id: orderId,
        status: 'created',
      });

    if (insertErr) {
      console.error('Error inserting payment row:', insertErr);
      return NextResponse.json({ error: 'Failed to record payment attempt' }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({
      orderId,
      keyId,
      amount: Number(amount),
      currency: 'INR',
    }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error in create-order API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}
