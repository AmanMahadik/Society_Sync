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
    const { text, targetLang } = await req.json();

    if (!text || !targetLang) {
      return NextResponse.json(
        { error: 'Missing text or targetLang parameters' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (targetLang !== 'mr' && targetLang !== 'en') {
      return NextResponse.json(
        { error: 'Invalid target language. Supported: "mr", "en"' },
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

    // Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: `You are an expert translator. Translate the given text to ${targetLang === 'mr' ? 'Marathi' : 'English'}. Return ONLY the direct translation. Do not include any explanations, markdown blockquotes, or conversational texts. Just the translated characters.`,
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      console.error('Groq Translation API failed:', errorMsg);
      return NextResponse.json(
        { error: 'Translation failed', details: errorMsg },
        { status: response.status, headers: corsHeaders }
      );
    }

    const data = await response.json();
    const translatedText = data.choices[0]?.message?.content?.trim() || '';

    return NextResponse.json({ translatedText }, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
