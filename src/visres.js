import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator
} from "react-native";

const BASE_URL = "http://192.168.169.139:5000";

const ResidentVisitorScreen = ({ route }) => {
  const { flatNumber } = route.params;
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResidentVisitors();
  }, []);

  // Fetch visitors who visited this resident's flat
  const fetchResidentVisitors = async () => {
    try {
      console.log(`Fetching visitors for flat: ${flatNumber}`);
      const response = await fetch(`${BASE_URL}/api/resident/visitors/${flatNumber}`);

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Resident Visitors API Response:", JSON.stringify(data, null, 2));

      setVisitors(data);
    } catch (error) {
      console.error("❌ Error fetching resident visitors:", error);
      Alert.alert("Error", "Failed to fetch visitors.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Visitors for Flat {flatNumber}</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#1D3956" style={styles.loader} />
      ) : visitors.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.noVisitorsText}>No visitors found.</Text>
        </View>
      ) : (
        <FlatList
          data={visitors}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={styles.visitorCard}>
              <Text style={styles.visitorText}>
                <Text style={styles.boldText}>Name:</Text> {item.visitorName}
              </Text>
              <Text style={styles.visitorText}>
                <Text style={styles.boldText}>Phone:</Text> {item.visitorPhone}
              </Text>
              <Text style={styles.visitorText}>
                <Text style={styles.boldText}>Visited On:</Text> {item.date}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9FC", padding: 20 },
  header: { fontSize: 24, fontWeight: "bold", color: "#1D3956", textAlign: "center", marginBottom: 20 },
  loader: { marginTop: 50 },
  visitorCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 3,
  },
  visitorText: { fontSize: 16, color: "#333", marginBottom: 5 },
  boldText: { fontWeight: "bold", color: "#1D3956" },
  emptyContainer: { alignItems: "center", justifyContent: "center", marginTop: 50 },
  noVisitorsText: { fontSize: 18, color: "#888" },
});

export default ResidentVisitorScreen;
