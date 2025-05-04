import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import StaffAttendanceCalendar from "./StaffAttendanceCalendar";
import Tasks from "./Task"; // New Task Component

const { width } = Dimensions.get("window");

const HomeScreen = ({ route }) => {
  const [activeTab, setActiveTab] = useState("Attendance");
  const { staffId } = route.params || {}; // Extract staffId from params

  return (
    <View style={styles.container}>
      {/* Top Navigation Tabs */}
      <View style={styles.topNavBar}>
        {["Attendance", "Tasks"].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.navItem, activeTab === tab && styles.activeNavItem]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.navText, activeTab === tab && styles.activeNavText]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content Section */}
      <View style={styles.contentContainer}>
        {activeTab === "Attendance" ? (
          <StaffAttendanceCalendar staffId={staffId} />
        ) : (
          <Tasks staffId={staffId} />
        )}
      </View>
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  topNavBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#1D3956",
    paddingVertical: 15,
    elevation: 5,
  },
  navItem: { paddingVertical: 10, paddingHorizontal: 20 },
  activeNavItem: { borderBottomWidth: 3, borderBottomColor: "#FFD700" },
  navText: { color: "white", fontSize: 16, fontWeight: "bold" },
  activeNavText: { color: "#FFD700" },
  contentContainer: { flex: 1, padding: 20 },
});

export default HomeScreen;
