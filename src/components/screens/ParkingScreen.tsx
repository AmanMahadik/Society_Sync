import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Image } from 'react-native';
import { Text, Card, Button, TextInput, IconButton, Portal, Modal, useTheme, Snackbar, SegmentedButtons, List } from 'react-native-paper';
import { useAuth } from '../../lib/auth-context';
import { dataManager, ParkingRequest, ParkingTimeSlot, ParkingStatus } from '../../lib/data-manager';

export const ParkingScreen: React.FC = () => {
  const { profile, user } = useAuth();
  const theme = useTheme();

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<ParkingTimeSlot>('evening');
  const [bookings, setBookings] = useState<ParkingRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ParkingRequest[]>([]);

  // Booking modal states
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [visitorName, setVisitorName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Detail modal states
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [activeDetail, setActiveDetail] = useState<ParkingRequest | null>(null);

  // Toast notification
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const showToast = (msg: string) => {
    setSnackbarMessage(msg);
    setSnackbarVisible(true);
  };

  const fetchBookings = async () => {
    try {
      const allBookings = await dataManager.getParkingBookings(selectedDate);
      setBookings(allBookings);

      // Filter pending bookings for Admin's queue across the entire day
      if (profile?.role === 'admin') {
        setPendingRequests(allBookings.filter(b => b.status === 'pending'));
      }
    } catch (e) {
      console.error('Error fetching bookings', e);
    }
  };

  useEffect(() => {
    fetchBookings();
    const interval = setInterval(fetchBookings, 4000); // Poll for live updates
    return () => clearInterval(interval);
  }, [selectedDate, profile]);

  const handleBookSlot = (slot: string) => {
    setSelectedSlot(slot);
    setBookingModalVisible(true);
  };

  const submitBooking = async () => {
    if (!visitorName || !vehicleNumber || !user) {
      showToast('Please enter visitor name and vehicle number.');
      return;
    }
    setSubmitting(true);
    try {
      await dataManager.requestParkingBooking(
        user.id,
        selectedSlot,
        selectedDate,
        selectedTimeSlot,
        vehicleNumber.toUpperCase(),
        visitorName
      );
      setBookingModalVisible(false);
      setVisitorName('');
      setVehicleNumber('');
      showToast(`Request submitted for Slot ${selectedSlot} (${selectedTimeSlot})! Waiting for approval.`);
      fetchBookings();
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Error booking slot. Please check for overlaps.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (requestId: string, status: ParkingStatus) => {
    if (!user) return;
    await dataManager.updateParkingRequestStatus(requestId, status, user.id);
    showToast(`Request ${status.toUpperCase()} successfully!`);
    fetchBookings();
  };

  const handleShowDetail = (booking: ParkingRequest) => {
    setActiveDetail(booking);
    setDetailModalVisible(true);
  };

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Generate V1 to V10 slots status for the SELECTED date and time slot
  const getSlotStatus = (slotNum: string) => {
    const booking = bookings.find(b => b.slot_number === slotNum && b.time_slot === selectedTimeSlot);
    if (!booking) return { status: 'available', booking: null };
    return { status: booking.status, booking };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#FF3B30'; // Occupied (Red)
      case 'pending': return '#FFD700'; // Pending (Gold)
      case 'available': return '#3B82F6'; // Available (Blue Accent)
      default: return theme.colors.outline;
    }
  };

  const getTimeSlotLabel = (slot: ParkingTimeSlot) => {
    switch (slot) {
      case 'morning': return '☀️ Morning (6 AM - 12 PM)';
      case 'afternoon': return '🌤️ Afternoon (12 PM - 5 PM)';
      case 'evening': return '🌆 Evening (5 PM - 11 PM)';
      case 'overnight': return '🌙 Overnight (11 PM - 6 AM)';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.screenHeader}>
        <Image 
          source={require('../../../assets/images/logo.png')} 
          style={[styles.screenHeaderLogo, { borderColor: '#3B82F6' }]} 
          resizeMode="contain"
        />
        <Text variant="titleLarge" style={styles.screenHeaderTitle}>
          SocietySync Parking
        </Text>
      </View>

      {/* Date Switcher Navigation */}
      <View style={[styles.dateBar, { backgroundColor: theme.colors.surfaceVariant }]}>
        <IconButton icon="chevron-left" size={24} onPress={() => shiftDate(-1)} />
        <Text variant="titleMedium" style={{ fontWeight: 'bold', color: '#FFFFFF' }}>
          📅 {new Date(selectedDate).toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short' })}
        </Text>
        <IconButton icon="chevron-right" size={24} onPress={() => shiftDate(1)} />
      </View>

      {/* Time Slot Switcher */}
      <View style={styles.timeSlotBar}>
        <SegmentedButtons
          value={selectedTimeSlot}
          onValueChange={(val) => setSelectedTimeSlot(val as ParkingTimeSlot)}
          buttons={[
            { value: 'morning', label: 'Morning', icon: 'weather-sunny' },
            { value: 'afternoon', label: 'Afternoon', icon: 'weather-partly-cloudy' },
            { value: 'evening', label: 'Evening', icon: 'weather-sunset' },
            { value: 'overnight', label: 'Night', icon: 'weather-night' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Visual Legend Header */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text variant="titleMedium" style={{ fontWeight: 'bold', textAlign: 'center', fontSize: 14, color: '#3B82F6' }}>
              🚗 {getTimeSlotLabel(selectedTimeSlot)}
            </Text>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: '#3B82F6' }]} />
                <Text variant="bodySmall">Available</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: '#FFD700' }]} />
                <Text variant="bodySmall">Pending</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: '#FF3B30' }]} />
                <Text variant="bodySmall">Occupied</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Interactive Slots Grid */}
        <Text variant="titleMedium" style={styles.sectionTitle}>Interactive Parking Lot Grid</Text>
        <View style={styles.gridContainer}>
          {Array.from({ length: 10 }).map((_, i) => {
            const slotName = `V${i + 1}`;
            const { status, booking } = getSlotStatus(slotName);
            const slotColor = getStatusColor(status);

            const getSlotIcon = (slotStatus: string) => {
              switch (slotStatus) {
                case 'available': return 'car-outline';
                case 'pending': return 'parking';
                case 'approved': return 'car-connected';
                default: return 'car-outline';
              }
            };

            return (
              <Card 
                key={slotName} 
                style={[
                  styles.slotCard, 
                  { borderColor: slotColor, borderWidth: 2 }
                ]}
                onPress={() => {
                  if (status === 'available') {
                    handleBookSlot(slotName);
                  } else if (booking) {
                    handleShowDetail(booking);
                  }
                }}
              >
                <Card.Content style={styles.slotContent}>
                  <Text variant="titleLarge" style={{ fontWeight: 'bold', color: slotColor }}>
                    {slotName}
                  </Text>
                  <IconButton 
                    icon={getSlotIcon(status)} 
                    iconColor={slotColor}
                    size={28}
                    style={{ margin: 0 }}
                  />
                  <Text 
                    variant="bodySmall" 
                    style={{ 
                      color: slotColor, 
                      fontWeight: 'bold', 
                      textTransform: 'uppercase',
                      fontSize: 9
                    }}
                  >
                    {status}
                  </Text>
                </Card.Content>
              </Card>
            );
          })}
        </View>

        {/* Admin Approvals Queue */}
        {profile?.role === 'admin' && (
          <View style={{ marginTop: 24 }}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
              ⏳ Pending Bookings Queue ({pendingRequests.length})
            </Text>

            {pendingRequests.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content style={{ alignItems: 'center', paddingVertical: 12 }}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>
                    No pending booking requests.
                  </Text>
                </Card.Content>
              </Card>
            ) : (
              pendingRequests.map((request) => (
                <Card key={request.id} style={styles.requestCard}>
                  <Card.Content>
                    <View style={styles.requestHeader}>
                      <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                        Slot {request.slot_number} Request
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                        Flat: {request.user_flat}
                      </Text>
                    </View>

                    <Text variant="bodyMedium" style={{ marginVertical: 2 }}>
                      Visitor: <Text style={{ fontWeight: 'bold' }}>{request.visitor_name}</Text>
                    </Text>
                    <Text variant="bodyMedium" style={{ marginBottom: 2 }}>
                      Vehicle: <Text style={{ fontWeight: 'bold' }}>{request.vehicle_number}</Text>
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.outline, marginBottom: 8, textTransform: 'capitalize' }}>
                      Time Window: {request.time_slot}
                    </Text>

                    <View style={styles.requestActions}>
                      <Button 
                        mode="outlined" 
                        onPress={() => handleStatusChange(request.id, 'rejected')}
                        style={styles.actionBtn}
                        textColor={theme.colors.error}
                        compact
                      >
                        Reject
                      </Button>
                      <Button 
                        mode="contained" 
                        onPress={() => handleStatusChange(request.id, 'approved')}
                        style={styles.actionBtn}
                        buttonColor="#388E3C"
                        textColor="#FFF"
                        compact
                      >
                        Approve
                      </Button>
                    </View>
                  </Card.Content>
                </Card>
              ))
            )}
          </View>
        )}

        {/* Security Guard Approved checklist */}
        {profile?.role === 'guard' && (
          <View style={{ marginTop: 24 }}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              📋 Approved Gate Entry Checklist
            </Text>
            {bookings.filter(b => b.status === 'approved' && b.time_slot === selectedTimeSlot).length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content style={{ alignItems: 'center', paddingVertical: 16 }}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>
                    No approved visitor vehicles scheduled for this time slot.
                  </Text>
                </Card.Content>
              </Card>
            ) : (
              bookings.filter(b => b.status === 'approved' && b.time_slot === selectedTimeSlot).map((b) => (
                <List.Item
                  key={b.id}
                  title={`${b.vehicle_number} - ${b.visitor_name}`}
                  description={`Slot ${b.slot_number} • Flat ${b.user_flat} • Approved`}
                  left={props => <List.Icon {...props} icon="check-circle" color="#388E3C" />}
                  style={{ backgroundColor: '#E8F5E9', borderRadius: 8, marginBottom: 8 }}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* SNACKBAR TOAST */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={{ marginBottom: 60 }}
      >
        {snackbarMessage}
      </Snackbar>

      {/* BOOKING REQUEST MODAL */}
      <Portal>
        <Modal
          visible={bookingModalVisible}
          onDismiss={() => setBookingModalVisible(false)}
          contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.elevation.level3 }]}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>🚗 Book Visitor Slot {selectedSlot}</Text>
          <Text variant="bodySmall" style={styles.modalSubtitle}>
            Requesting {selectedTimeSlot} slot for {selectedDate}
          </Text>

          <TextInput
            label="Visitor Full Name"
            placeholder="e.g. Rahul Mehta (Uncle)"
            value={visitorName}
            onChangeText={setVisitorName}
            mode="outlined"
            style={styles.modalInput}
            left={<TextInput.Icon icon="account" />}
          />

          <TextInput
            label="Vehicle Number"
            placeholder="e.g. MH-12-PQ-9988"
            value={vehicleNumber}
            onChangeText={setVehicleNumber}
            mode="outlined"
            style={styles.modalInput}
            autoCapitalize="characters"
            left={<TextInput.Icon icon="car-info" />}
          />

          <View style={styles.modalButtons}>
            <Button mode="outlined" onPress={() => setBookingModalVisible(false)} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button 
              mode="contained" 
              onPress={submitBooking} 
              loading={submitting}
              disabled={submitting}
              style={{ flex: 1 }}
            >
              Request Slot
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* SLOT DETAIL MODAL */}
      <Portal>
        <Modal
          visible={detailModalVisible}
          onDismiss={() => setDetailModalVisible(false)}
          contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.elevation.level3 }]}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>🏷️ Slot {activeDetail?.slot_number} Allocation</Text>
          
          {activeDetail && (
            <Card style={{ borderRadius: 12, elevation: 0 }}>
              <Card.Content style={{ gap: 8 }}>
                <Text variant="titleMedium">Status: 
                  <Text style={{ 
                    fontWeight: 'bold', 
                    color: getStatusColor(activeDetail.status),
                    textTransform: 'uppercase'
                  }}> {activeDetail.status}</Text>
                </Text>
                <Text variant="bodyLarge">Visitor: <Text style={{ fontWeight: 'bold' }}>{activeDetail.visitor_name}</Text></Text>
                <Text variant="bodyLarge">Vehicle: <Text style={{ fontWeight: 'bold' }}>{activeDetail.vehicle_number}</Text></Text>
                <Text variant="bodyLarge">Flat Host: <Text style={{ fontWeight: 'bold' }}>Flat {activeDetail.user_flat}</Text></Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.outline, textTransform: 'capitalize' }}>
                  Time Window: {activeDetail.time_slot}
                </Text>
              </Card.Content>
            </Card>
          )}

          <Button 
            mode="contained" 
            onPress={() => setDetailModalVisible(false)} 
            style={{ marginTop: 16, borderRadius: 8 }}
          >
            Close Panel
          </Button>
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
    color: '#FFFFFF',
  },
  dateBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    elevation: 1,
  },
  timeSlotBar: {
    padding: 8,
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  segmentedButtons: {
    width: '100%',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  infoCard: {
    borderRadius: 16,
    marginBottom: 16,
    elevation: 1,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  slotCard: {
    flexBasis: '48%',
    borderRadius: 12,
    elevation: 1.5,
    marginBottom: 4,
  },
  slotContent: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  emptyCard: {
    borderRadius: 12,
    elevation: 1,
  },
  requestCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    borderColor: '#E0E0E0',
    borderWidth: 1,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#EEE',
    paddingBottom: 6,
    marginBottom: 8,
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  actionBtn: {
    borderRadius: 6,
    flex: 1,
  },
  modalContainer: {
    padding: 20,
    margin: 20,
    borderRadius: 16,
  },
  modalTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalSubtitle: {
    textAlign: 'center',
    color: '#777',
    marginBottom: 16,
  },
  modalInput: {
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
});
