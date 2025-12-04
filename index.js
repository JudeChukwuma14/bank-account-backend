const express = require("express");
const server = express();
require("dotenv").config();
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const mongodb = process.env.MONGO_URI;

const memberRoutes = require("./router/memberRoutes"); // Fixed path
const paymentRoutes = require("./router/paymentRoutes"); // Fixed path
const loanRoutes = require("./router/loanRoutes");

// MongoDB connection
mongoose
  .connect(mongodb)
  .then(() => {
    console.log("✅ DB Connected Successfully");
  })
  .catch((err) => {
    console.error("❌ DB Connection Error:", err.message);
  });

// Middleware ORDER MATTERS - Body parser first!
server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use(helmet());
server.use(cors());



// Routes
server.use("/api/v1/members", memberRoutes);
server.use("/api/v1/payments", paymentRoutes);
server.use("/api/v1/loans", loanRoutes);

// Health check endpoint
server.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running healthy",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
// server.use('*', (req, res) => {
//     res.status(404).json({
//         success: false,
//         message: `Route ${req.originalUrl} not found`
//     });
// });

// Global error handler
server.use((error, req, res, next) => {
  console.error("🚨 Global Error Handler:", error);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
});

const port = process.env.PORT || 4000;
server.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
