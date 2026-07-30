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
    const { message, societyId, language } = await req.json();

    if (!message || !societyId) {
      return NextResponse.json(
        { error: 'Missing required parameters: message, societyId' },
        { status: 400, headers: corsHeaders }
      );
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY is not configured on the server.' },
        { status: 500, headers: corsHeaders }
      );
    }

    // 1. Fetch active events for this society
    const { data: events, error: eventsError } = await supabaseServer
      .from('events')
      .select('*')
      .eq('society_id', societyId)
      .eq('is_active', true);

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return NextResponse.json(
        { error: 'Database error fetching events', details: eventsError },
        { status: 500, headers: corsHeaders }
      );
    }

    // 2. Fetch all timetable items for those events
    let timetableItems: any[] = [];
    if (events && events.length > 0) {
      const eventIds = events.map(e => e.id);
      const { data: items, error: itemsError } = await supabaseServer
        .from('timetable_items')
        .select('*')
        .in('event_id', eventIds)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (itemsError) {
        console.error('Error fetching timetable items:', itemsError);
      } else {
        timetableItems = items || [];
      }
    }

    // 2.5 Fetch society admins, guards, announcements, and info
    const { data: admins } = await supabaseServer
      .from('profiles')
      .select('full_name, email, phone')
      .eq('society_id', societyId)
      .in('role', ['admin', 'master_admin']);

    const { data: guards } = await supabaseServer
      .from('profiles')
      .select('full_name, phone')
      .eq('society_id', societyId)
      .eq('role', 'guard');

    const { data: announcements } = await supabaseServer
      .from('announcements')
      .select('title, body, created_at')
      .eq('society_id', societyId)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: societyInfo } = await supabaseServer
      .from('societies')
      .select('name, address, city, state, pincode, society_code')
      .eq('id', societyId)
      .maybeSingle();

    // Get current local date from user's current request timestamp or default to server time
    const todayStr = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    // 3. Construct system prompt with strict no-hallucination rules and schedule context
    const systemPrompt = `You are the SocietySync AI Assistant. Your goal is to answer resident questions about society events, schedules, calendar timelines, administrator and security guard/watchman contacts, recent notices, or general society details based strictly on the provided society context and timetable database.

CRITICAL RULES:
1. DO NOT HALLUCINATE. Do not make up any dates, times, names, phone numbers, or details.
2. Use ONLY the provided database and context information.
3. If the user asks about something not present in the database or context (e.g., a specific resident, private data, or unlisted contact), reply politely that you do not have that information. Do not guess or invent contact info.
4. Respond in the requested language: ${language === 'marathi' ? 'Marathi' : 'English'}.
5. Keep your response concise, polite, and directly addressing the user's question.
6. The current date is ${todayStr} (${dayOfWeek}). Use this reference when the user says "today", "tomorrow", "yesterday", or "this week".
7. When providing contact phone numbers, display them clearly next to the name of the person (e.g. "Admin: [Name] - [Phone]").

SOCIETY GENERAL INFORMATION:
- Name: ${societyInfo?.name || 'N/A'}
- Address: ${societyInfo?.address || 'N/A'}, ${societyInfo?.city || ''}, ${societyInfo?.state || ''} ${societyInfo?.pincode || ''}
- Registration Code: ${societyInfo?.society_code || 'N/A'}

SOCIETY ADMINISTRATORS (CONTACT LIST):
${JSON.stringify(admins || [])}

SECURITY GUARDS / WATCHMEN (CONTACT LIST):
${JSON.stringify(guards || [])}

LATEST SOCIETY NOTICES & ANNOUNCEMENTS:
${JSON.stringify(announcements?.map(a => ({
  title: a.title,
  body: a.body,
  date: a.created_at ? new Date(a.created_at).toLocaleDateString() : 'N/A'
})) || [])}

ACTIVE EVENTS:
${JSON.stringify(events?.map(e => ({
  name_en: e.name_en || e.name,
  name_mr: e.name_mr || e.name,
  description_en: e.description_en || e.description,
  description_mr: e.description_mr || e.description,
  start_date: e.start_date,
  end_date: e.end_date,
  status: e.status
})))}

TIMETABLE SCHEDULE DATABASE:
${JSON.stringify(timetableItems.map(item => ({
  date: item.date,
  time: item.time,
  category: item.category,
  title_en: item.title_en,
  title_mr: item.title_mr,
  notes_en: item.notes_en,
  notes_mr: item.notes_mr,
  is_triggered: item.is_triggered
})))}
`;

    // 4. Send request to Groq chat completions
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq chatbot API failed:', errText);
      return NextResponse.json(
        { error: 'Failed to query chatbot brain', details: errText },
        { status: response.status, headers: corsHeaders }
      );
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content?.trim() || '';

    return NextResponse.json({ reply }, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    console.error('Chatbot route error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
