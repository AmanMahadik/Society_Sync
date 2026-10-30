import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const { residentId, societyId, name, adminId } = await req.json();

    if (!residentId || !societyId) {
      return NextResponse.json({ error: 'Missing residentId or societyId' }, { status: 400 });
    }

    // 1. Reset society links and set role/status back to default
    const { error } = await supabaseServer
      .from('profiles')
      .update({
        society_id: null,
        status: 'pending',
        role: 'owner'
      })
      .eq('id', residentId)
      .eq('society_id', societyId);

    if (error) throw error;

    // 2. Log action to audit logs
    if (adminId) {
      await supabaseServer.from('portal_audit_log').insert({
        action_type: 'member_removal',
        performed_by: adminId,
        society_id: societyId,
        old_value: name || 'Resident',
        new_value: 'Removed from Society'
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error removing resident:', err);
    return NextResponse.json({ error: err.message || 'Failed to remove resident' }, { status: 500 });
  }
}
