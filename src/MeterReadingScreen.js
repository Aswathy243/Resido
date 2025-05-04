import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Image, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, ScrollView,Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import Sharing from 'expo-sharing/build/Sharing';
import { Platform } from 'react-native';
import axios from 'axios';
import { IP } from '@env';

const MeterReadingScreen = ({ route, navigation }) => {
  const { residentId, flatNumber } = route.params;
  const [activeTab, setActiveTab] = useState('submit');
  const [readingValue, setReadingValue] = useState('');
  const [image, setImage] = useState(null);
  const [base64Image, setBase64Image] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [readingsHistory, setReadingsHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [initialReading, setInitialReading] = useState(0);
  const [currentBill, setCurrentBill] = useState(null);

  const tabs = [
    { id: 'submit', label: 'Reading' },
    { id: 'history', label: 'History' },
    { id: 'bill', label: 'Current Bill' }
  ];

  useEffect(() => {
    if (activeTab === 'history') {
      fetchReadingHistory();
    } else if (activeTab === 'bill') {
      fetchCurrentBill();
    } else {
      fetchInitialReading();
    }
  }, [activeTab]);

  const fetchInitialReading = async () => {
    try {
      const response = await axios.get(`http://${IP}:5000/api/meter-readings/initial-reading/${residentId}`);
      setInitialReading(response.data.initialReading);
    } catch (error) {
      console.error("Error fetching initial reading:", error);
    }
  };

  const fetchReadingHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await axios.get(`http://${IP}:5000/api/meter-readings/resident/${residentId}`);
      setReadingsHistory(response.data);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch reading history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchCurrentBill = async () => {
    try {
      setHistoryLoading(true);
      const response = await axios.get(`http://${IP}:5000/api/meter-readings/current-bill/${residentId}`);
      setCurrentBill(response.data);
    } catch (error) {
      if (error.response?.status !== 404) {
        Alert.alert("Error", "Failed to fetch current bill");
      }
    } finally {
      setHistoryLoading(false);
    }
  };
  

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission required", "Gallery permission is needed to select photos");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets?.length > 0) {
      const selectedImage = result.assets[0];
      setImage(selectedImage.uri);
      setBase64Image(`data:image/jpeg;base64,${selectedImage.base64}`);
    }
  };

  const submitReading = async () => {
    if (!readingValue) {
      Alert.alert("Error", "Please enter the reading value");
      return;
    }

    if (parseInt(readingValue) <= initialReading) {
      Alert.alert(
        "Invalid Reading",
        `Current reading must be greater than previous reading (${initialReading})`
      );
      return;
    }

    if (!base64Image) {
      Alert.alert("Error", "Please select a photo of your meter");
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(`http://${IP}:5000/api/meter-readings`, {
        residentId,
        flatNumber,
        readingValue,
        isManual: "false",
        imageBase64: base64Image
      });

      Alert.alert("Success", "Meter reading submitted for approval!");
      setReadingValue("");
      setImage(null);
      setBase64Image(null);
      setActiveTab("history");
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to submit reading");
    } finally {
      setIsLoading(false);
    }
  };

  const renderSubmitTab = () => (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <Text style={styles.sectionTitle}>New Meter Reading</Text>
      
      

      <TextInput
        style={styles.input}
        placeholder={`Enter current reading `}
        keyboardType="numeric"
        value={readingValue}
        onChangeText={setReadingValue}
      />

      {image ? (
        <Image source={{ uri: image }} style={styles.imagePreview} />
      ) : (
        <Text style={styles.placeholderText}>No image selected</Text>
      )}

      <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
        <Text style={styles.buttonText}>{image ? "Change Image" : "Select Image"}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.submitButton, (!readingValue || !image) && styles.disabledButton]}
        onPress={submitReading}
        disabled={!readingValue || !image || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Submit Reading</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderHistoryTab = () => (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <Text style={styles.sectionTitle}>My Reading History</Text>
      
      {historyLoading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : readingsHistory.length === 0 ? (
        <Text style={styles.emptyMessage}>No readings submitted yet</Text>
      ) : (
        readingsHistory.map((reading) => (
          <View key={reading._id} style={[
            styles.historyCard,
            reading.status === 'Approved' && styles.approvedCard,
            reading.status === 'Rejected' && styles.rejectedCard
          ]}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyDate}>
                {new Date(reading.readingDate).toLocaleDateString()}
              </Text>
              <Text style={[
                styles.statusBadge,
                reading.status === 'Approved' && styles.approvedStatus,
                reading.status === 'Rejected' && styles.rejectedStatus
              ]}>
                {reading.status}
              </Text>
            </View>

            <Text style={styles.readingValue}>
              Reading: {reading.readingValue} units
            </Text>

            {reading.rejectionReason && (
              <Text style={styles.rejectionReason}>
                Reason: {reading.rejectionReason}
              </Text>
            )}

            {reading.billAmount && (
              <View style={styles.billSection}>
                <Text style={styles.billTitle}>Bill Details:</Text>
                <Text>Previous: {reading.previousReading} units</Text>
                <Text>Current: {reading.readingValue} units</Text>
                <Text>Consumption: {reading.consumption} units</Text>
                <Text>Total Society Bill: ₹{reading.totalSocietyBill?.toFixed(2)}</Text>
                <Text style={styles.individualBill}>Your Bill: ₹{reading.billAmount?.toFixed(2)}</Text>
              </View>
            )}

            {reading.imageUrl && (
              <Image 
                source={{ uri: reading.imageUrl }} 
                style={styles.historyImage} 
              />
            )}
          </View>
        ))
      )}
    </ScrollView>
  );

  const downloadBillPDF = async () => {
    try {
      const url = `http://${IP}:5000/api/meter-readings/bill-pdf/${residentId}`;
      const filename = `Electricity_Bill_${flatNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Show loading alert
      Alert.alert(
        "Generating Bill", 
        "Your bill is being prepared...",
        [],
        { cancelable: true }
      );
  
      if (Platform.OS === 'android') {
        // For Android, use the browser to download
        Linking.openURL(url);
      } else {
        // For iOS, use the sharing approach
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        const downloadResumable = FileSystem.createDownloadResumable(
          url,
          fileUri,
          {},
          (downloadProgress) => {
            const progress = Math.round(
              (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100
            );
            console.log(`Download progress: ${progress}%`);
          }
        );
  
        const { uri } = await downloadResumable.downloadAsync();
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Your Electricity Bill',
            UTI: 'com.adobe.pdf'
          });
        } else {
          Alert.alert(
            "Download Complete", 
            `Bill saved to: ${uri}`,
            [{ text: "OK" }]
          );
        }
      }
    } catch (error) {
      console.error("Download error:", error);
      Alert.alert(
        "Error", 
        error.message || "Failed to download bill. Please try again later."
      );
    }
  };
  
  const renderBillTab = () => (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <Text style={styles.sectionTitle}>Current Electricity Bill</Text>
  
      {historyLoading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : currentBill ? (
        <View style={styles.billCard}>
          <Text style={styles.billLabel}>Previous Reading: {currentBill.previousReading} units</Text>
          <Text style={styles.billLabel}>Current Reading: {currentBill.currentReading} units</Text>
          <Text style={styles.billLabel}>Consumption: {currentBill.consumption} units</Text>
          <Text style={styles.billLabel}>Total Society Bill: ₹{currentBill.totalSocietyBill?.toFixed(2)}</Text>
          <Text style={styles.billLabel}>Your Share: ₹{currentBill.individualBill?.toFixed(2)}</Text>
          <Text style={styles.billDate}>Billing Date: {new Date(currentBill.billingDate).toLocaleDateString()}</Text>
  
          <TouchableOpacity style={styles.downloadButton} onPress={downloadBillPDF}>
            <Text style={styles.downloadButtonText}>Download PDF</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.emptyMessage}>No current bill available</Text>
      )}
    </ScrollView>
  );
  

  const renderTabContent = () => {
    switch (activeTab) {
      case 'submit': return renderSubmitTab();
      case 'history': return renderHistoryTab();
      case 'bill': return renderBillTab();
      default: return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
  {tabs.map((tab) => (
    <TouchableOpacity
      key={tab.id}
      style={[
        styles.tabButton,
        activeTab === tab.id && styles.activeTabButton
      ]}
      onPress={() => setActiveTab(tab.id)}
    >
      <Text style={[
        styles.tabText,
        activeTab === tab.id && styles.activeTabText
      ]}>
        {tab.label}
      </Text>
    </TouchableOpacity>
  ))}
</View>

      {renderTabContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1D3956',
    paddingVertical: 30,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  tabButton: {
    padding: 15,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#fff',
  },
  tabText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  activeTabText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  tabContent: {
    flexGrow: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D3956',
    marginBottom: 20,
  },
  readingInfo: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#e9f5ff',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#eee',
  },
  placeholderText: {
    textAlign: 'center',
    padding: 20,
    color: '#999',
    fontStyle: 'italic',
    backgroundColor: '#eee',
    borderRadius: 8,
    marginBottom: 15,
  },
  imageButton: {
    backgroundColor: '#1D3956',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#2ecc71',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  loader: {
    marginVertical: 30,
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#666',
    marginTop: 30,
    fontSize: 16,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  approvedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2ecc71',
  },
  rejectedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  historyDate: {
    color: '#666',
    fontSize: 14,
  },
  statusBadge: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  approvedStatus: {
    backgroundColor: '#e8f8f0',
    color: '#2ecc71',
  },
  rejectedStatus: {
    backgroundColor: '#fdedec',
    color: '#e74c3c',
  },
  readingValue: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  rejectionReason: {
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  billSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  billTitle: {
    fontWeight: '600',
    marginBottom: 5,
    color: '#1D3956',
  },
  individualBill: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#1D3956',
    marginTop: 5,
  },
  historyImage: {
    width: '100%',
    height: 150,
    borderRadius: 6,
    backgroundColor: '#eee',
    marginTop: 10,
  },
  billCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  totalBillRow: {
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  billLabel: {
    fontSize: 16,
    color: '#555',
  },
  totalBillLabel: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  billValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalBillValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1D3956',
  },
  billDate: {
    textAlign: 'right',
    color: '#666',
    fontSize: 14,
    marginTop: 10,
  },
  downloadButton: {
    backgroundColor: "#1D3956",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 15,
  },
  downloadButtonText: {
    color: "#fff",
    fontWeight: "600",
  }
  
});

export default MeterReadingScreen;