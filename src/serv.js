

process.env.TZ = "Asia/Kolkata";  // Change this to your timezone
console.log("🕒 Server Timezone Set To:", process.env.TZ);

// ✅ Function to get correct local date
const getLocalDate = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); // Adjust for local timezone
  return now.toISOString().split("T")[0];
};

console.log("🕒 Corrected Local Date:", getLocalDate());
const express = require("express");

const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const PDFDocument = require('pdfkit');
const fs = require('fs');
const axios = require('axios');  // Make sure this line exists
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { Register } = require("../models/items");
const { Visitor } = require("../models/items");
const { HallBooking } = require("../models/items");
const { Insurance } = require("../models/items");
const { MeterReading } = require("../models/items");
const multer = require('multer');



const cron = require("node-cron");

const app = express();

// Middleware
app.use(cors());


app.use(express.json({ limit: "50mb" })); // ✅ Support large Base64 images
app.use(express.urlencoded({ extended: true, limit: "50mb" })); // ✅ Support large form-data

// Error Handling Middleware

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Failed:", err));

  const storage = multer.memoryStorage();
  const upload = multer({ storage });
// Health Check API
app.get("/", (req, res) => {
  res.json({ message: "Server is running!" });
});

// Register API
app.post("/api/register", async (req, res) => {
  try {
    const { fullName, userName, phone, email, password, role, flatNumber } = req.body;

    if (!fullName || !userName || !phone || !email || !password || !role) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const existingUser = await Register.findOne({ $or: [{ phone }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: "Phone number or Email already in use!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new Register({
      fullName,
      userName,
      phone,
      email,
      password: hashedPassword,
      role,
      flatNumber: role === "Resident" ? flatNumber : null,
    });

    await newUser.save();
    res.status(201).json({ message: "User registered successfully." });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { userName, password } = req.body;

    if (!userName || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    // 🔹 Force MongoDB to return flatNumber
    const user = await Register.findOne({ userName }, "fullName userName phone email password role flatNumber");

    if (!user) return res.status(401).json({ error: "Invalid credentials." });

    console.log("✅ User Found:", user); // Debugging: Check if flatNumber exists

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ error: "Invalid credentials." });

    console.log("🔹 Flat Number Retrieved:", user.flatNumber || "Not Found"); // Debugging: Check flatNumber

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.SECRET_KEY,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      role: user.role,
      userDetails: {
        _id: user._id,
        fullName: user.fullName,
        userName: user.userName,
        role: user.role,
        phone: user.phone,
        email: user.email,
        flatNumber: user.flatNumber || "N/A", // Ensure flatNumber is returned
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ Login Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add this to serv.js
// Profile endpoint
// Add this to your serv.js
// Add this endpoint to your serv.js
app.get('/api/user/:userId', async (req, res) => {
  try {
    const user = await Register.findById(req.params.userId)
      .select('-password -attendance -tasks -locked')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error("❌ Profile error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Attendance APIs (from serv.js)
app.get("/staff", async (req, res) => {
  try {
    const staff = await Register.find({ role: { $nin: ["Resident", "Admin", "Treasurer"] } });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch staff" });
  }
});


app.post("/attendance", async (req, res) => {
  try {
    let { staffId, date, status } = req.body;

    console.log("📡 Received Attendance Request:", req.body);
    const serverDate = getLocalDate();  // ✅ Use Correct Local Date
    console.log("🕒 Server's Corrected Local Date:", serverDate);

    if (!staffId || !date || !status) {
      console.error("❌ Missing required fields");
      return res.status(400).json({ error: "Missing required fields" });
    }

    const staff = await Register.findById(staffId);
    if (!staff || ["Resident", "Admin"].includes(staff.role)) {
      console.error("❌ Attendance not allowed for this role:", staff?.role);
      return res.status(404).json({ error: "Attendance not allowed for this role" });
    }

    const existingAttendance = staff.attendance?.find((att) => att.date === date);
    if (existingAttendance) {
      console.warn("⚠️ Attendance already marked for:", date);
      return res.status(400).json({ error: "Attendance already marked for this date" });
    }

    staff.attendance.push({ date, status });
    await staff.save();

    console.log(`✅ Attendance Updated for ${date} - Staff ID: ${staffId}`);
    res.json({ message: "Attendance updated successfully" });

  } catch (error) {
    console.error("❌ Attendance Save Error:", error);
    res.status(500).json({ error: "Failed to mark attendance" });
  }
});





// Fetch Attendance Records (Exclude Admin & Treasurer)
app.get("/attendance/:month", async (req, res) => {
  try {
    const { month } = req.params;
    const attendance = await Register.aggregate([
      {
        $match: { role: { $nin: ["Resident", "Admin", "Treasurer"] } }, 
      },
      {
        $project: {
          fullName: 1,
          role: 1,
          attendance: {
            $filter: {
              input: "$attendance",
              as: "att",
              cond: { $regexMatch: { input: "$$att.date", regex: `^${month}` } },
            },
          },
        },
      },
      {
        $addFields: {
          presentCount: {
            $size: {
              $filter: {
                input: "$attendance",
                as: "att",
                cond: { $eq: ["$$att.status", "Present"] },
              },
            },
          },
          totalDaysRecorded: { $size: "$attendance" },  // ✅ Total days attendance was recorded
        },
      },
      {
        $project: {
          fullName: 1,
          role: 1,
          attendance: 1,
          presentCount: 1,
          totalDaysRecorded: 1,  // ✅ Ensure this is included in response
        },
      },
    ]);

    // ✅ Ensure All Staff Appear (Even If No Attendance Exists)
    const allStaff = await Register.find(
      { role: { $nin: ["Resident", "Admin", "Treasurer"] } },
      "fullName role"
    );

    const mergedData = allStaff.map((staff) => {
      const record = attendance.find((att) => att.fullName === staff.fullName);
      return record || { fullName: staff.fullName, role: staff.role, attendance: [], presentCount: 0, totalDaysRecorded: 0 };
    });

    res.json(mergedData);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
});





app.get("/attendance/user/:staffId", async (req, res) => {
  try {
    const { staffId } = req.params;

    const staff = await Register.findById(staffId);
    if (!staff || staff.role === "Resident") {
      return res.status(404).json({ error: "Staff member not found or is a resident" });
    }
    

    const markedDates = {};
    if (staff.attendance) {
      staff.attendance.forEach((entry) => {
        markedDates[entry.date] = {
          selected: true,
          marked: true,
          selectedColor: entry.status === "Present" ? "green" : "red",
        };
      });
      
    }

    // ✅ Ensure tasks are sent correctly
    res.json({ markedDates, tasks: staff.tasks || [] });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch attendance and tasks" });
  }
});



app.post("/api/visitor/checkin", async (req, res) => {
  try {
    const { visitorName, visitorPhone, purpose, flatNumber } = req.body;

    if (!visitorName || !visitorPhone || !flatNumber) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Validate flat number exists in the system
    const resident = await Register.findOne({ 
      flatNumber,
      role: "Resident" 
    });
    
    if (!resident) {
      return res.status(400).json({ 
        error: "Invalid flat number - no resident found with this flat number" 
      });
    }

    const newVisitor = new Visitor({
      visitorName,
      visitorPhone,
      purpose: purpose || "Not specified",
      flatNumber,
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString(),
    });

    await newVisitor.save();
    res.status(201).json({ message: "Visitor checked in successfully." });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// API to log visitor check-out
app.post("/api/visitor/checkout", async (req, res) => {
  try {
    const { visitorPhone } = req.body;

    const visitor = await Visitor.findOne({ visitorPhone, checkOutTime: null });

    if (!visitor) {
      return res.status(404).json({ error: "Visitor not found or already checked out." });
    }

    visitor.checkOutTime = new Date().toLocaleTimeString();
    await visitor.save();

    res.status(200).json({ message: "Visitor checked out successfully." });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// API to fetch all visitors
app.get("/api/visitors", async (req, res) => {
  try {
    const visitors = await Visitor.find().sort({ date: -1, time: -1 });
    res.json(visitors);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch visitor logs" });
  }
});

// API to search visitors by flat number
app.get("/api/search-visitor", async (req, res) => {
  try {
    const { flatNumber } = req.query;
    if (!flatNumber) {
      return res.status(400).json({ error: "Flat number is required" });
    }

    const visitors = await Visitor.find({ flatNumber });
    res.json(visitors);
  } catch (error) {
    res.status(500).json({ error: "Failed to search visitors" });
  }
});

app.get("/api/resident/visitors/:flatNumber", async (req, res) => {
  try {
    const { flatNumber } = req.params;
    console.log("🔹 Fetching visitors for Flat:", flatNumber);

    if (!flatNumber) {
      return res.status(400).json({ error: "Flat number is required" });
    }

    const visitors = await Visitor.find({ flatNumber }).sort({ date: -1, time: -1 });

    console.log("✅ Visitors Found:", visitors.length);
    res.json(visitors);
  } catch (error) {
    console.error("❌ Failed to fetch resident visitors:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/assign-task", async (req, res) => {
  try {
    const { staffId, task, dueDate } = req.body;

    if (!staffId || !task || !dueDate) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const staff = await Register.findById(staffId);
    if (!staff || staff.role === "Resident") {
      return res.status(404).json({ error: "Staff member not found or is a resident" });
    }

    if (staff.tasks.some(t => !t.completed)) {
      return res.status(400).json({ error: "This staff member has pending tasks!" });
    }

    staff.tasks.push({ 
      task, 
      dueDate,
      assignedDate: new Date().toISOString().split("T")[0]
    });
    staff.locked = true;
    await staff.save();

    res.status(200).json({ message: "Task assigned successfully!" });
  } catch (error) {
    console.error("Error assigning task:", error);
    res.status(500).json({ error: "Failed to assign task" });
  }
});

app.post("/complete-task", async (req, res) => {
  try {
    const { staffId, taskId } = req.body; // Changed from taskIndex to taskId

    if (!staffId || !taskId) {
      return res.status(400).json({ error: "Staff ID and task ID are required" });
    }

    const staff = await Register.findById(staffId);
    if (!staff) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    // Find the task by ID instead of index
    const taskIndex = staff.tasks.findIndex(t => t._id.equals(taskId));
    if (taskIndex === -1) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Mark task as completed
    staff.tasks[taskIndex].completed = true;
    staff.tasks[taskIndex].completedDate = new Date().toISOString().split("T")[0];

    // Check if all tasks are completed
    const hasPendingTasks = staff.tasks.some(t => !t.completed);
    staff.locked = hasPendingTasks;

    await staff.save();

    res.status(200).json({ 
      message: "Task completed successfully",
      staff: staff.toObject()
    });
  } catch (error) {
    console.error("Error completing task:", error);
    res.status(500).json({ error: "Failed to complete task" });
  }
});




// Fetch locked halls
// ✅ Book a hall (Direct Approval, No Admin Involvement)
// In the /api/book-hall endpoint, update the uniqueSlot calculation to include time
app.post("/api/book-hall", async (req, res) => {
  try {
    const { residentId, residentName, flatNumber, facility, eventName, peopleCount, date, time } = req.body;

    if (!residentId || !residentName || !flatNumber || !facility || !eventName || !peopleCount || !date || !time) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      return res.status(400).json({ error: "Invalid time format. Use HH:MM in 24-hour format." });
    }

    const uniqueSlot = `${date}-${time}-${facility}`;
    console.log("🔹 Checking for existing booking:", uniqueSlot);

    // Rest of the endpoint remains the same...
    const existingBooking = await HallBooking.findOne({ uniqueSlot });

    if (existingBooking) {
      console.log("❌ Duplicate Booking Found:", existingBooking);
      return res.status(400).json({ error: "This hall is already booked for the selected date and time." });
    }

    const newBooking = new HallBooking({
      residentId,
      residentName,
      flatNumber,
      facility,
      eventName,
      peopleCount,
      date,
      time,
      uniqueSlot,
      status: "Approved",
    });

    await newBooking.save();
    res.status(201).json({ message: "Hall booked successfully." });
  } catch (error) {
    console.error("❌ Booking Failed:", error);
    res.status(500).json({ error: "Failed to book hall. Please try again." });
  }
});


// ✅ Fetch resident's hall bookings
app.get("/api/my-hall-bookings/:residentId", async (req, res) => {
  try {
    const { residentId } = req.params;
    const bookings = await HallBooking.find({ residentId }).sort({ date: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch resident's bookings" });
  }
});

// ✅ Resident cancels their own booking
app.post("/api/unlock-hall", async (req, res) => {
  try {
    const { residentId, facility } = req.body;

    if (!residentId || !facility) {
      return res.status(400).json({ error: "Resident ID and facility are required." });
    }

    // Find the booking based on residentId and facility
    const booking = await HallBooking.findOne({ residentId, facility });

    if (!booking) {
      return res.status(404).json({ error: "No active booking found for this resident." });
    }

    // Delete the booking
    await HallBooking.deleteOne({ _id: booking._id });

    res.json({ message: "Hall booking cancelled successfully." });
  } catch (error) {
    console.error("❌ Unlocking Error:", error);
    res.status(500).json({ error: "Failed to unlock hall." });
  }
});
// ✅ Ensure this API exists in serv.js
app.get("/api/locked-halls", async (req, res) => {
  try {
    const lockedHalls = await HallBooking.find({ status: "Approved" }).select("facility");
    res.json({ lockedHalls: lockedHalls.map((hall) => hall.facility) });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch locked halls" });
  }
});
// ✅ Fetch all hall bookings for Admin
app.get("/api/hall-bookings", async (req, res) => {
  try {
    const bookings = await HallBooking.find().sort({ date: -1 });
    res.json(bookings);
  } catch (error) {
    console.error("❌ Error fetching hall bookings:", error);
    res.status(500).json({ error: "Failed to fetch hall bookings" });
  }
});

// Alternative simpler implementation
app.get("/attendance-records", async (req, res) => {
  try {
    const { date, staffId, status } = req.query;
    
    // Find all non-resident staff
    const query = { role: { $ne: "Resident" } };
    if (staffId) {
      query._id = staffId;
    }
    
    const staffMembers = await Register.find(query);
    
    // Process the data to extract attendance records
    const records = [];
    
    staffMembers.forEach(staff => {
      if (staff.attendance && staff.attendance.length > 0) {
        staff.attendance.forEach(att => {
          // Apply filters if provided
          if (date && att.date !== date) return;
          if (status && att.status !== status) return;
          
          records.push({
            staffId: staff._id,
            fullName: staff.fullName,
            role: staff.role,
            date: att.date,
            status: att.status
          });
        });
      }
    });
    
    // Sort by date descending
    records.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json(records);
  } catch (error) {
    console.error("Error fetching attendance records:", error);
    res.status(500).json({ error: "Failed to fetch attendance records" });
  }
});

// Store reminders temporarily
let dueReminders = [];

// Helper function to generate date range
const generateDateRange = (daysBefore, daysAfter) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dateRange = [];
  for (let i = -daysBefore; i <= daysAfter; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    dateRange.push(date);
  }
  
  return dateRange;
};

// Format date as YYYY-MM-DD
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Update reminders cache
const updateRemindersCache = async () => {
  try {
    const today = new Date().toISOString().split("T")[0]; // Get today's date in YYYY-MM-DD format
    
    dueReminders = await Insurance.find({
      renewalDate: today // Only fetch reminders for today
    }).sort({ renewalDate: 1 }).lean();

    console.log(`[${new Date().toISOString()}] Reminders cache updated. Found ${dueReminders.length} due today.`);
  } catch (error) {
    console.error("Error updating reminders cache:", error);
  }
};


// API Endpoints
app.post("/api/insurance", async (req, res) => {
  try {
    const { userId, insuranceName, renewalDate } = req.body;
    if (!userId || !insuranceName || !renewalDate) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    const paymentReminderDate = new Date(renewalDate);
    paymentReminderDate.setDate(paymentReminderDate.getDate() + 15);
    
    const newInsurance = await Insurance.create({ 
      userId, 
      insuranceName, 
      renewalDate, 
      paymentReminderDate: paymentReminderDate.toISOString().split("T")[0] 
    });
    
    res.status(201).json({ message: "Insurance saved successfully", insurance: newInsurance });
  } catch (error) {
    res.status(500).json({ error: "Error saving insurance", details: error.message });
  }
});

app.get("/api/insurance/history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const history = await Insurance.find({ userId })
      .sort({ renewalDate: 1 })
      .lean();
    res.json(history);
  } catch (error) {
    console.error("Error fetching insurance history:", error);
    res.status(500).json({ error: "Error fetching insurance history" });
  }
});

cron.schedule("0 0 * * *", async () => {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Fetch insurances where payment reminder is today
    const duePayments = await Insurance.find({ paymentReminderDate: today });

    duePayments.forEach(async (insurance) => {
      console.log(`🔔 Reminder: Treasurer needs to pay insurance for ${insurance.insuranceName}`);

      // Set the next payment reminder after 15 days
      const nextReminder = new Date(insurance.paymentReminderDate);
      nextReminder.setDate(nextReminder.getDate() + 15);

      await Insurance.updateOne(
        { _id: insurance._id },
        { paymentReminderDate: nextReminder.toISOString().split("T")[0] } // Update cyclically
      );
    });

    console.log(`✅ Payment reminders updated for ${duePayments.length} insurances.`);
  } catch (error) {
    console.error("Error updating payment reminders:", error);
  }
});
app.get("/api/reminders", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const insuranceReminders = await Insurance.find({ renewalDate: today });
    const paymentReminders = await Insurance.find({ paymentReminderDate: today });

    res.json({ insuranceReminders, paymentReminders });
  } catch (error) {
    res.status(500).json({ error: "Error fetching reminders" });
  }
});

// Fetch Reminders API
// 📌 Submit meter reading (with Base64 image support)
// Add these endpoints to your existing serv.js file

// Get initial reading for a resident
app.get("/api/meter-readings/initial-reading/:residentId", async (req, res) => {
  try {
    const { residentId } = req.params;
    const lastReading = await MeterReading.findOne({ 
      residentId, 
      status: "Approved" 
    }).sort({ readingDate: -1 });

    res.json({ 
      initialReading: lastReading ? lastReading.readingValue : 10000 
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get initial reading" });
  }
});

// Submit meter reading with previous reading check
app.post("/api/meter-readings", async (req, res) => {
  try {
    const { residentId, flatNumber, readingValue, isManual, imageBase64 } = req.body;
    
    if (!readingValue || isNaN(readingValue)) {
      return res.status(400).json({ error: "Invalid reading value" });
    }

    // Get last approved reading or use default initial value
    const lastReading = await MeterReading.findOne({ 
      residentId, 
      status: "Approved" 
    }).sort({ readingDate: -1 });

    const previousReading = lastReading ? lastReading.readingValue : 10000;
    
    if (parseInt(readingValue) <= previousReading) {
      return res.status(400).json({ 
        error: `Current reading must be greater than previous reading (${previousReading})` 
      });
    }

    let imageUrl = null;
    if (imageBase64 && imageBase64.startsWith("data:image")) {
      imageUrl = imageBase64;
    } else if (!isManual || isManual === "false") {
      return res.status(400).json({ error: "Valid image is required" });
    }

    const reading = new MeterReading({
      residentId,
      flatNumber,
      readingValue,
      previousReading,
      imageUrl,
      isManualEntry: isManual === "true",
    });

    await reading.save();
    res.status(201).json(reading);
  } catch (error) {
    res.status(500).json({ error: "Failed to submit reading" });
  }
});

// Calculate bills for all approved readings

app.get("/api/meter-readings/submission-status", async (req, res) => {
  try {
    const residents = await mongoose.model('Register').find({ role: "Resident" }).select("_id flatNumber");
    
    if (!residents || residents.length === 0) {
      return res.status(404).json({ 
        error: "No residents found in database" 
      });
    }

    const latestReadings = await mongoose.model('MeterReading').aggregate([
      { $match: { status: "Approved" } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$residentId",
          latestReading: { $first: "$$ROOT" }
        }
      }
    ]);

    const missingSubmissions = residents.filter(resident => 
      !latestReadings.some(r => r._id.equals(resident._id))
    );

    res.json({
      allSubmitted: missingSubmissions.length === 0,
      totalResidents: residents.length,
      submittedCount: latestReadings.length,
      missingSubmissions: missingSubmissions.map(r => ({
        residentId: r._id,
        flatNumber: r.flatNumber
      }))
    });
  } catch (error) {
    console.error("Submission status error:", error);
    res.status(500).json({ 
      error: "Failed to check submission status",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Calculate Bills Endpoint
app.post("/api/meter-readings/calculate-bills", async (req, res) => {
  try {
    const { totalBillAmount } = req.body;

    // 1. Enhanced Input Validation
    if (typeof totalBillAmount !== 'number' || isNaN(totalBillAmount) || totalBillAmount <= 0) {
      return res.status(400).json({
        error: "Invalid totalBillAmount",
        details: "Must be a positive number greater than zero"
      });
    }

    // 2. Check submission status
    let statusResponse;
    try {
      statusResponse = await axios.get(`http://${process.env.IP}:${process.env.PORT}/api/meter-readings/submission-status`);
      if (!statusResponse.data.allSubmitted) {
        return res.status(400).json({
          error: "Cannot calculate bills - missing submissions",
          missing: statusResponse.data.missingSubmissions
        });
      }
    } catch (err) {
      console.error("Submission status check failed:", err);
      return res.status(500).json({ error: "Failed to verify submission status" });
    }

    // 3. Get approved readings
    const readings = await MeterReading.aggregate([
      { $match: { status: "Approved", billAmount: { $exists: false } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$residentId", latestReading: { $first: "$$ROOT" } } }
    ]);

    if (!readings?.length) {
      return res.status(400).json({ error: "No approved readings available for billing" });
    }

    // 4. Calculate consumption with validation
    let totalConsumption = 0;
    const readingsWithConsumption = readings.map(r => {
      const consumption = r.latestReading.readingValue - r.latestReading.previousReading;
      
      if (isNaN(consumption)) {  // Fixed this line - added missing parenthesis
        throw new Error(`Invalid consumption calculation for resident ${r._id}`);
      }
      if (consumption < 0) {
        throw new Error(`Negative consumption (${consumption}) for resident ${r._id}`);
      }
      
      totalConsumption += consumption;
      return {
        ...r.latestReading,
        consumption,
        residentId: r._id
      };
    });

    // 5. Validate total consumption
    if (totalConsumption <= 0) {
      return res.status(400).json({
        error: "Invalid total consumption",
        details: "Sum of all consumptions must be greater than zero"
      });
    }

    // 6. Calculate bills with NaN protection
    const billUpdates = readingsWithConsumption.map(r => {
      const billAmount = (r.consumption / totalConsumption) * totalBillAmount;
      
      // Final validation
      if (isNaN(billAmount) || !isFinite(billAmount)) {
        console.error("Invalid bill calculation:", {
          residentId: r.residentId,
          consumption: r.consumption,
          totalConsumption,
          totalBillAmount
        });
        throw new Error(`Invalid bill calculation for resident ${r.residentId}`);
      }

      return {
        updateOne: {
          filter: { _id: r._id },
          update: {
            $set: {
              consumption: r.consumption,
              billAmount: parseFloat(billAmount.toFixed(2)),
              totalSocietyBill: parseFloat(totalBillAmount.toFixed(2)),
              reviewDate: new Date(),
              status: "Billed"
            }
          }
        }
      };
    });

    // 7. Execute updates
    const bulkResult = await MeterReading.bulkWrite(billUpdates);

    res.json({
      success: true,
      totalBillAmount: parseFloat(totalBillAmount.toFixed(2)),
      totalConsumption,
      residentsBilled: readings.length,
      stats: {
        matched: bulkResult.matchedCount,
        modified: bulkResult.modifiedCount
      }
    });

  } catch (error) {
    console.error("Bill calculation failed:", error);
    res.status(500).json({
      error: "Bill calculation failed",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get resident's current bill
app.get("/api/meter-readings/current-bill/:residentId", async (req, res) => {
  try {
    const { residentId } = req.params;
    const bill = await MeterReading.findOne({
      residentId,
      billAmount: { $exists: true }
    }).sort({ readingDate: -1 });

    if (!bill) {
      return res.status(404).json({ error: "No bill found" });
    }

    res.json({
      previousReading: bill.previousReading,
      currentReading: bill.readingValue,
      consumption: bill.consumption,
      totalSocietyBill: bill.totalSocietyBill,
      individualBill: bill.billAmount,
      billingDate: bill.reviewDate
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get current bill" });
  }
});



// ✅ Get meter readings for a resident


// Get all pending meter readings for treasurer
app.get("/api/meter-readings", async (req, res) => {
  try {
    console.log("📡 Fetching all meter readings...");
    
    const readings = await MeterReading.find()
      .sort({ readingDate: -1 })
      .populate("residentId", "fullName flatNumber");

    console.log("✅ Readings Fetched:", readings);
    res.json(readings);
  } catch (error) {
    console.error("❌ Error in /api/meter-readings:", error);
    res.status(500).json({ error: error.message });
  }
});






// Approve a meter reading
// Get all meter readings for a specific resident
app.get("/api/meter-readings/resident/:residentId", async (req, res) => {
  try {
    const readings = await MeterReading.find({ residentId: req.params.residentId })
      .sort({ readingDate: -1 })
      .populate("reviewedBy", "fullName");
    res.json(readings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve a meter reading
app.post("/api/meter-readings/approve/:readingId", async (req, res) => {
  try {
    const { readingId } = req.params;
    const { treasurerId } = req.body;

    const reading = await MeterReading.findByIdAndUpdate(
      readingId,
      {
        status: "Approved",
        reviewedBy: treasurerId,
        reviewDate: new Date()
      },
      { new: true }
    );

    if (!reading) {
      return res.status(404).json({ error: "Meter reading not found" });
    }

    res.json({ 
      message: "Meter reading approved successfully", 
      reading
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject a meter reading
app.post("/api/meter-readings/reject/:readingId", async (req, res) => {
  try {
    const { readingId } = req.params;
    const { treasurerId, reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: "Rejection reason is required" });
    }

    const reading = await MeterReading.findByIdAndUpdate(
      readingId,
      {
        status: "Rejected",
        reviewedBy: treasurerId,
        reviewDate: new Date(),
        rejectionReason: reason
      },
      { new: true }
    );

    if (!reading) {
      return res.status(404).json({ error: "Meter reading not found" });
    }

    res.json({ 
      message: "Meter reading rejected successfully", 
      reading
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
const billsDir = path.join(__dirname, 'bills');
if (!fs.existsSync(billsDir)) {
  fs.mkdirSync(billsDir, { recursive: true });
}

// PDF Generation Endpoint
app.get('/api/meter-readings/bill-pdf/:residentId', async (req, res) => {
  try {
    const { residentId } = req.params;
    
    // Fetch the latest billed reading with resident details
    const billData = await MeterReading.findOne({
      residentId,
      billAmount: { $exists: true, $gt: 0 }
    })
    .sort({ readingDate: -1 })
    .populate('residentId', 'fullName flatNumber');

    if (!billData) {
      return res.status(404).json({ error: "No bill found for this resident" });
    }

    // Validate required fields
    if (!billData.readingValue || !billData.previousReading || 
        !billData.consumption || !billData.billAmount || !billData.totalSocietyBill) {
      return res.status(400).json({ error: "Bill data is incomplete" });
    }

    const doc = new PDFDocument();
    const filename = `Electricity_Bill_${billData.flatNumber}_${billData.readingDate.toISOString().split('T')[0]}.pdf`;

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe PDF directly to response
    doc.pipe(res);

    // PDF Header
    doc.fontSize(25).text('ELECTRICITY BILL', { align: 'center' });
    doc.moveDown(0.5);
    
    // Resident Information
    doc.fontSize(14)
       .text(`Resident Name: ${billData.residentId.fullName}`, { align: 'left' })
       .text(`Flat Number: ${billData.flatNumber}`, { align: 'left' })
       .text(`Billing Date: ${billData.reviewDate.toLocaleDateString()}`, { align: 'left' });
    
    doc.moveDown(1);
    
    // Meter Reading Details
    doc.font('Helvetica-Bold').text('Meter Reading Details:', { underline: true });
    doc.moveDown(0.5);
    
    // Create a table for readings
    const startY = doc.y;
    const col1 = 50;
    const col2 = 250;
    
    // Table Headers
    doc.font('Helvetica-Bold')
       .text('Description', col1, startY)
       .text('Value', col2, startY);
    
    // Table Rows
    doc.font('Helvetica')
       .text('Previous Reading', col1, startY + 25)
       .text(`${billData.previousReading} units`, col2, startY + 25)
       
       .text('Current Reading', col1, startY + 50)
       .text(`${billData.readingValue} units`, col2, startY + 50)
       
       .text('Consumption', col1, startY + 75)
       .text(`${billData.consumption} units`, col2, startY + 75);
    
    doc.moveDown(2);
    
    // Bill Calculation
    // Bill Calculation
doc.font('Helvetica-Bold').text('Bill Calculation:', { underline: true });
doc.moveDown(0.5);

const billStartY = doc.y;

doc.font('Helvetica')
   .text('Total Society Consumption', col1, billStartY)
   .text(`${String(billData.consumption)} units`, col2, billStartY)
   
   .text('Total Society Bill', col1, billStartY + 25)
   .text(`₹${String(billData.totalSocietyBill.toFixed(2))}`, col2, billStartY + 25)
   
   .text('Your Consumption', col1, billStartY + 50)
   .text(`${String(billData.consumption)} units`, col2, billStartY + 50)
   
   .font('Helvetica-Bold')
   .text('Your Share', col1, billStartY + 75)
   .text(`₹${String(billData.billAmount.toFixed(2))}`, col2, billStartY + 75);
    


   
    doc.moveDown(2);
    
    // Payment Information
    doc.fontSize(12)
       .text('Payment Due Date: ' + new Date(billData.reviewDate.getTime() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString(), { align: 'left' })
       .text('Please pay within 15 days to avoid late fees', { align: 'left' });
    
    doc.moveDown(1);
    
    // Footer
    doc.fontSize(10)
       .text('Thank you for your timely payment!', { align: 'center' })
       
    doc.end();

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate bill PDF',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Start Server
// Add this middleware
const isTreasurer = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    if (decoded.role !== "Treasurer") {
      return res.status(403).json({ error: "Forbidden - Treasurer access only" });
    }
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Protect the routes
app.get("/api/treasurer/dashboard", isTreasurer, async (req, res) => {
  res.json({ message: "Welcome Treasurer!" });
});




// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
