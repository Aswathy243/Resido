import React, { useRef, useState } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions, 
  Animated,
  Alert,
  TextInput
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

const { height, width } = Dimensions.get("window");

const TreasurerHomeScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const sidebarAnimation = useRef(new Animated.Value(-width)).current;
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("home");

  // Get user details from navigation params
  const { userId } = route.params || {};

  const toggleSidebar = () => {
    Animated.timing(sidebarAnimation, {
      toValue: sidebarVisible ? -width : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setSidebarVisible(!sidebarVisible);
  };

  const features = [
    { 
      id: "1", 
      name: "Insurance", 
      icon: "shield-checkmark", 
      navigateTo: "Task",
      params: { userId }
    },
    { 
      id: "2", 
      name: "Meter Approvals",
      icon: "document-text",
      navigateTo: "reading",
      params: { treasurerId: userId }
    },
  ];

  const handleNavigation = (screen, params) => {
    if (!screen) {
      Alert.alert("Error", "Screen not configured");
      return;
    }
    navigation.navigate(screen, params);
  };

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <TouchableOpacity style={styles.menuIcon} onPress={toggleSidebar}>
          <Ionicons name="menu" size={30} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerText}></Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={22} color="#575757" style={styles.searchIcon} />
        <TextInput 
          placeholder="Search features..." 
          placeholderTextColor="#575757" 
          style={styles.searchInput} 
        />
      </View>

      {/* Features Grid */}
      <FlatList
        data={features}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={{ justifyContent: "space-around" }}
        renderItem={({ item }) => (
          <View style={styles.featureWrapper}>
            <TouchableOpacity 
              activeOpacity={0.7} 
              style={styles.featureCard}
              onPress={() => handleNavigation(item.navigateTo, item.params)}
            >
              <Ionicons name={item.icon} size={39} color="#475877" />
            </TouchableOpacity>
            <Text style={styles.featureText}>{item.name}</Text>
          </View>
        )}
        style={styles.grid}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        {[
          { name: "home", icon: "home", label: "Home" },
          { name: "profile", icon: "person", label: "Profile" },
          { name: "logout", icon: "log-out", label: "Logout" },
        ].map((tab) => (
          <TouchableOpacity 
            key={tab.name} 
            style={styles.navButton} 
            onPress={() => {
              if (tab.name === "logout") {
                navigation.navigate("Login");
              } 
              else if(tab.name=="profile"){
                console.log("🔍 Navigating to Profile with userId:", userId);
                navigation.navigate("profile", { userId });

              }
              else {
                setActiveTab(tab.name);
              }
            }}
          >
            <Ionicons 
              name={tab.icon} 
              size={24} 
              color={activeTab === tab.name ? "#475877" : "grey"} 
            />
            <Text style={[
              styles.navText, 
              activeTab === tab.name && { color: "#475877" }
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    padding: 20,
    paddingTop: height * 0.12,
  },
  headerSection: {
    height: height * 0.21,
    backgroundColor: "#1D3956",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    zIndex: 1,
  },
  menuIcon: {
    position: "absolute",
    left: 20,
    top: 40,
    zIndex: 2,
  },
  headerText: {
    top: 15,
    fontSize: 25,
    fontWeight: "bold",
    letterSpacing: 1,
    color: "white",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 8,
    borderRadius: 30,
    marginBottom: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 2,
    marginTop: 35,
  
  },
  searchIcon: {
    marginRight: 9,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 8,
  },
  featureWrapper: {
    flex: 1,
    alignItems: "center",
    marginVertical: 30,
  },
  featureCard: {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    width: width * 0.37,
    height: width * 0.37,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  featureText: {
    marginTop: 10,
    color: "#333",
    fontWeight: "bold",
    fontSize: 15,
    textAlign: "center",
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  navButton: {
    alignItems: "center",
    padding: 5,
  },
  navText: {
    fontSize: 12,
    color: "grey",
    marginTop: 4,
  },
});

export default TreasurerHomeScreen;