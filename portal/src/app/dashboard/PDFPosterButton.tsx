'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';

// PDF Document Stylesheet
const pdfStyles = StyleSheet.create({
  page: {
    padding: 50,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    fontFamily: 'Helvetica',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subHeader: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 40,
  },
  card: {
    borderWidth: 2,
    borderColor: '#00a383',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    width: '100%',
    marginBottom: 30,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  code: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#00a383',
    letterSpacing: 3,
  },
  box: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    width: '100%',
  },
  boxTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 10,
  },
  step: {
    fontSize: 11,
    color: '#334155',
    marginBottom: 6,
    lineHeight: 1.4,
  },
  footer: {
    marginTop: 'auto',
    fontSize: 9,
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

      <View style={pdfStyles.box}>
        <Text style={pdfStyles.boxTitle}>Quick Onboarding Instructions:</Text>
        <Text style={pdfStyles.step}>1. Download the SocietySync mobile app from the Play Store or App Store.</Text>
        <Text style={pdfStyles.step}>2. Open the app, tap Sign Up, and enter the unique Society Code above.</Text>
        <Text style={pdfStyles.step}>3. Enter your flat coordinates and complete your profile authentication.</Text>
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
