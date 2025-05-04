import React, { useRef, useState, useEffect } from "react";
import { 
  View, Text, FlatList, TouchableOpacity, 
  StyleSheet, Dimensions, Animated, TextInput 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

const { height, width } = Dimensions.get("window");

const features = [
  { id: "1", name: "Facility booking", icon: "calendar", navigateTo: "Halladm" },
  { id: "2", name: "Staff Attendance", icon: "people", navigateTo: "attend" },
];

const HomeScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { staffId } = route.params || {};
  const [activeTab, setActiveTab] = useState("home");
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeSidebarItem, setActiveSidebarItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredFeatures, setFilteredFeatures] = useState(features);

  const sidebarAnimation = useRef(new Animated.Value(-width)).current;
  const translateX = useRef(new Animated.Value(-width)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: 0,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredFeatures(features);
    } else {
      const filtered = features.filter(feature =>
        feature.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFeatures(filtered);
    }
  }, [searchQuery]);

  const toggleSidebar = () => {
    Animated.timing(sidebarAnimation, {
      toValue: sidebarVisible ? -width : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setSidebarVisible(!sidebarVisible);
  };

  return (
    <View style={styles.container}>
      {/* Sidebar */}
      <Animated.View style={[styles.sidebar, { transform: [{ translateX: sidebarAnimation }] }]}>
        <TouchableOpacity onPress={toggleSidebar} style={styles.closeBtn}>
          <Ionicons name="close" size={30} color="white" />
        </TouchableOpacity>
        <View style={styles.profileSection}>
          <Ionicons name="person-circle" size={60} color="white" />
          <Text style={styles.profileName}>Roshan</Text>
        </View>
        {['Dashboard', 'Profile', 'Settings'].map((item, index) => (
          <TouchableOpacity key={index} style={styles.sidebarItem} onPress={toggleSidebar}>
            <Text style={styles.sidebarItemText}>{item}</Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* Header Section */}
      <View style={styles.headerSection}>
        <TouchableOpacity style={styles.menuIcon} onPress={toggleSidebar}>
          <Ionicons name="menu" size={30} color="white" />
        </TouchableOpacity>
        <Animated.Text style={[styles.headerText, { transform: [{ translateX }] }]}>
          Welcome to ResiDo
        </Animated.Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={22} color="#575757" style={styles.searchIcon} />
        <TextInput 
          placeholder="Search features..." 
          placeholderTextColor="#575757" 
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Features Grid */}
      <FlatList
        data={filteredFeatures}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={{ justifyContent: "space-around" }}
        renderItem={({ item }) => (
          <View style={styles.featureWrapper}>
            <TouchableOpacity 
              activeOpacity={0.7} 
              style={styles.featureCard}
              onPress={() => {
                const screen = item.navigateTo || item.name.replace(/\s/g, "");
                navigation.navigate(screen);
              }}
            >
              <Ionicons name={item.icon} size={39} color="#475877" />
            </TouchableOpacity>
            <Text style={styles.featureText}>{item.name}</Text>
          </View>
        )}
        style={styles.grid}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No features found</Text>
          </View>
        }
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
              else if(tab.name === "profile") {
                console.log("🔍 Navigating to Profile with userId:", staffId);
                navigation.navigate("profile", {staffId });
              }
              else {
                setActiveTab(tab.name);
              }
            }}
          >
            <Ionicons name={tab.icon} size={24} color={activeTab === tab.name ? "#475877" : "grey"} />
            <Text style={[styles.navText, activeTab === tab.name && { color: "#475877" }]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    padding: 20,
    paddingTop: height * 0.12,
  },
  headerSection: {
    height: height * 0.29,
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
    fontFamily: "Roboto",
    color: "white",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 9,
    borderRadius: 30,
    marginBottom: 7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 2,
    marginTop: -59,
  },
  searchIcon: {
    marginRight: 9,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 7,
  },
  featureWrapper: {
    flex: 1,
    alignItems: "center",
    marginVertical: 20,
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  navButton: {
    alignItems: "center",
  },
  navText: {
    fontSize: 12,
    color: "grey",
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
  },
});

export default HomeScreen;