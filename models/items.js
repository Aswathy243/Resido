const mongoose = require("mongoose");

// Define the Register Schema
const RegisterSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    userName: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ["Security", "Plumber", "Electrician", "Cleaning Staff", "Gardener", "Treasurer", "Resident","Admin"],
    },
    flatNumber: { type: String, unique: false, sparse: true },
    attendance: [{ date: String, status: String }],

    // ✅ New Field: Stores Tasks Assigned to Staff
    // In the tasks array of RegisterSchema
tasks: [
  {
    task: { type: String, required: true },
    dueDate: { type: String, required: true },
    assignedDate: { type: String, default: new Date().toISOString().split("T")[0] },
    completed: { type: Boolean, default: false },
    completedDate: { type: String }
  }
],

    // ✅ New Field: Locked Status
    locked: { type: Boolean, default: false }, // Default to false (unlocked)

    
  },
  { timestamps: true }
);

// Define the Hall Booking Schema
const HallBookingSchema = new mongoose.Schema(
  {
    residentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Register",
      required: true,
    },
    residentName: { type: String, required: true },
    flatNumber: { type: String, required: true },
    facility: { type: String, required: true },
    date: { type: String, required: true, index: true }, // Faster queries
    time: { type: String, required: true },
    status: { type: String, enum: ["Pending", "Approved", "Rejected", "Cancelled"], default: "Pending" },

    uniqueSlot: { type: String, required: true, unique: true }, // Prevents duplicate bookings

    // ✅ Newly Added Fields
    eventName: { type: String, required: true },  // Added event name
    peopleCount: { type: Number, required: true },  // Added people count

    isCancelled: { type: Boolean, default: false },
    cancellationReason: { type: String, default: null },

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Register", default: null },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Register", default: null },
  },
  { timestamps: true }
);





// Insurance Schema


const insuranceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  insuranceName: { type: String, required: true },
  renewalDate: { type: String, required: true },
  paymentReminderDate: { type: String, required: true }, // Stores next 15-day reminder
});








// Define the Visitor Schema
const visitorSchema = new mongoose.Schema({
  visitorName: { type: String, required: true },
  visitorPhone: { type: String, required: true, match: /^[0-9]{10}$/ }, // Ensures 10-digit phone number
  purpose: { type: String, default: "Not specified" },
  flatNumber: { type: String, required: true },
  date: { type: String, required: true }, // Store as "YYYY-MM-DD" format
  time: { type: String, required: true }, // Store as "HH:MM AM/PM"
  checkOutTime: { type: String, default: null }, // Store checkout time
});
const BillSchema = new mongoose.Schema({
  flatNumber: { type: String, required: true },
  meterReading: { type: Number, required: true },
  billAmount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});
// In your models/items.js, ensure MeterReading schema has these fields:
const meterReadingSchema = new mongoose.Schema({
  residentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Register', 
    required: true 
  },
  flatNumber: { 
    type: String, 
    required: true 
  },
  readingValue: { 
    type: Number, 
    required: true,
    validate: {
      validator: function(value) {
        return value > this.previousReading;
      },
      message: props => `Reading (${props.value}) must be greater than previous reading (${this.previousReading})`
    }
  },
  previousReading: { 
    type: Number, 
    required: true,
    default: 10000
  },
  consumption: { 
    type: Number,
    min: 0
  },
  imageUrl: { 
    type: String,
    required: function() {
      return !this.isManualEntry;
    }
  },
  isManualEntry: { 
    type: Boolean, 
    default: false 
  },
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected'], 
    default: 'Pending' 
  },
  reviewedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Register' 
  },
  reviewDate: { 
    type: Date 
  },
  rejectionReason: { 
    type: String 
  },
  billAmount: { 
    type: Number,
    min: 0
  },
  totalSocietyBill: { 
    type: Number,
    min: 0
  },
  readingDate: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });


// Export Models
const Register = mongoose.model("Register", RegisterSchema);
const HallBooking = mongoose.model("HallBooking", HallBookingSchema);
const Visitor = mongoose.model("Visitor", visitorSchema);
const Bill = mongoose.model("Bill", BillSchema);
const Insurance = mongoose.model("Insurance", insuranceSchema);
const MeterReading = mongoose.model("MeterReading", meterReadingSchema);

module.exports = { Register, HallBooking, Visitor,Bill,Insurance,MeterReading };