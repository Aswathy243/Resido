const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors({ origin: "*" })); // Allow requests from any origin

// Connect to MongoDB
mongoose
  .connect("mongodb://localhost:27017/Net", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Connection Failed:", err));

// Define Staff Schema
const staffSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  attendance: [{ date: String, status: String }],
});

const Staff = mongoose.model("Staff", staffSchema);

// ✅ Get all staff
app.get("/staff", async (req, res) => {
  try {
    const staff = await Staff.find();
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch staff" });
  }
});

// ✅ Mark Attendance
app.post("/attendance", async (req, res) => {
  try {
    const { staffId, date, status } = req.body;
    if (!staffId || !date || !status) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    staff.attendance.push({ date, status });
    await staff.save();
    res.json({ message: "Attendance updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to mark attendance" });
  }
});

// ✅ Get attendance for a specific month (YYYY-MM format)
app.get("/attendance/:month", async (req, res) => {
  try {
    const { month } = req.params;
    const attendance = await Staff.aggregate([
      {
        $project: {
          name: 1,
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
    ]);

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
