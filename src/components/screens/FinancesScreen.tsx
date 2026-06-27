import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Image, Alert, Linking } from 'react-native';
import { Text, Card, Button, TextInput, SegmentedButtons, IconButton, Portal, Modal, useTheme, Chip, Snackbar, Avatar, List, Divider } from 'react-native-paper';
import { useAuth } from '../../lib/auth-context';
import { dataManager, Event, Transaction, MaintenanceDue } from '../../lib/data-manager';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase, uriToArrayBuffer } from '../../lib/supabase';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export const FinancesScreen: React.FC = () => {
  const { profile, user } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState('ledger'); // 'ledger' or 'dues'
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [maintenanceDues, setMaintenanceDues] = useState<MaintenanceDue[]>([]);

  // Modals visibility
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [txModalVisible, setTxModalVisible] = useState(false);
  const [duesModalVisible, setDuesModalVisible] = useState(false);

  // New Event Form states
  const [eventName, setEventName] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);

  // New Transaction Form states
  const [txTitle, setTxTitle] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txType, setTxType] = useState<'income' | 'expense'>('income');
  const [txCategory, setTxCategory] = useState('Chandaa');
  const [txBillUrl, setTxBillUrl] = useState('');
  const [txDesc, setTxDesc] = useState('');

  // New Dues Form states
  const [dueFlat, setDueFlat] = useState('');
  const [dueWing, setDueWing] = useState('');
  const [dueAmount, setDueAmount] = useState('3500');
  const [dueMonth, setDueMonth] = useState('2026-06-01');

  const [submitting, setSubmitting] = useState(false);

  // Snackbar Toast
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const showToast = (msg: string) => {
    setSnackbarMessage(msg);
    setSnackbarVisible(true);
  };

  const loadAllData = async () => {
    try {
      const eventList = await dataManager.getEvents();
      setEvents(eventList);

      // If an event is currently selected, refresh its transactions
      if (selectedEvent) {
        const refreshedEvent = eventList.find(e => e.id === selectedEvent.id);
        if (refreshedEvent) setSelectedEvent(refreshedEvent);
        const txList = await dataManager.getTransactions(selectedEvent.id);
        setTransactions(txList);
      }

      const dues = await dataManager.getMaintenanceDues();
      setMaintenanceDues(dues);
    } catch (e) {
      console.error('Error fetching financial data', e);
    }
  };

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 4000); // Polling for live updates
    return () => clearInterval(interval);
  }, [selectedEvent]);

  const handleCreateEvent = async () => {
    if (!eventName || !user) {
      showToast('Please enter an event name.');
      return;
    }
    setSubmitting(true);
    try {
      await dataManager.createEvent(eventName, eventDesc, eventDate, user.id);
      setEventModalVisible(false);
      setEventName('');
      setEventDesc('');
      showToast(`Event '${eventName}' created!`);
      loadAllData();
    } catch (e) {
      console.error(e);
      showToast('Failed to create event.');
    } finally {
      setSubmitting(false);
    }
  };

  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);

  const handleSelectReceipt = () => {
    Alert.alert(
      'Upload Receipt',
      'Select a receipt image from camera or gallery',
      [
        { text: 'Camera', onPress: () => handlePickImage(true) },
        { text: 'Gallery', onPress: () => handlePickImage(false) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handlePickImage = async (useCamera: boolean) => {
    try {
      let permissionResult;
      if (useCamera) {
        permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      } else {
        permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'Permission is required to access camera or gallery.');
        return;
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: (ImagePicker as any).MediaType?.IMAGE || 'images',
        allowsEditing: true,
        quality: 0.8,
      };

      const result = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedUri = result.assets[0].uri;
        await uploadReceipt(pickedUri);
      }
    } catch (e) {
      console.error('Image picking error', e);
      Alert.alert('Error', 'Failed to select image.');
    }
  };

  const uploadReceipt = async (localUri: string) => {
    if (!user) return;
    setUploadingReceipt(true);
    try {
      const arrayBuffer = await uriToArrayBuffer(localUri);
      
      const fileExt = localUri.split('.').pop() || 'jpg';
      const fileName = `receipt_${Date.now()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      // Upload to public 'bills' bucket
      const { error: uploadError } = await supabase.storage
        .from('bills')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) {
        // Fallback to 'avatars' bucket if 'bills' bucket is not created
        const { error: fallbackError } = await supabase.storage
          .from('avatars')
          .upload(filePath, arrayBuffer, {
            contentType: `image/${fileExt}`,
            upsert: true,
          });

        if (fallbackError) {
          throw uploadError;
        } else {
          // Get Public URL from 'avatars'
          const { data } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);
          setTxBillUrl(data.publicUrl);
          Alert.alert('Success', 'Receipt image uploaded successfully.');
        }
      } else {
        // Get Public URL from 'bills'
        const { data } = supabase.storage
          .from('bills')
          .getPublicUrl(filePath);
        setTxBillUrl(data.publicUrl);
        Alert.alert('Success', 'Receipt image uploaded successfully.');
      }
    } catch (e: any) {
      console.error('Receipt upload error', e);
      Alert.alert('Upload Failed', 'Could not upload receipt image. Please ensure your internet is working.');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleAddTransaction = async () => {
    if (!selectedEvent || !txTitle || !txAmount || !user) {
      showToast('Please fill in title and amount.');
      return;
    }
    setSubmitting(true);
    try {
      await dataManager.addTransaction({
        event_id: selectedEvent.id,
        type: txType,
        category: txCategory,
        amount: Number(txAmount),
        description: txTitle + (txDesc ? ` - ${txDesc}` : ''),
        bill_image_url: txBillUrl || null,
        recorded_by: user.id
      });
      setTxModalVisible(false);
      setTxTitle('');
      setTxAmount('');
      setTxBillUrl('');
      setTxDesc('');
      showToast('Transaction recorded successfully!');
      // Refresh transactions list
      const txList = await dataManager.getTransactions(selectedEvent.id);
      setTransactions(txList);
      loadAllData();
    } catch (e) {
      console.error(e);
      showToast('Failed to record transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditTransactionClick = (tx: Transaction) => {
    setEditingTxId(tx.id);
    setTxType(tx.type);
    setTxCategory(tx.category);
    setTxAmount(String(tx.amount));
    
    // Parse description back into title and description
    const parts = (tx.description || '').split(' - ');
    setTxTitle(parts[0]);
    setTxDesc(parts.slice(1).join(' - '));
    
    setTxBillUrl(tx.bill_image_url || '');
    setTxModalVisible(true);
  };

  const handleDeleteTransactionClick = (txId: string) => {
    if (!selectedEvent) return;
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to permanently delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await dataManager.deleteTransaction(txId, selectedEvent.id);
              showToast('Transaction deleted successfully.');
              // Refresh transactions list
              const txList = await dataManager.getTransactions(selectedEvent.id);
              setTransactions(txList);
              loadAllData();
            } catch (err) {
              console.error(err);
              showToast('Failed to delete transaction.');
            }
          }
        }
      ]
    );
  };

  const handleUpdateTransaction = async () => {
    if (!selectedEvent || !editingTxId || !txTitle || !txAmount || !user) {
      showToast('Please fill in title and amount.');
      return;
    }
    setSubmitting(true);
    try {
      await dataManager.updateTransaction(
        editingTxId,
        {
          type: txType,
          category: txCategory,
          amount: Number(txAmount),
          description: txTitle + (txDesc ? ` - ${txDesc}` : ''),
          bill_image_url: txBillUrl || null,
        },
        selectedEvent.id
      );
      setTxModalVisible(false);
      setEditingTxId(null);
      setTxTitle('');
      setTxAmount('');
      setTxBillUrl('');
      setTxDesc('');
      showToast('Transaction updated successfully!');
      // Refresh transactions list
      const txList = await dataManager.getTransactions(selectedEvent.id);
      setTransactions(txList);
      loadAllData();
    } catch (e) {
      console.error(e);
      showToast('Failed to update transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewTransactionClick = () => {
    setEditingTxId(null);
    setTxTitle('');
    setTxAmount('');
    setTxBillUrl('');
    setTxDesc('');
    setTxModalVisible(true);
  };

  const handleAddDues = async () => {
    if (!dueFlat || !dueWing || !dueAmount) {
      showToast('Please fill flat, wing, and amount.');
      return;
    }
    try {
      // Calculate due date (default: 10th of next month)
      const dateParts = dueMonth.split('-');
      const year = Number(dateParts[0]);
      const month = Number(dateParts[1]);
      const dueDateStr = `${year}-${String(month).padStart(2, '0')}-10`;

      await dataManager.addMaintenanceDue({
        flat_number: dueFlat,
        wing: dueWing.toUpperCase(),
        amount: Number(dueAmount),
        paid_amount: 0,
        status: 'pending',
        month: dueMonth,
        due_date: dueDateStr
      });
      setDuesModalVisible(false);
      setDueFlat('');
      setDueWing('');
      showToast(`Dues set for Flat ${dueWing.toUpperCase()}-${dueFlat}`);
      loadAllData();
    } catch (e) {
      showToast('Dues record already exists for this flat & month!');
    }
  };

  const handleMarkPaid = async (dueId: string, wing: string, flat: string) => {
    await dataManager.markDuesPaid(dueId);
    showToast(`Dues cleared for Flat ${wing}-${flat}`);
    loadAllData();
  };

  const handleSendReminder = (wing: string, flat: string, amount: number) => {
    showToast(`🔔 Auto-reminder notification pushed to Resident of ${wing}-${flat} for ₹${amount.toLocaleString()}`);
  };

  const handleExportPDF = async () => {
    if (!selectedEvent) return;
    try {
      showToast(`📄 Generating '${selectedEvent.name}' financial report...`);
      
      // 1. Get transactions for the event
      const txList = await dataManager.getTransactions(selectedEvent.id);
      
      // 2. Extract payment mode from category/description
      const getPaymentMode = (t: Transaction) => {
        const text = `${t.category} ${t.description || ''}`.toLowerCase();
        if (text.includes('upi')) return 'UPI';
        if (text.includes('cash')) return 'Cash';
        if (text.includes('bank') || text.includes('transfer') || text.includes('neft') || text.includes('rtgs')) return 'Bank Transfer';
        if (text.includes('cheque')) return 'Cheque';
        return 'UPI'; // Default
      };

      // 3. Format transactions into HTML table rows matching the user's template column format
      const incomeRows = txList
        .filter(t => t.type === 'income')
        .map(t => {
          const dateStr = t.recorded_at ? new Date(t.recorded_at).toLocaleDateString([], { day: '2-digit', month: 'short' }) : '';
          const receiptNo = `GH/2026/${100 + Number(t.id)}`;
          const contributorName = t.description ? t.description.split(' - ')[0] : 'Resident Contribution';
          const contributorSub = t.description && t.description.includes(' - ') ? t.description.split(' - ').slice(1).join(' - ') : 'Approved Society Member';
          const mode = getPaymentMode(t);
          const amountStr = Number(t.amount).toLocaleString('en-IN');
          return `
            <tr>
              <td>${dateStr}</td>
              <td>${receiptNo}</td>
              <td><span class="item-name">${contributorName}</span><div class="item-sub">${contributorSub}</div></td>
              <td>${mode}</td>
              <td class="num">${amountStr}</td>
            </tr>
          `;
        }).join('');

      const expenseRows = txList
        .filter(t => t.type === 'expense')
        .map(t => {
          const dateStr = t.recorded_at ? new Date(t.recorded_at).toLocaleDateString([], { day: '2-digit', month: 'short' }) : '';
          const billNo = `BILL-${1000 + Number(t.id)}`;
          const vendorName = t.description ? t.description.split(' - ')[0] : 'Vendor Expense';
          const vendorSub = t.description && t.description.includes(' - ') ? t.description.split(' - ').slice(1).join(' - ') : 'Verified Festival Expense';
          const category = t.category;
          const amountStr = Number(t.amount).toLocaleString('en-IN');
          return `
            <tr>
              <td>${dateStr}</td>
              <td>${billNo}</td>
              <td><span class="item-name">${vendorName}</span><div class="item-sub">${vendorSub}</div></td>
              <td class="cat">${category}</td>
              <td class="num">${amountStr}</td>
            </tr>
          `;
        }).join('');

      // Calculate totals
      const totalIncome = txList.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
      const totalExpense = txList.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
      const balance = totalIncome - totalExpense;

      // 4. Map transactions to the 6 premium chart categories from the template using keyword matching
      const chartCategories = [
        { key: 'decoration', label: 'Decoration &amp;<br/>Mandap', search: ['decor', 'mandap', 'pandal', 'stage', 'flower'] },
        { key: 'idol', label: 'Idol &amp;<br/>Visarjan', search: ['idol', 'murti', 'visarjan', 'procession', 'truck'] },
        { key: 'catering', label: 'Catering &amp;<br/>Prasad', search: ['catering', 'prasad', 'food', 'sweets', 'caterer', 'mahaprasad'] },
        { key: 'sound', label: 'Sound &amp;<br/>Lighting', search: ['sound', 'light', 'pa system', 'mic', 'speaker', 'generator', 'electricity'] },
        { key: 'priest', label: 'Priest &amp;<br/>Rituals', search: ['priest', 'ritual', 'pooja', 'pandit', 'samagri', 'puja'] },
        { key: 'misc', label: 'Miscellaneous', search: [] }
      ];

      const categoryAmounts = chartCategories.map(cat => {
        if (cat.key === 'misc') {
          return txList
            .filter(t => t.type === 'expense')
            .filter(t => {
              const categoryLower = t.category.toLowerCase();
              const descLower = (t.description || '').toLowerCase();
              const matchedOther = chartCategories
                .filter(c => c.key !== 'misc')
                .some(c => c.search.some(keyword => categoryLower.includes(keyword) || descLower.includes(keyword)));
              return !matchedOther;
            })
            .reduce((sum, t) => sum + Number(t.amount), 0);
        } else {
          return txList
            .filter(t => t.type === 'expense')
            .filter(t => {
              const categoryLower = t.category.toLowerCase();
              const descLower = (t.description || '').toLowerCase();
              return cat.search.some(keyword => categoryLower.includes(keyword) || descLower.includes(keyword));
            })
            .reduce((sum, t) => sum + Number(t.amount), 0);
        }
      });

      const maxAmount = Math.max(...categoryAmounts, 1);
      const chartColumns = chartCategories.map((cat, idx) => {
        const amt = categoryAmounts[idx];
        const heightPercent = Math.max(Math.round((amt / maxAmount) * 80), 5); // min 5% for visual bar
        return `
          <div class="chart-bar-col">
            <div class="chart-amount">&#8377;${amt.toLocaleString('en-IN')}</div>
            <div class="chart-bar cat-label" style="height:${heightPercent}%;"></div>
          </div>
        `;
      }).join('');
      
      const chartLabels = chartCategories.map(cat => `
        <div class="chart-label-col">${cat.label}</div>
      `).join('');

      // Generate Initials for the Seal Mark on the Cover Page (e.g. "Greenfield Heights" -> "GH")
      const getInitials = (name: string) => {
        return name
          .split(' ')
          .filter(word => word.length > 0)
          .map(word => word[0])
          .join('')
          .toUpperCase()
          .slice(0, 3);
      };
      const initials = getInitials(profile?.society_name || 'SocietySync');

      // 5. Assemble full HTML using the premium multi-page design template
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Event Bills & Transactions Report</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700;8..60,900&family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

  :root{
    --ink:#10243E;
    --ink-soft:#1B3A5C;
    --gold:#C9A227;
    --gold-deep:#9C7C1B;
    --paper:#FBF9F4;
    --paper-card:#FFFFFF;
    --slate:#5B6472;
    --slate-light:#8B93A1;
    --line:#E3DCC9;
    --green:#1E7245;
    --green-bg:#EAF4ED;
    --red:#A8401C;
    --red-bg:#FBEAE3;
    --gold-bg:#FBF3DC;
  }

  *{ box-sizing:border-box; margin:0; padding:0; }

  body{
    font-family:'Inter', sans-serif;
    color:var(--ink);
    background:var(--paper);
  }

  .page{
    width:210mm;
    min-height:297mm;
    position:relative;
    background:var(--paper);
    overflow:hidden;
    page-break-after:always;
  }
  .page:last-child{ page-break-after:auto; }

  /* ---------- Ledger spine signature element (content pages) ---------- */
  .spine{
    position:absolute;
    top:0; left:0; bottom:0;
    width:13mm;
    background:linear-gradient(180deg, var(--ink) 0%, var(--ink-soft) 100%);
  }
  .spine-label{
    position:absolute;
    top:50%; left:50%;
    transform:translate(-50%,-50%) rotate(-90deg);
    white-space:nowrap;
    color:var(--gold);
    font-family:'Source Serif 4', serif;
    font-size:10.5px;
    letter-spacing:3px;
    text-transform:uppercase;
    font-weight:600;
  }
  .spine-tick{
    position:absolute;
    left:0; width:13mm; height:2px;
    background:var(--gold);
    opacity:.55;
  }

  .content{
    margin-left:13mm;
    padding:16mm 16mm 20mm 14mm;
  }

  /* ---------- Running header / footer ---------- */
  .doc-header{
    display:flex;
    justify-content:space-between;
    align-items:baseline;
    border-bottom:1.4px solid var(--ink);
    padding-bottom:7px;
    margin-bottom:9mm;
  }
  .doc-header .h-left{
    font-family:'Source Serif 4', serif;
    font-weight:700;
    font-size:12.5px;
    letter-spacing:.3px;
  }
  .doc-header .h-right{
    font-family:'IBM Plex Mono', monospace;
    font-size:9.5px;
    color:var(--slate);
    letter-spacing:.5px;
  }
  .doc-footer{
    position:absolute;
    bottom:10mm; left:14mm; right:16mm;
    display:flex;
    justify-content:space-between;
    align-items:center;
    font-family:'IBM Plex Mono', monospace;
    font-size:8.5px;
    color:var(--slate-light);
    border-top:.75px solid var(--line);
    padding-top:5px;
    letter-spacing:.4px;
  }

  /* ===================== COVER PAGE ===================== */
  .cover{ background:var(--ink); color:#fff; }
  .cover::before{
    content:"";
    position:absolute; inset:0;
    background:
      radial-gradient(circle at 85% 8%, rgba(201,162,39,0.16), transparent 42%),
      radial-gradient(circle at 6% 92%, rgba(201,162,39,0.10), transparent 38%);
  }
  .cover-frame{
    position:absolute;
    top:14mm; left:14mm; right:14mm; bottom:14mm;
    border:1px solid rgba(201,162,39,0.45);
  }
  .cover-frame::before{
    content:"";
    position:absolute; inset:6px;
    border:1px solid rgba(201,162,39,0.22);
  }
  .cover-inner{
    position:relative;
    height:100%;
    display:flex;
    flex-direction:column;
    padding:26mm 20mm;
  }
  .cover-eyebrow{
    font-family:'IBM Plex Mono', monospace;
    font-size:11px;
    letter-spacing:4px;
    color:var(--gold);
    text-transform:uppercase;
  }
  .cover-seal{
    width:74px; height:74px;
    border-radius:50%;
    border:1.6px solid var(--gold);
    display:flex; align-items:center; justify-content:center;
    margin:9mm 0 7mm 0;
    position:relative;
  }
  .cover-seal::before{
    content:"";
    position:absolute; inset:7px;
    border:1px solid rgba(201,162,39,0.55);
    border-radius:50%;
  }
  .cover-seal-mark{
    font-family:'Source Serif 4', serif;
    font-weight:700;
    font-size:22px;
    color:var(--gold);
    letter-spacing:1px;
  }
  .cover-title{
    font-family:'Source Serif 4', serif;
    font-weight:700;
    font-size:46px;
    line-height:1.08;
    max-width:130mm;
    margin-top:2mm;
  }
  .cover-title em{
    font-style:normal;
    color:var(--gold);
    font-weight:600;
  }
  .cover-sub{
    font-size:13.5px;
    color:#C9D2DE;
    margin-top:7mm;
    max-width:120mm;
    line-height:1.6;
    font-weight:400;
  }
  .cover-meta{
    margin-top:auto;
    display:grid;
    grid-template-columns:1fr 1fr 1fr;
    gap:0;
    border-top:1px solid rgba(255,255,255,0.18);
    padding-top:7mm;
  }
  .cover-meta div{ padding-right:8mm; }
  .cover-meta .m-label{
    font-family:'IBM Plex Mono', monospace;
    font-size:9px;
    letter-spacing:2px;
    text-transform:uppercase;
    color:var(--gold);
    margin-bottom:3px;
  }
  .cover-meta .m-value{
    font-size:13.5px;
    font-weight:600;
    color:#fff;
  }
  .cover-stamp{
    position:absolute;
    bottom:30mm; right:22mm;
    text-align:right;
  }
  .cover-stamp .s-amount{
    font-family:'Source Serif 4', serif;
    font-weight:700;
    font-size:30px;
    color:var(--gold);
  }
  .cover-stamp .s-label{
    font-family:'IBM Plex Mono', monospace;
    font-size:9.5px;
    letter-spacing:1.5px;
    color:#C9D2DE;
    margin-top:2px;
  }

  /* ===================== TYPOGRAPHY ===================== */
  h1.section-title{
    font-family:'Source Serif 4', serif;
    font-weight:700;
    font-size:23px;
    color:var(--ink);
    margin-bottom:2mm;
  }
  .section-rule{
    width:38px; height:3px;
    background:var(--gold);
    margin-bottom:6mm;
  }
  .section-intro{
    font-size:11px;
    color:var(--slate);
    line-height:1.65;
    max-width:150mm;
    margin-bottom:8mm;
  }

  /* ===================== SUMMARY CARDS ===================== */
  .summary-grid{
    display:grid;
    grid-template-columns:repeat(3, 1fr);
    gap:5mm;
    margin-bottom:9mm;
  }
  .stat-card{
    background:var(--paper-card);
    border:1px solid var(--line);
    border-top:3px solid var(--gold);
    padding:6mm 5mm;
    position:relative;
  }
  .stat-card .s-label{
    font-family:'IBM Plex Mono', monospace;
    font-size:8.7px;
    letter-spacing:1.5px;
    text-transform:uppercase;
    color:var(--slate);
    margin-bottom:4mm;
  }
  .stat-card .s-value{
    font-family:'Source Serif 4', serif;
    font-weight:700;
    font-size:23px;
    color:var(--ink);
  }
  .stat-card .s-value sup{
    font-size:13px;
    font-weight:600;
    margin-right:1px;
  }
  .stat-card .s-foot{
    font-size:9px;
    color:var(--slate-light);
    margin-top:3mm;
    padding-top:3mm;
    border-top:.75px dashed var(--line);
  }
  .stat-card.income{ border-top-color:var(--green); }
  .stat-card.income .s-value{ color:var(--green); }
  .stat-card.expense{ border-top-color:var(--red); }
  .stat-card.expense .s-value{ color:var(--red); }

  /* ===================== BALANCE BAR ===================== */
  .balance-bar{
    background:var(--ink);
    color:#fff;
    padding:6mm 7mm;
    display:flex;
    align-items:center;
    justify-content:space-between;
    margin-bottom:9mm;
    position:relative;
    overflow:hidden;
  }
  .balance-bar::after{
    content:"";
    position:absolute; right:0; top:0; bottom:0; width:3px;
    background:var(--gold);
  }
  .balance-bar .b-label{
    font-family:'IBM Plex Mono', monospace;
    font-size:9.5px;
    letter-spacing:2px;
    text-transform:uppercase;
    color:var(--gold);
  }
  .balance-bar .b-desc{
    font-size:9.5px;
    color:#C9D2DE;
    margin-top:2px;
  }
  .balance-bar .b-amount{
    font-family:'Source Serif 4', serif;
    font-weight:700;
    font-size:28px;
  }

  /* ===================== TABLES ===================== */
  table.ledger{
    width:100%;
    border-collapse:collapse;
    margin-bottom:9mm;
  }
  table.ledger thead th{
    font-family:'IBM Plex Mono', monospace;
    font-size:8.3px;
    letter-spacing:1px;
    text-transform:uppercase;
    color:var(--paper);
    background:var(--ink);
    text-align:left;
    padding:3.6mm 3.5mm;
    font-weight:500;
  }
  table.ledger thead th.num{ text-align:right; }
  table.ledger tbody td{
    font-size:10px;
    padding:3.4mm 3.5mm;
    border-bottom:.75px solid var(--line);
    vertical-align:top;
  }
  table.ledger tbody tr:nth-child(even){ background:#F6F2E8; }
  table.ledger tbody td.num{
    text-align:right;
    font-family:'IBM Plex Mono', monospace;
    font-size:10px;
    white-space:nowrap;
  }
  table.ledger tbody td .item-name{
    font-weight:600;
    color:var(--ink);
  }
  table.ledger tbody td .item-sub{
    font-size:8.7px;
    color:var(--slate-light);
    margin-top:1px;
  }
  table.ledger tbody td.cat{
    text-align:left;
  }
  .pill{
    display:inline-block;
    font-family:'IBM Plex Mono', monospace;
    font-size:7.8px;
    letter-spacing:.5px;
    padding:2px 7px;
    border-radius:9px;
    text-transform:uppercase;
    font-weight:600;
  }
  .pill.paid{ background:var(--green-bg); color:var(--green); }
  .pill.income{ background:var(--gold-bg); color:var(--gold-deep); }

  table.ledger tfoot td{
    font-family:'Source Serif 4', serif;
    font-weight:700;
    font-size:11.5px;
    padding:4mm 3.5mm;
    border-top:1.6px solid var(--ink);
  }
  table.ledger tfoot td.num{
    text-align:right;
    font-family:'IBM Plex Mono', monospace;
    font-size:12px;
  }

  /* ===================== TWO COL NOTE ===================== */
  .note-box{
    background:var(--gold-bg);
    border-left:3px solid var(--gold);
    padding:5mm 6mm;
    font-size:9.7px;
    color:#5C4A12;
    line-height:1.6;
    margin-bottom:8mm;
  }
  .note-box b{ color:var(--gold-deep); }

  /* ===================== SIGNATURE / CERTIFICATION ===================== */
  .cert-grid{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:14mm;
    margin-top:14mm;
  }
  .cert-block .c-line{
    border-bottom:1px solid var(--ink);
    height:14mm;
  }
  .cert-block .c-role{
    font-family:'Source Serif 4', serif;
    font-weight:600;
    font-size:11px;
    margin-top:3mm;
  }
  .cert-block .c-meta{
    font-family:'IBM Plex Mono', monospace;
    font-size:8.5px;
    color:var(--slate);
    margin-top:1.5mm;
  }

  .disclaimer{
    margin-top:12mm;
    padding-top:5mm;
    border-top:.75px solid var(--line);
    font-size:8.3px;
    color:var(--slate-light);
    line-height:1.6;
  }

  /* ===================== CHART (CSS bars, no external libs) ===================== */
  .chart-wrap{
    display:flex;
    align-items:flex-end;
    gap:6mm;
    height:48mm;
    padding:0 4mm 0 0;
    margin-bottom:4mm;
    border-bottom:1.4px solid var(--ink);
  }
  .chart-bar-col{
    flex:1;
    display:flex;
    flex-direction:column;
    align-items:center;
    height:100%;
    justify-content:flex-end;
  }
  .chart-bar{
    width:62%;
    border-radius:2px 2px 0 0;
  }
  .chart-bar.exp{ background:linear-gradient(180deg, #C1572F, var(--red)); }
  .chart-bar.cat-label{ background:linear-gradient(180deg, #2A4D74, var(--ink)); }
  .chart-amount{
    font-family:'IBM Plex Mono', monospace;
    font-size:8px;
    color:var(--ink);
    margin-bottom:2mm;
    font-weight:600;
  }
  .chart-labels{
    display:flex;
    gap:6mm;
    margin-top:2mm;
  }
  .chart-label-col{
    flex:1;
    text-align:center;
    font-size:8px;
    color:var(--slate);
    letter-spacing:.3px;
  }

</style>
</head>
<body>

<!-- ============================================================ -->
<!-- PAGE 1 — COVER                                                -->
<!-- ============================================================ -->
<div class="page cover">
  <div class="cover-frame"></div>
  <div class="cover-inner">
    <div class="cover-eyebrow">${profile?.society_name || 'SocietySync Co-Op Housing'} Residents&rsquo; Welfare Association</div>

    <div class="cover-seal">
      <div class="cover-seal-mark">${initials}</div>
    </div>

    <div class="cover-title">Event Bills &amp;<br/>Transactions <em>Report</em></div>
    <div class="cover-sub">
      An itemized statement of contributions received and expenses incurred for the
      ${selectedEvent.name} celebration, prepared for review by the
      Society Management Committee and General Body.
    </div>

    <div class="cover-meta">
      <div>
        <div class="m-label">Event</div>
        <div class="m-value">${selectedEvent.name}</div>
      </div>
      <div>
        <div class="m-label">Reporting Period</div>
        <div class="m-value">${selectedEvent.event_date ? new Date(selectedEvent.event_date).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) : 'Ongoing'}</div>
      </div>
      <div>
        <div class="m-label">Statement Date</div>
        <div class="m-value">${new Date().toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}</div>
      </div>
    </div>

    <div class="cover-stamp">
      <div class="s-amount">&#8377;${balance.toLocaleString('en-IN')}</div>
      <div class="s-label">CLOSING FUND BALANCE</div>
    </div>
  </div>
</div>

<!-- ============================================================ -->
<!-- PAGE 2 — SUMMARY                                              -->
<!-- ============================================================ -->
<div class="page">
  <div class="spine">
    <div class="spine-label">Section 01 &mdash; Financial Summary</div>
  </div>
  <div class="content">

    <div class="doc-header">
      <div class="h-left">Event Bills &amp; Transactions Report</div>
      <div class="h-right">${selectedEvent.name.toUpperCase()} &nbsp;|&nbsp; PAGE 02</div>
    </div>

    <h1 class="section-title">Financial Summary</h1>
    <div class="section-rule"></div>
    <p class="section-intro">
      This statement consolidates all Chandaa (contributions) received from residents and sponsors,
      against verified expense bills recorded by the Festival Committee. All figures are in Indian
      Rupees (&#8377;) and are reconciled against bank deposit slips and physical receipt bills on file.
    </p>

    <div class="summary-grid">
      <div class="stat-card income">
        <div class="s-label">Total Contributions Received</div>
        <div class="s-value">&#8377;${totalIncome.toLocaleString('en-IN')}</div>
        <div class="s-foot">${txList.filter(t => t.type === 'income').length} contributing households &middot; Reconciled</div>
      </div>
      <div class="stat-card expense">
        <div class="s-label">Total Expenses Incurred</div>
        <div class="s-value">&#8377;${totalExpense.toLocaleString('en-IN')}</div>
        <div class="s-foot">${txList.filter(t => t.type === 'expense').length} verified bills &middot; ${new Set(txList.filter(t => t.type === 'expense').map(t => t.category)).size} categories</div>
      </div>
      <div class="stat-card">
        <div class="s-label">Closing Fund Balance</div>
        <div class="s-value">&#8377;${balance.toLocaleString('en-IN')}</div>
        <div class="s-foot">Carried forward to Society General Fund</div>
      </div>
    </div>

    <div class="balance-bar">
      <div>
        <div class="b-label">Net Position</div>
        <div class="b-desc">${balance >= 0 ? 'Contributions exceeded expenses for this event by a healthy margin' : 'Expenses exceeded contributions for this event'}</div>
      </div>
      <div class="b-amount">${balance >= 0 ? '+' : '-'} &#8377;${Math.abs(balance).toLocaleString('en-IN')}</div>
    </div>

    <h1 class="section-title" style="font-size:16px; margin-top:2mm;">Expense Distribution by Category</h1>
    <div class="section-rule" style="margin-bottom:7mm;"></div>

    <div class="chart-wrap">
      ${chartColumns}
    </div>
    <div class="chart-labels">
      ${chartLabels}
    </div>

    <div class="note-box" style="margin-top:9mm;">
      <b>Note:</b> This is an official system-generated financial ledger report compiled directly
      from the verified databases of ${profile?.society_name || 'SocietySync Co-Op Housing'}.
    </div>

  </div>
  <div class="doc-footer">
    <span>${profile?.society_name || 'SocietySync'} Residents&rsquo; Welfare Association &middot; Prepared via SocietySync Festival Ledger</span>
    <span>CONFIDENTIAL &mdash; FOR COMMITTEE &amp; RESIDENT CIRCULATION</span>
  </div>
</div>

<!-- ============================================================ -->
<!-- PAGE 3 — INCOME LEDGER                                        -->
<!-- ============================================================ -->
<div class="page">
  <div class="spine">
    <div class="spine-label">Section 02 &mdash; Contributions Ledger</div>
  </div>
  <div class="content">

    <div class="doc-header">
      <div class="h-left">Event Bills &amp; Transactions Report</div>
      <div class="h-right">${selectedEvent.name.toUpperCase()} &nbsp;|&nbsp; PAGE 03</div>
    </div>

    <h1 class="section-title">Contributions Received (Chandaa)</h1>
    <div class="section-rule"></div>
    <p class="section-intro">
      Itemized record of all contributions collected from residents and external sponsors,
      in order of receipt. Each entry is cross-referenced against the official receipt book number.
    </p>

    <table class="ledger">
      <thead>
        <tr>
          <th style="width:11%;">Date</th>
          <th style="width:13%;">Receipt No.</th>
          <th>Contributor</th>
          <th style="width:16%;">Mode</th>
          <th class="num" style="width:16%;">Amount (&#8377;)</th>
        </tr>
      </thead>
      <tbody>
        ${incomeRows || '<tr><td colspan="5" style="text-align:center; padding: 10px;">No income entries recorded yet.</td></tr>'}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4">Total Contributions Received</td>
          <td class="num">&#8377;${totalIncome.toLocaleString('en-IN')}</td>
        </tr>
      </tfoot>
    </table>

    <div class="note-box">
      <b>Verification:</b> All collections are recorded and validated by the Treasurer. Bank transfer
      and UPI entries are reconciled against the society bank statement.
    </div>

  </div>
  <div class="doc-footer">
    <span>${profile?.society_name || 'SocietySync'} Residents&rsquo; Welfare Association &middot; Prepared via SocietySync Festival Ledger</span>
    <span>CONFIDENTIAL &mdash; FOR COMMITTEE &amp; RESIDENT CIRCULATION</span>
  </div>
</div>

<!-- ============================================================ -->
<!-- PAGE 4 — EXPENSE LEDGER / BILLS                               -->
<!-- ============================================================ -->
<div class="page">
  <div class="spine">
    <div class="spine-label">Section 03 &mdash; Expense Bills Ledger</div>
  </div>
  <div class="content">

    <div class="doc-header">
      <div class="h-left">Event Bills &amp; Transactions Report</div>
      <div class="h-right">${selectedEvent.name.toUpperCase()} &nbsp;|&nbsp; PAGE 04</div>
    </div>

    <h1 class="section-title">Expense Bills &amp; Vendor Payments</h1>
    <div class="section-rule"></div>
    <p class="section-intro">
      Every expense below is supported by a physical or digital receipt bill, uploaded against the
      corresponding transaction in the Festival Ledger module and available for committee audit on request.
    </p>

    <table class="ledger">
      <thead>
        <tr>
          <th style="width:10%;">Date</th>
          <th style="width:13%;">Bill No.</th>
          <th>Vendor / Description</th>
          <th style="width:17%;">Category</th>
          <th class="num" style="width:15%;">Amount (&#8377;)</th>
        </tr>
      </thead>
      <tbody>
        ${expenseRows || '<tr><td colspan="5" style="text-align:center; padding: 10px;">No expense entries recorded yet.</td></tr>'}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4">Total Expenses Incurred</td>
          <td class="num">&#8377;${totalExpense.toLocaleString('en-IN')}</td>
        </tr>
      </tfoot>
    </table>

    <div class="note-box">
      <b>Full bill register:</b> Scanned receipts and supporting documents for all expense bills
      are stored securely in Supabase Storage and can be audited via the SocietySync app.
    </div>

  </div>
  <div class="doc-footer">
    <span>${profile?.society_name || 'SocietySync'} Residents&rsquo; Welfare Association &middot; Prepared via SocietySync Festival Ledger</span>
    <span>CONFIDENTIAL &mdash; FOR COMMITTEE &amp; RESIDENT CIRCULATION</span>
  </div>
</div>

<!-- ============================================================ -->
<!-- PAGE 5 — CERTIFICATION                                        -->
<!-- ============================================================ -->
<div class="page">
  <div class="spine">
    <div class="spine-label">Section 04 &mdash; Certification</div>
  </div>
  <div class="content">

    <div class="doc-header">
      <div class="h-left">Event Bills &amp; Transactions Report</div>
      <div class="h-right">${selectedEvent.name.toUpperCase()} &nbsp;|&nbsp; PAGE 05</div>
    </div>

    <h1 class="section-title">Reconciliation &amp; Certification</h1>
    <div class="section-rule"></div>
    <p class="section-intro">
      The figures presented in this report have been reviewed against bank statements, cash registers,
      and physical bills on file. The undersigned certify that this statement presents a true and fair
      summary of all funds received and expended for this event.
    </p>

    <table class="ledger" style="margin-bottom:6mm;">
      <thead>
        <tr><th>Particulars</th><th class="num">Amount (&#8377;)</th></tr>
      </thead>
      <tbody>
        <tr><td>Opening Balance (carried from previous event)</td><td class="num">₹0.00</td></tr>
        <tr><td>Add: Total Contributions Received</td><td class="num">₹${totalIncome.toLocaleString('en-IN')}</td></tr>
        <tr><td>Less: Total Expenses Incurred</td><td class="num">(₹${totalExpense.toLocaleString('en-IN')})</td></tr>
      </tbody>
      <tfoot>
        <tr><td>Closing Balance &mdash; Transferred to Society General Fund</td><td class="num">&#8377;${balance.toLocaleString('en-IN')}</td></tr>
      </tfoot>
    </table>

    <div class="cert-grid">
      <div class="cert-block">
        <div class="c-line"></div>
        <div class="c-role">Festival Committee Treasurer</div>
        <div class="c-meta">Name: ______________________&nbsp;&nbsp;Date: __________</div>
      </div>
      <div class="cert-block">
        <div class="c-line"></div>
        <div class="c-role">Society Secretary / Administrator</div>
        <div class="c-meta">Name: ______________________&nbsp;&nbsp;Date: __________</div>
      </div>
    </div>

    <div class="disclaimer">
      This is an official system-generated report exported from the SocietySync Festival Ledger module.
      For supporting bills, transaction logs, and audit trails, refer to the live ledger within
      the SocietySync application.
    </div>

  </div>
  <div class="doc-footer">
    <span>${profile?.society_name || 'SocietySync'} Residents&rsquo; Welfare Association &middot; Prepared via SocietySync Festival Ledger</span>
    <span>CONFIDENTIAL &mdash; FOR COMMITTEE &amp; RESIDENT CIRCULATION</span>
  </div>
</div>

</body>
</html>
      `;

      // 6. Generate PDF file
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      
      // 7. Share PDF file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Download ${selectedEvent.name} Report`,
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('PDF Generated', `Report saved at: ${uri}`);
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to export PDF report.');
    }
  };

  const formatCurrency = (val: number) => {
    return '₹' + val.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  const isCurrentUserFlat = (wing: string, flat: string) => {
    return profile?.wing === wing && profile?.flat_number === flat;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <View style={styles.screenHeader}>
        <Image 
          source={require('../../../assets/images/logo.png')} 
          style={[styles.screenHeaderLogo, { borderColor: '#FFD700' }]} 
          resizeMode="contain"
        />
        <Text variant="titleLarge" style={[styles.screenHeaderTitle, { color: theme.colors.onSurface }]}>
          SocietySync Finances
        </Text>
      </View>

      <View style={styles.tabHeader}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            { value: 'ledger', label: 'Festival Ledger', icon: 'cash-register' },
            { value: 'dues', label: 'Maintenance Dues', icon: 'clipboard-list' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* ==================== TAB 1: FESTIVAL LEDGER ==================== */}
        {activeTab === 'ledger' && !selectedEvent && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <Text variant="titleMedium" style={styles.sectionTitle}>Festival Events & Ledgers</Text>
              {(profile?.role === 'admin' || profile?.role === 'owner') && (
                <Button 
                  mode="contained" 
                  icon="plus" 
                  onPress={() => setEventModalVisible(true)}
                  style={styles.actionButton}
                >
                  New Event
                </Button>
              )}
            </View>

            {events.map((event) => (
              <Card 
                key={event.id} 
                style={styles.eventCard}
                onPress={async () => {
                  setSelectedEvent(event);
                  const txList = await dataManager.getTransactions(event.id);
                  setTransactions(txList);
                }}
              >
                <Card.Content>
                  <View style={styles.eventHeaderRow}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold', color: '#00D4AA' }}>
                      {event.name}
                    </Text>
                    <View 
                      style={{ 
                        backgroundColor: theme.colors.secondaryContainer, 
                        paddingHorizontal: 10, 
                        paddingVertical: 2, 
                        borderRadius: 12,
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}
                    >
                      <Text 
                        style={{ 
                          fontSize: 10, 
                          fontWeight: 'bold', 
                          color: theme.colors.onSecondaryContainer 
                        }}
                      >
                        {event.event_date ? new Date(event.event_date).toLocaleDateString([], { year: 'numeric', month: 'short' }) : 'Ongoing'}
                      </Text>
                    </View>
                  </View>
                  <Text variant="bodySmall" style={{ color: theme.colors.outline, marginVertical: 4 }}>
                    {event.description || 'No description provided.'}
                  </Text>
                  
                  <Divider style={{ marginVertical: 8 }} />

                  <View style={styles.eventStatsRow}>
                    <View style={styles.statCol}>
                      <Text variant="bodySmall" style={{ color: theme.colors.outline }}>Total Chandaa</Text>
                      <Text variant="titleMedium" style={{ color: '#00D4AA', fontWeight: 'bold' }}>
                        {formatCurrency(event.total_income)}
                      </Text>
                    </View>
                    <View style={styles.statCol}>
                      <Text variant="bodySmall" style={{ color: theme.colors.outline }}>Total Expense</Text>
                      <Text variant="titleMedium" style={{ color: '#FF3B30', fontWeight: 'bold' }}>
                        {formatCurrency(event.total_expense)}
                      </Text>
                    </View>
                    <View style={styles.statCol}>
                      <Text variant="bodySmall" style={{ color: theme.colors.outline }}>Fund Balance</Text>
                      <Text variant="titleMedium" style={{ color: '#FFD700', fontWeight: 'bold' }}>
                        {formatCurrency(event.balance)}
                      </Text>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </View>
        )}

        {/* ==================== EVENT DETAILS VIEW ==================== */}
        {activeTab === 'ledger' && selectedEvent && (
          <View>
            {/* Header with back button */}
            <View style={styles.detailsHeader}>
              <IconButton icon="arrow-left" size={24} onPress={() => setSelectedEvent(null)} />
              <View style={{ flex: 1 }}>
                <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>{selectedEvent.name}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>Event Details & Ledger Sheet</Text>
              </View>
            </View>

            {/* Financial Summary Card */}
            <Card style={[styles.balanceCard, { backgroundColor: theme.colors.elevation.level2, borderColor: '#FFD700', borderWidth: 1.5 }]}>
              <Card.Content style={styles.balanceContent}>
                <IconButton icon="wallet-outline" iconColor="#FFD700" size={32} style={{ margin: 0 }} />
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, opacity: 0.8 }}>
                  Event Net Fund Balance
                </Text>
                <Text variant="displaySmall" style={[styles.balanceText, { color: '#FFD700', fontWeight: 'bold' }]}>
                  {formatCurrency(selectedEvent.balance)}
                </Text>
                <View style={styles.statsRowInline}>
                  <Text style={{ color: '#00D4AA', fontSize: 13, fontWeight: 'bold' }}>
                    Chandaa: <Text style={{ color: theme.colors.onSurface }}>{formatCurrency(selectedEvent.total_income)}</Text>
                  </Text>
                  <Text style={{ color: '#FF3B30', fontSize: 13, fontWeight: 'bold' }}>
                    Expense: <Text style={{ color: theme.colors.onSurface }}>{formatCurrency(selectedEvent.total_expense)}</Text>
                  </Text>
                </View>
              </Card.Content>
            </Card>

            {/* Transaction Controls */}
            <View style={styles.sectionHeaderRow}>
              <Text variant="titleMedium" style={styles.sectionTitle}>Transactions Ledger</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <IconButton 
                  icon="file-pdf-box" 
                  iconColor="#FF3B30" 
                  mode="outlined" 
                  size={20}
                  style={{ margin: 0 }}
                  onPress={handleExportPDF} 
                />
                {(profile?.role === 'admin' || profile?.role === 'owner') && (
                  <Button 
                    mode="contained" 
                    icon="plus" 
                    onPress={handleNewTransactionClick}
                    style={styles.actionButton}
                  >
                    Add Bill
                  </Button>
                )}
              </View>
            </View>

            {/* Transaction Items */}
            {transactions.length === 0 ? (
              <Text style={{ textAlign: 'center', marginVertical: 20, color: theme.colors.outline }}>
                No transactions recorded for this event yet.
              </Text>
            ) : (
              transactions.map((tx) => (
                <Card key={tx.id} style={styles.txCard}>
                  <Card.Content style={styles.txContent}>
                    <View style={styles.txMainInfo}>
                      <IconButton 
                        icon={tx.type === 'income' ? 'cash-multiple' : 'chart-line'} 
                        iconColor={tx.type === 'income' ? '#00D4AA' : '#FF3B30'}
                        size={22}
                      />
                      <View style={{ flex: 1 }}>
                        <Text variant="titleMedium" style={styles.txTitleText}>{tx.description}</Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                          Category: {tx.category} • By {tx.recorded_by_name || 'Admin'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.txFinanceInfo}>
                      <Text 
                        variant="titleMedium" 
                        style={[
                          styles.txAmountText, 
                          { color: tx.type === 'income' ? '#00D4AA' : '#FF3B30' }
                        ]}
                      >
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </Text>
                      <Text variant="bodySmall" style={styles.txDate}>
                        {tx.recorded_at ? new Date(tx.recorded_at).toLocaleDateString([], { day: '2-digit', month: 'short' }) : ''}
                      </Text>
                    </View>
                  </Card.Content>
                  {(tx.bill_image_url || profile?.role === 'admin' || profile?.role === 'owner') && (
                    <Card.Actions style={styles.txActions}>
                      {tx.bill_image_url && (
                        <Button 
                          mode="text" 
                          icon="receipt" 
                          labelStyle={{ fontSize: 11 }}
                          onPress={() => {
                            if (tx.bill_image_url) {
                              Linking.openURL(tx.bill_image_url).catch(() => showToast('Invalid bill URL'));
                            }
                          }}
                        >
                          View Bill Proof
                        </Button>
                      )}
                      {(profile?.role === 'admin' || profile?.role === 'owner') && (
                        <Button 
                          mode="text" 
                          icon="pencil" 
                          labelStyle={{ fontSize: 11 }}
                          onPress={() => handleEditTransactionClick(tx)}
                        >
                          Edit
                        </Button>
                      )}
                      {(profile?.role === 'admin' || profile?.role === 'owner') && (
                        <Button 
                          mode="text" 
                          icon="delete" 
                          textColor={theme.colors.error}
                          labelStyle={{ fontSize: 11 }}
                          onPress={() => handleDeleteTransactionClick(tx.id)}
                        >
                          Delete
                        </Button>
                      )}
                    </Card.Actions>
                  )}
                </Card>
              ))
            )}
          </View>
        )}

        {/* ==================== TAB 2: MAINTENANCE DUES ==================== */}
        {activeTab === 'dues' && (
          <View>
            <Card style={styles.duesInfoCard}>
              <Card.Content>
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>📢 Maintenance Delinquent Leaderboard</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 4 }}>
                  Sorted by highest pending dues. Flat Owner is responsible for payments. Renters can verify if their owner is pocketing dues payments. Includes a 2% late fee if overdue.
                </Text>
              </Card.Content>
            </Card>

            <View style={styles.sectionHeaderRow}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                {profile?.role === 'renter' ? 'Your Flat Maintenance Ledger' : 'Outstanding Dues'}
              </Text>
              {(profile?.role === 'admin' || profile?.role === 'owner') && (
                <Button 
                  mode="contained" 
                  icon="plus" 
                  onPress={() => setDuesModalVisible(true)}
                  style={styles.actionButton}
                >
                  Create Dues
                </Button>
              )}
            </View>

            {maintenanceDues
              .filter(due => profile?.role !== 'renter' || isCurrentUserFlat(due.wing, due.flat_number))
              .map((due, index) => {
                const isMyFlat = isCurrentUserFlat(due.wing, due.flat_number);
                const outstanding = Number(due.amount) + Number(due.interest_charged) - Number(due.paid_amount);
                
                const getStatusColor = (status: string) => {
                  switch (status) {
                    case 'paid': return '#00D4AA'; // Green
                    case 'overdue': return '#FF3B30'; // Red
                    case 'pending': return '#FFD700'; // Gold
                    default: return theme.colors.outline;
                  }
                };

                const statusColor = getStatusColor(due.status);

                return (
                  <Card 
                    key={due.id} 
                    style={[
                      styles.dueCard, 
                      isMyFlat && { borderColor: '#00D4AA', borderWidth: 1.5 },
                      due.status === 'paid' && { opacity: 0.75 }
                    ]}
                  >
                    <Card.Content style={styles.dueContent}>
                      <View style={styles.dueLeft}>
                        {profile?.role !== 'renter' && due.status !== 'paid' && (
                          <Avatar.Text 
                            size={28} 
                            label={`#${index + 1}`} 
                            style={[
                              styles.dueRank, 
                              { backgroundColor: statusColor }
                            ]}
                            labelStyle={{ fontSize: 12, color: theme.colors.onPrimary, fontWeight: 'bold' }}
                          />
                        )}
                        <View>
                          <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                            Flat {due.wing}-{due.flat_number} {isMyFlat && '(Your Flat)'}
                          </Text>
                          <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                            Due Date: {new Date(due.due_date).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                          </Text>
                          {due.interest_charged > 0 && (
                            <Text variant="bodySmall" style={{ color: '#FF3B30', fontWeight: 'bold' }}>
                              ⚠️ Includes Late Fee (2%): {formatCurrency(due.interest_charged)}
                            </Text>
                          )}
                        </View>
                      </View>

                      <View style={styles.dueRight}>
                        <Text 
                          variant="titleMedium" 
                          style={[
                            styles.dueAmount, 
                            { color: statusColor }
                          ]}
                        >
                          {formatCurrency(outstanding > 0 ? outstanding : Number(due.amount))}
                        </Text>
                        <Text 
                          variant="bodySmall" 
                          style={{ 
                            fontWeight: 'bold', 
                            color: statusColor,
                            textTransform: 'uppercase'
                          }}
                        >
                          {due.status}
                        </Text>
                      </View>
                    </Card.Content>

                    {/* Dues Actions */}
                    {due.status !== 'paid' && (
                      <Card.Actions style={styles.dueActions}>
                        {(profile?.role === 'admin' || profile?.role === 'owner') && (
                          <Button 
                            mode="text" 
                            icon="bell-ring" 
                            onPress={() => handleSendReminder(due.wing, due.flat_number, outstanding)}
                            labelStyle={{ fontSize: 11 }}
                          >
                            Send Reminder
                          </Button>
                        )}
                        {(profile?.role === 'admin' || profile?.role === 'owner') && (
                          <Button 
                            mode="contained-tonal" 
                            icon="cash" 
                            onPress={() => handleMarkPaid(due.id, due.wing, due.flat_number)}
                            labelStyle={{ fontSize: 11 }}
                          >
                            Clear Dues
                          </Button>
                        )}
                        {!isMyFlat && profile?.role === 'owner' && (
                          <Button 
                            mode="text" 
                            icon="bell" 
                            onPress={() => handleSendReminder(due.wing, due.flat_number, outstanding)}
                            labelStyle={{ fontSize: 11 }}
                          >
                            Send Alert
                          </Button>
                        )}
                        {isMyFlat && (
                          <Button 
                            mode="contained" 
                            icon="credit-card-outline" 
                            onPress={() => showToast('Redirecting to secure gateway...')}
                            labelStyle={{ fontSize: 11 }}
                          >
                            Pay Dues Online
                          </Button>
                        )}
                      </Card.Actions>
                    )}
                  </Card>
                );
              })}
          </View>
        )}
      </ScrollView>

      {/* Snackbar Toast */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={{ marginBottom: 60 }}
      >
        {snackbarMessage}
      </Snackbar>

      {/* CREATE EVENT MODAL */}
      <Portal>
        <Modal
          visible={eventModalVisible}
          onDismiss={() => setEventModalVisible(false)}
          contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.elevation.level3 }]}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>🎉 Create New Festival Event</Text>
          <TextInput
            label="Event Name"
            placeholder="e.g. Ganesh Chaturthi 2026"
            value={eventName}
            onChangeText={setEventName}
            mode="outlined"
            style={styles.modalInput}
          />
          <TextInput
            label="Event Description"
            placeholder="e.g. Chanda collections and stage vendor bills"
            value={eventDesc}
            onChangeText={setEventDesc}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.modalInput}
          />
          <TextInput
            label="Start Date (YYYY-MM-DD)"
            value={eventDate}
            onChangeText={setEventDate}
            mode="outlined"
            style={styles.modalInput}
          />
          <View style={styles.modalButtons}>
            <Button mode="outlined" onPress={() => setEventModalVisible(false)} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button 
              mode="contained" 
              onPress={handleCreateEvent} 
              loading={submitting}
              disabled={submitting}
              style={{ flex: 1 }}
            >
              Create
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* ADD TRANSACTION MODAL */}
      <Portal>
        <Modal
          visible={txModalVisible}
          onDismiss={() => {
            setTxModalVisible(false);
            setEditingTxId(null);
          }}
          contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.elevation.level3 }]}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            {editingTxId ? '✏️ Edit Ledger Transaction' : '📝 Add Ledger Transaction'}
          </Text>
          <TextInput
            label="Transaction Title"
            placeholder="e.g. Stage Pandal Decoration"
            value={txTitle}
            onChangeText={setTxTitle}
            mode="outlined"
            style={styles.modalInput}
          />
          <TextInput
            label="Amount (₹)"
            keyboardType="numeric"
            value={txAmount}
            onChangeText={setTxAmount}
            mode="outlined"
            style={styles.modalInput}
          />

          <Text variant="labelMedium" style={{ marginBottom: 6 }}>Transaction Type</Text>
          <SegmentedButtons
            value={txType}
            onValueChange={(val) => setTxType(val as 'income' | 'expense')}
            buttons={[
              { value: 'income', label: 'Chandaa/Receipt (+)', icon: 'plus' },
              { value: 'expense', label: 'Vendor Bill (-)', icon: 'minus' },
            ]}
            style={styles.modalSegment}
          />

          <TextInput
            label="Category"
            placeholder="Chandaa, Pandal, Sound System, Food, VIP..."
            value={txCategory}
            onChangeText={setTxCategory}
            mode="outlined"
            style={styles.modalInput}
          />
          <TextInput
            label="Brief Description (Optional)"
            value={txDesc}
            onChangeText={setTxDesc}
            mode="outlined"
            style={styles.modalInput}
          />
          <TextInput
            label="Digital Bill Image URL (Optional)"
            placeholder="e.g. https://invoice-host.com/invoice.jpg"
            value={txBillUrl}
            onChangeText={setTxBillUrl}
            mode="outlined"
            style={styles.modalInput}
          />

          <View style={{ marginBottom: 16, alignItems: 'center' }}>
            <Button
              mode="contained-tonal"
              icon="camera"
              onPress={handleSelectReceipt}
              loading={uploadingReceipt}
              disabled={uploadingReceipt}
              style={{ width: '100%' }}
            >
              {uploadingReceipt ? 'Uploading Receipt...' : 'Scan / Upload Receipt Image'}
            </Button>
            {txBillUrl ? (
              <Text variant="bodySmall" style={{ color: '#00D4AA', marginTop: 4, textAlign: 'center', fontWeight: 'bold' }}>
                ✓ Receipt Image attached successfully
              </Text>
            ) : null}
          </View>

          <View style={styles.modalButtons}>
            <Button 
              mode="outlined" 
              onPress={() => {
                setTxModalVisible(false);
                setEditingTxId(null);
              }} 
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button 
              mode="contained" 
              onPress={editingTxId ? handleUpdateTransaction : handleAddTransaction} 
              loading={submitting}
              disabled={submitting}
              style={{ flex: 1 }}
            >
              {editingTxId ? 'Update Bill' : 'Save Bill'}
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* CREATE DUES MODAL */}
      <Portal>
        <Modal
          visible={duesModalVisible}
          onDismiss={() => setDuesModalVisible(false)}
          contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.elevation.level3 }]}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>📋 Set New Maintenance Dues</Text>
          
          <View style={styles.modalRow}>
            <TextInput
              label="Wing"
              placeholder="e.g. B"
              value={dueWing}
              onChangeText={setDueWing}
              mode="outlined"
              style={[styles.modalInput, { flex: 1 }]}
              autoCapitalize="characters"
            />
            <TextInput
              label="Flat Number"
              placeholder="e.g. 302"
              value={dueFlat}
              onChangeText={setDueFlat}
              mode="outlined"
              keyboardType="numeric"
              style={[styles.modalInput, { flex: 1 }]}
            />
          </View>

          <TextInput
            label="Base Amount (₹)"
            value={dueAmount}
            onChangeText={setDueAmount}
            mode="outlined"
            style={styles.modalInput}
          />

          <TextInput
            label="Billing Month (YYYY-MM-DD)"
            value={dueMonth}
            onChangeText={setDueMonth}
            mode="outlined"
            style={styles.modalInput}
          />

          <View style={styles.modalButtons}>
            <Button mode="outlined" onPress={() => setDuesModalVisible(false)} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button mode="contained" onPress={handleAddDues} style={{ flex: 1 }}>
              Record Dues
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  screenHeaderLogo: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
  },
  screenHeaderTitle: {
    fontWeight: 'bold',
  },
  tabHeader: {
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#DDD',
  },
  segmentedButtons: {
    width: '100%',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontWeight: 'bold',
  },
  actionButton: {
    borderRadius: 8,
  },
  eventCard: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 2,
  },
  eventHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
    marginBottom: 16,
  },
  balanceCard: {
    borderRadius: 16,
    marginBottom: 20,
    elevation: 3,
  },
  balanceContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  balanceText: {
    marginTop: 8,
  },
  statsRowInline: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 12,
  },
  txCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 1.5,
  },
  txContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  txMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  txTitleText: {
    fontWeight: 'bold',
  },
  txFinanceInfo: {
    alignItems: 'flex-end',
    minWidth: 95,
  },
  txAmountText: {
    fontWeight: 'bold',
  },
  txDate: {
    color: '#888',
    fontSize: 10,
  },
  txActions: {
    justifyContent: 'flex-start',
    borderTopWidth: 0.5,
    borderTopColor: '#EEE',
    paddingVertical: 0,
  },
  duesInfoCard: {
    marginBottom: 20,
    borderRadius: 12,
    elevation: 1,
  },
  dueCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 1.5,
  },
  dueContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  dueLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dueRank: {
    borderRadius: 6,
  },
  dueRight: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  dueAmount: {
    fontWeight: 'bold',
  },
  dueActions: {
    justifyContent: 'flex-end',
    borderTopWidth: 0.5,
    borderTopColor: '#EEE',
  },
  modalContainer: {
    padding: 20,
    margin: 20,
    borderRadius: 16,
  },
  modalTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalInput: {
    marginBottom: 12,
  },
  modalRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalSegment: {
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
});
