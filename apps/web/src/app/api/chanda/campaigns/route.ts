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

// GET active campaigns for residents, or all campaigns for admins
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
  };

  try {
    const url = new URL(req.url);
    const societyId = url.searchParams.get('societyId');
    const isAdmin = url.searchParams.get('isAdmin') === 'true';

    if (!societyId) {
      return NextResponse.json({ error: 'Missing societyId parameter' }, { status: 400, headers: corsHeaders });
    }

    let query = supabaseServer
      .from('chanda_campaigns')
      .select('*')
      .eq('society_id', societyId);

    if (!isAdmin) {
      query = query.eq('status', 'active');
    }

    const { data: campaigns, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ campaigns }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}

// POST create campaign
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
      societyId,
      title,
      description,
      targetAmount,
      suggestedAmount,
      minAmount,
      startDate,
      endDate,
      amountType,
      wingTargets,
      bannerUrl,
      createdBy,
    } = body;

    if (!societyId || !title || !startDate || !createdBy) {
      return NextResponse.json({ error: 'Missing required campaign parameters' }, { status: 400, headers: corsHeaders });
    }

    const { data: campaign, error } = await supabaseServer
      .from('chanda_campaigns')
      .insert({
        society_id: societyId,
        title: title,
        description: description || null,
        target_amount: targetAmount ? Number(targetAmount) : null,
        suggested_amount: suggestedAmount ? Number(suggestedAmount) : null,
        min_amount: minAmount ? Number(minAmount) : 1,
        start_date: startDate,
        end_date: endDate || null,
        status: 'draft',
        amount_type: amountType || 'flexible',
        wing_targets: wingTargets || null,
        banner_url: bannerUrl || null,
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, campaign }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error creating campaign:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}
