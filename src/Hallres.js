import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Alert,
  StyleSheet, FlatList, Modal, Platform, ScrollView
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";

const ResidentHallBooking = ({ route }) => {
  const { residentId, residentName, flatNumber } = route.params || {};

  const [activeTab, setActiveTab] = useState("Book");
  const [halls] = useState(["Community Hall 1", "Community Hall 2", "Community Hall 3", "Community Hall 4"]);
  const [selectedHall, setSelectedHall] = useState(null);
  const [eventName, setEventName] = useState("");
  const [peopleCount, setPeopleCount] = useState("");
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState("12:00 PM");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);
  const [lockedHalls, setLockedHalls] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchLockedHalls(), fetchMyBookings()]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLockedHalls = async () => {
    try {
      const response = await axios.get("http://192.168.169.139:5000/api/locked-halls");
      setLockedHalls(response.data.lockedHalls);
    } catch (error) {
      console.error("Error fetching locked halls:", error);
      Alert.alert("Error", "Failed to fetch hall availability");
    }
  };

  const fetchMyBookings = async () => {
    try {
      const response = await axios.get(`http://192.168.169.139:5000/api/my-hall-bookings/${residentId}`);
      setMyBookings(response.data);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      Alert.alert("Error", "Failed to fetch your bookings");
    }
  };

  const handleTimeChange = (event, newTime) => {
    setShowTimePicker(false);
    if (newTime) {
      setSelectedTime(newTime);
      const hours = newTime.getHours();
      const minutes = newTime.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12;
      const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
      setTime(`${formattedHours}:${formattedMinutes} ${ampm}`);
    }
  };

  const convertTo24Hour = (timeString) => {
    const [time, period] = timeString.split(' ');
    let [hours, minutes] = time.split(':');
    
    if (period === 'PM' && hours !== '12') {
      hours = parseInt(hours, 10) + 12;
    } else if (period === 'AM' && hours === '12') {
      hours = '00';
    }
    
    return `${hours}:${minutes}`;
  };

  const handleBooking = async () => {
    if (!residentId || !residentName || !flatNumber || !eventName || !peopleCount || !selectedHall || !time) {
      Alert.alert("Error", "Please fill all fields including time");
      return;
    }

    try {
      const time24 = convertTo24Hour(time);
      const response = await axios.post("http://192.168.169.139:5000/api/book-hall", {
        residentId,
        residentName,
        flatNumber,
        facility: selectedHall,
        eventName,
        peopleCount,
        date: date.toISOString().split("T")[0],
        time: time24,
      });

      Alert.alert("Success", response.data.message);
      setModalVisible(false);
      setEventName("");
      setPeopleCount("");
      setDate(new Date());
      setTime("12:00 PM");
      setSelectedTime(new Date());
      fetchData();
    } catch (error) {
      console.error("Booking Error:", error.response?.data || error);
      Alert.alert("Error", error.response?.data?.error || "Failed to book hall");
    }
  };

  const handleCancelBooking = async (booking) => {
    if (isCancelling) return;
    
    setIsCancelling(true);
    try {
      await axios.post("http://192.168.169.139:5000/api/unlock-hall", { 
        residentId, 
        facility: booking.facility 
      });
      Alert.alert("Success", "Booking cancelled successfully");
      fetchData();
    } catch (error) {
      console.error("Cancel booking error:", error);
      Alert.alert("Error", error.response?.data?.error || "Failed to cancel booking");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "Book" && styles.activeTab]}
          onPress={() => setActiveTab("Book")}
        >
          <Text style={[styles.tabText, activeTab === "Book" && styles.activeTabText]}>
            Book Hall
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "Modify" && styles.activeTab]}
          onPress={() => setActiveTab("Modify")}
        >
          <Text style={[styles.tabText, activeTab === "Modify" && styles.activeTabText]}>
            My Bookings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}

      {/* Content Area */}
      {!isLoading && activeTab === "Book" ? (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={[styles.card, styles.firstCard]}>
            <Text style={styles.subHeader}>Available Community Halls</Text>
            <View style={styles.hallContainer}>
              {halls.map((hall) => (
                <TouchableOpacity
                  key={hall}
                  style={[
                    styles.hallBox,
                    lockedHalls.includes(hall) && styles.lockedHall
                  ]}
                  disabled={lockedHalls.includes(hall)}
                  onPress={() => {
                    setSelectedHall(hall);
                    setModalVisible(true);
                  }}
                >
                  <Text style={styles.hallText}>{hall}</Text>
                  {lockedHalls.includes(hall) && (
                    <Text style={styles.lockedText}>Booked</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : (
        !isLoading && (
          <View style={[styles.card, styles.firstCard]}>
            <Text style={styles.subHeader}>Your Bookings</Text>
            {myBookings.length > 0 ? (
              <FlatList
                data={myBookings}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.flatListContent}
                renderItem={({ item }) => (
                  <View style={styles.bookingItem}>
                    <View style={styles.bookingHeader}>
                      <Text style={styles.bookingHall}>{item.facility}</Text>
                      <Text style={styles.bookingStatus}>Confirmed</Text>
                    </View>
                    
                    <View style={styles.bookingDetailsContainer}>
                      <View style={styles.bookingDetailRow}>
                        <Text style={styles.bookingDetailLabel}>Date:</Text>
                        <Text style={styles.bookingDetailValue}>{item.date}</Text>
                      </View>
                      
                      <View style={styles.bookingDetailRow}>
                        <Text style={styles.bookingDetailLabel}>Time:</Text>
                        <Text style={styles.bookingDetailValue}>{item.time}</Text>
                      </View>
                      
                      <View style={styles.bookingDetailRow}>
                        <Text style={styles.bookingDetailLabel}>Event:</Text>
                        <Text style={styles.bookingDetailValue}>{item.eventName}</Text>
                      </View>
                      
                      <View style={styles.bookingDetailRow}>
                        <Text style={styles.bookingDetailLabel}>People:</Text>
                        <Text style={styles.bookingDetailValue}>{item.peopleCount}</Text>
                      </View>
                    </View>
                    
                    <TouchableOpacity
                      style={[styles.checkoutBtn, isCancelling && { opacity: 0.7 }]}
                      onPress={() => handleCancelBooking(item)}
                      disabled={isCancelling}
                    >
                      <Text style={styles.checkoutText}>
                        {isCancelling ? "Cancelling..." : "Cancel Booking"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            ) : (
              <View style={styles.noBookingsContainer}>
                <Text style={styles.noBookingsText}>You don't have any bookings yet</Text>
                <Text style={styles.noBookingsSubText}>Book a hall to see your reservations here</Text>
              </View>
            )}
          </View>
        )
      )}

      {/* Booking Form Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Book {selectedHall}</Text>
            
            <View style={styles.modalCard}>
              <Text style={styles.subHeader}>Event Name</Text>
              <TextInput
                placeholder="Enter event name"
                value={eventName}
                onChangeText={setEventName}
                style={styles.input}
              />
            </View>
            
            <View style={styles.modalCard}>
              <Text style={styles.subHeader}>Number of People</Text>
              <TextInput
                placeholder="Enter number of people"
                value={peopleCount}
                onChangeText={setPeopleCount}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
            
            <View style={styles.modalCard}>
              <Text style={styles.subHeader}>Event Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {date.toISOString().split("T")[0]}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) setDate(selectedDate);
                  }}
                />
              )}
            </View>

            <View style={styles.modalCard}>
              <Text style={styles.subHeader}>Event Time</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.timeButtonText}>{time || "Select Time"}</Text>
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={handleTimeChange}
                />
              )}
            </View>
            
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleBooking}
            >
              <Text style={styles.submitText}>Submit Booking</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.cancelModalBtn}
              onPress={() => {
                setModalVisible(false);
                setEventName("");
                setPeopleCount("");
                setDate(new Date());
                setTime("12:00 PM");
                setSelectedTime(new Date());
              }}
            >
              <Text style={styles.cancelModalText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9FC" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 18,
    color: "#1D3956",
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#1D3956",
    paddingVertical: 20,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  tab: { padding: 10 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: "#fff" },
  tabText: { fontSize: 16, color: "#fff", fontWeight: "600" },
  activeTabText: { fontWeight: "bold" },
  scrollContainer: { paddingHorizontal: 20, paddingVertical: 20 },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
  },
  firstCard: { marginTop: 10 },
  subHeader: {
    fontSize: 18,
    fontWeight: "600",
    color: "#555",
    marginBottom: 15,
  },
  hallContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  hallBox: {
    width: "48%",
    backgroundColor: "#1D3956",
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  hallText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  lockedHall: {
    backgroundColor: "#ff6961",
    opacity: 0.7,
  },
  lockedText: {
    color: "#fff",
    fontWeight: "bold",
    marginTop: 5,
  },
  bookingItem: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  bookingHall: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1D3956",
  },
  bookingStatus: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "600",
  },
  bookingDetailsContainer: {
    marginVertical: 10,
  },
  bookingDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  bookingDetailLabel: {
    fontSize: 16,
    color: "#555",
    fontWeight: "600",
  },
  bookingDetailValue: {
    fontSize: 16,
    color: "#333",
  },
  noBookingsContainer: {
    alignItems: "center",
    paddingVertical: 30,
  },
  noBookingsText: {
    textAlign: "center",
    color: "#777",
    fontSize: 18,
    marginBottom: 5,
  },
  noBookingsSubText: {
    textAlign: "center",
    color: "#aaa",
    fontSize: 14,
  },
  checkoutBtn: {
    backgroundColor: "#ff4444",
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 15,
  },
  checkoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "#F7F9FC",
    borderRadius: 15,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1D3956",
    marginBottom: 20,
    textAlign: "center",
  },
  modalCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#1D3956",
    borderRadius: 10,
    padding: 15,
    backgroundColor: "#f5f5f5",
  },
  dateButton: {
    borderWidth: 1,
    borderColor: "#1D3956",
    borderRadius: 10,
    padding: 15,
    backgroundColor: "#f5f5f5",
  },
  dateButtonText: {
    color: "#333",
  },
  timeButton: {
    borderWidth: 1,
    borderColor: "#1D3956",
    borderRadius: 10,
    padding: 15,
    backgroundColor: "#f5f5f5",
  },
  timeButtonText: {
    color: "#333",
  },
  submitBtn: {
    backgroundColor: "#1D3956",
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 10,
  },
  submitText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  cancelModalBtn: {
    backgroundColor: "#1D3956",
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 10,
  },
  cancelModalText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  flatListContent: {
    paddingBottom: 20,
  },
});

export default ResidentHallBooking;