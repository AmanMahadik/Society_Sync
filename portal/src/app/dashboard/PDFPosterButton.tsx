'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Image } from '@react-pdf/renderer';

// PDF Document Stylesheet
const pdfStyles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    fontFamily: 'Helvetica',
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 6,
  },
  subHeader: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 25,
  },
  card: {
    borderWidth: 2,
    borderColor: '#00a383',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    width: '100%',
    marginBottom: 20,
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  code: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00a383',
    letterSpacing: 3,
  },
  qrContainerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  qrBox: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  qrTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  qrImage: {
    width: 110,
    height: 110,
    marginBottom: 8,
  },
  qrDesc: {
    fontSize: 9,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 1.3,
  },
  box: {
    padding: 15,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    width: '100%',
    marginBottom: 20,
  },
  boxTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  step: {
    fontSize: 10,
    color: '#334155',
    marginBottom: 5,
    lineHeight: 1.4,
  },
  footer: {
    marginTop: 'auto',
    fontSize: 8,
    color: '#94a3b8',
    textAlign: 'center',
  }
});

// A4 Poster Document Generator
const PosterDocument = ({ societyName, societyCode }: { societyName: string; societyCode: string }) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.header}>{societyName}</Text>
      <Text style={pdfStyles.subHeader}>Welcome to the Digital Housing Community</Text>
      
      <View style={pdfStyles.card}>
        <Text style={pdfStyles.codeLabel}>Our Official Society Code</Text>
        <Text style={pdfStyles.code}>{societyCode}</Text>
      </View>

      <View style={pdfStyles.qrContainerRow}>
        {/* QR Code 1: Download App */}
        <View style={pdfStyles.qrBox}>
          <Text style={pdfStyles.qrTitle}>1. Scan to Install App</Text>
          <Image 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('https://expo.dev/accounts/aman1611/projects/Society_Sync/builds/e5ad992f-d0e5-499f-b19c-20f4430835b5')}`} 
            style={pdfStyles.qrImage} 
          />
          <Text style={pdfStyles.qrDesc}>Download the official SocietySync app build onto your device.</Text>
        </View>

        {/* QR Code 2: Society Code */}
        <View style={pdfStyles.qrBox}>
          <Text style={pdfStyles.qrTitle}>2. Scan Code to Join</Text>
          <Image 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(societyCode)}`} 
            style={pdfStyles.qrImage} 
          />
          <Text style={pdfStyles.qrDesc}>Scan during register flat screen to extract code and join society.</Text>
        </View>
      </View>

      <View style={pdfStyles.box}>
        <Text style={pdfStyles.boxTitle}>Quick Onboarding Instructions:</Text>
        <Text style={pdfStyles.step}>1. Scan the left QR code to download and install SocietySync.</Text>
        <Text style={pdfStyles.step}>2. Open the app, tap Sign Up, and scan or type the Society Code above.</Text>
        <Text style={pdfStyles.step}>3. Enter your flat coordinates and complete your profile registration.</Text>
      </View>

      <Text style={pdfStyles.footer}>Powered by SocietySync © {new Date().getFullYear()}</Text>
    </Page>
  </Document>
);

interface PDFPosterButtonProps {
  societyName: string;
  societyCode: string;
}

export default function PDFPosterButton({ societyName, societyCode }: PDFPosterButtonProps) {
  return (
    <PDFDownloadLink
      document={<PosterDocument societyName={societyName} societyCode={societyCode} />}
      fileName={`${societyName.replace(/\s+/g, '_')}_SocietyCode_Poster.pdf`}
      className="w-full py-3 bg-[#00d4aa]/15 border border-[#00d4aa]/30 hover:border-[#00d4aa] text-[#00d4aa] hover:bg-[#00d4aa]/25 text-center font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-2"
    >
      {({ loading: pdfLoading }) => (pdfLoading ? 'Preparing PDF...' : 'DOWNLOAD PRINTABLE A4 POSTER')}
    </PDFDownloadLink>
  );
}
