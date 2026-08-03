import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../lib/supabaseServer';
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'some-super-secret-key-at-least-32-chars';
const ENCRYPTION_KEY = crypto.scryptSync(SECRET_KEY, 'salt-2fa', 32);

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

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
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400, headers: corsHeaders });
    }

    // 1. Authenticate with Supabase Auth using password flow
    const { data: authData, error: authError } = await supabaseServer.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.session) {
      return NextResponse.json({ error: authError?.message || 'Authentication failed' }, { status: 401, headers: corsHeaders });
    }

    const { session, user } = authData;

    // 2. Fetch the user's profile
    const { data: profile, error: profileError } = await supabaseServer
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404, headers: corsHeaders });
    }

    // Parse bio JSON metadata
    let bioObj: any = {};
    if (profile.bio) {
      try {
        bioObj = JSON.parse(profile.bio);
      } catch (e) {
        // If bio is a simple text, treat it as empty config
        bioObj = {};
      }
    }

    const is2FAEnabled = !!bioObj.two_factor_enabled;

    if (!is2FAEnabled) {
      // 2FA not active - return session directly
      return NextResponse.json({ status: 'success', session }, { status: 200, headers: corsHeaders });
    }

    // 3. 2FA is active - generate a secure 6-digit code
    const twoFactorCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiration

    // Update profile bio JSON config
    const updatedBio = {
      ...bioObj,
      two_factor_code: twoFactorCode,
      two_factor_expires_at: expiresAt,
      two_factor_approved: false,
    };

    const { error: updateError } = await supabaseServer
      .from('profiles')
      .update({ bio: JSON.stringify(updatedBio) })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    // Encrypt the session object as a pending token
    const pendingToken = encrypt(JSON.stringify(session));

    return NextResponse.json({
      status: '2fa_required',
      code: twoFactorCode,
      pendingToken,
      userId: user.id
    }, { status: 200, headers: corsHeaders });

  } catch (err: any) {
    console.error('Error in login-2fa API:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
