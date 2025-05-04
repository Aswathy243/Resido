import React, { useState } from "react";
import {
  View,
  TextInput,
  Alert,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from 'expo-constants';
import { IP } from "@env";


export default function Login({ navigation }) {
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);

  const handleLogin = async () => {
    if (!userName || !password) {
      Alert.alert("Error", "Please enter both username and password.");
      return;
    }
  
    try {
      const response = await axios.post(
        `http://${IP}:5000/api/login`,
        { userName, password },
        { headers: { "Content-Type": "application/json" } }
      );
  
      Alert.alert("Login Successful", response.data.message);
  
      const { token, role, userDetails } = response.data;
  
      // ✅ Get Expo Push Token only if user is Treasurer
      
  
      // ✅ Redirect Based on Role
      switch (role) {
        case "Resident":
          navigation.navigate("Homeres", {
            flatNumber: userDetails.flatNumber,
            residentId: userDetails._id,
            residentName: userDetails.fullName,
          });
          break;
        case "Security":
          navigation.navigate("Homesec",{staffId: userDetails._id});
          break;
        case "Admin":
          navigation.navigate("Homeadm",{staffId: userDetails._id});
          break;
        case "Treasurer":
          navigation.navigate("Hometre", { userId: userDetails._id });
          break;
        default:
          navigation.navigate("StaffAttendanceCalendar", { staffId: userDetails._id });
      }
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage = error.response?.data?.error || "Login failed";
      Alert.alert("Login Failed", errorMessage);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <SafeAreaView>
        <Text style={styles.header}>Welcome Back</Text>
        <Text style={styles.subHeader}>Sign in to continue</Text>

        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Username"
            value={userName}
            onChangeText={setUserName}
            style={styles.inputField}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!passwordVisible}
            style={styles.inputField}
            placeholderTextColor="#999"
          />
          <TouchableOpacity 
            style={styles.eyeIcon}
            onPress={() => setPasswordVisible(!passwordVisible)}
          >
            {passwordVisible ? <EyeOff color="#777" /> : <Eye color="#777" />}
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.forgotPassword} 
          onPress={() => Alert.alert("Forgot Password", "Reset link sent to your email.")}
        >
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <LinearGradient 
            colors={["#1D3956", "#1D3956"]} 
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>Login</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.signupContainer} 
          onPress={() => navigation.navigate("Register")}
        >
          <Text style={styles.signupText}>Don't have an account? <Text style={styles.signupHighlight}>Sign Up</Text></Text>
        </TouchableOpacity>
      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 20, 
    backgroundColor: "#f5f5f5",
    flex: 1 
  },
  header: { 
    fontSize: 28, 
    fontWeight: "bold", 
    textAlign: "center", 
    marginTop: 20, 
    color: "#333" 
  },
  subHeader: { 
    textAlign: "center", 
    color: "#777", 
    fontSize: 14, 
    marginBottom: 30 
  },
  inputContainer: { 
    backgroundColor: "#fff",
    borderRadius: 30,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  inputField: { 
    flex: 1, 
    fontSize: 16, 
    paddingVertical: 8,
    color: "#333",

  },
  eyeIcon: {
    padding: 5
  },
  forgotPassword: { 
    alignSelf: "flex-end", 
    marginTop: 5 
  },
  forgotText: { 
    color: "#1D3956", 
    fontSize: 14, 
    fontWeight: "bold" 
  },
  button: { 
    alignSelf: "center", 
    marginTop: 25, 
    width: "95%",
    borderRadius: 20,
    overflow: 'hidden'
  },
  buttonGradient: { 
    padding: 16, 
    alignItems: "center" 
  },
  buttonText: { 
    color: "white", 
    fontWeight: "bold", 
    fontSize: 16 
  },
  signupContainer: { 
    alignItems: "center", 
    marginTop: 20 
  },
  signupText: { 
    color: "#777", 
    fontSize: 14 
  },
  signupHighlight: { 
    color: "#1D3956", 
    fontWeight: "bold" 
  },
});