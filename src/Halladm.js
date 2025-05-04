import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");
const API_URL = "http://192.168.169.139:5000"; // Replace with your actual local IP

const AdminHallBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/hall-bookings`);
      setBookings(response.data);
    } catch (error) {
      Alert.alert("Error", "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (bookingId, status) => {
    setUpdating(true);
    try {
      const response = await axios.put(`${API_URL}/api/hall-bookings/${bookingId}`, { status });
      if (response.status === 200) {
        Alert.alert("Success", `Booking ${status.toLowerCase()} successfully.`);
        fetchBookings(); // Refresh list
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update booking status.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Hall Bookings</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1D3956" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View style={styles.bookingCard}>
              <View style={styles.bookingHeader}>
                <Ionicons name="calendar-outline" size={24} color="#1D3956" />
                <Text style={styles.bookingTitle}>{item.facility}</Text>
              </View>

              <View style={styles.bookingDetails}>
                <Text style={styles.label}>Resident: <Text style={styles.value}>{item.residentName}</Text></Text>
                <Text style={styles.label}>Flat: <Text style={styles.value}>{item.flatNumber}</Text></Text>
                <Text style={styles.label}>Date: <Text style={styles.value}>{item.date}</Text></Text>
                <Text style={styles.label}>Time: <Text style={styles.value}>{item.time}</Text></Text>
                <Text style={styles.label}>Status: <Text style={[styles.status, styles[item.status.toLowerCase()]]}>{item.status}</Text></Text>
              </View>

              {item.status === "Pending" && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => handleStatusUpdate(item._id, "Approved")}
                    disabled={updating}
                  >
                    <Text style={styles.actionText}>{updating ? "Processing..." : "Approve"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleStatusUpdate(item._id, "Rejected")}
                    disabled={updating}
                  >
                    <Text style={styles.actionText}>{updating ? "Processing..." : "Reject"}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", padding: 20 },

  
  headerText: { fontSize: 24, fontWeight: "bold", color: "#1D3956" },

  // Booking Card
  bookingCard: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  bookingTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1D3956",
    marginLeft: 10,
  },
  bookingDetails: { marginBottom: 10 },
  label: { fontSize: 14, fontWeight: "bold", color: "#555" },
  value: { fontSize: 14, color: "#333" },

  // Status Colors
  status: { fontSize: 14, fontWeight: "bold" },
  approved: { color: "green" },
  rejected: { color: "red" },
  pending: { color: "orange" },

  // Action Buttons
  actions: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
    marginHorizontal: 5,
  },
  approveButton: { backgroundColor: "#2E8B57" },
  rejectButton: { backgroundColor: "#D32F2F" },
  actionText: { color: "white", fontWeight: "bold" },
});

export default AdminHallBookings;
