import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseServer } from '../../../../lib/supabaseServer';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const pdfStyles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#374151', backgroundColor: '#ffffff' },
  header: { borderBottomWidth: 2, borderBottomColor: '#00d4aa', paddingBottom: 15, marginBottom: 20 },
  societyName: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  receiptTitle: { fontSize: 14, fontWeight: 'bold', color: '#00d4aa', marginTop: 10 },
  detailsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  label: { fontWeight: 'bold', color: '#4b5563' },
  value: { color: '#111827' },
  table: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, overflow: 'hidden', marginBottom: 25 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', padding: 8 },
  tableRowHeader: { flexDirection: 'row', backgroundColor: '#f9fafb', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', padding: 8 },
  col1: { width: '70%' },
  col2: { width: '30%', textAlign: 'right' },
  totalContainer: { flexDirection: 'row', justifyContent: 'flex-end', padding: 8 },
  totalLabel: { fontWeight: 'bold', color: '#111827' },
  totalValue: { fontWeight: 'bold', color: '#00d4aa', fontSize: 12 },
  footer: { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 15, textAlign: 'center', color: '#9ca3af', fontSize: 8, marginTop: 40 }
});

const ReceiptPDF = ({ payment, resident, campaign, wing, flatNumber }: any) => {
  const dateStr = new Date(payment.paid_at || payment.created_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.societyName}>SOCIETYSYNC CO-OPERATIVE HOUSING COUNCIL</Text>
          <Text style={{ fontSize: 9, color: '#6b7280', marginTop: 2 }}>Official Maintenance & Funds Collection Receipt</Text>
        </View>

        <View style={pdfStyles.detailsContainer}>
          <View style={{ gap: 3 }}>
            <Text><Text style={pdfStyles.label}>Receipt No: </Text><Text style={pdfStyles.value}>{payment.receipt_number}</Text></Text>
            <Text><Text style={pdfStyles.label}>Date: </Text><Text style={pdfStyles.value}>{dateStr}</Text></Text>
            <Text><Text style={pdfStyles.label}>Campaign: </Text><Text style={pdfStyles.value}>{campaign.title}</Text></Text>
          </View>
          <View style={{ gap: 3, textAlign: 'right' }}>
            <Text><Text style={pdfStyles.label}>Resident: </Text><Text style={pdfStyles.value}>{resident.full_name}</Text></Text>
            <Text><Text style={pdfStyles.label}>Wing/Flat: </Text><Text style={pdfStyles.value}>{wing.name} - Flat {flatNumber}</Text></Text>
            <Text><Text style={pdfStyles.label}>Phone: </Text><Text style={pdfStyles.value}>{resident.phone || 'N/A'}</Text></Text>
          </View>
        </View>

        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableRowHeader}>
            <Text style={[pdfStyles.col1, pdfStyles.label]}>Description</Text>
            <Text style={[pdfStyles.col2, pdfStyles.label, { textAlign: 'right' }]}>Amount</Text>
          </View>
          <View style={pdfStyles.tableRow}>
            <Text style={pdfStyles.col1}>Contribution to {campaign.title} Fund</Text>
            <Text style={[pdfStyles.col2, pdfStyles.value]}>INR {Number(payment.amount).toFixed(2)}</Text>
          </View>
          <View style={pdfStyles.totalContainer}>
            <Text style={[pdfStyles.totalLabel, { marginRight: 20 }]}>Total Paid:</Text>
            <Text style={pdfStyles.totalValue}>INR {Number(payment.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          </View>
        </View>

        <View style={{ marginBottom: 30 }}>
          <Text style={[pdfStyles.label, { marginBottom: 5 }]}>Payment Mode:</Text>
          <Text style={pdfStyles.value}>{payment.razorpay_payment_id ? 'Razorpay Online' : 'Offline Mode'}</Text>
          {payment.razorpay_payment_id && (
            <Text style={{ fontSize: 8, color: '#6b7280', marginTop: 2 }}>TXN Ref: {payment.razorpay_payment_id}</Text>
          )}
        </View>

        <View style={pdfStyles.footer}>
          <Text>Thank you for your valuable contribution towards the community festival fund.</Text>
          <Text style={{ marginTop: 3 }}>This is a computer-generated receipt and requires no signature.</Text>
        </View>
      </Page>
    </Document>
  );
};

