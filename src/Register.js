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
import { Eye, EyeOff } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import RNPickerSelect from "react-native-picker-select";
import { IP } from "@env";
import axios from "axios";

const Register = ({ navigation }) => {
  const [fullName, setFullName] = useState("");
  const [userName, setUserName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("");
  const [flatNumber, setFlatNumber] = useState("");

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const handleSubmit = async () => {



    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();


    if (!fullName || !userName || !phone || !email || !password || !confirmPassword || !role || (role === "Resident" && !flatNumber)) {
      Alert.alert("Error", "All fields are required.");
      return;
    }
    
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(trimmedPhone)) {
      Alert.alert("Error", "Phone number must be exactly 10 digits.");
      return;
    }
  
    // Validate Email Format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert("Error", "Invalid email format.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match!");
      return;
    }

    const userData = { fullName, userName, phone, email, password, role, flatNumber: role === "Resident" ? flatNumber : null };

    try {
      const response = await axios.post(
        `http://${IP}:5000/api/register`,
        userData,
        { headers: { "Content-Type": "application/json" } }
      );
      Alert.alert("Success", response.data.message);
      navigation.navigate("Login");
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Failed to register";
      Alert.alert("Registration Failed", errorMessage);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.title}>Create Account</Text>

        {/* Role Selection */}
        <View style={styles.inputContainer}>
          <RNPickerSelect
            onValueChange={setRole}
            items={[
              { label: "Security", value: "Security" },
              { label: "Plumber", value: "Plumber" },
              { label: "Electrician", value: "Electrician" },
              { label: "Cleaning Staff", value: "Cleaning Staff" },
              { label: "Gardener", value: "Gardener" },
            
              { label: "Resident", value: "Resident" },
              
           
            ]}
            placeholder={{ label: "Select Role", value: null }}
            style={pickerSelectStyles}
          />
        </View>

        {role === "Resident" && (
          <TextInput
            style={styles.input}
            placeholder="Flat Number"
            placeholderTextColor="#777"
            value={flatNumber}
            onChangeText={setFlatNumber}
          />
        )}

        {/* Input Fields */}
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          placeholderTextColor="#777"
          value={fullName}
          onChangeText={setFullName}
        />

        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#777"
          value={userName}
          onChangeText={setUserName}
        />

        <TextInput
          style={styles.input}
          placeholder="Phone"
          placeholderTextColor="#777"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#777"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />

        {/* Password Fields */}
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor="#777"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!passwordVisible}
          />
          <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)}>
            {passwordVisible ? <EyeOff size={20} color="#777" /> : <Eye size={20} color="#777" />}
          </TouchableOpacity>
        </View>

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Confirm Password"
            placeholderTextColor="#777"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!confirmPasswordVisible}
          />
          <TouchableOpacity onPress={() => setConfirmPasswordVisible(!confirmPasswordVisible)}>
            {confirmPasswordVisible ? <EyeOff size={20} color="#777" /> : <Eye size={20} color="#777" />}
          </TouchableOpacity>
        </View>

        {/* Register Button */}
        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <LinearGradient colors={["#1D3956", "#142A42"]} style={styles.buttonGradient}>
            <Text style={styles.buttonText}>Register</Text>
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#F5F5F5",
    padding: 25,
  },
  safeArea: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 30,
    textAlign: "center",
  },
  inputContainer: {
    backgroundColor: "white",
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    justifyContent: "center",
    height: 50,
  },
  input: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    height: 50,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    height: 50,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    height: 50,
  },
  button: {
    marginTop: 20,
    width: "100%",
    borderRadius: 25,
    overflow: "hidden",
  },
  buttonGradient: {
    padding: 15,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});

const pickerSelectStyles = {
  inputIOS: {
    fontSize: 16,
    color: "#333",
  },
  inputAndroid: {
    fontSize: 16,
    color: "#333",
  },
  placeholder: {
    color: "#777",
  },
};

export default Register;