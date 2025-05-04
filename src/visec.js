import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  FlatList,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

const BASE_URL = "http://192.168.169.139:5000/api";

const VisitorScreen = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState("visitor");
  const [visitorName, setVisitorName] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [purpose, setPurpose] = useState("");
  const [flatNumber, setFlatNumber] = useState("");
  const [visitors, setVisitors] = useState([]);
  const [searchFlatNumber, setSearchFlatNumber] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [allVisitors, setAllVisitors] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchVisitors();
    fetchAllVisitors();
  }, []);

  const fetchVisitors = async () => {
    try {
      const response = await fetch(`${BASE_URL}/visitors`);
      const data = await response.json();
      setVisitors(data);
    } catch (error) {
      console.error("Error fetching visitors:", error);
    }
  };

  const fetchAllVisitors = async () => {
    try {
      setRefreshing(true);
      const response = await fetch(`${BASE_URL}/visitors`);
      const data = await response.json();
      setAllVisitors(data);
    } catch (error) {
      console.error("Error fetching all visitors:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSearch = async () => {
    if (!searchFlatNumber.trim()) {
      Alert.alert("Error", "Please enter a flat number to search.");
      return;
    }

    try {
      const response = await fetch(
        `${BASE_URL}/search-visitor?flatNumber=${searchFlatNumber}`
      );
      const data = await response.json();
      const filteredResults = data.filter((visitor) => !visitor.checkOutTime);
      setSearchResults(filteredResults);
    } catch (error) {
      console.error("Error searching visitor:", error);
      Alert.alert("Error", "Failed to search visitor.");
    }
  };

  const handleCheckIn = async () => {
    if (!visitorName || !visitorPhone || !flatNumber) {
      Alert.alert("Error", "Name, phone and flat number are required.");
      return;
    }
  
    if (visitorPhone.length !== 10) {
      Alert.alert("Error", "Please enter a valid 10-digit phone number.");
      return;
    }
  
    const visitorData = {
      visitorName,
      visitorPhone,
      purpose: purpose || "Not specified",
      flatNumber,
    };
  
    try {
      const response = await fetch(`${BASE_URL}/visitor/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(visitorData),
      });
  
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to check in visitor");
      }
  
      Alert.alert("Success", data.message);
      setVisitorName("");
      setVisitorPhone("");
      setPurpose("");
      setFlatNumber("");
      fetchVisitors();
      fetchAllVisitors();
    } catch (error) {
      console.error("Error:", error);
      Alert.alert("Error", error.message || "Failed to submit visitor details.");
    }
  };

  const handleCheckOut = async (visitorPhone) => {
    try {
      const response = await fetch(`${BASE_URL}/visitor/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorPhone }),
      });

      const data = await response.json();
      Alert.alert("Success", data.message);
      fetchVisitors();
      fetchAllVisitors();
      handleSearch();
    } catch (error) {
      console.error("Error:", error);
      Alert.alert("Error", "Failed to check out visitor.");
    }
  };

  const renderVisitorItem = ({ item }) => (
    <View style={styles.requestItem}>
      <Text style={styles.requestText}>Name: {item.visitorName}</Text>
      <Text style={styles.requestText}>Phone: {item.visitorPhone}</Text>
      <Text style={styles.requestText}>Flat: {item.flatNumber}</Text>
      <Text style={styles.requestText}>Date: {item.date}</Text>
      <Text style={styles.requestText}>Time: {item.time}</Text>
      {!item.checkOutTime && (
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() => handleCheckOut(item.visitorPhone)}
        >
          <Text style={styles.checkoutText}>Check Out</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderLogItem = ({ item }) => (
    <View style={styles.logItem}>
      <Text style={styles.logText}>Name: {item.visitorName}</Text>
      <Text style={styles.logText}>Phone: {item.visitorPhone}</Text>
      <Text style={styles.logText}>Flat: {item.flatNumber}</Text>
      <Text style={styles.logText}>Purpose: {item.purpose}</Text>
      <Text style={styles.logText}>Date: {item.date}</Text>
      <Text style={styles.logText}>Check-in: {item.time}</Text>
      <Text
        style={[
          styles.logText,
          item.checkOutTime ? styles.checkedOut : styles.checkedIn,
        ]}
      >
        Check-out: {item.checkOutTime || "Not checked out"}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "visitor" && styles.activeTab]}
          onPress={() => setActiveTab("visitor")}
        >
          <Text style={[styles.tabText, activeTab === "visitor" && styles.activeTabText]}>
            Visitor
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "search" && styles.activeTab]}
          onPress={() => setActiveTab("search")}
        >
          <Text style={[styles.tabText, activeTab === "search" && styles.activeTabText]}>
            Search
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "logs" && styles.activeTab]}
          onPress={() => {
            setActiveTab("logs");
            fetchAllVisitors();
          }}
        >
          <Text style={[styles.tabText, activeTab === "logs" && styles.activeTabText]}>
            Logs
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "visitor" && (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={[styles.card, styles.firstCard]}>
            <Text style={styles.subHeader}>Visitor Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter visitor name"
              value={visitorName}
              onChangeText={setVisitorName}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.subHeader}>Visitor Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter visitor phone number"
              value={visitorPhone}
              onChangeText={setVisitorPhone}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.subHeader}>Flat Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter flat number"
              value={flatNumber}
              onChangeText={setFlatNumber}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.subHeader}>Purpose (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter purpose of visit"
              value={purpose}
              onChangeText={setPurpose}
            />
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleCheckIn}>
            <Text style={styles.submitText}>Check In Visitor</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {activeTab === "search" && (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.card}>
            <Text style={styles.subHeader}>Search Visitor by Flat Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter Flat Number"
              value={searchFlatNumber}
              onChangeText={setSearchFlatNumber}
            />
            <TouchableOpacity style={styles.submitBtn} onPress={handleSearch}>
              <Text style={styles.submitText}>Search</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={searchResults}
            keyExtractor={(item) => item._id}
            renderItem={renderVisitorItem}
            ListEmptyComponent={
              <Text style={styles.noRequestsText}>
                {searchFlatNumber
                  ? "No active visitors found for this flat."
                  : "Enter a flat number to search."}
              </Text>
            }
            scrollEnabled={false}
          />
        </ScrollView>
      )}

      {activeTab === "logs" && (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.card}>
            <Text style={styles.logsHeader}>All Visitor Logs</Text>
            <FlatList
              data={allVisitors}
              keyExtractor={(item) => item._id}
              renderItem={renderLogItem}
              ListEmptyComponent={
                <Text style={styles.noLogsText}>No visitor logs found.</Text>
              }
              scrollEnabled={false}
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9FC" },
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
  subHeader: { fontSize: 18, fontWeight: "600", color: "#555", marginBottom: 10 },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2,
  },
  firstCard: { marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#1D3956",
    borderRadius: 10,
    padding: 15,
    backgroundColor: "#f5f5f5",
    marginBottom: 10,
  },
  submitBtn: {
    backgroundColor: "#1D3956",
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 10,
  },
  submitText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  requestItem: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  requestText: { fontSize: 14, marginBottom: 5, color: "#333" },
  checkoutBtn: {
    backgroundColor: "#e74c3c",
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 10,
  },
  checkoutText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  noRequestsText: {
    textAlign: "center",
    color: "#777",
    marginTop: 20,
    fontSize: 16,
  },
  logsHeader: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1D3956",
    marginBottom: 15,
    textAlign: "center",
  },
  logItem: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  logText: { fontSize: 14, marginBottom: 5, color: "#333" },
  checkedIn: { color: "#e74c3c", fontWeight: "bold" },
  checkedOut: { color: "#2ecc71", fontWeight: "bold" },
  noLogsText: {
    textAlign: "center",
    color: "#777",
    marginTop: 20,
    fontSize: 16,
  },
});

export default VisitorScreen;