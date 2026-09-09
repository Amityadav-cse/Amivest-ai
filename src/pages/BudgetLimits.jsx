import React, { useEffect, useState } from "react";

const BACKEND =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:5000";

const DEFAULT_CATEGORIES = [
  "Food",
  "Shopping",
  "Transport",
  "Bills",
  "Education",
  "Entertainment",
  "Health",
  "Travel",
  "Groceries",
  "Fuel",
  "Rent",
  "EMI",
  "Other",
];


async function api(path, options = {}) {

  const response = await fetch(
    `${BACKEND}${path}`,
    {
      credentials: "include",

      headers: {
        "Content-Type":
          "application/json",

        ...(options.headers || {}),
      },

      ...options,
    }
  );


  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }


  if (!response.ok) {

    throw new Error(
      data.error ||
      data.message ||
      `Server returned status code: ${response.status}`
    );
  }


  return data;
}


function money(value) {

  return `₹${Number(
    value || 0
  ).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}


export default function BudgetLimits() {

  const [limits, setLimits] =
    useState([]);

  const [categories, setCategories] =
    useState(DEFAULT_CATEGORIES);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [showExpense, setShowExpense] =
    useState(false);

  const [showLimit, setShowLimit] =
    useState(false);

  const [expenseAmount, setExpenseAmount] =
    useState("");

  const [expenseCategory, setExpenseCategory] =
    useState("Food");

  const [expenseDescription, setExpenseDescription] =
    useState("");

  const [limitCategory, setLimitCategory] =
    useState("Food");

  const [limitAmount, setLimitAmount] =
    useState("");


  // ========================================================
  // LOAD EVERYTHING
  // ========================================================

  async function loadData() {

    setLoading(true);
    setError("");

    try {

      const [
        limitData,
        categoryData,
      ] = await Promise.all([

        api("/budget/limits"),

        api("/budget/categories"),

      ]);


      setLimits(
        limitData.limits || []
      );


      if (
        categoryData.categories &&
        categoryData.categories.length
      ) {

        setCategories(
          categoryData.categories
        );

      }


    } catch (err) {

      console.error(
        "Budget loading error:",
        err
      );

      setError(
        err.message ||
        "Unable to load budget data."
      );

    } finally {

      setLoading(false);

    }
  }


  useEffect(() => {

    loadData();

  }, []);


  // ========================================================
  // ADD EXPENSE
  // ========================================================

  async function addExpense() {

    setError("");
    setSuccess("");

    const amount =
      Number(expenseAmount);


    if (!amount || amount <= 0) {

      setError(
        "Please enter a valid expense amount."
      );

      return;
    }


    setSaving(true);


    try {

      const data =
        await api(
          "/budget/expense",
          {
            method: "POST",

            body: JSON.stringify({

              amount,

              category:
                expenseCategory,

              description:
                expenseDescription ||
                "Manual expense",

            }),
          }
        );


      setSuccess(
        data.message ||
        "Expense added successfully."
      );


      setExpenseAmount("");

      setExpenseDescription("");

      setShowExpense(false);


      await loadData();


    } catch (err) {

      setError(
        err.message ||
        "Unable to add expense."
      );

    } finally {

      setSaving(false);

    }
  }


  // ========================================================
  // SAVE LIMIT
  // ========================================================

  async function saveLimit() {

    setError("");
    setSuccess("");

    const amount =
      Number(limitAmount);


    if (!amount || amount <= 0) {

      setError(
        "Please enter a valid spending limit."
      );

      return;
    }


    setSaving(true);


    try {

      const data =
        await api(
          "/budget/limits",
          {
            method: "POST",

            body: JSON.stringify({

              category:
                limitCategory,

              monthly_limit:
                amount,

            }),
          }
        );


      setSuccess(
        data.message ||
        "Spending limit saved successfully."
      );


      setLimitAmount("");

      setShowLimit(false);


      await loadData();


    } catch (err) {

      setError(
        err.message ||
        "Unable to save limit."
      );

    } finally {

      setSaving(false);

    }
  }


  // ========================================================
  // DELETE LIMIT
  // ========================================================

  async function deleteLimit(id) {

    if (
      !window.confirm(
        "Delete this spending limit?"
      )
    ) {
      return;
    }


    try {

      await api(
        `/budget/limits/${id}`,
        {
          method: "DELETE",
        }
      );


      setSuccess(
        "Spending limit deleted."
      );


      await loadData();


    } catch (err) {

      setError(
        err.message ||
        "Unable to delete limit."
      );

    }
  }


  // ========================================================
  // UI
  // ========================================================

  return (

    <div
      style={{
        background: "#161a1f",
        border: "1px solid #242b35",
        borderRadius: "16px",
        padding: "24px",
        marginBottom: "30px",
        color: "#fff",
      }}
    >

      {/* ====================================================
          HEADER
      ==================================================== */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "15px",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >

        <div>

          <h2
            style={{
              margin: 0,
              fontSize: "24px",
            }}
          >
            💸 Spending & Daily Expenses
          </h2>

          <p
            style={{
              color: "#9ca3af",
              marginTop: "7px",
            }}
          >
            Track today's expenses and stay
            within your monthly limits.
          </p>

        </div>


        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >

          <button
            onClick={() => {
              setShowExpense(
                !showExpense
              );
              setShowLimit(false);
            }}
            style={buttonStyle}
          >
            ➕ Add Today's Expense
          </button>


          <button
            onClick={() => {
              setShowLimit(
                !showLimit
              );
              setShowExpense(false);
            }}
            style={buttonStyle}
          >
            🎯 Set Spending Limit
          </button>

        </div>

      </div>


      {/* ====================================================
          ERROR
      ==================================================== */}

      {error && (

        <div
          style={{
            background: "#351a21",
            border:
              "1px solid #7f2938",
            color: "#fca5a5",
            padding: "13px",
            borderRadius: "9px",
            marginBottom: "15px",
          }}
        >
          ⚠️ {error}
        </div>

      )}


      {/* ====================================================
          SUCCESS
      ==================================================== */}

      {success && (

        <div
          style={{
            background: "#073b36",
            border:
              "1px solid #0f766e",
            color: "#5eead4",
            padding: "13px",
            borderRadius: "9px",
            marginBottom: "15px",
          }}
        >
          {success}
        </div>

      )}


      {/* ====================================================
          ADD EXPENSE FORM
      ==================================================== */}

      {showExpense && (

        <div style={formBox}>

          <h3>
            📝 Enter Today's Expense
          </h3>

          <p style={helpText}>
            Enter the expense you made today.
          </p>


          <label style={label}>
            Amount
          </label>

          <input
            type="number"
            min="1"
            value={expenseAmount}
            onChange={(e) =>
              setExpenseAmount(
                e.target.value
              )
            }
            placeholder="Example: 500"
            style={input}
          />


          <label style={label}>
            Category
          </label>

          <select
            value={expenseCategory}
            onChange={(e) =>
              setExpenseCategory(
                e.target.value
              )
            }
            style={input}
          >

            {categories.map(
              (category) => (

                <option
                  key={category}
                  value={category}
                >
                  {category}
                </option>

              )
            )}

          </select>


          <label style={label}>
            Description
          </label>

          <input
            type="text"
            value={expenseDescription}
            onChange={(e) =>
              setExpenseDescription(
                e.target.value
              )
            }
            placeholder="Example: Lunch"
            style={input}
          />


          <button
            onClick={addExpense}
            disabled={saving}
            style={saveButton}
          >
            {saving
              ? "Saving..."
              : "💾 Save Today's Expense"}
          </button>

        </div>

      )}


      {/* ====================================================
          LIMIT FORM
      ==================================================== */}

      {showLimit && (

        <div style={formBox}>

          <h3>
            🎯 Set Monthly Spending Limit
          </h3>

          <p style={helpText}>
            AmiVest will monitor this category
            throughout the month.
          </p>


          <label style={label}>
            Category
          </label>

          <select
            value={limitCategory}
            onChange={(e) =>
              setLimitCategory(
                e.target.value
              )
            }
            style={input}
          >

            {categories.map(
              (category) => (

                <option
                  key={category}
                  value={category}
                >
                  {category}
                </option>

              )
            )}

          </select>


          <label style={label}>
            Monthly Limit
          </label>

          <input
            type="number"
            min="1"
            value={limitAmount}
            onChange={(e) =>
              setLimitAmount(
                e.target.value
              )
            }
            placeholder="Example: 5000"
            style={input}
          />


          <button
            onClick={saveLimit}
            disabled={saving}
            style={saveButton}
          >
            {saving
              ? "Saving..."
              : "💾 Save Spending Limit"}
          </button>

        </div>

      )}


      {/* ====================================================
          LOADING
      ==================================================== */}

      {loading && (

        <div
          style={{
            padding: "30px",
            textAlign: "center",
            color: "#94a3b8",
          }}
        >
          Loading your financial data...
        </div>

      )}


      {/* ====================================================
          LIMIT CARDS
      ==================================================== */}

      {!loading && (

        <div>

          <h3
            style={{
              marginBottom: "15px",
            }}
          >
            📊 Your Active Limits
          </h3>


          {limits.length === 0 ? (

            <div
              style={{
                background: "#0b1420",
                border:
                  "1px dashed #334155",
                borderRadius: "12px",
                padding: "30px",
                textAlign: "center",
                color: "#94a3b8",
              }}
            >
              No spending limits yet.

              <br />

              Set your first limit above.
            </div>

          ) : (

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "15px",
              }}
            >

              {limits.map(
                (limit) => (

                  <LimitCard
                    key={limit.id}
                    limit={limit}
                    onDelete={
                      deleteLimit
                    }
                  />

                )
              )}

            </div>

          )}

        </div>

      )}

    </div>
  );
}


// ============================================================
// LIMIT CARD
// ============================================================

function LimitCard({
  limit,
  onDelete,
}) {

  const percentage =
    Number(
      limit.percent_used || 0
    );

  const safePercentage =
    Math.min(
      100,
      Math.max(
        0,
        percentage
      )
    );


  let progressColor =
    "#10b981";

  if (percentage >= 100) {

    progressColor =
      "#ef4444";

  } else if (percentage >= 80) {

    progressColor =
      "#f59e0b";

  }


  return (

    <div
      style={{
        background: "#0b1420",
        border:
          "1px solid #243244",
        borderRadius: "12px",
        padding: "18px",
      }}
    >

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >

        <strong>
          {limit.category}
        </strong>


        <button
          onClick={() =>
            onDelete(limit.id)
          }
          style={{
            background:
              "transparent",
            border: "none",
            color: "#ef4444",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          🗑️
        </button>

      </div>


      <div
        style={{
          marginTop: "15px",
          fontSize: "22px",
          fontWeight: "700",
        }}
      >
        {money(limit.spent)}
      </div>


      <div
        style={{
          color: "#64748b",
          fontSize: "12px",
          marginTop: "3px",
        }}
      >
        of {money(limit.monthly_limit)}
      </div>


      <div
        style={{
          background: "#172033",
          height: "8px",
          borderRadius: "20px",
          overflow: "hidden",
          marginTop: "14px",
        }}
      >

        <div
          style={{
            width:
              `${safePercentage}%`,
            height: "100%",
            background:
              progressColor,
            transition:
              "width .3s ease",
          }}
        />

      </div>


      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "10px",
          fontSize: "12px",
        }}
      >

        <span>
          {percentage.toFixed(0)}% used
        </span>

        <span>
          {money(limit.remaining)} left
        </span>

      </div>


      <div
        style={{
          marginTop: "12px",
          fontSize: "12px",
          color:
            limit.status === "exceeded"
              ? "#fca5a5"
              : limit.status === "warning"
              ? "#fcd34d"
              : "#6ee7b7",
        }}
      >
        {limit.alert}
      </div>

    </div>

  );
}


// ============================================================
// STYLES
// ============================================================

const buttonStyle = {

  background:
    "linear-gradient(135deg,#0d9488,#06b6d4)",

  border: "none",

  color: "#fff",

  padding: "12px 18px",

  borderRadius: "9px",

  fontWeight: "700",

  cursor: "pointer",

};


const formBox = {

  background: "#0b1420",

  border:
    "1px solid #243244",

  borderRadius: "12px",

  padding: "20px",

  marginBottom: "20px",

};


const helpText = {

  color: "#94a3b8",

  fontSize: "13px",

};


const label = {

  display: "block",

  color: "#cbd5e1",

  fontSize: "13px",

  fontWeight: "600",

  marginTop: "14px",

  marginBottom: "6px",

};


const input = {

  width: "100%",

  boxSizing: "border-box",

  background: "#07111f",

  color: "#fff",

  border:
    "1px solid #26374b",

  borderRadius: "8px",

  padding: "12px",

  outline: "none",

};


const saveButton = {

  width: "100%",

  marginTop: "18px",

  background:
    "linear-gradient(135deg,#0d9488,#06b6d4)",

  color: "#fff",

  border: "none",

  borderRadius: "9px",

  padding: "13px",

  fontWeight: "700",

  cursor: "pointer",

};