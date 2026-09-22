const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const connectDB = require("./config/db");
const activityRoutes = require("./routes/activity.routes");

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
connectDB();

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "Carbon Footprint Tracker API is running"
  });
});

app.use("/api/activities", activityRoutes);

// Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});