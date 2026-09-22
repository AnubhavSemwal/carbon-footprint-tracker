const emissionFactors = {
  car: 0.20,
  bus: 0.08,
  flight: 0.25,
  electricity: 0.80,
  vegMeal: 0.5,
  nonVegMeal: 2.0
};

const calculateCO2 = (type, quantity) => {
  const factor = emissionFactors[type];

  if (factor === undefined) {
    throw new Error("Invalid activity type");
  }

  return quantity * factor;
};

module.exports = {
  calculateCO2,
  emissionFactors
};