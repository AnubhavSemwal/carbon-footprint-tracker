const express = require("express");
const Activity = require("../models/activity.model");
const { calculateCO2 } = require("../utils/co2Calculator");

const router = express.Router();

// ==========================================
// ADD NEW ACTIVITY
// POST /api/activities
// ==========================================

router.post("/", async (req, res) => {
  try {
    const { type, quantity, date } = req.body;

    // Check required fields
    if (!type || quantity === undefined || !date) {
      return res.status(400).json({
        message: "Type, quantity and date are required"
      });
    }

    // Check quantity
    if (quantity <= 0) {
      return res.status(400).json({
        message: "Quantity must be greater than 0"
      });
    }

    // Calculate CO2
    const co2 = calculateCO2(type, quantity);

    // Determine unit
    let unit;

    if (type === "electricity") {
      unit = "kWh";
    } else if (type === "vegMeal" || type === "nonVegMeal") {
      unit = "meals";
    } else {
      unit = "km";
    }

    // Save activity
    const activity = await Activity.create({
      type,
      quantity,
      unit,
      co2,
      date
    });

    res.status(201).json({
      message: "Activity added successfully",
      activity
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});

// ==========================================
// GET ALL ACTIVITIES
// GET /api/activities
// ==========================================

router.get("/", async (req, res) => {
  try {
    const activities = await Activity.find().sort({
      date: -1
    });

    res.json(activities);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});

module.exports = router;