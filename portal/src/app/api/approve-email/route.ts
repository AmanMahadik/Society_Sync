import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { adminEmail, adminName, societyName, societyCode } = await req.json();

    if (!adminEmail || !societyCode || !societyName || !adminName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('RESEND_API_KEY is not configured. Email sending skipped.');
      return NextResponse.json({ 
        success: true, 
        warning: 'RESEND_API_KEY environment variable is not configured. Email notification was skipped.' 
      });
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>SocietySync Registration Approved</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            background-color: #f4f4f7; 
            color: #51545e; 
            margin: 0; 
            padding: 0; 
          }
          .wrapper { 
            width: 100%; 
            table-layout: fixed; 
            background-color: #f4f4f7; 
            padding-bottom: 40px; 
          }
          .content { 
            max-width: 570px; 
            margin: 0 auto; 
            background-color: #ffffff; 
            border-radius: 8px; 
            border: 1px solid #e8e8f1; 
            overflow: hidden; 
            margin-top: 40px; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.05); 
          }
          .header { 
            background-color: #09090b; 
            padding: 30px; 
            text-align: center; 
            border-bottom: 3px solid #00d4aa; 
          }
          .header h1 { 
            color: #ffffff; 
            margin: 0; 
            font-size: 24px; 
            font-weight: 800; 
            letter-spacing: -0.5px; 
          }
          .header span { 
            color: #00d4aa; 
          }
          .body { 
            padding: 40px; 
          }
          .welcome { 
            font-size: 18px; 
            font-weight: bold; 
            color: #1f2937; 
            margin-bottom: 20px; 
          }
          .lead { 
            font-size: 15px; 
            line-height: 1.6; 
            color: #4b5563; 
            margin-bottom: 30px; 
          }
          .details-card { 
            background-color: #f9fafb; 
            border: 1px solid #f3f4f6; 
            border-radius: 6px; 
            padding: 20px; 
            margin-bottom: 30px; 
          }
          .details-row { 
            display: flex; 
            justify-content: space-between; 
            padding: 8px 0; 
            border-bottom: 1px solid #f3f4f6; 
            font-size: 14px; 
          }
          .details-row:last-child { 
            border-bottom: none; 
          }
          .details-label { 
            font-weight: 600; 
            color: #4b5563; 
          }
          .details-val { 
            color: #111827; 
            text-align: right; 
          }
          .code-box { 
            background-color: #09090b; 
            color: #00d4aa; 
            border-radius: 6px; 
            padding: 16px; 
            text-align: center; 
            font-family: monospace; 
            font-size: 28px; 
            font-weight: bold; 
            letter-spacing: 4px; 
            margin: 20px 0; 
            border: 1px solid #1f2937; 
          }
          .cta-btn { 
            display: block; 
            text-align: center; 
            background-color: #00d4aa; 
            color: #09090b !important; 
            text-decoration: none; 
            font-weight: bold; 
            padding: 14px 20px; 
            border-radius: 6px; 
            font-size: 15px; 
            margin: 30px 0; 
            box-shadow: 0 4px 10px rgba(0, 212, 170, 0.2);
          }
          .footer { 
            padding: 30px; 
            text-align: center; 
            font-size: 12px; 
            color: #9ca3af; 
            border-top: 1px solid #f3f4f6; 
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="content">
            <div class="header">
              <h1>Society<span>Sync</span></h1>
            </div>
            <div class="body">
              <div class="welcome">Hello ${adminName},</div>
              <div class="lead">We are pleased to inform you that your registration request for <strong>${societyName}</strong> has been audited and successfully approved by the Master Administration! Your community portal is now active.</div>
              
              <div class="details-card">
                <div class="details-row">
                  <div class="details-label">Society Name</div>
                  <div class="details-val">${societyName}</div>
                </div>
                <div class="details-row">
                  <div class="details-label">Admin Representative</div>
                  <div class="details-val">${adminName}</div>
                </div>
                <div class="details-row">
                  <div class="details-label">Registered Admin Email</div>
                  <div class="details-val">${adminEmail}</div>
                </div>
                <div class="details-row">
                  <div class="details-label">Login Credentials</div>
                  <div class="details-val"><em>As configured during registration</em></div>
                </div>
              </div>

              <div style="font-size: 13px; font-weight: bold; color: #1f2937; text-align: center; letter-spacing: 0.5px;">YOUR UNIQUE SOCIETY CODE</div>
              <div class="code-box">${societyCode}</div>
              
              <div class="lead" style="font-size: 13.5px; margin-top: 25px; border-top: 1px dashed #e8e8f1; padding-top: 20px;">
                <strong>Next Steps for Onboarding:</strong>
                <ol style="padding-left: 20px; margin-top: 8px; line-height: 1.5;">
                  <li>Log in to the Web Admin Portal to post notice board announcements and manage resident lists.</li>
                  <li>Distribute the unique Society Code above to your residents. They will use this code when signing up in the mobile app to join your isolated society space.</li>
                  <li>Register security guard profiles directly inside the Web Portal Community Roster so they can monitor gates and receive SOS alarms.</li>
                </ol>
              </div>

              <a href="${req.nextUrl.origin}/login" class="cta-btn">ACCESS WEB PORTAL</a>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} SocietySync Inc. All rights reserved.</p>
              <p>This is an automated operational notification. Please do not reply directly to this email.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: 'SocietySync <onboarding@resend.dev>',
        to: [adminEmail],
        subject: `🏢 SocietySync Registration Approved: ${societyName}`,
        html: emailHtml
      })
    });

    const resendData = await resendResponse.json();
    return NextResponse.json({ success: true, data: resendData });
  } catch (error: any) {
    console.error('Error sending approval email:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
