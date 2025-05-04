import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Alert, ActivityIndicator, TouchableOpacity, Modal, TextInput } from 'react-native';
import axios from 'axios';
import { IP } from '@env';

const MeterReadingApprovalScreen = ({ route }) => {
  const { userId } = route.params;
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingReadings, setPendingReadings] = useState([]);
  const [processedReadings, setProcessedReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedReading, setSelectedReading] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalBillAmount, setTotalBillAmount] = useState('');
  const [showBillModal, setShowBillModal] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState({
    allSubmitted: false,
    totalResidents: 0,
    submittedCount: 0,
    missingSubmissions: []
  });

  useEffect(() => {
    fetchReadings();
  }, [activeTab]);

  useEffect(() => {
    const checkSubmissionStatus = async () => {
      try {
        const response = await axios.get(`http://${IP}:5000/api/meter-readings/submission-status`);
        setSubmissionStatus(response.data);
      } catch (error) {
        console.error("Error checking submission status:", error);
      }
    };
    
    if (activeTab === 'processed') {
      checkSubmissionStatus();
    }
  }, [activeTab]);

  const fetchReadings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://${IP}:5000/api/meter-readings`);
      
      setPendingReadings(response.data.filter(r => r.status === 'Pending'));
      setProcessedReadings(response.data.filter(r => r.status !== 'Pending'));
    } catch (error) {
      Alert.alert("Error", "Failed to fetch meter readings");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reading) => {
    try {
      setIsProcessing(true);
      await axios.post(
        `http://${IP}:5000/api/meter-readings/approve/${reading._id}`,
        { treasurerId: userId }
      );

      fetchReadings();
      Alert.alert("Success", "Meter reading approved");
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to approve reading");
    } finally {
      setIsProcessing(false);
    }
  };

  const openRejectModal = (reading) => {
    setSelectedReading(reading);
    setRejectModalVisible(true);
  };

  const handleReject = async () => {
    if (!rejectionReason) {
      Alert.alert("Error", "Please enter a rejection reason");
      return;
    }

    try {
      setIsProcessing(true);
      await axios.post(
        `http://${IP}:5000/api/meter-readings/reject/${selectedReading._id}`,
        { 
          treasurerId: userId,
          reason: rejectionReason
        }
      );

      setRejectModalVisible(false);
      setRejectionReason("");
      fetchReadings();
      Alert.alert("Success", "Meter reading rejected");
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to reject reading");
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateBills = async () => {
    if (!totalBillAmount || isNaN(totalBillAmount)) {
      Alert.alert("Error", "Please enter a valid bill amount");
      return;
    }

    try {
      setIsProcessing(true);
      const response = await axios.post(
        `http://${IP}:5000/api/meter-readings/calculate-bills`,
        { 
          treasurerId: userId,
          totalBillAmount: parseFloat(totalBillAmount)
        }
      );

      setShowBillModal(false);
      setTotalBillAmount("");
      fetchReadings();
      Alert.alert("Success", `Bills calculated for ${response.data.residentCount} residents`);
    } catch (error) {
      Alert.alert("Error", error.response?.data?.error || "Failed to calculate bills");
    } finally {
      setIsProcessing(false);
    }
  };

  const renderReadingCard = (reading) => {
    const isPending = reading.status === 'Pending';

    return (
      <View key={reading._id} style={[
        styles.readingCard,
        !isPending && styles.processedCard,
        reading.status === 'Rejected' && styles.rejectedCard
      ]}>
        <View style={styles.readingHeader}>
          <Text style={styles.residentInfo}>
            {reading.residentId?.fullName || 'Unknown Resident'} (Flat: {reading.flatNumber})
          </Text>
          {!isPending && (
            <Text style={[
              styles.statusBadge,
              reading.status === 'Approved' ? styles.approvedBadge : styles.rejectedBadge
            ]}>
              {reading.status}
            </Text>
          )}
        </View>

        <Text style={styles.readingValue}>
          <Text style={styles.label}>Reading:</Text> {reading.readingValue} units
        </Text>

        {reading.previousReading && (
          <Text style={styles.readingValue}>
            <Text style={styles.label}>Previous:</Text> {reading.previousReading} units
          </Text>
        )}

        {reading.consumption && (
          <Text style={styles.readingValue}>
            <Text style={styles.label}>Consumption:</Text> {reading.consumption} units
          </Text>
        )}

        {reading.billAmount && (
          <Text style={styles.readingValue}>
            <Text style={styles.label}>Bill Amount:</Text> ₹{reading.billAmount.toFixed(2)}
          </Text>
        )}

        {reading.rejectionReason && (
          <Text style={styles.rejectionReason}>
            <Text style={styles.label}>Reason:</Text> {reading.rejectionReason}
          </Text>
        )}

        {reading.imageUrl && (
          <Image 
            source={{ uri: reading.imageUrl }} 
            style={styles.meterImage} 
            resizeMode="contain" 
          />
        )}

        {isPending && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleApprove(reading)}
              disabled={isProcessing}
            >
              <Text style={styles.actionButtonText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => openRejectModal(reading)}
              disabled={isProcessing}
            >
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderCalculateBillButton = () => {
    if (activeTab === 'processed') {
      return (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            {submissionStatus.submittedCount}/{submissionStatus.totalResidents} residents submitted
          </Text>
          {submissionStatus.missingSubmissions.length > 0 && (
            <View style={styles.missingContainer}>
              <Text style={styles.missingTitle}>Missing submissions:</Text>
              {submissionStatus.missingSubmissions.map((resident, index) => (
                <Text key={index} style={styles.missingText}>
                  Flat {resident.flatNumber}
                </Text>
              ))}
            </View>
          )}
          <TouchableOpacity
            style={[
              styles.calculateBillButton,
              !submissionStatus.allSubmitted && styles.disabledButton
            ]}
            onPress={() => setShowBillModal(true)}
            disabled={!submissionStatus.allSubmitted}
          >
            <Text style={styles.calculateBillButtonText}>
              {submissionStatus.allSubmitted ? "Calculate Bills" : "Waiting for All Submissions"}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
     <View style={styles.tabBar}>
  <TouchableOpacity
    style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
    onPress={() => setActiveTab('pending')}
  >
    <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
      Pending 
    </Text>
  </TouchableOpacity>
  <TouchableOpacity
    style={[styles.tab, activeTab === 'processed' && styles.activeTab]}
    onPress={() => setActiveTab('processed')}
  >
    <Text style={[styles.tabText, activeTab === 'processed' && styles.activeTabText]}>
      Processed 
    </Text>
  </TouchableOpacity>
</View>

      {renderCalculateBillButton()}

      <ScrollView style={styles.contentContainer}>
        {loading ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : activeTab === 'pending' ? (
          pendingReadings.length === 0 ? (
            <Text style={styles.emptyText}>No pending meter readings</Text>
          ) : (
            pendingReadings.map(renderReadingCard)
          )
        ) : (
          processedReadings.length === 0 ? (
            <Text style={styles.emptyText}>No processed readings yet</Text>
          ) : (
            processedReadings.map(renderReadingCard)
          )
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={rejectModalVisible}
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Meter Reading</Text>
            <Text style={styles.modalSubtitle}>
              For {selectedReading?.residentId?.fullName || 'Resident'} (Flat: {selectedReading?.flatNumber})
            </Text>
            
            <TextInput
              style={styles.reasonInput}
              placeholder="Enter rejection reason"
              multiline
              numberOfLines={4}
              value={rejectionReason}
              onChangeText={setRejectionReason}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setRejectModalVisible(false);
                  setRejectionReason("");
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleReject}
                disabled={isProcessing || !rejectionReason}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Submit Rejection</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={showBillModal}
        onRequestClose={() => setShowBillModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Calculate Bills</Text>
            <Text style={styles.modalSubtitle}>
              Enter the total electricity bill amount for the society
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="Total Bill Amount (₹)"
              keyboardType="numeric"
              value={totalBillAmount}
              onChangeText={setTotalBillAmount}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowBillModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.submitButton]}
                onPress={calculateBills}
                disabled={isProcessing || !totalBillAmount}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Calculate</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1D3956',
    paddingVertical: 30,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  tab: {
    padding: 15,
  },
  activeTab: {
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
  statusContainer: {
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    margin: 15,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D3956',
    marginBottom: 10,
    textAlign: 'center',
  },
  missingContainer: {
    marginBottom: 15,
  },
  missingTitle: {
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 5,
  },
  missingText: {
    color: '#666',
    marginLeft: 10,
  },
  calculateBillButton: {
    backgroundColor: '#1D3956',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
  },
  calculateBillButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    padding: 15,
  },
  loader: {
    marginTop: 50,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 30,
    color: '#666',
    fontSize: 16,
  },
  readingCard: {
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
  processedCard: {
    opacity: 0.8,
  },
  rejectedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  readingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  residentInfo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  approvedBadge: {
    backgroundColor: '#e8f8f0',
    color: '#2ecc71',
  },
  rejectedBadge: {
    backgroundColor: '#fdedec',
    color: '#e74c3c',
  },
  label: {
    fontWeight: '600',
    color: '#555',
  },
  readingValue: {
    fontSize: 16,
    marginBottom: 10,
  },
  rejectionReason: {
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  meterImage: {
    width: '100%',
    height: 200,
    borderRadius: 6,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  approveButton: {
    backgroundColor: '#2ecc71',
  },
  rejectButton: {
    backgroundColor: '#e74c3c',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D3956',
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    marginBottom: 20,
    fontSize: 16,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    minHeight: 100,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
  },
  submitButton: {
    backgroundColor: '#1D3956',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default MeterReadingApprovalScreen;