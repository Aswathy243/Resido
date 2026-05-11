# RESIDO 🏘️
### Residence Management System

A full-stack mobile application designed to simplify and automate the management of large residential complexes — built with React Native, Node.js, and MongoDB.

---

## 📌 Overview

Residential communities often struggle with inefficiencies caused by manual processes for service requests, visitor tracking, billing, and financial management. RESIDO addresses these challenges by digitizing and automating day-to-day residential operations, making life easier for residents, staff, and administrators alike.

---

## ✨ Features

- 🔐 **Role-Based Access Control** — Separate access levels for residents, staff, and admins
- 📋 **Complaint Management** — Residents can raise and track service requests in real time
- 👤 **Visitor Log** — Secure entry and exit tracking for seamless visitor management
- 💰 **LPG Bill Tracking** — Accurate and transparent billing for residential gas usage
- 🏠 **Flat Insurance Management** — Manage and track insurance details for individual units
- 📅 **Facility Booking** — Residents can book shared facilities with ease
- 🧾 **Payment Verification** — Transparent transaction tracking for all payments
- 🗂️ **Asset & Inventory Management** — Systematically manage community assets
- 👷 **Staff Task Monitoring** — Track and manage staff assignments and responsibilities

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React Native |
| Backend | Node.js, Express.js |
| Database | MongoDB |
| API | RESTful APIs |

---

## 🏗️ Architecture

```
RESIDO
├── Frontend (React Native)
│   ├── Resident Module
│   ├── Staff Module
│   └── Admin Module
├── Backend (Node.js + Express.js)
│   ├── RESTful API Layer
│   └── Role-Based Auth Middleware
└── Database (MongoDB)
    ├── Users & Roles
    ├── Complaints & Requests
    ├── Visitor Logs
    ├── Billing & Payments
    └── Assets & Inventory
```

---

## 👥 User Roles

| Role | Access |
|---|---|
| **Resident** | Raise complaints, book facilities, view bills, track visitors |
| **Staff** | View assigned tasks, update request status |
| **Admin** | Full access — manage users, verify payments, generate reports |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB
- React Native CLI / Expo

### Installation

```bash
# Clone the repository
git clone https://github.com/Aswathy243/RESIDO.git

# Navigate to backend
cd backend
npm install
npm start

# Navigate to frontend
cd ../frontend
npm install
npx react-native run-android   # For Android
npx react-native run-ios       # For iOS
```

### Environment Variables

Create a `.env` file in the backend directory:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

---

## 📂 Project Structure

```
resido/
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   └── server.js
├── frontend/
│   ├── screens/
│   ├── components/
│   ├── navigation/
│   └── App.js
└── README.md
```

---

## 🤝 Contributors

- **Aswathy S** — [github.com/Aswathy243](https://github.com/Aswathy243)

---

