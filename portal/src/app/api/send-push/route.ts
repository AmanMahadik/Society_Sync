import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabaseServer';

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
    const { societyId, titleEn, titleMr, bodyEn, bodyMr, timetableItemId, category } = body;

    if (!societyId || !bodyEn || !bodyMr) {
      return NextResponse.json(
        { error: 'Missing required parameters: societyId, bodyEn, bodyMr' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Fetch unique Expo push tokens from profiles
    const { data: users, error: fetchError } = await supabaseServer
      .from('profiles')
      .select('notification_token')
      .eq('society_id', societyId)
      .not('notification_token', 'is', null);

    if (fetchError) {
      console.error('Error fetching push tokens:', fetchError);
      return NextResponse.json(
        { error: 'Failed to retrieve push tokens', details: fetchError },
        { status: 500, headers: corsHeaders }
      );
    }

    // Filter valid tokens (must start with ExponentPushToken)
    const rawTokens = users?.map(u => u.notification_token) || [];
    const tokens = Array.from(new Set(rawTokens))
      .filter(t => t && (t.startsWith('ExponentPushToken') || t.startsWith('ExpoPushToken')));

    if (tokens.length > 0) {
      // 2. Prepare Expo notifications payload
      // Send bilingual notification body or adapt based on user settings (we send English title/body, and pass Marathi translations in data payload, or vice versa, or combine)
      // Since Expo doesn't support localizing on user-locale easily on the fly without complex configurations, we combine or format as: "English Title / Marathi Title" or "Body / मराठी संदेश"
      // Alternatively, we send English title + body, but pack Marathi in the JSON data, OR format it elegantly like "Aarti has started / आरती सुरू झाली आहे".
      // Let's combine them elegantly for the system push:
      // E.g., title: "SocietySync Alert / सोसायटी सिंक सूचना"
      // E.g., body: "Aarti has started! / आरती सुरू झाली आहे!"
      const titleCombined = titleEn && titleMr ? `${titleEn} / ${titleMr}` : (titleEn || titleMr || 'SocietySync Alert');
      const bodyCombined = `${bodyEn} / ${bodyMr}`;

      const messages = tokens.map(token => ({
        to: token,
        sound: 'default',
        title: titleCombined,
        body: bodyCombined,
        data: { 
          titleEn, 
          titleMr, 
          bodyEn, 
          bodyMr, 
          timetableItemId, 
          category,
          type: 'event_trigger'
        },
      }));

      // Expo limit is 100 messages per request
      const chunkSize = 100;
      for (let i = 0; i < messages.length; i += chunkSize) {
        const chunk = messages.slice(i, i + chunkSize);
        try {
          const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Accept-encoding': 'gzip, deflate',
            },
            body: JSON.stringify(chunk),
          });
          
          if (!response.ok) {
            const errText = await response.text();
            console.error(`Expo push chunk failed:`, errText);
          }
        } catch (pushErr) {
          console.error(`Failed to dispatch push notifications:`, pushErr);
        }
      }
    }

    // 3. Log notification in database
    const { error: logError } = await supabaseServer
      .from('notification_logs')
      .insert({
        society_id: societyId,
        timetable_item_id: timetableItemId || null,
        message_en: bodyEn,
        message_mr: bodyMr,
        sent_to_count: tokens.length
      });

    if (logError) {
      console.error('Error logging notification in database:', logError);
    }

    // 4. Update the timetable item is_triggered status if applicable
    if (timetableItemId) {
      await supabaseServer
        .from('timetable_items')
        .update({
          is_triggered: true,
          triggered_at: new Date().toISOString()
        })
        .eq('id', timetableItemId);
    }

    return NextResponse.json({ success: true, sentCount: tokens.length }, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    console.error('Push notification endpoint error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
