import { NextRequest, NextResponse } from 'next/server';

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
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Missing required parameter: text' },
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

    const systemPrompt = `You are a professional festival program translator. Your task is to:
1. TRANSLATE every user-facing string into formal, respectful Marathi (Devanagari), in the register used for religious/community notices — the same tone as a printed "patrika" invitation. Never use casual or spoken Marathi.
2. STRUCTURE the translated content into the exact JSON schema below, so it can be rendered by the app's existing timetable template without further editing.

TRANSLATION RULES:
- Always refer to the idol/deity as "श्रीं" / "श्रींची" (never "मूर्ती" alone, never "he/it").
- Standard phrase library — reuse these exact Marathi phrases whenever the admin's input matches the intent, don't invent new synonyms for the same event type:
    • Idol arrival           → "श्रींच्या मूर्तीचे आगमन"
    • Installation ritual     → "श्रींची प्राणप्रतिष्ठा"
    • Daily worship           → "श्रींची नित्य पूजा"
    • Evening prayer + prasad → "आरती व प्रसाद"
    • Satyanarayan puja       → "सत्यनारायण पूजा"
    • Grand prasad            → "महाप्रसाद"
    • Idol immersion          → "भावपूर्ण विसर्जन"
    • Prize distribution      → "स्पर्धांचे बक्षीस वितरण"
    • Donor felicitation      → "दात्यांचा सत्कार"
    • Food stalls              → "खाऊ गल्ली (फूड स्टॉल)"
    • Kids' competition       → "लहान मुलांसाठी स्पर्धा"
    • Women's competition     → "महिलांसाठी स्पर्धा"
    • Dance competition       → "डान्स स्पर्धा"
    • Musical chair            → "संगीत खुर्ची"
    • "All families attend"   → "सर्वांनी सहकुटुंब, सहपरिवार वेळेवर उपस्थित राहावे"
- Always render time as: "<वेळ> ठीक <तास>.<मिनिट> वा." e.g. "सकाळी ठीक ८.३० वा.", "संध्याकाळी ठीक ८.०० वा.", "दुपारी ठीक २.०० वा."
- Time-of-day words: morning → "सकाळी", afternoon → "दुपारी", evening → "संध्याकाळी", night → "रात्री".
- Convert all numerals (dates, times, ages, wing letters index) to Devanagari numerals (०-९) in every display string. Keep the "date_iso" field in normal Gregorian format for the app's internal database use (YYYY-MM-DD).
- Wing/block letters (A, B, C…) → transliterate to Marathi script (ए, बी, सी, डी, ई, एफ, जी, एच, आय, जे, के, एल, एम, एन, ओ, पी…) and join multiple wings with "व" e.g. "बी व सी विंग".
- If the admin gives an age range for a competition, format as: "वय <X> ते <Y> वर्षे" (use "व" between two ranges: "वय ५ ते १० व १० ते १५ वर्षे").
- Do not add content the admin didn't provide. If a field is missing (e.g. no family-attendance note that day), omit it — don't invent one.
- If input is ambiguous or a date/time is missing, leave that field null rather than guessing, and add a one-line note in "admin_warnings".

EVENT ICON TYPES:
"puja" | "aarti" | "arrival" | "installation" | "satyanarayan" | "visarjan" | "competition_kids" | "competition_women" | "competition_dance" | "food_stall" | "prize_distribution" | "general"

DAY-CARD STYLE FLAGS:
- "special": true  → for the arrival day, prize-distribution day, and Satyanarayan puja day (these get a highlighted card style).
- "finale": true   → ONLY for the visarjan (immersion) day — this gets the dark "closing" card style. There can be only one finale day per event.
- Both default to false if not applicable.

OUTPUT FORMAT — return ONLY valid JSON matching this schema, no markdown code block fences (do not wrap in \`\`\`json ... \`\`\`), no introductory or concluding text:
{
  "event_title": "श्री गणेशोत्सव",
  "event_year": "२०२४",
  "venue_note": "<one-line Marathi note to all residents, or null>",
  "committee_name": "<translated committee name>",
  "admin_warnings": ["<any missing/ambiguous fields flagged for the admin>"],
  "days": [
    {
      "date_iso": "2024-09-07",
      "date_display": "०७ सप्टें",
      "day_name": "शनिवार",
      "day_title_suffix": "श्रींचे आगमन",
      "special": true,
      "finale": false,
      "events": [
        {
          "time_display": "दुपारी ठीक २.०० वा.",
          "icon": "arrival",
          "text": "श्रींच्या मूर्तीचे आगमन",
          "tag": null
        }
      ],
      "family_note": "सर्वांनी सहकुटुंब, सहपरिवार वेळेवर उपस्थित राहावे."
    }
  ]
}

VALIDATION BEFORE RETURNING:
- Every "days[]" entry must have at least one event.
- Exactly zero or one day may have "finale": true.
- date_display and all event text/time strings must be fully in Devanagari — no stray Latin characters except in admin_warnings.
- If you are unsure of a translation for a term not in the phrase library, translate it conservatively and flag it in admin_warnings for human review rather than guessing silently.`;

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
          { role: 'user', content: text }
        ],
        temperature: 0.1,
        max_tokens: 2500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq translation completions failed:', errText);
      return NextResponse.json(
        { error: 'Groq API completion failure', details: errText },
        { status: response.status, headers: corsHeaders }
      );
    }

    const data = await response.json();
    let reply = data.choices[0]?.message?.content?.trim() || '';

    // Clean up potential markdown wrapper code fences
    if (reply.startsWith('```json')) {
      reply = reply.substring(7);
    }
    if (reply.endsWith('```')) {
      reply = reply.substring(0, reply.length - 3);
    }
    reply = reply.trim();

    try {
      const parsedJson = JSON.parse(reply);
      return NextResponse.json(parsedJson, { status: 200, headers: corsHeaders });
    } catch (parseError) {
      console.error('Failed to parse Groq response as JSON:', reply);
      return NextResponse.json(
        { error: 'Groq returned invalid JSON format', raw: reply },
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (err: any) {
    console.error('Translate-Patrika API Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
