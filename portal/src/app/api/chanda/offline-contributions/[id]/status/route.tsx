import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../../../lib/supabaseServer';
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

const OfflineReceiptPDF = ({ contribution, resident, campaign, wing, flatNumber }: any) => {
  const dateStr = new Date(contribution.collected_at).toLocaleDateString('en-IN', {
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
            <Text><Text style={pdfStyles.label}>Receipt No: </Text><Text style={pdfStyles.value}>{contribution.receipt_number}</Text></Text>
            <Text><Text style={pdfStyles.label}>Date: </Text><Text style={pdfStyles.value}>{dateStr}</Text></Text>
            <Text><Text style={pdfStyles.label}>Campaign: </Text><Text style={pdfStyles.value}>{campaign.title}</Text></Text>
          </View>
          <View style={{ gap: 3, textAlign: 'right' }}>
            <Text><Text style={pdfStyles.label}>Resident: </Text><Text style={pdfStyles.value}>{resident ? resident.full_name : contribution.payer_name}</Text></Text>
            <Text><Text style={pdfStyles.label}>Wing/Flat: </Text><Text style={pdfStyles.value}>{wing.name} - Flat {flatNumber}</Text></Text>
            <Text><Text style={pdfStyles.label}>Phone: </Text><Text style={pdfStyles.value}>{resident?.phone || 'N/A'}</Text></Text>
          </View>
        </View>

        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableRowHeader}>
            <Text style={[pdfStyles.col1, pdfStyles.label]}>Description</Text>
            <Text style={[pdfStyles.col2, pdfStyles.label, { textAlign: 'right' }]}>Amount</Text>
          </View>
          <View style={pdfStyles.tableRow}>
            <Text style={pdfStyles.col1}>Contribution to {campaign.title} Fund</Text>
            <Text style={[pdfStyles.col2, pdfStyles.value]}>INR {Number(contribution.amount).toFixed(2)}</Text>
          </View>
          <View style={pdfStyles.totalContainer}>
            <Text style={[pdfStyles.totalLabel, { marginRight: 20 }]}>Total Paid:</Text>
            <Text style={pdfStyles.totalValue}>INR {Number(contribution.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          </View>
        </View>

        <View style={{ marginBottom: 30 }}>
          <Text style={[pdfStyles.label, { marginBottom: 5 }]}>Payment Mode:</Text>
          <Text style={pdfStyles.value}>Offline ({contribution.collection_mode.toUpperCase()})</Text>
          {contribution.upi_reference_id && (
            <Text style={{ fontSize: 8, color: '#6b7280', marginTop: 2 }}>UPI Ref: {contribution.upi_reference_id}</Text>
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

async function generateOfflineReceipt(contributionId: string) {
  try {
    const { data: contribution } = await supabaseServer
      .from('chanda_offline_contributions')
      .select('*')
      .eq('id', contributionId)
      .single();

    if (!contribution) return;

    let resident = null;
    if (contribution.resident_id) {
      const { data } = await supabaseServer
        .from('profiles')
        .select('*')
        .eq('id', contribution.resident_id)
        .single();
      resident = data;
    }

    const { data: campaign } = await supabaseServer
      .from('chanda_campaigns')
      .select('*')
      .eq('id', contribution.campaign_id)
      .single();

    const { data: wing } = await supabaseServer
      .from('wings')
      .select('*')
      .eq('id', contribution.wing_id)
      .single();

    const flatNumber = resident?.flat_number || 'N/A';

    const doc = React.createElement(OfflineReceiptPDF, { contribution, resident, campaign, wing, flatNumber });
    const buffer = await renderToBuffer(doc);

    const fileName = `${contribution.society_id}/offline_${contribution.id}.pdf`;
    const { error: uploadError } = await supabaseServer.storage
      .from('chanda-receipts')
      .upload(fileName, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabaseServer.storage
      .from('chanda-receipts')
      .getPublicUrl(fileName);

    const receiptUrl = publicUrlData?.publicUrl || '';

    await supabaseServer
      .from('chanda_offline_contributions')
      .update({
        receipt_url: receiptUrl,
      })
      .eq('id', contribution.id);

    if (contribution.resident_id) {
      await supabaseServer
        .from('notifications')
        .insert({
          society_id: contribution.society_id,
          user_id: contribution.resident_id,
          title: '🎉 Offline Contribution Verified',
          body: `Your offline payment of ₹${contribution.amount} for "${campaign.title}" was verified. Receipt ${contribution.receipt_number} is ready.`,
          is_read: false,
        });
    }
  } catch (e) {
    console.error('Error generating offline PDF receipt:', e);
  }
}

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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const origin = req.headers.get('origin') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
  };

  try {
    const body = await req.json();
    const { status, verifiedBy, rejectionReason } = body;

    if (!status || !['verified', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status parameter' }, { status: 400, headers: corsHeaders });
    }

    if (status === 'verified') {
      const receiptNumber = `REC-CH-OFF-${Math.floor(100000 + Math.random() * 900000)}`;

      const { data: contribution, error } = await supabaseServer
        .from('chanda_offline_contributions')
        .update({
          status: 'verified',
          verified_by: verifiedBy,
          verified_at: new Date().toISOString(),
          receipt_number: receiptNumber,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Generate receipt
      generateOfflineReceipt(id);

      return NextResponse.json({ success: true, contribution }, { headers: corsHeaders });
    } else {
      if (!rejectionReason) {
        return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400, headers: corsHeaders });
      }

      const { data: contribution, error } = await supabaseServer
        .from('chanda_offline_contributions')
        .update({
          status: 'rejected',
          verified_by: verifiedBy,
          verified_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (contribution.resident_id) {
        const { data: campaign } = await supabaseServer
          .from('chanda_campaigns')
          .select('title')
          .eq('id', contribution.campaign_id)
          .single();

        await supabaseServer
          .from('notifications')
          .insert({
            society_id: contribution.society_id,
            user_id: contribution.resident_id,
            title: '❌ Offline Contribution Rejected',
            body: `Your offline payment of ₹${contribution.amount} for "${campaign?.title || 'Chanda'}" was rejected. Reason: ${rejectionReason}`,
            is_read: false,
          });
      }

      return NextResponse.json({ success: true, contribution }, { headers: corsHeaders });
    }
  } catch (error: any) {
    console.error('Error verifying offline contribution:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}
