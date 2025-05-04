const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// ✅ Middleware
app.use(express.json());
app.use(cors());

// ✅ Connect to MongoDB (Auto-creates database if not exists)
mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/Net")
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// ✅ Define Schema
const VisitorSchema = new mongoose.Schema({
  visitorName: { type: String, required: true },
  visitorPhone: { type: String, required: true },
  purpose: { type: String, default: "Not specified" },
  flatNumber: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  checkedOut: { type: Boolean, default: false },
});

// ✅ Create Model
const Visitor = mongoose.model("Visitor", VisitorSchema);

// ✅ Route to handle visitor form submission
app.post("/add-visitor", async (req, res) => {
  try {
    console.log("📥 Received Data:", req.body);

    const { visitorName, visitorPhone, purpose, flatNumber, date, time } = req.body;
    if (!visitorName || !visitorPhone || !flatNumber || !date || !time) {
      return res.status(400).json({ message: "❌ All fields are required!" });
    }

    const newVisitor = new Visitor({ visitorName, visitorPhone, purpose, flatNumber, date, time });
    await newVisitor.save();

    console.log("✅ Visitor saved:", newVisitor);
    res.json({ message: "✅ Visitor details saved successfully!" });
  } catch (error) {
    console.error("❌ Database Save Error:", error);
    res.status(500).json({ message: "❌ Error saving visitor", error });
  }
});

// ✅ Route to fetch all visitors
app.get("/visitors", async (req, res) => {
  try {
    const visitors = await Visitor.find();
    res.json(visitors);
  } catch (error) {
    console.error("❌ Fetching Data Error:", error);
    res.status(500).json({ message: "❌ Error fetching visitors", error });
  }
});

// ✅ Route to check out a visitor
app.put("/checkout/:id", async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndUpdate(req.params.id, { checkedOut: true }, { new: true });
    if (!visitor) return res.status(404).json({ message: "❌ Visitor not found" });

    console.log("✅ Visitor checked out:", visitor);
    res.json({ message: "✅ Visitor checked out successfully!" });
  } catch (error) {
    console.error("❌ Checkout Error:", error);
    res.status(500).json({ message: "❌ Error updating visitor", error });
  }
});
app.get("/search-visitor", async (req, res) => {
    try {
      const { flatNumber } = req.query;
      if (!flatNumber) {
        return res.status(400).json({ message: "Flat Number is required for search." });
      }
  
      const visitors = await Visitor.find({ flatNumber });
      if (visitors.length === 0) {
        return res.status(404).json({ message: "No visitors found for this flat number." });
      }
  
      res.json(visitors);
    } catch (error) {
      console.error("❌ Error in search-visitor:", error);
      res.status(500).json({ message: "Internal server error", error });
    }
  });
  

// ✅ Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
