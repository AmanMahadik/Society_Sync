import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import path from 'path';

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
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'Missing status field' }, { status: 400, headers: corsHeaders });
    }

    // Input fields validation
    if (status === 'visitor_approval') {
      const { residentEmail, visitorName, wing, flatNumber } = body;
      if (!residentEmail || !visitorName || !wing || !flatNumber) {
        return NextResponse.json({ error: 'Missing required fields for visitor approval email' }, { status: 400, headers: corsHeaders });
      }
    } else if (status !== 'support_query') {
      const { adminEmail, adminName, societyName } = body;
      if (!adminEmail || !societyName || !adminName) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers: corsHeaders });
      }
    } else {
      const { userEmail, userName, message } = body;
      if (!userEmail || !userName || !message) {
        return NextResponse.json({ error: 'Missing required fields for support query' }, { status: 400, headers: corsHeaders });
      }
    }

    const { adminEmail, adminName, societyName } = body;
    const gmailUser = process.env.EMAIL_USER || 'societysync5@gmail.com';
    const gmailPass = process.env.EMAIL_PASS || 'coid caoh ncjf flok';

    // Prepare email content
    let subject = '';
    let messageText = '';
    let messageHtml = '';

    if (status === 'approved') {
      const { societyCode } = body;
      if (!societyCode) {
        return NextResponse.json({ error: 'Missing societyCode for approval' }, { status: 400, headers: corsHeaders });
      }

      subject = `🏢 SocietySync Registration Approved: ${societyName}`;
      messageText = `Hello ${adminName},

Congratulations! Your registration request for "${societyName}" has been successfully approved by the Master Admin team. 

Your unique Society Code is: ${societyCode}

You can now log in to the Web Admin Portal to manage your society operations. To onboarding residents:
1. Ask them to install the mobile app via the download link: https://expo.dev/accounts/aman1611/projects/society-sync/builds/83da809f-7ae0-4cd1-ba99-559bdab33899
2. Tell them to register using the Society Code: ${societyCode}
3. Approve their profiles in the Roster.
4. Note: The first user who registers using this Society Code will automatically be assigned the Administrator (Admin) role. All subsequent users will be registered as residents and will require approval before accessing society services.

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
            <li style="margin-bottom: 15px;">Direct residents to install the mobile application via the build link: <br/>
              <a href="https://expo.dev/accounts/aman1611/projects/society-sync/builds/83da809f-7ae0-4cd1-ba99-559bdab33899" style="color: #00d4aa; text-decoration: none; font-weight: bold;">Download App Here</a>
              <div style="margin-top: 10px; text-align: center;">
                <span style="font-size: 11px; color: #6b7280; display: block; margin-bottom: 5px;">Scan QR Code to Download:</span>
                <img src="cid:app_qr_code" style="width: 140px; height: 140px; border: 1px solid #e5e7eb; border-radius: 6px; padding: 5px;" alt="App QR Code" />
              </div>
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
    } else if (status === 'suspended') {
      subject = `⚠️ SocietySync Account Suspended: ${societyName}`;
      messageText = `Hello ${adminName},

We are writing to inform you that your SocietySync account for the society "${societyName}" has been suspended by the Master Admin team.

During this suspension:
- Access to the Web Admin Portal will be blocked.
- Residents and security guards will not be able to log in or use the mobile app.
- All real-time visitor gate pass approvals and services are temporarily paused.

If you have any questions or would like to request reactivation, please contact our support team.`;

      messageHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff; color: #374151;">
          <h2 style="color: #f59e0b; text-align: center; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">⚠️ Account Suspended</h2>
          <p>Hello <strong>${adminName}</strong>,</p>
          <p>We are writing to inform you that your SocietySync account for the society <strong>"${societyName}"</strong> has been suspended by the Master Admin team.</p>
          
          <div style="background-color: #fffbeb; border: 1px dashed #fcd34d; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #b45309; font-weight: bold;">Impact of Suspension:</p>
            <ul style="margin: 5px 0 0 0; font-size: 14px; color: #78350f; line-height: 1.5; padding-left: 20px;">
              <li>Access to the Web Admin Portal is temporarily blocked.</li>
              <li>Residents and security guards cannot log in or access mobile app features.</li>
              <li>Real-time notifications and visitor gate pass approvals are paused.</li>
            </ul>
          </div>

          <p>If you believe this suspension is an error or would like to resolve the issue and request reactivation, please contact our Master Admin support team.</p>
          
          <p style="font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 15px; text-align: center; margin-top: 30px;">This is an automated message sent from SocietySync Admin Team.</p>
        </div>
      `;
    } else if (status === 'activated') {
      subject = `✅ SocietySync Account Reactivated: ${societyName}`;
      messageText = `Hello ${adminName},

Great news! Your SocietySync account for the society "${societyName}" has been reactivated by the Master Admin team.

All services have been restored:
- You can now log in to the Web Admin Portal as usual.
- Residents and security guards can log back into the mobile app and resume operations.

Thank you for your cooperation!`;

      messageHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff; color: #374151;">
          <h2 style="color: #10b981; text-align: center; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">✅ Account Reactivated</h2>
          <p>Hello <strong>${adminName}</strong>,</p>
          <p>Great news! Your SocietySync account for the society <strong>"${societyName}"</strong> has been reactivated by the Master Admin team.</p>
          
          <div style="background-color: #ecfdf5; border: 1px dashed #6ee7b7; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #047857; font-weight: bold;">Status Restored:</p>
            <ul style="margin: 5px 0 0 0; font-size: 14px; color: #065f46; line-height: 1.5; padding-left: 20px;">
              <li>Full access to the Web Admin Portal is restored.</li>
              <li>Residents and security guards can log in and access all mobile features.</li>
              <li>All services and notifications are fully operational.</li>
            </ul>
          </div>

          <p>You can now log in and continue managing your society. Thank you for your patience and cooperation.</p>
          
          <p style="font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 15px; text-align: center; margin-top: 30px;">This is an automated message sent from SocietySync Admin Team.</p>
        </div>
      `;
    } else if (status === 'deleted') {
      subject = `🚨 SocietySync Account Permanently Deleted: ${societyName}`;
      messageText = `Hello ${adminName},

We are writing to notify you that the society "${societyName}" has been permanently deleted from the SocietySync platform by the Master Admin team.

Please note:
- All associated data including resident rosters, guard logs, visitor history, and configurations have been permanently wiped.
- This action is irreversible, and you will no longer be able to log in or retrieve any information.

We appreciate you being part of SocietySync. If you have any questions, please contact the Master Admin team.`;

      messageHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff; color: #374151;">
          <h2 style="color: #dc2626; text-align: center; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">🚨 Account Permanently Deleted</h2>
          <p>Hello <strong>${adminName}</strong>,</p>
          <p>We are writing to notify you that the society <strong>"${societyName}"</strong> has been permanently deleted from the SocietySync platform by the Master Admin team.</p>
          
          <div style="background-color: #fef2f2; border: 1px dashed #fca5a5; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #b91c1c; font-weight: bold;">Important Notice:</p>
            <ul style="margin: 5px 0 0 0; font-size: 14px; color: #7f1d1d; line-height: 1.5; padding-left: 20px;">
              <li>All resident profiles, admin credentials, and guard accounts have been removed.</li>
              <li>Visitor history, passcodes, and society settings have been permanently wiped.</li>
              <li>This action is irreversible and no data can be recovered.</li>
            </ul>
          </div>

          <p>Thank you for using SocietySync. If you have any final inquiries, please get in touch with the Master Admin team.</p>
          
          <p style="font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 15px; text-align: center; margin-top: 30px;">This is an automated message sent from SocietySync Admin Team.</p>
        </div>
      `;
    } else if (status === 'support_query') {
      const { userEmail, userName, flat, message } = body;
      subject = `❓ New SocietySync Support Inquiry from ${userName}`;
      messageText = `Hello,

A new support request has been submitted from the marketing/info website:

- Name: ${userName}
- Email: ${userEmail}
- Flat/Unit: ${flat || 'N/A'}
- Message:
${message}

A copy of this inquiry has been CC'd to the user.`;

      messageHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff; color: #374151;">
          <h2 style="color: #00d4aa; text-align: center; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">❓ Support Request</h2>
          <p>A new support request has been submitted from the marketing/info website:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 8px 0; font-weight: bold; width: 120px;">Name:</td>
              <td style="padding: 8px 0;">${userName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 8px 0; font-weight: bold;">Email:</td>
              <td style="padding: 8px 0;"><a href="mailto:${userEmail}" style="color: #00d4aa; text-decoration: none;">${userEmail}</a></td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 8px 0; font-weight: bold;">Flat/Unit:</td>
              <td style="padding: 8px 0;">${flat || 'N/A'}</td>
            </tr>
          </table>

          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 15px; border-radius: 6px; margin: 20px 0; white-space: pre-wrap;">
            <strong>Message:</strong><br/>
            ${message}
          </div>

          <p style="font-size: 11px; color: #6b7280; text-align: center; border-top: 1px solid #f3f4f6; padding-top: 15px; margin-top: 30px;">
            A copy of this message has been sent to the sender at ${userEmail}.
          </p>
        </div>
      `;
    } else if (status === 'broadcast') {
      const { broadcastMessage } = body;
      subject = `📢 SocietySync System Announcement for ${societyName}`;
      messageText = `Hello ${adminName},

We have an important announcement from the SocietySync Master Admin team:

${broadcastMessage}

Best regards,
The SocietySync Master Admin Team`;

      messageHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff; color: #374151;">
          <h2 style="color: #dc2626; text-align: center; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">📢 System Announcement</h2>
          <p>Hello <strong>${adminName}</strong>,</p>
          <p>We are writing to communicate an official broadcast announcement from the SocietySync Master Admin team to the society <strong>"${societyName}"</strong>:</p>
          
          <div style="background-color: #f9fafb; border-left: 4px solid #dc2626; padding: 15px; border-radius: 4px; margin: 20px 0; white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #1f2937;">
            ${broadcastMessage}
          </div>
          
          <p>If you have any questions or require support regarding this notice, please get in touch with us.</p>
          <p style="font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 15px; text-align: center; margin-top: 30px;">This notice is sent directly from SocietySync Master Operations.</p>
        </div>
      `;
    } else if (status === 'visitor_approval') {
      const { residentEmail, visitorName, purpose, wing, flatNumber, photoUrl } = body;
      subject = `🚨 Gate Entry Requested: ${visitorName}`;
      messageText = `Hello,

A visitor is waiting at the main gate and requests your entry approval.

Visitor Details:
- Name: ${visitorName}
- Purpose: ${purpose || 'Visitor'}
- Destination: Wing ${wing} - Flat ${flatNumber}

Please open the SocietySync mobile app to Approve or Deny entry.`;

      messageHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff; color: #374151;">
          <h2 style="color: #00d4aa; text-align: center; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">🚨 Gate Entry Requested</h2>
          <p>Hello Resident,</p>
          <p>A visitor is waiting at the main gate and requests your entry approval.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #4b5563;"><strong>Visitor Name:</strong> ${visitorName}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #4b5563;"><strong>Purpose of Visit:</strong> ${purpose || 'Visitor'}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #4b5563;"><strong>Destination Flat:</strong> Wing ${wing} - Flat ${flatNumber}</p>
          </div>
          
          ${photoUrl ? `
          <div style="text-align: center; margin: 20px 0;">
            <img src="${photoUrl}" style="max-width: 240px; border-radius: 8px; border: 1px solid #e5e7eb;" alt="Visitor Photo" />
          </div>
          ` : ''}

          <p>Please open your <strong>SocietySync Mobile Application</strong> immediately to Approve or Deny this visitor.</p>
          
          <p style="font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 15px; text-align: center; margin-top: 30px;">This is an automated gate security message from SocietySync.</p>
        </div>
      `;
    } else {
      return NextResponse.json({ error: 'Invalid status type' }, { status: 400, headers: corsHeaders });
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

      const attachments = [];

      if (status === 'approved') {
        // 1. Attach QR Code inline
        const qrPath = path.join(process.cwd(), 'public', 'qr_code.png');
        if (fs.existsSync(qrPath)) {
          attachments.push({
            filename: 'qr_code.png',
            path: qrPath,
            cid: 'app_qr_code'
          });
          console.log('Attached QR code to email inline.');
        } else {
          console.warn('QR code image not found at path:', qrPath);
        }

        // 2. Scan public folder for user_manual files (e.g. user_manual.pdf, user_manual.docx)
        const publicDir = path.join(process.cwd(), 'public');
        if (fs.existsSync(publicDir)) {
          const files = fs.readdirSync(publicDir);
          const manualFile = files.find(f => f.toLowerCase().startsWith('user_manual.'));
          if (manualFile) {
            const manualPath = path.join(publicDir, manualFile);
            attachments.push({
              filename: manualFile,
              path: manualPath
            });
            console.log(`Found and attached user manual: ${manualFile}`);
          } else {
            console.warn('No user_manual.* file found in public directory.');
          }
        } else {
          console.warn('Public directory not found at path:', publicDir);
        }
      }

      let toEmail = adminEmail;
      let ccEmail = undefined;

      if (status === 'support_query') {
        const { userEmail } = body;
        toEmail = gmailUser;
        ccEmail = userEmail;
      } else if (status === 'visitor_approval') {
        const { residentEmail } = body;
        toEmail = residentEmail;
      }

      const info = await transporter.sendMail({
        from: `"SocietySync" <${gmailUser}>`,
        to: toEmail,
        cc: ccEmail,
        subject: subject,
        text: messageText,
        html: messageHtml,
        attachments: attachments
      });

      console.log('Nodemailer email sent successfully:', info.messageId);
      return NextResponse.json({ success: true, method: 'nodemailer', messageId: info.messageId }, { headers: corsHeaders });
    }

    // Fallback: Send email via FormSubmit (free static email delivery tool)
    console.log('Gmail App Password not found in environment variables. Falling back to FormSubmit...');
    const token = '19bcd09a7561ac0a204d32703f974dbb';

    // Replace inline cid with public URL for FormSubmit compatibility
    const fallbackHtml = messageHtml.replace('cid:app_qr_code', 'https://society-sync-portal.vercel.app/qr_code.png');

    let payloadName = adminName;
    let payloadEmail = adminEmail;
    if (status === 'support_query') {
      const { userName, userEmail } = body;
      payloadName = userName;
      payloadEmail = userEmail;
    } else if (status === 'visitor_approval') {
      const { visitorName, residentEmail } = body;
      payloadName = visitorName;
      payloadEmail = residentEmail;
    }

    const payload = {
      name: payloadName,
      email: payloadEmail,
      society: societyName || 'N/A',
      status: status.toUpperCase(),
      message: messageText,
      _cc: payloadEmail,
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
    return NextResponse.json({ success: true, method: 'formsubmit', data: fsData }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error in approve-email API route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}
