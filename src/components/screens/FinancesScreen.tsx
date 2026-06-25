import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Card, Button, TextInput, SegmentedButtons, IconButton, Portal, Modal, useTheme, Chip, Snackbar, Avatar, List, Divider } from 'react-native-paper';
import { useAuth } from '../../lib/auth-context';
import { dataManager, Event, Transaction, MaintenanceDue } from '../../lib/data-manager';

export const FinancesScreen: React.FC = () => {
  const { profile, user } = useAuth();
  const theme = useTheme();

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
      loadAllData();
    } catch (e) {
      console.error(e);
      showToast('Failed to record transaction.');
    } finally {
      setSubmitting(false);
    }
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

  const handleExportPDF = (name: string) => {
    showToast(`📄 Exporting '${name}' financial report as PDF...`);
  };

  const formatCurrency = (val: number) => {
    return '₹' + val.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  const isCurrentUserFlat = (wing: string, flat: string) => {
    return profile?.wing === wing && profile?.flat_number === flat;
  };

  return (
    <View style={styles.container}>
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
              {profile?.role === 'admin' && (
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
                    <Chip style={{ height: 24, justifyContent: 'center' }}>
                      {event.event_date ? new Date(event.event_date).toLocaleDateString([], { year: 'numeric', month: 'short' }) : 'Ongoing'}
                    </Chip>
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
                <Text variant="titleLarge" style={{ fontWeight: 'bold', color: '#FFFFFF' }}>{selectedEvent.name}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>Event Details & Ledger Sheet</Text>
              </View>
            </View>

            {/* Financial Summary Card */}
            <Card style={[styles.balanceCard, { backgroundColor: '#1E1E1E', borderColor: '#FFD700', borderWidth: 1.5 }]}>
              <Card.Content style={styles.balanceContent}>
                <IconButton icon="wallet-outline" iconColor="#FFD700" size={32} style={{ margin: 0 }} />
                <Text variant="titleMedium" style={{ color: '#FFFFFF', opacity: 0.8 }}>
                  Event Net Fund Balance
                </Text>
                <Text variant="displaySmall" style={[styles.balanceText, { color: '#FFD700', fontWeight: 'bold' }]}>
                  {formatCurrency(selectedEvent.balance)}
                </Text>
                <View style={styles.statsRowInline}>
                  <Text style={{ color: '#00D4AA', fontSize: 13, fontWeight: 'bold' }}>
                    Chandaa: <Text style={{ color: '#FFFFFF' }}>{formatCurrency(selectedEvent.total_income)}</Text>
                  </Text>
                  <Text style={{ color: '#FF3B30', fontSize: 13, fontWeight: 'bold' }}>
                    Expense: <Text style={{ color: '#FFFFFF' }}>{formatCurrency(selectedEvent.total_expense)}</Text>
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
                  onPress={() => handleExportPDF(selectedEvent.name)} 
                />
                {profile?.role === 'admin' && (
                  <Button 
                    mode="contained" 
                    icon="plus" 
                    onPress={() => setTxModalVisible(true)}
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
                  {tx.bill_image_url && (
                    <Card.Actions style={styles.txActions}>
                      <Button 
                        mode="text" 
                        icon="receipt" 
                        labelStyle={{ fontSize: 11 }}
                        onPress={() => showToast(`Opening Receipt: ${tx.description}`)}
                      >
                        View Bill Proof
                      </Button>
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
              {profile?.role === 'admin' && (
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
                            labelStyle={{ fontSize: 12, color: due.status === 'overdue' ? '#FFF' : '#0F0F0F', fontWeight: 'bold' }}
                          />
                        )}
                        <View>
                          <Text variant="titleMedium" style={{ fontWeight: 'bold', color: '#FFFFFF' }}>
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
                        {profile?.role === 'admin' && (
                          <>
                            <Button 
                              mode="text" 
                              icon="bell-ring" 
                              onPress={() => handleSendReminder(due.wing, due.flat_number, outstanding)}
                              labelStyle={{ fontSize: 11 }}
                            >
                              Send Reminder
                            </Button>
                            <Button 
                              mode="contained-tonal" 
                              icon="cash" 
                              onPress={() => handleMarkPaid(due.id, due.wing, due.flat_number)}
                              labelStyle={{ fontSize: 11 }}
                            >
                              Clear Dues
                            </Button>
                          </>
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
          onDismiss={() => setTxModalVisible(false)}
          contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.elevation.level3 }]}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>📝 Add Ledger Transaction</Text>
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

          <View style={styles.modalButtons}>
            <Button mode="outlined" onPress={() => setTxModalVisible(false)} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button 
              mode="contained" 
              onPress={handleAddTransaction} 
              loading={submitting}
              disabled={submitting}
              style={{ flex: 1 }}
            >
              Save Bill
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
