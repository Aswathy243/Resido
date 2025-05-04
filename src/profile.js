import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import { IP } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Profile = ({ navigation, route }) => {
    const { userId, residentId,staffId } = route.params || {}; // Accept both IDs
    const profileId = userId || residentId||staffId;  // ✅ Use whichever is available
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
  
    const fetchUserData = async () => {
      try {
        setError(null);
  
        console.log("🔍 Fetching Profile for profileId:", profileId);  // Debugging log
  
        const response = await axios.get(`http://${IP}:5000/api/user/${profileId}`);
  
        console.log("✅ Profile Data:", response.data);
  
        if (!response.data) {
          throw new Error("No user data received");
        }
  
        setUserData({
          ...response.data,
          createdAt: new Date(response.data.createdAt).toLocaleDateString(),
        });
      } catch (err) {
        console.error("❌ Profile fetch error:", err);
        setError(err.response?.data?.error || err.message || "Failed to load profile");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };
  
    useEffect(() => {
      if (profileId) {
        fetchUserData();
      } else {
        console.error("❌ No userId or residentId provided.");
        setError("User ID is missing.");
      }
    }, [profileId]);
  
    const onRefresh = () => {
      setRefreshing(true);
      fetchUserData();
    };
  

  useEffect(() => {
    fetchUserData();
  }, [profileId]);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      navigation.replace('Login');
    } catch (err) {
      console.error('Logout error:', err);
      Alert.alert('Error', 'Failed to logout');
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1D3956" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={fetchUserData}>
          <LinearGradient colors={['#1D3956', '#142A42']} style={styles.buttonGradient}>
            <Text style={styles.buttonText}>Retry</Text>
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!userData) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>No user data available</Text>
        <TouchableOpacity style={styles.button} onPress={fetchUserData}>
          <LinearGradient colors={['#1D3956', '#142A42']} style={styles.buttonGradient}>
            <Text style={styles.buttonText}>Refresh</Text>
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#1D3956']}
        />
      }
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#1D3956" />
          </TouchableOpacity>
          <Text style={styles.title}>My Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.profileCard}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <ProfileField label="Full Name" value={userData.fullName} />
            <ProfileField label="Username" value={userData.userName} />
            <ProfileField label="Role" value={userData.role} />
            {userData.flatNumber && <ProfileField label="Flat Number" value={userData.flatNumber} />}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <ProfileField label="Email" value={userData.email} />
            <ProfileField label="Phone" value={userData.phone} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Information</Text>
            <ProfileField label="Member Since" value={userData.createdAt} />
          </View>
        </View>

        
      </SafeAreaView>
    </ScrollView>
  );
};

const ProfileField = ({ label, value }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value} numberOfLines={1}>{value || 'N/A'}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    color: '#1D3956',
    fontSize: 16,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1D3956',
    textAlign: 'center',
    flex: 1,
  },
  errorText: {
    fontSize: 18,
    color: '#FF3A44',
    textAlign: 'center',
    marginVertical: 20,
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1D3956',
    marginBottom: 15,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  field: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  label: {
    fontSize: 16,
    color: '#555',
    fontWeight: '600',
    flex: 1,
  },
  value: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  
 
});

export default Profile;