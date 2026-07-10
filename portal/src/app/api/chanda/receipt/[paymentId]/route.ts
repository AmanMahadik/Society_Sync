import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../../lib/supabaseServer';

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

// GET redirect to receipt URL
export async function GET(req: NextRequest, { params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  const origin = req.headers.get('origin') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
  };

  try {
    // 1. Check online payments
    let { data: payment } = await supabaseServer
      .from('chanda_payments')
      .select('receipt_url')
      .eq('id', paymentId)
      .maybeSingle();

    // 2. If not found, check offline contributions
    if (!payment || !payment.receipt_url) {
      const { data: offline } = await supabaseServer
        .from('chanda_offline_contributions')
        .select('receipt_url')
        .eq('id', paymentId)
        .maybeSingle();
      
      payment = offline;
    }

    if (!payment || !payment.receipt_url) {
      return NextResponse.json({ error: 'Receipt is being generated, check back shortly.' }, { status: 404, headers: corsHeaders });
    }

    // Redirect to the public URL
    return NextResponse.redirect(payment.receipt_url);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}

// POST resend receipt push notification
export async function POST(req: NextRequest, { params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  const origin = req.headers.get('origin') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
  };

  try {
    let payment = null;
    let type = 'online';

    // 1. Try online payments
    const { data: onlinePay } = await supabaseServer
      .from('chanda_payments')
      .select('*, chanda_campaigns(title)')
      .eq('id', paymentId)
      .maybeSingle();

    if (onlinePay && onlinePay.receipt_url) {
      payment = onlinePay;
    } else {
      // 2. Try offline contributions
      const { data: offlinePay } = await supabaseServer
        .from('chanda_offline_contributions')
        .select('*, chanda_campaigns(title)')
        .eq('id', paymentId)
        .maybeSingle();
      
      if (offlinePay && offlinePay.receipt_url) {
        payment = offlinePay;
        type = 'offline';
      }
    }

    if (!payment) {
      return NextResponse.json({ error: 'Receipt not found or not yet generated' }, { status: 404, headers: corsHeaders });
    }

    const campaignTitle = payment.chanda_campaigns?.title || 'Chanda';
    const residentId = type === 'online' ? payment.resident_id : payment.resident_id;

    if (residentId) {
      // Re-insert notification to trigger push alert
      await supabaseServer
        .from('notifications')
        .insert({
          society_id: payment.society_id,
          user_id: residentId,
          title: '🧾 Receipt Copy Sent',
          body: `Here is a copy of your receipt (${payment.receipt_number}) for "${campaignTitle}".`,
          is_read: false,
        });
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error resending receipt:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}