async function generateAndUploadReceipt(paymentId: string) {
  try {
    // 1. Fetch details
    const { data: payment } = await supabaseServer
      .from('chanda_payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (!payment) return;

    const { data: resident } = await supabaseServer
      .from('profiles')
      .select('*')
      .eq('id', payment.resident_id)
      .single();

    const { data: campaign } = await supabaseServer
      .from('chanda_campaigns')
      .select('*')
      .eq('id', payment.campaign_id)
      .single();

    const { data: wing } = await supabaseServer
      .from('wings')
      .select('*')
      .eq('id', payment.wing_id)
      .single();

    const flatNumber = resident?.flat_number || 'N/A';

    // 2. Generate PDF Buffer
    const doc = React.createElement(ReceiptPDF, { payment, resident, campaign, wing, flatNumber });
    const buffer = await renderToBuffer(doc);

    // 3. Upload to Supabase Storage
    const fileName = `${payment.society_id}/${payment.id}.pdf`;
    const { error: uploadError } = await supabaseServer.storage
      .from('chanda-receipts')
      .upload(fileName, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: publicUrlData } = supabaseServer.storage
      .from('chanda-receipts')
      .getPublicUrl(fileName);

    const receiptUrl = publicUrlData?.publicUrl || '';

    // 4. Update payment row
    await supabaseServer
      .from('chanda_payments')
      .update({
        receipt_url: receiptUrl,
        receipt_generated_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    // 5. Insert notification
    await supabaseServer
      .from('notifications')
      .insert({
        society_id: payment.society_id,
        user_id: payment.resident_id,
        title: '🎉 Payment Received: Chanda Contribution',
        body: `Your payment of ₹${payment.amount} for "${campaign.title}" was received. Receipt ${payment.receipt_number} is ready.`,
        is_read: false,
      });
  } catch (e) {
    console.error('Error generating PDF receipt in webhook background process:', e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (webhookSecret && signatureHeader) {
      const expected = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (expected !== signatureHeader) {
        return NextResponse.json({ error: 'Signature mismatch' }, { status: 400 });
      }
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.event;
    const eventId = payload.account_id ? `${payload.account_id}_${Date.now()}` : `event_${Date.now()}`;

    // 1. Idempotency Check
    const { data: existingEvent } = await supabaseServer
      .from('chanda_webhook_events')
      .select('id')
      .eq('razorpay_event_id', eventId)
      .maybeSingle();

    if (existingEvent) {
      return NextResponse.json({ success: true, duplicate: true });
    }

    // 2. Insert event
    await supabaseServer
      .from('chanda_webhook_events')
      .insert({
        razorpay_event_id: eventId,
        event_type: eventType,
        payload: payload,
        processed: false,
      });

    // 3. Handle specific events
    if (eventType === 'payment.captured') {
      const orderId = payload.payload.payment.entity.order_id;
      const paymentId = payload.payload.payment.entity.id;
      const signature = signatureHeader || 'sig_webhook_captured';

      const receiptNumber = `REC-CH-${Math.floor(100000 + Math.random() * 900000)}`;

      // Update payment
      const { data: updatedPayments, error: updateErr } = await supabaseServer
        .from('chanda_payments')
        .update({
          status: 'paid',
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
          receipt_number: receiptNumber,
          paid_at: new Date().toISOString(),
        })
        .eq('razorpay_order_id', orderId)
        .select();

      if (!updateErr && updatedPayments && updatedPayments.length > 0) {
        // Trigger async receipt generation & upload
        generateAndUploadReceipt(updatedPayments[0].id);
      }
    } else if (eventType === 'payment.failed') {
      const orderId = payload.payload.payment.entity.order_id;
      await supabaseServer
        .from('chanda_payments')
        .update({ status: 'failed' })
        .eq('razorpay_order_id', orderId);
    } else if (eventType === 'refund.processed') {
      const paymentId = payload.payload.refund.entity.payment_id;
      await supabaseServer
        .from('chanda_payments')
        .update({ status: 'refunded' })
        .eq('razorpay_payment_id', paymentId);
    }

    // Mark event processed
    await supabaseServer
      .from('chanda_webhook_events')
      .update({ processed: true })
      .eq('razorpay_event_id', eventId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in webhook handling API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
