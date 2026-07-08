import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { adminEmail, adminName, societyName, status } = body;

    if (!adminEmail || !societyName || !adminName || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const gmailUser = process.env.EMAIL_USER || 'societysync5@gmail.com';
    const gmailPass = process.env.EMAIL_PASS; // Gmail App Password

    // Prepare email content
    let subject = '';
    let messageText = '';
    let messageHtml = '';

    if (status === 'approved') {
      const { societyCode } = body;
      if (!societyCode) {
        return NextResponse.json({ error: 'Missing societyCode for approval' }, { status: 400 });
      }

      subject = `🏢 SocietySync Registration Approved: ${societyName}`;
      messageText = `Hello ${adminName},

Congratulations! Your registration request for "${societyName}" has been successfully approved by the Master Admin team. 

Your unique Society Code is: ${societyCode}

You can now log in to the Web Admin Portal to manage your society operations. To onboarding residents:
1. Ask them to install the mobile app via the download link: https://expo.dev/accounts/aman1611/projects/Society_Sync/builds/e5ad992f-d0e5-499f-b19c-20f4430835b5
2. Tell them to register using the Society Code: ${societyCode}
3. Approve their profiles in the Roster.

Welcome to SocietySync!`;

      messageHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff; color: #374151;">
          <h2 style="color: #00d4aa; text-align: center; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">🏢 Registration Approved</h2>
          <p>Hello <strong>${adminName}</strong>,</p>
          <p>Congratulations! Your registration request for the society <strong>"${societyName}"</strong> has been successfully approved by the Master Admin team.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; font-size: 14px; color: #4b5563;">Your Unique Society Code:</p>
            <h3 style="margin: 5px 0 0 0; font-size: 24px; color: #111827; letter-spacing: 1px;">${societyCode}</h3>
          </div>

          <p><strong>Next Steps for Onboarding Residents:</strong></p>
          <ol style="line-height: 1.6; padding-left: 20px;">
            <li style="margin-bottom: 10px;">Direct residents to install the mobile application via the build link: <br/>
              <a href="https://expo.dev/accounts/aman1611/projects/Society_Sync/builds/e5ad992f-d0e5-499f-b19c-20f4430835b5" style="color: #00d4aa; text-decoration: none; font-weight: bold;">Download App Here</a>
            </li>
            <li style="margin-bottom: 10px;">Instruct them to use your unique Society Code during mobile app registration: <strong>${societyCode}</strong></li>
            <li style="margin-bottom: 10px;">Approve their resident profiles in the SocietySync Admin Roster once they sign up.</li>
          </ol>

          <p style="margin-top: 30px;">Welcome to the future of society management!</p>
          <p style="font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 15px; text-align: center; margin-top: 20px;">This is an automated message sent from SocietySync Admin Team.</p>
        </div>
      `;
    } else if (status === 'rejected') {
      const { rejectionReason } = body;
      const reasonText = rejectionReason || 'Invalid documents or details';

      subject = `❌ SocietySync Registration Rejected: ${societyName}`;
      messageText = `Hello ${adminName},

We regret to inform you that your registration request for "${societyName}" has been rejected by the Master Admin team.

Reason for Rejection: ${reasonText}

If you believe this was an error, please verify your registration details and submit a new request with the correct documents.`;

      messageHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff; color: #374151;">
          <h2 style="color: #ef4444; text-align: center; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">❌ Registration Rejected</h2>
          <p>Hello <strong>${adminName}</strong>,</p>
          <p>We regret to inform you that your registration request for the society <strong>"${societyName}"</strong> has been declined by the Master Admin team.</p>
          
          <div style="background-color: #fef2f2; border: 1px dashed #fca5a5; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #b91c1c; font-weight: bold;">Reason for Rejection:</p>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #7f1d1d; line-height: 1.5;">${reasonText}</p>
          </div>

          <p>If you believe this decision was made in error, please verify your registration details and resubmit a new application with the correct documents on our registration portal.</p>
          
          <p style="font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 15px; text-align: center; margin-top: 30px;">This is an automated message sent from SocietySync Admin Team.</p>
        </div>
      `;
    } else {
      return NextResponse.json({ error: 'Invalid status type' }, { status: 400 });
    }

    // Attempt to send email via Gmail (if App Password is provided)
    if (gmailPass) {
      console.log(`Sending email using Nodemailer (Gmail) from ${gmailUser}...`);
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass
        }
      });

      const info = await transporter.sendMail({
        from: `"SocietySync" <${gmailUser}>`,
        to: adminEmail,
        subject: subject,
        text: messageText,
        html: messageHtml
      });

      console.log('Nodemailer email sent successfully:', info.messageId);
      return NextResponse.json({ success: true, method: 'nodemailer', messageId: info.messageId });
    }

    // Fallback: Send email via FormSubmit (free static email delivery tool)
    console.log('Gmail App Password not found in environment variables. Falling back to FormSubmit...');
    const token = '19bcd09a7561ac0a204d32703f974dbb';
    const payload = {
      name: adminName,
      email: adminEmail,
      society: societyName,
      status: status === 'approved' ? "APPROVED / ACTIVE" : "REJECTED / DECLINED",
      message: messageText,
      _cc: adminEmail,
      _subject: subject,
      _template: "box"
    };

    const formSubmitResponse = await fetch(`https://formsubmit.co/ajax/${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'https://society-sync-info.vercel.app',
        'Referer': 'https://society-sync-info.vercel.app/'
      },
      body: JSON.stringify(payload)
    });

    const fsData = await formSubmitResponse.json();
    return NextResponse.json({ success: true, method: 'formsubmit', data: fsData });
  } catch (error: any) {
    console.error('Error in approve-email API route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
