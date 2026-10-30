import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../lib/supabaseServer';

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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401, headers: corsHeaders });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 401, headers: corsHeaders });
    }

    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ error: 'Verification code is required' }, { status: 400, headers: corsHeaders });
    }

    // Fetch the user's profile to check the 2FA code
    const { data: profile, error: profileError } = await supabaseServer
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404, headers: corsHeaders });
    }

    // Parse bio configuration
    let bioObj: any = {};
    if (profile.bio) {
      try {
        bioObj = JSON.parse(profile.bio);
      } catch (e) {
        bioObj = {};
      }
    }

    // Format clean codes for comparison
    const cleanInputCode = code.toString().replace(/\s/g, '');
    const cleanStoredCode = (bioObj.two_factor_code || '').toString().replace(/\s/g, '');

    if (!cleanStoredCode || cleanInputCode !== cleanStoredCode) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400, headers: corsHeaders });
    }

    // Check expiration
    if (bioObj.two_factor_expires_at && Date.now() > bioObj.two_factor_expires_at) {
      return NextResponse.json({ error: 'Verification code has expired' }, { status: 400, headers: corsHeaders });
    }

    // Update 2FA approved state to true
    const updatedBio = {
      ...bioObj,
      two_factor_approved: true,
    };

    const { error: updateError } = await supabaseServer
      .from('profiles')
      .update({ bio: JSON.stringify(updatedBio) })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, message: 'Portal login authorized successfully' }, { status: 200, headers: corsHeaders });

  } catch (err: any) {
    console.error('Error in approve-2fa API:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
