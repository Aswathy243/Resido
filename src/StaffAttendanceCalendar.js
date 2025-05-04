import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  ActivityIndicator, 
  Alert, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView 
} from "react-native";
import { Calendar } from "react-native-calendars";

const API_URL = "http://192.168.169.139:5000"; // Replace with your actual IP

const StaffAttendanceCalendar = ({ route }) => {
  const [activeTab, setActiveTab] = useState("calendar"); // Manage tab state
  const [attendance, setAttendance] = useState({});
  const [tasks, setTasks] = useState([]); // Store tasks assigned to staff
  const [loading, setLoading] = useState(true);
  const { staffId } = route.params;

  useEffect(() => {
    if (staffId) {
      fetchAttendanceAndTasks(staffId);
    }
  }, [staffId]);

  const fetchAttendanceAndTasks = async (id) => {
    try {
      const response = await fetch(`${API_URL}/attendance/user/${id}`);
      const data = await response.json();

      if (data.error) throw new Error(data.error);

      // Extract attendance and tasks separately
      setAttendance(data.markedDates || {});
      setTasks(data.tasks || []);
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "calendar" && styles.activeTab]}
          onPress={() => setActiveTab("calendar")}
        >
          <Text style={[styles.tabText, activeTab === "calendar" && styles.activeTabText]}>
            Calendar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "tasks" && styles.activeTab]}
          onPress={() => setActiveTab("tasks")}
        >
          <Text style={[styles.tabText, activeTab === "tasks" && styles.activeTabText]}>
            Tasks
          </Text>
        </TouchableOpacity>
      </View>

      {/* Calendar View */}
      {activeTab === "calendar" ? (
        <View style={styles.tabContent}>
          {loading ? (
            <ActivityIndicator size="large" color="red" />
          ) : (
            <Calendar
              markedDates={attendance}
              theme={{
                todayTextColor: "red",
                arrowColor: "grey",
              }}
              markingType="custom"
            />
          )}
        </View>
      ) : (
        /* Task List View - Read Only */
        <ScrollView contentContainerStyle={styles.tabContent}>
          {loading ? (
            <ActivityIndicator size="large" color="red" />
          ) : tasks.length === 0 ? (
            <Text style={styles.noTasksText}>No tasks assigned.</Text>
          ) : (
            tasks.map((item, index) => (
              <View key={index} style={styles.taskItem}>
                <Text style={styles.taskDate}>Due: {item.dueDate}</Text>
                <Text style={styles.taskText}>
                  <Text style={{ fontWeight: "bold" }}>Task: </Text>
                  {item.task}
                </Text>
                <View style={styles.taskStatus}>
                  <Text style={styles.statusText}>
                    Status: {item.completed ? "Completed " : "Pending"}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#1D3956",
    paddingVertical: 20,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  tab: {
    padding: 15,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#fff",
  },
  tabText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  activeTabText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "yellow",
  },
  tabContent: {
    flexGrow: 1,
    padding: 20,
  },
  noTasksText: {
    textAlign: "center",
    fontSize: 16,
    color: "gray",
  },
  taskItem: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  taskDate: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  taskText: {
    fontSize: 14,
    color: "#555",
    marginBottom: 5,
  },
  taskStatus: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  statusText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
});

export default StaffAttendanceCalendar;