import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing signature parameters' }, { status: 400, headers: corsHeaders });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // If keySecret is not set, approve in mock mode
    if (!keySecret) {
      console.warn('RAZORPAY_KEY_SECRET not set, approving verification optimistically.');
      return NextResponse.json({ success: true, verified: true, mock: true }, { headers: corsHeaders });
    }

    const generated_signature = crypto
      .createHmac('sha256', keySecret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generated_signature === razorpay_signature) {
      return NextResponse.json({ success: true, verified: true }, { headers: corsHeaders });
    } else {
      return NextResponse.json({ success: false, verified: false, error: 'Signature mismatch' }, { status: 400, headers: corsHeaders });
    }
  } catch (error: any) {
    console.error('Error in verification API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}
