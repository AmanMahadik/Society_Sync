import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../../lib/supabaseServer';

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    },
  });
}

// GET campaign details
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const origin = req.headers.get('origin') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
  };

  try {
    const { data: campaign, error } = await supabaseServer
      .from('chanda_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404, headers: corsHeaders });
    }

    return NextResponse.json({ campaign }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}

// PATCH update campaign
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const origin = req.headers.get('origin') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
  };

  try {
    const body = await req.json();
    const { changedBy, ...fieldsToUpdate } = body;

    if (!changedBy) {
      return NextResponse.json({ error: 'Missing changedBy profile ID parameter' }, { status: 400, headers: corsHeaders });
    }

    // 1. Get current values to diff
    const { data: oldCampaign, error: fetchErr } = await supabaseServer
      .from('chanda_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !oldCampaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404, headers: corsHeaders });
    }

    // 2. Perform update
    const { data: campaign, error: updateErr } = await supabaseServer
      .from('chanda_campaigns')
      .update({
        ...fieldsToUpdate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 3. Compute audit log diff
    const diff: Record<string, { old: any; new: any }> = {};
    for (const key of Object.keys(fieldsToUpdate)) {
      if (oldCampaign[key] !== campaign[key]) {
        diff[key] = {
          old: oldCampaign[key],
          new: campaign[key],
        };
      }
    }

    if (Object.keys(diff).length > 0) {
      await supabaseServer
        .from('chanda_campaign_audit')
        .insert({
          campaign_id: id,
          changed_by: changedBy,
          changed_fields: diff,
        });
    }

    return NextResponse.json({ success: true, campaign }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error updating campaign:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}

// DELETE campaign
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const origin = req.headers.get('origin') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
  };

  try {
    // 1. Check if campaign exists
    const { data: campaign, error: fetchErr } = await supabaseServer
      .from('chanda_campaigns')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchErr || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404, headers: corsHeaders });
    }

    if (campaign.status !== 'draft' && campaign.status !== 'cancelled') {
      return NextResponse.json({ error: 'Only draft or cancelled campaigns can be deleted.' }, { status: 400, headers: corsHeaders });
    }

    // 3. Delete
    const { error: deleteErr } = await supabaseServer
      .from('chanda_campaigns')
      .delete()
      .eq('id', id);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}
