import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../../../lib/supabaseServer';
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

export async function POST(req: NextRequest, { params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  const origin = req.headers.get('origin') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
  };

  try {
    const body = await req.json();
    const { amount, reason } = body;

    // 1. Fetch payment
    const { data: payment, error: payErr } = await supabaseServer
      .from('chanda_payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (payErr || !payment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404, headers: corsHeaders });
    }

    if (payment.status !== 'paid') {
      return NextResponse.json({ error: 'Only paid contributions can be refunded' }, { status: 400, headers: corsHeaders });
    }

    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_12345';
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (keySecret && payment.razorpay_payment_id) {
      const razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });

      const refundAmount = amount ? Math.round(Number(amount) * 100) : undefined; // paise
      
      const refund = await razorpay.payments.refund(payment.razorpay_payment_id, {
        amount: refundAmount,
        notes: {
          paymentId: payment.id,
          reason: reason || 'Admin requested refund',
        },
      });

      console.log('Razorpay refund initiated:', refund.id);
      // Status will be set to 'refunded' via webhook event refund.processed
      return NextResponse.json({ success: true, method: 'razorpay', refundId: refund.id }, { headers: corsHeaders });
    } else {
      // Mock mode
      console.warn('RAZORPAY_KEY_SECRET not set, performing mock refund (flipping status directly).');
      const { error: updateErr } = await supabaseServer
        .from('chanda_payments')
        .update({ status: 'refunded' })
        .eq('id', paymentId);

      if (updateErr) throw updateErr;

      return NextResponse.json({ success: true, method: 'mock' }, { headers: corsHeaders });
    }
  } catch (error: any) {
    console.error('Error issuing refund:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}
