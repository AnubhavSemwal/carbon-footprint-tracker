const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        "car",
        "bus",
        "flight",
        "electricity",
        "vegMeal",
        "nonVegMeal"
      ]
    },

    quantity: {
      type: Number,
      required: true,
      min: 0
    },

    unit: {
      type: String,
      required: true
    },

    co2: {
      type: Number,
      required: true
    },

    date: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Activity", activitySchema);