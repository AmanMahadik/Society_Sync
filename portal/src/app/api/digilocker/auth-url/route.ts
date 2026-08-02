import { NextRequest, NextResponse } from 'next/server';

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

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
  };

  const searchParams = req.nextUrl.searchParams;
  const userId = searchParams.get('userId') || '';
  const societyId = searchParams.get('societyId') || '';

  const host = req.headers.get('host') || 'society-sync-portal.vercel.app';
  const protocol = host.includes('localhost') ? 'http' : (req.headers.get('x-forwarded-proto') || 'https');
  
  const redirectUrl = `${protocol}://${host}/verify-digilocker?userId=${userId}&societyId=${societyId}`;

  return NextResponse.json({ url: redirectUrl }, { headers: corsHeaders });
}
