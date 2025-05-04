import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  TextInput, 
  Alert, 
  Modal,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  ScrollView
} from "react-native";
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';

const API_URL = "http://192.168.169.139:5000";

const Attend = () => {
  // State variables
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [task, setTask] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("attendance");
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [today] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().split("T")[0].substring(0, 7));

  // Format date to YYYY-MM-DD
  const formatDate = (date) => {
    return date.toISOString().split("T")[0];
  };

  // Calculate days in selected month
  const calculateDaysInMonth = (month) => {
    const [year, monthNum] = month.split('-').map(Number);
    return new Date(year, monthNum, 0).getDate();  // monthNum is already 1-based
  };
  

  // Generate month options for picker (last 12 months)
  const generateMonthOptions = () => {
    const months = [];
    const currentYear = new Date().getFullYear(); // Ensure we use 2025
    const startMonth = 1; // January
    const endMonth = 12; // December
  
    for (let i = startMonth; i <= endMonth; i++) {
      const month = i.toString().padStart(2, '0'); // Ensure 2-digit month format
      const monthValue = `${currentYear}-${month}`;
  
      months.push({
        value: monthValue,
        label: new Date(`${currentYear}-${month}-01`).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        }),
      });
    }
  
    console.log("✅ Fixed Final Months List:", months.map(m => m.value));
    return months;
  };
  
  

  // Fetch data based on active tab
  useEffect(() => {
    if (activeTab === "attendance") {
      fetchStaff();
    } else if (activeTab === "attendanceRecords" && selectedMonth) {
      fetchAttendanceRecords();
    }
  }, [activeTab, selectedMonth]); // Ensure the effect runs when `selectedMonth` changes
  useEffect(() => {
    console.log("🕒 Device Current Date:", new Date().toISOString());
  }, []);
  

  // Fetch staff data
  const fetchStaff = async () => {
    try {
      setRefreshing(true);
      const response = await fetch(`${API_URL}/staff`);
      const data = await response.json();
      
      // Filter out Admins and Residents
      const filteredStaff = data.filter(member => !["Resident", "Admin","Treasurer"].includes(member.role));
      setStaff(filteredStaff);
    } catch (error) {
      Alert.alert("Error", "Failed to load staff");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch attendance records
  const fetchAttendanceRecords = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/attendance/${selectedMonth}`);
      const data = await response.json();
      setAttendanceRecords(data);
    } catch (error) {
      Alert.alert("Error", "Failed to load attendance records");
    } finally {
      setLoading(false);
    }
  };

  // Get all tasks from staff members
  const getAllTasks = () => {
    const allTasks = [];
    staff.forEach(member => {
      if (member.tasks && member.tasks.length > 0) {
        member.tasks.forEach(task => {
          allTasks.push({
            ...task,
            staffId: member._id,
            staffName: member.fullName,
            staffRole: member.role,
            assignedDate: task.assignedDate || new Date().toISOString().split("T")[0],
            completed: task.completed || false,
            completedDate: task.completedDate || null
          });
        });
      }
    });
    return allTasks;
  };

  // Mark attendance (Present/Absent)
  const markAttendance = async (staffId, status = "Present") => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const localDate = now.toISOString().split("T")[0];
  
    setMarking(true);
    
    // Optimistic UI update
    setStaff(prevStaff =>
      prevStaff.map(member => {
        if (member._id === staffId) {
          // Remove any existing attendance for today
          const filteredAttendance = (member.attendance || []).filter(
            att => att.date !== localDate
          );
          
          return {
            ...member,
            attendance: [...filteredAttendance, { date: localDate, status }]
          };
        }
        return member;
      })
    );
  
    try {
      const response = await fetch(`${API_URL}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId,
          date: localDate,
          status,
        }),
      });
  
      const result = await response.json();
  
      if (!response.ok) {
        throw new Error(result.error || "Failed to mark attendance");
      }
      Alert.alert("Success", `Attendance marked as ${status} successfully!`);
      // Final update after successful server response
      fetchStaff();
    } catch (error) {
      console.error("❌ Attendance Marking Error:", error);
      Alert.alert("Error", error.message);
      
      // Revert optimistic update if failed
      fetchStaff();
    } finally {
      setMarking(false);
    }
  };
  
  
  

  // Assign task to staff
  const assignTask = async () => {
    if (!task.trim() || !dueDate.trim()) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }
  
    try {
      const response = await fetch(`${API_URL}/assign-task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: selectedStaff,
          task,
          dueDate,
        }),
      });
  
      const data = await response.json();
      if (response.ok) {
        Alert.alert("Success", data.message);
        fetchStaff(); // Refresh the staff list
      } else {
        Alert.alert("Error", data.error || "Failed to assign task");
      }
  
      setTask("");
      setDueDate(new Date().toISOString().split("T")[0]); 
      setModalVisible(false);
      setSelectedStaff(null);
    } catch (error) {
      Alert.alert("Error", "Failed to assign task");
    }
  };

  // Complete task
  const completeTask = async (staffId, taskId) => {
    try {
      setMarking(true);
  
      const response = await fetch(`${API_URL}/complete-task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, taskId }),
      });
  
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to complete task");
      }
  
      Alert.alert("Success", data.message);
      fetchStaff(); // Refresh the staff list
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setMarking(false);
    }
  };
  
  
  
  

  // Render staff item for attendance tab
  const renderStaffItem = ({ item }) => {
    // Get today's date in same format as server (YYYY-MM-DD)
    const todayFormatted = new Date().toISOString().split('T')[0];
    
    // Find attendance for today
    const attendance = item.attendance?.find(att => 
      att.date === todayFormatted || 
      new Date(att.date).toISOString().split('T')[0] === todayFormatted
    );
    
    const isPresent = attendance?.status === "Present";
    const isAbsent = attendance?.status === "Absent";
    const hasPendingTask = item.tasks?.some(task => !task.completed);

    return (
      <View style={styles.staffItem}>
        <View style={styles.staffInfo}>
          <Text style={styles.staffName}>{item.fullName}</Text>
          <Text style={styles.staffRole}>{item.role}</Text>
          {item.locked && (
            <Text style={styles.lockedStatus}></Text>
          )}
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.statusButton,
              isPresent && styles.presentButton,
              (marking || isAbsent) && styles.disabledButton
            ]}
            disabled={marking || isAbsent}
            onPress={() => markAttendance(item._id, "Present")}
          >
            <Text style={[
              styles.buttonText,
              isPresent && styles.markedButtonText
            ]}>
              {isPresent ? "Present ✓" : "Mark Present"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statusButton,
              isAbsent && styles.absentButton,
              (marking || isPresent) && styles.disabledButton
            ]}
            disabled={marking || isPresent}
            onPress={() => markAttendance(item._id, "Absent")}
          >
            <Text style={[
              styles.buttonText,
              isAbsent && styles.markedButtonText
            ]}>
              {isAbsent ? "Absent ✗" : "Mark Absent"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.taskButton, (marking || item.locked) && styles.disabledButton]}
            onPress={() => {
              setSelectedStaff(item._id);
              setModalVisible(true);
            }}
            disabled={marking || item.locked}
          >
            <Text style={styles.buttonText}>Assign Task</Text>
          </TouchableOpacity>
        </View>

        
      {item.tasks?.map((task, index) => (
        <View key={task._id || index} style={styles.currentTaskContainer}>
          <Text style={styles.taskLabel}>Task {index + 1}:</Text>
          <Text style={styles.taskText}>{task.task}</Text>
          <Text style={styles.dueDate}>
            Due: {task.dueDate} (Assigned: {task.assignedDate})
          </Text>
          {!task.completed ? (
            <TouchableOpacity
              style={styles.completeButton}
              onPress={() => completeTask(item._id, task._id)}
              disabled={marking}
            >
              <Text style={styles.completeButtonText}>Mark Complete</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.completedText}>
              Completed on: {task.completedDate}
            </Text>
          )}
        </View>
      ))}
    </View>
    );
  };

  // Render attendance record item
  const renderAttendanceRecordItem = ({ item }) => {
    const presentCount = item.presentCount || 0;
    const attendedDays = item.attendance?.length || 0;
    const daysInMonth = calculateDaysInMonth(selectedMonth);
    const percentage = attendedDays > 0 ? Math.round((presentCount / daysInMonth) * 100) : 0;

    return (
      <View style={styles.recordItem}>
        <View style={styles.recordHeader}>
          <View>
            <Text style={styles.recordName}>{item.fullName}</Text>
            <Text style={styles.recordRole}>{item.role}</Text>
          </View>
          <View style={styles.attendanceStats}>
            <Text style={styles.presentCountText}>
              Present: {presentCount}/{daysInMonth} days
            </Text>
            <Text style={styles.percentageText}>
              {percentage}% of month
            </Text>
            <Text style={styles.attendedDaysText}>
              {attendedDays} days recorded
            </Text>
          </View>
        </View>
        <View style={styles.attendanceDetails}>
          {item.attendance?.map((att, index) => (
            <View key={index} style={styles.attendanceRow}>
              <Text style={styles.attendanceDate}>{att.date}</Text>
              <Text style={[
                styles.statusText,
                att.status === 'Present' ? styles.presentStatus : styles.absentStatus
              ]}>
                {att.status}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Render task history item
  const renderTaskItem = ({ item }) => {
    return (
      <View style={styles.taskItem}>
        <View style={styles.taskHeader}>
          <Text style={styles.taskStaffName}>{item.staffName}</Text>
          <Text style={styles.taskStaffRole}>{item.staffRole}</Text>
        </View>
        <Text style={styles.taskText}>{item.task}</Text>
        <View style={styles.taskDates}>
          
          <Text style={styles.taskDate}>Assigned: {item.assignedDate}</Text>
          
         
        </View>
        <View style={styles.taskStatusContainer}>
          <Text style={[
            styles.taskStatus,
            item.completed ? styles.taskCompleted : styles.taskPending
          ]}>
            {item.completed ? 'Completed' : 'Pending'}
          </Text>
        </View>
      </View>
    );
  };

  // Render main content based on active tab
  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1D3956" />
        </View>
      );
    }

    switch (activeTab) {
      case 'attendance':
        return (
          <FlatList
            data={staff}
            keyExtractor={(item) => item._id.toString()}
            renderItem={renderStaffItem}
            contentContainerStyle={styles.listContent}
            refreshing={refreshing}
            onRefresh={fetchStaff}
            ListHeaderComponent={
              <View style={styles.todayHeaderContainer}>
                <Text style={styles.todayHeader}>
                  Today: {today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </Text>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No staff members found</Text>
              </View>
            }
          />
        );
      case 'attendanceRecords':
        return (
          <ScrollView>
            <View style={styles.monthPickerContainer}>
              <Text style={styles.monthPickerLabel}>Select Month:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedMonth}
                  onValueChange={(itemValue) => setSelectedMonth(itemValue)}
                  style={styles.monthPicker}
                  dropdownIconColor="#1D3956"
                >
                  {generateMonthOptions().map((month) => (
                    <Picker.Item 
                      key={month.value} 
                      label={month.label}
                      value={month.value}
                    />
                  ))}
                </Picker>
              </View>
            </View>
            <FlatList
              data={attendanceRecords}
              keyExtractor={(item) => item._id.toString()}
              renderItem={renderAttendanceRecordItem}
              contentContainerStyle={styles.listContent}
              refreshing={refreshing}
              onRefresh={fetchAttendanceRecords}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No attendance records found for {selectedMonth}</Text>
                </View>
              }
            />
          </ScrollView>
        );
      case 'taskHistory':
        const allTasks = getAllTasks();
        return (
          <FlatList
            data={allTasks}
            keyExtractor={(item, index) => `${item.staffId}-${index}`}
            renderItem={renderTaskItem}
            contentContainerStyle={styles.listContent}
            refreshing={refreshing}
            onRefresh={fetchStaff}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No tasks found</Text>
              </View>
            }
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1D3956" />
      
      {/* Header with tabs */}
      <View style={styles.header}>
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={styles.tabButton}
            onPress={() => setActiveTab('attendance')}
          >
            <Text style={[styles.tabText, activeTab === 'attendance' && styles.activeTabText]}>
              Attendance
            </Text>
            {activeTab === 'attendance' && <View style={styles.activeTabUnderline} />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.tabButton}
            onPress={() => setActiveTab('attendanceRecords')}
          >
            <Text style={[styles.tabText, activeTab === 'attendanceRecords' && styles.activeTabText]}>
              Records
            </Text>
            {activeTab === 'attendanceRecords' && <View style={styles.activeTabUnderline} />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.tabButton}
            onPress={() => setActiveTab('taskHistory')}
          >
            <Text style={[styles.tabText, activeTab === 'taskHistory' && styles.activeTabText]}>
              History
            </Text>
            {activeTab === 'taskHistory' && <View style={styles.activeTabUnderline} />}
          </TouchableOpacity>
        </View>
      </View>

      {renderContent()}

      {/* Task Assignment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              Assign Task to {staff.find((s) => s._id === selectedStaff)?.fullName}
            </Text>

            <Text style={styles.inputLabel}>Task Description *</Text>
            <TextInput
              placeholder="Enter task details"
              placeholderTextColor="#999"
              value={task}
              onChangeText={setTask}
              style={styles.input}
              multiline
            />

            <Text style={styles.inputLabel}>Due Date *</Text>
            <TextInput
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#999"
              value={dueDate}
              onChangeText={setDueDate}
              style={styles.input}
              keyboardType="numbers-and-punctuation"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.submitButton} 
                onPress={assignTask}
              >
                <Text style={styles.submitButtonText}>Assign Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#1D3956',
    paddingBottom: 20,
    elevation: 3,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 20,
    marginTop: 15,
  },
  tabButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
    fontSize: 16,
  },
  activeTabText: {
    color: 'white',
    fontWeight: '600',
  },
  activeTabUnderline: {
    height: 3,
    backgroundColor: 'white',
    width: '100%',
    marginTop: 8,
    borderRadius: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  todayHeaderContainer: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  todayHeader: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
  },
  staffItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
  },
  staffInfo: {
    marginBottom: 12,
  },
  staffName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  staffRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  lockedStatus: {
    fontSize: 12,
    color: '#e74c3c',
    marginTop: 4,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  statusButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  presentButton: {
    backgroundColor: '#1D3956',
    borderColor: '#1D3956',
  },
  absentButton: {
    backgroundColor: '#e74c3c',
    borderColor: '#e74c3c',
  },
  taskButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    marginLeft: 4,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#555',
    fontWeight: '500',
    fontSize: 14,
  },
  markedButtonText: {
    color: 'white',
  },
  currentTaskContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  taskLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 4,
  },
  taskText: {
    fontSize: 14,
    color: '#333',
  },
  dueDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  completeButton: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#1D3956',
    borderRadius: 40,
    alignItems: 'center',
  },
  completeButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  completedText: {
    marginTop: 8,
    color: '#2ecc71',
    fontWeight: '500',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    width: '90%',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1D3956',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    color: '#555',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    borderRadius: 6,
    padding: 12,
    backgroundColor: '#f0f0f0',
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  submitButton: {
    borderRadius: 6,
    padding: 12,
    backgroundColor: '#1D3956',
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#555',
    fontWeight: '500',
    fontSize: 16,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16,
  },
  recordItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  recordName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  recordRole: {
    fontSize: 14,
    color: '#666',
  },
  attendanceStats: {
    alignItems: 'flex-end',
  },
  presentCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
  },
  percentageText: {
    fontSize: 12,
    color: '#666',
  },
  attendedDaysText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  attendanceDetails: {
    marginTop: 10,
  },
  attendanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  attendanceDate: {
    fontSize: 14,
    color: '#555',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
  },
  presentStatus: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
  },
  absentStatus: {
    backgroundColor: '#ffebee',
    color: '#c62828',
  },
  monthPickerContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: '#f5f5f5',
  },
  monthPickerLabel: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  monthPicker: {
    backgroundColor: 'white',
  },
  taskItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  taskStaffName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  taskStaffRole: {
    fontSize: 14,
    color: '#666',
  },
  taskText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  taskDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  taskDate: {
    fontSize: 12,
    color: '#888',
  },
  taskStatusContainer: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  taskStatus: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  taskPending: {
    backgroundColor: '#f39c12',
    color: 'white',
  },
  taskCompleted: {
    backgroundColor: '#2ecc71',
    color: 'white',
  },
});

export default Attend;