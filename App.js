import * as React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Login from "./src/Login";
import Register from "./src/Register";
import Homeres from "./src/Homeres";
import Homeadm from "./src/Homeadm";
import visec from "./src/visec";
import attend from "./src/attend";
import StaffAttendanceCalendar from "./src/StaffAttendanceCalendar"; 
import visres from "./src/visres"; 
import Homestaff from "./src/Homestaff"; 
import Task from "./src/Task"; 
import Hallres from "./src/Hallres";
import Halladm from "./src/Halladm";
import MeterReadingScreen from "./src/MeterReadingScreen";
import Hometre from "./src/Hometre";
import reading from "./src/reading";
import profile from "./src/profile";
import Homesec from "./src/Homesec";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={Register} options={{ headerShown: false }} />
        <Stack.Screen name="Homeres" component={Homeres} options={{ headerShown: false }} />
        <Stack.Screen name="Homeadm" component={Homeadm} options={{ headerShown: false }} />
        <Stack.Screen name="visec" component={visec} options={{ headerShown: false }} />
        <Stack.Screen name="attend" component={attend} options={{ headerShown: false }} />
        <Stack.Screen name="Homesec" component={Homesec} options={{ headerShown: false }} />
        <Stack.Screen
          name="StaffAttendanceCalendar"
          component={StaffAttendanceCalendar}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="visres" component={visres} options={{ headerShown: false }} />
        <Stack.Screen name="Homestaff" component={Homestaff} options={{ headerShown: false }} />
        <Stack.Screen name="Task" component={Task} options={{ headerShown: false }} />
        <Stack.Screen name="Hallres" component={Hallres} options={{ headerShown: false }} />
        <Stack.Screen name="Halladm" component={Halladm} options={{ headerShown: false }} />
        <Stack.Screen name="MeterReadingScreen" component={MeterReadingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Hometre" component={Hometre} options={{ headerShown: false }} />
        <Stack.Screen 
          name="reading" 
          component={reading} 
          options={{headerShown: false }}
        />
        <Stack.Screen name="profile" component={profile} options={{ headerShown: false }} />
      
      </Stack.Navigator>
    </NavigationContainer>
  );
}
