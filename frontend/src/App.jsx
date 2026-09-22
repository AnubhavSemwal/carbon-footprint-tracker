import { useEffect, useMemo, useState } from "react";
import "./App.css";
import API from "./api";

function App() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const [type, setType] = useState("car");
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [weeklyTarget, setWeeklyTarget] = useState(() => {
    return localStorage.getItem("weeklyCO2Target") || "20";
  });

  const [targetInput, setTargetInput] = useState(() => {
    return localStorage.getItem("weeklyCO2Target") || "20";
  });

  const [filterType, setFilterType] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingActivity, setPendingActivity] = useState(null);

  const activityInfo = {
    car: {
      name: "Car Travel",
      shortName: "Car",
      unit: "km",
      factor: 0.2,
      icon: "🚗"
    },
    bus: {
      name: "Bus Travel",
      shortName: "Bus",
      unit: "km",
      factor: 0.08,
      icon: "🚌"
    },
    flight: {
      name: "Flight",
      shortName: "Flight",
      unit: "km",
      factor: 0.25,
      icon: "✈️"
    },
    electricity: {
      name: "Electricity",
      shortName: "Electricity",
      unit: "kWh",
      factor: 0.8,
      icon: "⚡"
    },
    vegMeal: {
      name: "Vegetarian Meal",
      shortName: "Veg Meal",
      unit: "meals",
      factor: 0.5,
      icon: "🥗"
    },
    nonVegMeal: {
      name: "Non-Vegetarian Meal",
      shortName: "Non-Veg Meal",
      unit: "meals",
      factor: 2,
      icon: "🍽️"
    }
  };

  const warningThresholds = {
    car: 1000,
    bus: 1000,
    flight: 20000,
    electricity: 1000,
    vegMeal: 100,
    nonVegMeal: 100
  };

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await API.get("/activities");
      setActivities(response.data);
    } catch (err) {
      console.error(err);
      setError("Unable to load activities.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const getDateOnly = (value) => {
    return new Date(value).toISOString().split("T")[0];
  };

  const getActivityName = (activityType) => {
    return activityInfo[activityType]?.name || activityType;
  };

  const getActivityUnit = (activityType) => {
    return activityInfo[activityType]?.unit || "";
  };

  const submitActivity = async (activityData) => {
    try {
      setMessage("");
      setError("");

      await API.post("/activities", activityData);

      setMessage("Activity added successfully!");
      setQuantity("");
      setPendingActivity(null);
      setShowConfirmation(false);

      await fetchActivities();
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          "Unable to add activity."
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!quantity || Number(quantity) <= 0) {
      setError("Please enter a valid quantity.");
      return;
    }

    if (!date) {
      setError("Please select a date.");
      return;
    }

    const activityData = {
      type,
      quantity: Number(quantity),
      date
    };

    if (Number(quantity) > warningThresholds[type]) {
      setPendingActivity(activityData);
      setShowConfirmation(true);
      return;
    }

    await submitActivity(activityData);
  };

  const confirmActivity = async () => {
    if (!pendingActivity) return;

    await submitActivity(pendingActivity);
  };

  const cancelConfirmation = () => {
    setShowConfirmation(false);
    setPendingActivity(null);
  };

  const handleTargetSubmit = (e) => {
    e.preventDefault();

    const target = Number(targetInput);

    if (!target || target <= 0) {
      setError("Please enter a valid weekly target.");
      return;
    }

    localStorage.setItem(
      "weeklyCO2Target",
      target.toString()
    );

    setWeeklyTarget(target.toString());
    setMessage("Weekly target updated successfully!");
    setError("");
  };

  const getCurrentWeekActivities = () => {
    const today = new Date();
    const day = today.getDay();

    const difference = day === 0 ? -6 : 1 - day;

    const monday = new Date(today);

    monday.setDate(
      today.getDate() + difference
    );

    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);

    sunday.setDate(
      monday.getDate() + 6
    );

    sunday.setHours(23, 59, 59, 999);

    return activities.filter((activity) => {
      const activityDate = new Date(activity.date);

      return (
        activityDate >= monday &&
        activityDate <= sunday
      );
    });
  };

  const totalCO2 = useMemo(() => {
    return activities.reduce(
      (total, activity) =>
        total + Number(activity.co2 || 0),
      0
    );
  }, [activities]);

  const weeklyActivities =
    getCurrentWeekActivities();

  const weeklyCO2 = weeklyActivities.reduce(
    (total, activity) =>
      total + Number(activity.co2 || 0),
    0
  );

  const targetNumber = Number(weeklyTarget);

  const weeklyPercentage =
    targetNumber > 0
      ? (weeklyCO2 / targetNumber) * 100
      : 0;

  const remainingCO2 =
    targetNumber - weeklyCO2;

  const exceededBy =
    weeklyCO2 - targetNumber;

  const categoryBreakdown = useMemo(() => {
    const breakdown = {};

    Object.keys(activityInfo).forEach(
      (activityType) => {
        breakdown[activityType] = 0;
      }
    );

    activities.forEach((activity) => {
      if (
        breakdown[activity.type] !== undefined
      ) {
        breakdown[activity.type] += Number(
          activity.co2 || 0
        );
      }
    });

    const total = Object.values(breakdown).reduce(
      (sum, value) => sum + value,
      0
    );

    return Object.entries(breakdown)
      .map(([activityType, co2]) => ({
        type: activityType,
        name: getActivityName(activityType),
        co2,
        percentage:
          total > 0
            ? (co2 / total) * 100
            : 0
      }))
      .filter((item) => item.co2 > 0)
      .sort((a, b) => b.co2 - a.co2);
  }, [activities]);

  const biggestContributor =
    categoryBreakdown.length > 0
      ? categoryBreakdown[0]
      : null;

  const averageDailyCO2 =
    activities.length > 0
      ? totalCO2 /
        Math.max(
          new Set(
            activities.map((activity) =>
              getDateOnly(activity.date)
            )
          ).size,
          1
        )
      : 0;

  const carbonScore = (() => {
    if (weeklyCO2 === 0) return 100;

    if (weeklyPercentage <= 50) return 100;

    if (weeklyPercentage <= 75) return 85;

    if (weeklyPercentage <= 100) return 70;

    if (weeklyPercentage <= 125) return 50;

    return 30;
  })();

  const getInsight = () => {
    if (!biggestContributor) {
      return "Start logging activities to receive personalized carbon insights.";
    }

    if (biggestContributor.type === "car") {
      return "Car travel is your biggest contributor. Consider walking, cycling, or public transport for shorter trips.";
    }

    if (biggestContributor.type === "flight") {
      return "Flights have a high carbon impact. Consider reducing unnecessary flights or choosing alternatives when possible.";
    }

    if (biggestContributor.type === "electricity") {
      return "Electricity is your biggest contributor. Switching off unused devices and reducing energy consumption can help.";
    }

    if (biggestContributor.type === "nonVegMeal") {
      return "Non-vegetarian meals are your biggest contributor. Adding more plant-based meals can reduce your footprint.";
    }

    if (biggestContributor.type === "bus") {
      return "Your bus travel contributes less per kilometre than car travel. Public transport is a useful lower-emission option.";
    }

    return "Your vegetarian meals currently contribute the most. Continuing balanced, plant-based choices can help keep emissions lower.";
  };

  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      const activityDate = getDateOnly(
        activity.date
      );

      if (
        filterType !== "all" &&
        activity.type !== filterType
      ) {
        return false;
      }

      if (
        fromDate &&
        activityDate < fromDate
      ) {
        return false;
      }

      if (
        toDate &&
        activityDate > toDate
      ) {
        return false;
      }

      return true;
    });
  }, [
    activities,
    filterType,
    fromDate,
    toDate
  ]);

  const filteredCO2 = filteredActivities.reduce(
    (total, activity) =>
      total + Number(activity.co2 || 0),
    0
  );

  const clearFilters = () => {
    setFilterType("all");
    setFromDate("");
    setToDate("");
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-card">
          <div className="loading-icon">🌱</div>
          <h2>Loading your footprint...</h2>
          <p>Preparing your climate dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">

      {/* HEADER */}

      <header className="app-header">
        <div className="header-content">

          <div className="brand-row">
            <div className="brand-icon">
              🌱
            </div>

            <div>
              <div className="brand-name">
                EcoTrack
              </div>

              <div className="brand-tag">
                Personal Carbon Dashboard
              </div>
            </div>
          </div>

          <div className="header-main">
            <div>
              <p className="eyebrow">
                YOUR CLIMATE JOURNEY
              </p>

              <h1 className="header-title">
                Understand your impact.
                <br />
                Make every choice count.
              </h1>

              <p className="header-subtitle">
                Track everyday activities, monitor
                your CO₂ emissions, and build more
                sustainable habits.
              </p>
            </div>

            <div className="header-badge">
              <span>●</span>
              Tracking active
            </div>
          </div>

        </div>
      </header>

      <main className="main-container">

        {/* MESSAGES */}

        {message && (
          <div className="success-message">
            <span>✓</span>
            {message}
          </div>
        )}

        {error && (
          <div className="error-message">
            <span>!</span>
            {error}
          </div>
        )}

        {/* DP2 WARNING */}

        {showConfirmation &&
          pendingActivity && (
            <div className="warning-box">

              <div className="warning-icon">
                !
              </div>

              <div className="warning-content">
                <h3 className="warning-title">
                  This value looks unusually high
                </h3>

                <p className="warning-text">
                  You entered{" "}
                  <strong>
                    {pendingActivity.quantity.toLocaleString()}
                  </strong>{" "}
                  {getActivityUnit(
                    pendingActivity.type
                  )}{" "}
                  for{" "}
                  <strong>
                    {getActivityName(
                      pendingActivity.type
                    )}
                  </strong>
                  .
                </p>

                <p className="warning-text">
                  Please check the value before
                  continuing. We never change your
                  data automatically.
                </p>

                <div className="warning-actions">

                  <button
                    onClick={cancelConfirmation}
                    className="edit-button"
                  >
                    Edit Value
                  </button>

                  <button
                    onClick={confirmActivity}
                    className="confirm-button"
                  >
                    Confirm Anyway
                  </button>

                </div>
              </div>

            </div>
          )}

        {/* SUMMARY */}

        <section className="summary-grid">

          <div className="summary-card primary-summary">
            <div className="summary-top">
              <span className="summary-icon">
                🌍
              </span>

              <span className="summary-badge">
                All time
              </span>
            </div>

            <p className="summary-label">
              Total CO₂ Footprint
            </p>

            <h2 className="summary-value">
              {totalCO2.toFixed(2)}
              <span> kg</span>
            </h2>

            <p className="summary-meta">
              Across all logged activities
            </p>
          </div>

          <div className="summary-card">
            <div className="summary-top">
              <span className="summary-icon">
                📅
              </span>

              <span className="summary-badge">
                Current week
              </span>
            </div>

            <p className="summary-label">
              Weekly Footprint
            </p>

            <h2 className="summary-value">
              {weeklyCO2.toFixed(2)}
              <span> kg</span>
            </h2>

            <p className="summary-meta">
              {weeklyPercentage.toFixed(1)}% of target used
            </p>
          </div>

          <div className="summary-card">
            <div className="summary-top">
              <span className="summary-icon">
                📝
              </span>

              <span className="summary-badge">
                Recorded
              </span>
            </div>

            <p className="summary-label">
              Activities
            </p>

            <h2 className="summary-value">
              {activities.length}
            </h2>

            <p className="summary-meta">
              Daily choices tracked
            </p>
          </div>

          <div className="summary-card score-card">
            <div className="summary-top">
              <span className="summary-icon">
                🌿
              </span>

              <span className="summary-badge score-badge">
                Weekly score
              </span>
            </div>

            <p className="summary-label">
              Carbon Score
            </p>

            <h2 className="summary-value">
              {carbonScore}
              <span>/100</span>
            </h2>

            <p className="summary-meta">
              Based on your weekly target
            </p>
          </div>

        </section>

        {/* MAIN GRID */}

        <div className="main-grid">

          {/* ADD ACTIVITY */}

          <section className="section-card">

            <div className="card-heading">
              <div>
                <p className="card-eyebrow">
                  ACTIVITY TRACKER
                </p>

                <h2 className="section-title">
                  Log an Activity
                </h2>
              </div>

              <span className="heading-icon">
                +
              </span>
            </div>

            <p className="section-description">
              Record a daily activity to calculate
              its estimated carbon impact.
            </p>

            <form onSubmit={handleSubmit}>

              <div className="form-group">

                <label className="form-label">
                  Activity Type
                </label>

                <select
                  value={type}
                  onChange={(e) =>
                    setType(e.target.value)
                  }
                  className="form-select"
                >
                  <option value="car">
                    🚗 Car Travel
                  </option>

                  <option value="bus">
                    🚌 Bus Travel
                  </option>

                  <option value="flight">
                    ✈️ Flight
                  </option>

                  <option value="electricity">
                    ⚡ Electricity
                  </option>

                  <option value="vegMeal">
                    🥗 Vegetarian Meal
                  </option>

                  <option value="nonVegMeal">
                    🍽️ Non-Vegetarian Meal
                  </option>
                </select>

              </div>

              <div className="form-row">

                <div className="form-group">

                  <label className="form-label">
                    Quantity
                  </label>

                  <div className="input-with-unit">

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(e.target.value)
                      }
                      placeholder="0"
                      className="form-input"
                    />

                    <span>
                      {getActivityUnit(type)}
                    </span>

                  </div>

                </div>

                <div className="form-group">

                  <label className="form-label">
                    Date
                  </label>

                  <input
                    type="date"
                    value={date}
                    onChange={(e) =>
                      setDate(e.target.value)
                    }
                    className="form-input"
                  />

                </div>

              </div>

              {quantity &&
                Number(quantity) > 0 && (
                  <div className="co2-preview">

                    <div>
                      <span className="preview-icon">
                        🌍
                      </span>

                      <span>
                        Estimated impact
                      </span>
                    </div>

                    <strong>
                      {(
                        Number(quantity) *
                        activityInfo[type].factor
                      ).toFixed(2)}{" "}
                      kg CO₂
                    </strong>

                  </div>
                )}

              <button
                type="submit"
                className="primary-button"
              >
                <span>＋</span>
                Add Activity
              </button>

            </form>

          </section>

          {/* WEEKLY TARGET */}

          <section className="section-card">

            <div className="card-heading">

              <div>
                <p className="card-eyebrow">
                  WEEKLY GOAL
                </p>

                <h2 className="section-title">
                  Your Carbon Target
                </h2>
              </div>

              <span className="heading-icon">
                🎯
              </span>

            </div>

            <p className="section-description">
              Your tracking week runs from Monday
              to Sunday.
            </p>

            <form
              onSubmit={handleTargetSubmit}
              className="target-form"
            >

              <div className="target-input-wrapper">

                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={targetInput}
                  onChange={(e) =>
                    setTargetInput(
                      e.target.value
                    )
                  }
                  className="target-input"
                  placeholder="20"
                />

                <span>kg CO₂</span>

              </div>

              <button
                type="submit"
                className="target-button"
              >
                Update Target
              </button>

            </form>

            <div className="target-dashboard">

              <div className="target-numbers">

                <div>
                  <span>
                    Used this week
                  </span>

                  <strong>
                    {weeklyCO2.toFixed(2)} kg
                  </strong>
                </div>

                <div className="target-number-right">
                  <span>
                    Weekly target
                  </span>

                  <strong>
                    {targetNumber.toFixed(2)} kg
                  </strong>
                </div>

              </div>

              <div className="progress-container">

                <div
                  className={`progress-bar ${
                    weeklyPercentage > 100
                      ? "exceeded"
                      : ""
                  }`}
                  style={{
                    width: `${Math.min(
                      weeklyPercentage,
                      100
                    )}%`
                  }}
                />

              </div>

              <div className="progress-footer">

                <span>
                  {weeklyPercentage.toFixed(1)}% used
                </span>

                {remainingCO2 >= 0 ? (
                  <strong className="remaining-text">
                    {remainingCO2.toFixed(2)} kg remaining
                  </strong>
                ) : (
                  <strong className="exceeded-text">
                    {exceededBy.toFixed(2)} kg over target
                  </strong>
                )}

              </div>

            </div>

            {weeklyCO2 > targetNumber && (
              <div className="nudge-box">

                <div className="nudge-icon">
                  🌱
                </div>

                <div>
                  <h3 className="nudge-title">
                    Your target has been crossed
                  </h3>

                  <p className="nudge-text">
                    That's okay. You can still make
                    lower-carbon choices for the rest
                    of the week.
                  </p>
                </div>

              </div>
            )}

          </section>

        </div>

        {/* INSIGHTS */}

        <section className="insights-grid">

          <div className="insight-card contributor-card">

            <div className="insight-icon">
              🔎
            </div>

            <div>

              <span className="insight-label">
                BIGGEST CONTRIBUTOR
              </span>

              <h3>
                {biggestContributor
                  ? biggestContributor.name
                  : "No data yet"}
              </h3>

              <p>
                {biggestContributor
                  ? `${biggestContributor.co2.toFixed(
                      2
                    )} kg CO₂ • ${biggestContributor.percentage.toFixed(
                      1
                    )}% of your total`
                  : "Log activities to discover your biggest source of emissions."}
              </p>

            </div>

          </div>

          <div className="insight-card average-card">

            <div className="insight-icon">
              📊
            </div>

            <div>

              <span className="insight-label">
                AVERAGE DAILY
              </span>

              <h3>
                {averageDailyCO2.toFixed(2)} kg
              </h3>

              <p>
                Average CO₂ across your recorded days
              </p>

            </div>

          </div>

          <div className="insight-card tip-card">

            <div className="insight-icon">
              💡
            </div>

            <div>

              <span className="insight-label">
                PERSONALIZED INSIGHT
              </span>

              <h3>
                Small changes matter
              </h3>

              <p>
                {getInsight()}
              </p>

            </div>

          </div>

        </section>

        {/* CATEGORY BREAKDOWN */}

        <section className="section-card">

          <div className="card-heading">

            <div>
              <p className="card-eyebrow">
                EMISSION ANALYSIS
              </p>

              <h2 className="section-title">
                CO₂ by Category
              </h2>
            </div>

            <span className="heading-icon">
              📊
            </span>

          </div>

          {categoryBreakdown.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                🌱
              </div>

              <p className="empty-state-text">
                No activities recorded yet.
              </p>
            </div>
          ) : (
            <div className="category-list">

              {categoryBreakdown.map((item) => (
                <div
                  key={item.type}
                  className="category-item"
                >

                  <div className="category-header">

                    <div className="category-title-wrap">

                      <span className="category-icon">
                        {activityInfo[item.type].icon}
                      </span>

                      <span className="category-name">
                        {item.name}
                      </span>

                    </div>

                    <span className="category-value">
                      {item.co2.toFixed(2)} kg
                      <small>
                        {item.percentage.toFixed(1)}%
                      </small>
                    </span>

                  </div>

                  <div className="category-progress-container">

                    <div
                      className="category-progress"
                      style={{
                        width: `${item.percentage}%`
                      }}
                    />

                  </div>

                </div>
              ))}

            </div>
          )}

        </section>

        {/* FACTORS */}

        <section className="section-card">

          <div className="card-heading">

            <div>
              <p className="card-eyebrow">
                CALCULATION METHOD
              </p>

              <h2 className="section-title">
                Emission Factors
              </h2>
            </div>

            <span className="heading-icon">
              ⚡
            </span>

          </div>

          <p className="section-description">
            The tracker uses the fixed emission
            factors provided in the challenge.
          </p>

          <div className="factor-grid">

            {Object.entries(activityInfo).map(
              ([key, item]) => (
                <div
                  className="factor-card"
                  key={key}
                >

                  <span>
                    {item.icon}
                  </span>

                  <div>
                    <strong>
                      {item.shortName}
                    </strong>

                    <small>
                      {item.factor} kg CO₂ /{" "}
                      {item.unit}
                    </small>
                  </div>

                </div>
              )
            )}

          </div>

        </section>

        {/* HISTORY */}

        <section className="section-card">

          <div className="card-heading">

            <div>
              <p className="card-eyebrow">
                YOUR RECORDS
              </p>

              <h2 className="section-title">
                Activity History
              </h2>
            </div>

            <span className="heading-icon">
              📋
            </span>

          </div>

          <div className="filter-grid">

            <div className="filter-group">

              <label>
                Activity Type
              </label>

              <select
                value={filterType}
                onChange={(e) =>
                  setFilterType(
                    e.target.value
                  )
                }
                className="filter-select"
              >
                <option value="all">
                  All Activities
                </option>

                <option value="car">
                  Car Travel
                </option>

                <option value="bus">
                  Bus Travel
                </option>

                <option value="flight">
                  Flight
                </option>

                <option value="electricity">
                  Electricity
                </option>

                <option value="vegMeal">
                  Vegetarian Meal
                </option>

                <option value="nonVegMeal">
                  Non-Vegetarian Meal
                </option>

              </select>

            </div>

            <div className="filter-group">

              <label>
                From Date
              </label>

              <input
                type="date"
                value={fromDate}
                onChange={(e) =>
                  setFromDate(
                    e.target.value
                  )
                }
                className="filter-input"
              />

            </div>

            <div className="filter-group">

              <label>
                To Date
              </label>

              <input
                type="date"
                value={toDate}
                onChange={(e) =>
                  setToDate(
                    e.target.value
                  )
                }
                className="filter-input"
              />

            </div>

            <div className="clear-filter-container">

              <button
                onClick={clearFilters}
                className="clear-button"
              >
                Clear Filters
              </button>

            </div>

          </div>

          <div className="filter-summary">

            <span>
              Showing{" "}
              <strong>
                {filteredActivities.length}
              </strong>{" "}
              activities
            </span>

            <span>
              {filteredCO2.toFixed(2)} kg CO₂
            </span>

          </div>

          {filteredActivities.length === 0 ? (
            <div className="empty-state">

              <div className="empty-state-icon">
                📭
              </div>

              <p className="empty-state-text">
                No activities match your filters.
              </p>

            </div>
          ) : (
            <div className="table-container">

              <table className="activity-table">

                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Activity</th>
                    <th>Quantity</th>
                    <th>CO₂ Impact</th>
                  </tr>
                </thead>

                <tbody>

                  {filteredActivities.map(
                    (activity) => (
                      <tr
                        key={activity._id}
                      >

                        <td>
                          {getDateOnly(
                            activity.date
                          )}
                        </td>

                        <td>

                          <div className="table-activity">

                            <span>
                              {
                                activityInfo[
                                  activity.type
                                ]?.icon
                              }
                            </span>

                            <strong>
                              {getActivityName(
                                activity.type
                              )}
                            </strong>

                          </div>

                        </td>

                        <td>
                          {activity.quantity}{" "}
                          {activity.unit}
                        </td>

                        <td className="co2-cell">
                          {Number(
                            activity.co2
                          ).toFixed(2)}{" "}
                          kg
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </section>

        {/* PRODUCT DECISIONS */}

        <section className="section-card decisions-section">

          <div className="card-heading">

            <div>
              <p className="card-eyebrow">
                PRODUCT THINKING
              </p>

              <h2 className="section-title">
                Product Decisions
              </h2>
            </div>

            <span className="heading-icon">
              💭
            </span>

          </div>

          <div className="decision-grid">

            <div className="decision-item">

              <span className="decision-number">
                01
              </span>

              <div>

                <h3 className="decision-title">
                  Weekly Target
                </h3>

                <p className="decision-text">
                  When the target is crossed, the
                  app warns and encourages the user
                  instead of shaming or blocking them.
                </p>

              </div>

            </div>

            <div className="decision-item">

              <span className="decision-number">
                02
              </span>

              <div>

                <h3 className="decision-title">
                  Unusual Input
                </h3>

                <p className="decision-text">
                  Extremely large values are flagged
                  for confirmation. The app never
                  silently changes user data.
                </p>

              </div>

            </div>

            <div className="decision-item">

              <span className="decision-number">
                03
              </span>

              <div>

                <h3 className="decision-title">
                  Weekly Period
                </h3>

                <p className="decision-text">
                  The tracking week runs from Monday
                  to Sunday and shows accumulated
                  progress during the current week.
                </p>

              </div>

            </div>

          </div>

        </section>

      </main>

      <footer className="app-footer">

        <div>
          <strong>EcoTrack</strong>
          <span> • </span>
          Personal Carbon Footprint Tracker
        </div>

        <p>
          Built for the climate-tech challenge
        </p>

      </footer>

    </div>
  );
}

export default App;