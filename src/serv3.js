const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { Register } = require("../models/items");
const { Visitor } = require("../models/items");
const { HallBooking } = require("../models/items");
const { Insurance } = require("../models/items");
const cron = require("node-cron");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Failed:", err));

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



// Attendance APIs (from serv.js)
app.get("/staff", async (req, res) => {
  try {
    const staff = await Register.find({ role: { $ne: "Resident" } });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch staff" });
  }
});

app.post("/attendance", async (req, res) => {
  try {
    const { staffId, date, status } = req.body;
    if (!staffId || !date || !status) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const staff = await Register.findById(staffId);
    if (!staff || ["Resident", "Admin"].includes(staff.role)) {
      return res.status(404).json({ error: "Attendance not allowed for this role" });
    }

    const existingAttendance = staff.attendance?.find((att) => att.date === date);
    if (existingAttendance) {
      return res.status(400).json({ error: "Attendance already marked for this date" });
    }

    if (!staff.attendance) {
      staff.attendance = [];
    }

    staff.attendance.push({ date, status });
    await staff.save();
    res.json({ message: "Attendance updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to mark attendance" });
  }
});

// Fetch Attendance Records (Exclude Admin & Treasurer)
app.get("/attendance/:month", async (req, res) => {
  try {
    const { month } = req.params;
    const attendance = await Register.aggregate([
      {
        $match: { role: { $nin: ["Resident", "Admin"] } }, // Exclude Resident & Admin
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
        },
      },
    ]);

    res.json(attendance);
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

    const newVisitor = new Visitor({
      visitorName,
      visitorPhone,
      purpose: purpose || "Not specified",
      flatNumber,
      date: new Date().toISOString().split("T")[0], // YYYY-MM-DD format
      time: new Date().toLocaleTimeString(), // HH:MM AM/PM format
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
    const { staffId, taskIndex } = req.body;

    if (!staffId || taskIndex === undefined) {
      return res.status(400).json({ error: "Staff ID and task index are required" });
    }

    const staff = await Register.findById(staffId);
    if (!staff) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    if (!staff.tasks[taskIndex]) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Mark the specific task as completed
    staff.tasks[taskIndex].completed = true;
    staff.tasks[taskIndex].completedDate = new Date().toISOString().split("T")[0];
    
    // Check if all tasks are completed
    const hasPendingTasks = staff.tasks.some(task => !task.completed);
    staff.locked = hasPendingTasks;
    
    await staff.save();

    res.status(200).json({ 
      message: "Task marked as completed!",
      hasPendingTasks
    });
  } catch (error) {
    console.error("Error completing task:", error);
    res.status(500).json({ error: "Failed to complete task" });
  }
});




// Fetch locked halls
// ✅ Book a hall (Direct Approval, No Admin Involvement)
app.post("/api/book-hall", async (req, res) => {
  try {
    const { residentId, residentName, flatNumber, facility, eventName, peopleCount, date, time } = req.body;

    if (!residentId || !residentName || !flatNumber || !facility || !eventName || !peopleCount || !date || !time) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const uniqueSlot = `${date}-${time}-${facility}`;
    console.log("🔹 Checking for existing booking:", uniqueSlot);

    // Prevent duplicate bookings
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
      status: "Approved", // ✅ Auto-approve booking
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


// Fetch Reminders API
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





// Error Handling Middleware
app.use((err, req, res, next) => {
  res.status(500).json({ error: "Something went wrong!" });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
