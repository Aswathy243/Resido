import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, Alert, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { IP } from "@env";

export default function InsuranceManager({ route }) {
  const { userId } = route.params;
  const [activeTab, setActiveTab] = useState("details");
  const [insuranceName, setInsuranceName] = useState("");
  const [renewalDate, setRenewalDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [history, setHistory] = useState([]);
  const [reminders, setReminders] = useState([]);

  const formatDateForDisplay = (dateString) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Fetch insurance history for the user
  const fetchHistory = async () => {
    try {
      const response = await axios.get(`http://${IP}:5000/api/insurance/history/${userId}`);
      setHistory(response.data.map(item => ({
        ...item,
        formattedDate: formatDateForDisplay(item.renewalDate)
      })));
    } catch (error) {
      console.error("Error fetching history:", error);
      Alert.alert("Error", "Failed to load insurance history");
    }
  };

  // Fetch renewal and payment reminders
  const fetchReminders = async () => {
    try {
      const response = await axios.get(`http://${IP}:5000/api/reminders`);
      const today = new Date().toISOString().split("T")[0];

      const dueTodayReminders = response.data.insuranceReminders
        .filter(reminder => reminder.renewalDate === today)
        .map(reminder => ({
          ...reminder,
          formattedDate: formatDateForDisplay(reminder.renewalDate),
          type: "Insurance Renewal Due"
        }));

      const paymentReminders = response.data.paymentReminders
        .filter(reminder => reminder.paymentReminderDate === today)
        .map(reminder => ({
          ...reminder,
          formattedDate: formatDateForDisplay(reminder.paymentReminderDate),
          type: "Treasurer Payment Due"
        }));

      setReminders([...dueTodayReminders, ...paymentReminders]);
    } catch (error) {
      console.error("Error fetching reminders:", error);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchReminders();
    const interval = setInterval(fetchReminders, 300000); // Refresh reminders every 5 minutes
    return () => clearInterval(interval);
  }, []);

  // Handle saving new insurance entry
  const handleSave = async () => {
    if (!insuranceName.trim()) {
      Alert.alert("Error", "Please enter an insurance name");
      return;
    }

    try {
      const formattedDate = renewalDate.toISOString().split("T")[0];
      await axios.post(`http://${IP}:5000/api/insurance`, {
        userId,
        insuranceName,
        renewalDate: formattedDate
      });

      Alert.alert("Success", "Insurance saved successfully");
      setInsuranceName("");
      setRenewalDate(new Date());
      fetchHistory();
      fetchReminders();
    } catch (error) {
      console.error("Error saving insurance:", error);
      Alert.alert("Error", error.response?.data?.error || "Failed to save insurance");
    }
  };

  return (
    <View style={styles.container}>
      {/* Tabs for Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === "details" && styles.activeTab]} onPress={() => setActiveTab("details")}>
          <Text style={[styles.tabText, activeTab === "details" && styles.activeTabText]}>Insurance</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === "history" && styles.activeTab]} onPress={() => setActiveTab("history")}>
          <Text style={[styles.tabText, activeTab === "history" && styles.activeTabText]}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === "reminders" && styles.activeTab]} onPress={() => setActiveTab("reminders")}>
          <Text style={[styles.tabText, activeTab === "reminders" && styles.activeTabText]}>Reminders</Text>
        </TouchableOpacity>
      </View>

      {/* Add Insurance Details */}
      {activeTab === "details" && (
        <View style={styles.tabContent}>
          <TextInput style={styles.input} placeholder="Insurance Name" value={insuranceName} onChangeText={setInsuranceName} />
          <TouchableOpacity onPress={() => setShowPicker(true)}>
            <TextInput style={styles.input} placeholder="Select Renewal Date" value={renewalDate.toLocaleDateString()} editable={false} />
          </TouchableOpacity>
          {showPicker && (
            <DateTimePicker value={renewalDate} mode="date" display="default" onChange={(event, selectedDate) => {
              setShowPicker(false);
              if (selectedDate) setRenewalDate(selectedDate);
            }} />
          )}
           <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Insurance History */}
      {activeTab === "history" && (
        <ScrollView style={styles.tabContent}>
          {history.length === 0 ? (
            <Text style={styles.noDataText}>No insurance history found.</Text>
          ) : (
            history.map((item, index) => (
              <View key={index} style={styles.historyItem}>
                <Text style={styles.historyText}>{item.insuranceName} - Due: {item.formattedDate}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Reminders */}
      {activeTab === "reminders" && (
        <ScrollView style={styles.tabContent}>
          {reminders.length === 0 ? (
            <Text style={styles.noDataText}>No reminders for today.</Text>
          ) : (
            reminders.map((item, index) => (
              <View key={index} style={[styles.reminderItem, item.type === "Treasurer Payment Due" ? styles.paymentReminder : null]}>
                <Text style={styles.reminderText}>🔔 {item.insuranceName} - {item.type} ({item.formattedDate})</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9FC" },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#1D3956",
    paddingVertical: 30,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  tab: { padding: 10 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: "#fff" },
  tabText: { fontSize: 16, color: "#fff", fontWeight: "600" },
  activeTabText: { fontSize: 18, fontWeight: "bold", color: "white" },
  tabContent: { flexGrow: 1, padding: 20 },
  input: { height: 50, borderColor: "#ddd", borderWidth: 1, borderRadius: 10, marginBottom: 15, paddingHorizontal: 10, backgroundColor: "#fff" },
  noDataText: { textAlign: "center", fontSize: 16, color: "gray", marginTop: 20 },
  historyItem: { padding: 15, backgroundColor: "#f5f5f5", marginBottom: 10, borderRadius: 8 },
  reminderItem: { padding: 15, backgroundColor: "#FFEEEE", borderLeftWidth: 4, borderLeftColor: "red", marginBottom: 10, borderRadius: 8 },
  paymentReminder: { backgroundColor: "#FFFAE6", borderLeftColor: "orange" },
  reminderText: { fontSize: 16 },
  saveButton: { backgroundColor: "#1D3956", padding: 15, borderRadius: 50, alignItems: "center",width:250,marginLeft:30 },
  saveButtonText: { color: "#fff", fontWeight: "bold" },
});

