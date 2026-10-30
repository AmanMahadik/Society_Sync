import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../lib/supabaseServer';
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'some-super-secret-key-at-least-32-chars';
const ENCRYPTION_KEY = crypto.scryptSync(SECRET_KEY, 'salt-2fa', 32);

function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift()!, 'hex');
  const encryptedText = parts.join(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
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
    const { pendingToken } = await req.json();

    if (!pendingToken) {
      return NextResponse.json({ error: 'Pending token is required' }, { status: 400, headers: corsHeaders });
    }

    // Decrypt the session
    let sessionStr: string;
    try {
      sessionStr = decrypt(pendingToken);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid or corrupted pending token' }, { status: 400, headers: corsHeaders });
    }

    const sessionObj = JSON.parse(sessionStr);
    const userId = sessionObj.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Invalid session payload' }, { status: 400, headers: corsHeaders });
    }

    // Fetch profile status
    const { data: profile, error: profileError } = await supabaseServer
      .from('profiles')
      .select('*')
      .eq('id', userId)
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

    const isApproved = !!bioObj.two_factor_approved;
    const expiresAt = bioObj.two_factor_expires_at;

    if (expiresAt && Date.now() > expiresAt) {
      return NextResponse.json({ status: 'expired', error: 'Two-factor session has expired' }, { status: 200, headers: corsHeaders });
    }

    if (!isApproved) {
      return NextResponse.json({ status: 'pending' }, { status: 200, headers: corsHeaders });
    }

    // Login is approved! Reset the verification fields to prevent replay attacks
    const updatedBio = {
      ...bioObj,
      two_factor_code: null,
      two_factor_expires_at: null,
      two_factor_approved: false,
    };

    const { error: updateError } = await supabaseServer
      .from('profiles')
      .update({ bio: JSON.stringify(updatedBio) })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ status: 'success', session: sessionObj }, { status: 200, headers: corsHeaders });

  } catch (err: any) {
    console.error('Error in complete-2fa API:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
