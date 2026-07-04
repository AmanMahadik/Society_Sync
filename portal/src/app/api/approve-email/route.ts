import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { adminEmail, adminName, societyName, status } = body;

    if (!adminEmail || !societyName || !adminName || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (status === 'approved') {
      const { societyCode } = body;
      if (!societyCode) {
        return NextResponse.json({ error: 'Missing societyCode for approval' }, { status: 400 });
      }

      const payload = {
        name: adminName,
        email: adminEmail,
        society: societyName,
        status: "APPROVED / ACTIVE",
        unique_society_code: societyCode,
        app_download_link: "https://expo.dev/accounts/aman1611/projects/Society_Sync/builds/e5ad992f-d0e5-499f-b19c-20f4430835b5",
        qr_code_image: "https://society-sync-info.vercel.app/qr_code.png",
        _subject: `🏢 SocietySync Registration Approved: ${societyName}`,
        _template: "box",
        message: `Hello ${adminName},

Congratulations! Your registration request for "${societyName}" has been successfully approved by the Master Admin team. 

Your unique Society Code is: ${societyCode}

You can now log in to the Web Admin Portal to manage your society operations. To onboard residents:
1. Ask them to install the mobile app via the download link: https://expo.dev/accounts/aman1611/projects/Society_Sync/builds/e5ad992f-d0e5-499f-b19c-20f4430835b5
2. Tell them to register using the Society Code: ${societyCode}
3. Approve their profiles in the Roster.

Welcome to SocietySync!`
      };

      const formSubmitResponse = await fetch(`https://formsubmit.co/ajax/${adminEmail}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const fsData = await formSubmitResponse.json();
      return NextResponse.json({ success: true, data: fsData });
    }

    if (status === 'rejected') {
      const { rejectionReason } = body;
      const payload = {
        name: adminName,
        email: adminEmail,
        society: societyName,
        status: "REJECTED / DECLINED",
        rejection_reason: rejectionReason || 'Invalid documents or details',
        _subject: `❌ SocietySync Registration Rejected: ${societyName}`,
        _template: "box",
        message: `Hello ${adminName},

We regret to inform you that your registration request for "${societyName}" has been rejected by the Master Admin team.

Reason for Rejection: ${rejectionReason || 'Invalid documents or details'}

If you believe this was an error, please verify your registration details and submit a new request with the correct documents.`
      };

      const formSubmitResponse = await fetch(`https://formsubmit.co/ajax/${adminEmail}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const fsData = await formSubmitResponse.json();
      return NextResponse.json({ success: true, data: fsData });
    }

    return NextResponse.json({ error: 'Invalid status type' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in approve-email API route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
