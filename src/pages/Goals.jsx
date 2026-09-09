import React, { useEffect, useMemo, useState } from "react";

/*
 * ============================================================
 * AMIVEST AI - GOALS / DAILY EXPENSE / SPENDING LIMITS
 * ============================================================
 *
 * This page is intentionally independent:
 * - If the user has NO spending limits, the page still works.
 * - Adding an expense does NOT require a spending limit.
 * - A warning is shown when a matching limit reaches 80%.
 * - An alert is shown when a matching limit is exceeded.
 * - API failures for optional budget endpoints do not break the page.
 *
 * Expected backend endpoints:
 *   GET    /budget/categories
 *   GET    /budget/limits
 *   GET    /budget/expenses/today
 *   GET    /budget/summary
 *   POST   /budget/limits
 *   DELETE /budget/limits/:id
 *   POST   /budget/expense
 */

const API_BASE =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

const DEFAULT_CATEGORIES = [
  "Food",
  "Shopping",
  "Transport",
  "Bills",
  "Entertainment",
  "Education",
  "Health",
  "Rent",
  "Travel",
  "Groceries",
  "Subscriptions",
  "Fuel",
  "EMI",
  "Investment",
  "Other",
];

function money(value) {
  const number = Number(value || 0);
  return `₹${number.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function normalizeCategory(value) {
  return String(value || "").trim().toLowerCase();
}

function getSpentFromLimit(limit) {
  return Number(
    limit?.spent ??
      limit?.current_spending ??
      limit?.amount_spent ??
      0
  );
}

function getLimitAmount(limit) {
  return Number(
    limit?.monthly_limit ??
      limit?.limit ??
      limit?.amount ??
      0
  );
}

function calculateLimitState(spent, limitAmount) {
  const spentNumber = Number(spent || 0);
  const limitNumber = Number(limitAmount || 0);

  if (limitNumber <= 0) {
    return {
      percentage: 0,
      remaining: 0,
      status: "none",
      exceededBy: 0,
    };
  }

  const rawPercentage = (spentNumber / limitNumber) * 100;
  const remaining = Math.max(limitNumber - spentNumber, 0);
  const exceededBy = Math.max(spentNumber - limitNumber, 0);

  let status = "within";

  if (spentNumber >= limitNumber) {
    status = "exceeded";
  } else if (rawPercentage >= 80) {
    status = "warning";
  }

  return {
    percentage: rawPercentage,
    remaining,
    status,
    exceededBy,
  };
}

export default function Goals({ transactions = [] }) {
  // ==========================================================
  // DATA
  // ==========================================================

  const [limits, setLimits] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [todayExpenses, setTodayExpenses] = useState([]);
  const [monthlySummary, setMonthlySummary] = useState({
    total: 0,
    categories: [],
  });

  // ==========================================================
  // UI STATE
  // ==========================================================

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [budgetAlert, setBudgetAlert] = useState(null);

  // ==========================================================
  // LIMIT FORM
  // ==========================================================

  const [showLimitForm, setShowLimitForm] = useState(false);
  const [limitCategory, setLimitCategory] = useState("Food");
  const [limitAmount, setLimitAmount] = useState("");

  // ==========================================================
  // EXPENSE FORM
  // ==========================================================

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Food");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(today());

  // ==========================================================
  // API HELPER
  // ==========================================================

  async function api(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      credentials: "include",
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
    });

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      const message =
        data.error ||
        data.message ||
        `Server returned status code: ${response.status}`;

      const error = new Error(message);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  // ==========================================================
  // OPTIONAL API LOADERS
  // ==========================================================
  // Each request is independent. A missing optional endpoint
  // must NOT prevent the rest of the Goals page from working.

  async function loadCategories() {
    try {
      const data = await api("/budget/categories");

      if (Array.isArray(data.categories) && data.categories.length) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.warn("Categories endpoint unavailable:", err);
      setCategories(DEFAULT_CATEGORIES);
    }
  }

  async function loadLimits() {
    try {
      const data = await api("/budget/limits");
      setLimits(Array.isArray(data.limits) ? data.limits : []);
      return Array.isArray(data.limits) ? data.limits : [];
    } catch (err) {
      // 404/empty means the user simply has no limits or the
      // optional endpoint is not available. Do not block the UI.
      console.warn("Limits endpoint unavailable:", err);
      setLimits([]);
      return [];
    }
  }

  async function loadTodayExpenses() {
    try {
      const data = await api("/budget/expenses/today");
      const expenses = Array.isArray(data.expenses)
        ? data.expenses
        : [];

      setTodayExpenses(expenses);
      return expenses;
    } catch (err) {
      console.warn("Today's expenses endpoint unavailable:", err);
      setTodayExpenses([]);
      return [];
    }
  }

  async function loadSummary() {
    try {
      const data = await api("/budget/summary");

      const summary = {
        total: Number(data.total || 0),
        categories: Array.isArray(data.categories)
          ? data.categories
          : [],
      };

      setMonthlySummary(summary);
      return summary;
    } catch (err) {
      console.warn("Budget summary endpoint unavailable:", err);
      setMonthlySummary({
        total: 0,
        categories: [],
      });

      return {
        total: 0,
        categories: [],
      };
    }
  }

  // ==========================================================
  // LOAD EVERYTHING
  // ==========================================================

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      await Promise.all([
        loadCategories(),
        loadLimits(),
        loadTodayExpenses(),
        loadSummary(),
      ]);
    } catch (err) {
      console.error("Goals loading error:", err);
      setError(err.message || "Unable to load spending data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // ==========================================================
  // SAVE SPENDING LIMIT
  // ==========================================================

  async function saveLimit(e) {
    e.preventDefault();

    setError("");
    setSuccess("");
    setBudgetAlert(null);

    const category = String(limitCategory || "").trim();
    const amount = Number(limitAmount);

    if (!category) {
      setError("Please select a category.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Please enter a valid monthly limit.");
      return;
    }

    setSaving(true);

    try {
      await api("/budget/limits", {
        method: "POST",
        body: JSON.stringify({
          category,
          monthly_limit: amount,
        }),
      });

      setSuccess(
        `${category} monthly limit of ${money(amount)} saved successfully.`
      );

      setLimitAmount("");
      setShowLimitForm(false);

      await loadLimits();
      await loadSummary();
    } catch (err) {
      console.error("Save limit error:", err);

      setError(
        err.message ||
          "Unable to save spending limit. Check that /budget/limits exists in Flask."
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================================
  // FIND MATCHING LIMIT
  // ==========================================================

  function findMatchingLimit(category, currentLimits = limits) {
    const target = normalizeCategory(category);

    return currentLimits.find(
      (limit) =>
        normalizeCategory(limit.category) === target
    );
  }

  // ==========================================================
  // BUILD LOCAL BUDGET ALERT
  // ==========================================================
  //
  // This is important:
  // Even if the backend does not return a "limit" object after
  // POST /budget/expense, we calculate the alert locally from
  // the user's actual loaded limit.

  function buildBudgetAlert(
    category,
    addedAmount,
    currentLimits = limits,
    currentSummary = monthlySummary
  ) {
    const matchingLimit = findMatchingLimit(
      category,
      currentLimits
    );

    // No limit is perfectly valid.
    if (!matchingLimit) {
      return {
        type: "none",
        category,
        addedAmount,
        message: `₹${Number(
          addedAmount
        ).toLocaleString("en-IN")} expense added to ${category}. No spending limit is set for ${category}.`,
      };
    }

    const limitAmount = getLimitAmount(matchingLimit);

    // Try backend's current spent first.
    let spentBefore = getSpentFromLimit(matchingLimit);

    // If backend didn't provide spent, calculate from monthly
    // category summary.
    if (!spentBefore) {
      const summaryItem =
        (currentSummary.categories || []).find(
          (item) =>
            normalizeCategory(item.category) ===
            normalizeCategory(category)
        );

      if (summaryItem) {
        spentBefore = Number(
          summaryItem.spent ??
            summaryItem.amount ??
            0
        );
      }
    }

    const spentAfter = spentBefore + Number(addedAmount || 0);
    const state = calculateLimitState(
      spentAfter,
      limitAmount
    );

    if (state.status === "exceeded") {
      return {
        type: "exceeded",
        category,
        spent: spentAfter,
        limit: limitAmount,
        exceededBy: state.exceededBy,
        percentage: state.percentage,
        message:
          `🚨 ${category} budget exceeded! ` +
          `You have spent ${money(spentAfter)} ` +
          `against your ${money(limitAmount)} limit. ` +
          `You are over the limit by ${money(state.exceededBy)}.`,
      };
    }

    if (state.status === "warning") {
      return {
        type: "warning",
        category,
        spent: spentAfter,
        limit: limitAmount,
        remaining: state.remaining,
        percentage: state.percentage,
        message:
          `⚠️ ${category} budget warning! ` +
          `You have used ${state.percentage.toFixed(0)}% of your ` +
          `${money(limitAmount)} limit. ` +
          `${money(state.remaining)} remains.`,
      };
    }

    return {
      type: "within",
      category,
      spent: spentAfter,
      limit: limitAmount,
      remaining: state.remaining,
      percentage: state.percentage,
      message:
        `✅ ${category} expense added. ` +
        `${money(state.remaining)} remains from your ` +
        `${money(limitAmount)} limit.`,
    };
  }

  // ==========================================================
  // ADD EXPENSE
  // ==========================================================

  async function addExpense(e) {
    e.preventDefault();

    setError("");
    setSuccess("");
    setBudgetAlert(null);

    const amount = Number(expenseAmount);
    const category = String(expenseCategory || "Other").trim();
    const description =
      String(expenseDescription || "").trim() ||
      "Manual expense";
    const date = expenseDate || today();

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Please enter a valid expense amount.");
      return;
    }

    if (!category) {
      setError("Please select a category.");
      return;
    }

    setSaving(true);

    try {
      // Save through the existing budget endpoint.
      const result = await api("/budget/expense", {
        method: "POST",
        body: JSON.stringify({
          amount,
          category,
          description,
          transaction_date: date,
        }),
      });

      // Prefer the backend's limit information when available.
      // Otherwise calculate it ourselves.
      let alert = null;

      if (result.limit) {
        const backendLimit = result.limit;
        const status = backendLimit.status;

        if (status === "exceeded") {
          const limitAmount =
            Number(
              backendLimit.monthly_limit ||
                backendLimit.limit ||
                0
            );

          const spent =
            Number(
              backendLimit.spent ||
                backendLimit.current_spending ||
                0
            );

          const exceededBy =
            Math.max(
              spent - limitAmount,
              0
            );

          alert = {
            type: "exceeded",
            category,
            spent,
            limit: limitAmount,
            exceededBy,
            percentage:
              Number(
                backendLimit.percentage || 0
              ),
            message:
              result.message ||
              `🚨 ${category} budget exceeded by ${money(
                exceededBy
              )}.`,
          };
        } else if (status === "warning") {
          alert = {
            type: "warning",
            category,
            percentage:
              Number(
                backendLimit.percentage || 0
              ),
            remaining:
              Number(
                backendLimit.remaining || 0
              ),
            message:
              result.message ||
              `⚠️ ${category} spending is at ${Number(
                backendLimit.percentage || 0
              ).toFixed(0)}% of the limit.`,
          };
        }
      }

      if (!alert) {
        alert = buildBudgetAlert(
          category,
          amount
        );
      }

      setBudgetAlert(alert);

      // Do NOT show a generic green success message over an alert.
      if (alert.type === "exceeded") {
        setSuccess("");
      } else if (alert.type === "warning") {
        setSuccess("");
      } else {
        setSuccess(alert.message);
      }

      setExpenseAmount("");
      setExpenseDescription("");
      setExpenseDate(today());
      setShowExpenseForm(false);

      // Refresh all displayed values.
      await Promise.all([
        loadLimits(),
        loadTodayExpenses(),
        loadSummary(),
      ]);
    } catch (err) {
      console.error("Add expense error:", err);

      setError(
        err.message ||
          "Unable to add expense. Check that /budget/expense exists in Flask."
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================================
  // DELETE LIMIT
  // ==========================================================

  async function deleteLimit(id) {
    if (!id) {
      setError("Invalid spending limit ID.");
      return;
    }

    const confirmed = window.confirm(
      "Delete this spending limit?"
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setBudgetAlert(null);

    try {
      await api(`/budget/limits/${id}`, {
        method: "DELETE",
      });

      setSuccess("Spending limit deleted successfully.");
      await loadLimits();
    } catch (err) {
      console.error("Delete limit error:", err);

      setError(
        err.message ||
          "Unable to delete spending limit."
      );
    }
  }

  // ==========================================================
  // TOTAL TODAY
  // ==========================================================

  const todayTotal = useMemo(() => {
    return todayExpenses.reduce(
      (sum, item) =>
        sum + Number(item.amount || 0),
      0
    );
  }, [todayExpenses]);

  // ==========================================================
  // TRANSACTION FALLBACK
  // ==========================================================

  const fallbackTodayTotal = useMemo(() => {
    return transactions
      .filter((item) => {
        if (!item.transaction_date) return false;

        return String(item.transaction_date).startsWith(
          today()
        );
      })
      .filter((item) => {
        return [
          "expense",
          "debit",
          "outflow",
        ].includes(
          String(item.type || "").toLowerCase()
        );
      })
      .reduce(
        (sum, item) =>
          sum + Number(item.amount || 0),
        0
      );
  }, [transactions]);

  const displayedTodayTotal =
    todayTotal || fallbackTodayTotal;

  // ==========================================================
  // LIMIT CARD DATA
  // ==========================================================

  const displayLimits = useMemo(() => {
    return limits.map((limit) => {
      const spent = getSpentFromLimit(limit);
      const amount = getLimitAmount(limit);

      const localState =
        calculateLimitState(
          spent,
          amount
        );

      // Keep backend status if it exists and is meaningful.
      const backendStatus =
        ["warning", "exceeded", "within"].includes(
          limit.status
        )
          ? limit.status
          : null;

      return {
        ...limit,
        spent,
        monthly_limit: amount,
        percentage:
          Number.isFinite(
            Number(limit.percentage)
          )
            ? Number(limit.percentage)
            : localState.percentage,
        remaining:
          Number.isFinite(
            Number(limit.remaining)
          )
            ? Number(limit.remaining)
            : localState.remaining,
        status:
          backendStatus ||
          (localState.status === "exceeded"
            ? "exceeded"
            : localState.status === "warning"
              ? "warning"
              : "within"),
      };
    });
  }, [limits]);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "40px",
        color: "#fff",
        boxSizing: "border-box",
      }}
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "35px",
          gap: "20px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "38px",
              margin: 0,
            }}
          >
            Goals
          </h1>

          <p
            style={{
              color: "#9aa9bd",
              fontSize: "17px",
            }}
          >
            Track your savings, spending limits
            and daily expenses.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() =>
              setShowExpenseForm(
                !showExpenseForm
              )
            }
            style={buttonStyle}
          >
            + Add Today's Expense
          </button>

          <button
            onClick={() =>
              setShowLimitForm(
                !showLimitForm
              )
            }
            style={buttonStyle}
          >
            + Set Spending Limit
          </button>
        </div>
      </div>

      {/* ======================================================
          MESSAGES
      ====================================================== */}

      {error && (
        <div style={errorStyle}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div style={successStyle}>
          {success}
        </div>
      )}

      {/* ======================================================
          BUDGET ALERT
      ====================================================== */}

      {budgetAlert &&
        budgetAlert.type === "exceeded" && (
          <div style={dangerAlertStyle}>
            <div
              style={{
                fontSize: "25px",
                fontWeight: 900,
                marginBottom: "8px",
              }}
            >
              🚨 Spending Limit Exceeded
            </div>

            <div
              style={{
                fontSize: "16px",
                lineHeight: 1.7,
              }}
            >
              <strong>
                {budgetAlert.category}
              </strong>{" "}
              spending has reached{" "}
              <strong>
                {money(budgetAlert.spent)}
              </strong>{" "}
              against your{" "}
              <strong>
                {money(budgetAlert.limit)}
              </strong>{" "}
              monthly limit.
              <br />
              You are over the limit by{" "}
              <strong>
                {money(
                  budgetAlert.exceededBy
                )}
              </strong>
              .
            </div>
          </div>
        )}

      {budgetAlert &&
        budgetAlert.type === "warning" && (
          <div style={warningAlertStyle}>
            <div
              style={{
                fontSize: "23px",
                fontWeight: 900,
                marginBottom: "8px",
              }}
            >
              ⚠️ Spending Warning
            </div>

            <div
              style={{
                fontSize: "16px",
                lineHeight: 1.7,
              }}
            >
              <strong>
                {budgetAlert.category}
              </strong>{" "}
              has used{" "}
              <strong>
                {Number(
                  budgetAlert.percentage || 0
                ).toFixed(0)}
                %
              </strong>{" "}
              of the monthly limit.
              <br />
              Remaining:{" "}
              <strong>
                {money(
                  budgetAlert.remaining
                )}
              </strong>
            </div>
          </div>
        )}

      {budgetAlert &&
        budgetAlert.type === "none" && (
          <div style={infoAlertStyle}>
            💡 {budgetAlert.message}
            <button
              onClick={() =>
                setShowLimitForm(true)
              }
              style={smallActionButton}
            >
              Set {budgetAlert.category} Limit
            </button>
          </div>
        )}

      {/* ======================================================
          TODAY / MONTH / LIMITS
      ====================================================== */}

      <div style={gridStyle}>
        <div style={cardStyle}>
          <div style={labelStyle}>
            TODAY'S EXPENSE
          </div>

          <div
            style={{
              fontSize: "32px",
              fontWeight: 800,
              marginTop: "10px",
            }}
          >
            {money(displayedTodayTotal)}
          </div>

          <p style={mutedStyle}>
            Total expenses recorded today
          </p>
        </div>

        <div style={cardStyle}>
          <div style={labelStyle}>
            THIS MONTH
          </div>

          <div
            style={{
              fontSize: "32px",
              fontWeight: 800,
              marginTop: "10px",
            }}
          >
            {money(monthlySummary.total)}
          </div>

          <p style={mutedStyle}>
            Total monthly spending
          </p>
        </div>

        <div style={cardStyle}>
          <div style={labelStyle}>
            ACTIVE LIMITS
          </div>

          <div
            style={{
              fontSize: "32px",
              fontWeight: 800,
              marginTop: "10px",
            }}
          >
            {displayLimits.length}
          </div>

          <p style={mutedStyle}>
            Categories being monitored
          </p>
        </div>
      </div>

      {/* ======================================================
          MANUAL EXPENSE FORM
      ====================================================== */}

      {showExpenseForm && (
        <div style={largeCard}>
          <h2>
            📝 Enter Today's Expense
          </h2>

          <p style={mutedStyle}>
            Enter your expense manually. A spending
            limit is optional — you can add expenses
            even when you have no limits.
          </p>

          <form
            onSubmit={addExpense}
            style={formGrid}
          >
            <div>
              <label style={labelStyle}>
                Expense Amount *
              </label>

              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Example: 500"
                value={expenseAmount}
                onChange={(e) =>
                  setExpenseAmount(
                    e.target.value
                  )
                }
                style={inputStyle}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>
                Category *
              </label>

              <select
                value={expenseCategory}
                onChange={(e) =>
                  setExpenseCategory(
                    e.target.value
                  )
                }
                style={inputStyle}
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
            </div>

            <div>
              <label style={labelStyle}>
                Date *
              </label>

              <input
                type="date"
                value={expenseDate}
                onChange={(e) =>
                  setExpenseDate(
                    e.target.value
                  )
                }
                style={inputStyle}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>
                Description
              </label>

              <input
                type="text"
                placeholder="Example: Lunch at college"
                value={expenseDescription}
                onChange={(e) =>
                  setExpenseDescription(
                    e.target.value
                  )
                }
                style={inputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                ...buttonStyle,
                gridColumn: "1 / -1",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving
                ? "Saving..."
                : "💾 Save Today's Expense"}
            </button>
          </form>
        </div>
      )}

      {/* ======================================================
          LIMIT FORM
      ====================================================== */}

      {showLimitForm && (
        <div style={largeCard}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "20px",
              alignItems: "center",
            }}
          >
            <div>
              <h2>
                💸 Set Monthly Spending Limit
              </h2>

              <p style={mutedStyle}>
                Set a limit only if you want
                AmiVest to warn you about spending.
              </p>
            </div>

            <button
              onClick={() =>
                setShowLimitForm(false)
              }
              style={secondaryButton}
              type="button"
            >
              Cancel
            </button>
          </div>

          <form
            onSubmit={saveLimit}
            style={formGrid}
          >
            <div>
              <label style={labelStyle}>
                Category *
              </label>

              <select
                value={limitCategory}
                onChange={(e) =>
                  setLimitCategory(
                    e.target.value
                  )
                }
                style={inputStyle}
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
            </div>

            <div>
              <label style={labelStyle}>
                Monthly Limit *
              </label>

              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="Example: 5000"
                value={limitAmount}
                onChange={(e) =>
                  setLimitAmount(
                    e.target.value
                  )
                }
                style={inputStyle}
                required
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                ...buttonStyle,
                gridColumn: "1 / -1",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving
                ? "Saving..."
                : "💾 Save Limit"}
            </button>
          </form>
        </div>
      )}

      {/* ======================================================
          SPENDING LIMITS
      ====================================================== */}

      <div style={largeCard}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            gap: "20px",
          }}
        >
          <div>
            <h2>
              💸 Spending Limits
            </h2>

            <p style={mutedStyle}>
              AmiVest watches your spending
              against the limits you set.
            </p>
          </div>

          {displayLimits.length > 0 && (
            <span
              style={{
                padding: "8px 13px",
                borderRadius: "20px",
                background: "#102b3a",
                color: "#5ce0d1",
                fontWeight: 800,
                fontSize: "13px",
              }}
            >
              {displayLimits.length} active
            </span>
          )}
        </div>

        {loading ? (
          <div style={emptyStyle}>
            Loading your financial data...
          </div>
        ) : displayLimits.length === 0 ? (
          <div style={emptyStyle}>
            <div
              style={{
                fontSize: "55px",
                marginBottom: "10px",
              }}
            >
              🎯
            </div>

            <h3>
              No spending limits yet
            </h3>

            <p style={mutedStyle}>
              You don't have any spending
              limits right now.
              <br />
              That's okay — your expenses
              can still be recorded normally.
            </p>

            <button
              onClick={() =>
                setShowLimitForm(true)
              }
              style={buttonStyle}
              type="button"
            >
              + Create Your First Limit
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "18px",
            }}
          >
            {displayLimits.map((limit) => {
              const rawPercentage =
                Number(
                  limit.percentage || 0
                );

              const percentage = Math.min(
                Math.max(rawPercentage, 0),
                100
              );

              const status =
                limit.status;

              let statusText =
                "✅ Within limit";

              if (status === "warning") {
                statusText =
                  "⚠️ 80%+ used";
              }

              if (status === "exceeded") {
                statusText =
                  "🚨 Limit exceeded";
              }

              const spent =
                Number(limit.spent || 0);

              const limitAmount =
                Number(
                  limit.monthly_limit || 0
                );

              const exceededBy =
                Math.max(
                  spent - limitAmount,
                  0
                );

              return (
                <div
                  key={limit.id || limit.category}
                  style={{
                    background: "#0b1726",
                    border:
                      status === "exceeded"
                        ? "1px solid #ff4d4d"
                        : status === "warning"
                          ? "1px solid #ffb020"
                          : "1px solid #26384e",
                    borderRadius: "18px",
                    padding: "22px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems: "center",
                    }}
                  >
                    <strong>
                      {limit.category}
                    </strong>

                    {limit.id && (
                      <button
                        onClick={() =>
                          deleteLimit(
                            limit.id
                          )
                        }
                        style={deleteButton}
                        type="button"
                        title="Delete limit"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: "18px",
                      fontSize: "25px",
                      fontWeight: 800,
                    }}
                  >
                    {money(spent)}

                    <span
                      style={{
                        color: "#7f8da0",
                        fontSize: "15px",
                        fontWeight: 500,
                      }}
                    >
                      {" "}
                      /{" "}
                      {money(
                        limitAmount
                      )}
                    </span>
                  </div>

                  <div
                    style={{
                      height: "10px",
                      background: "#172437",
                      borderRadius: "20px",
                      overflow: "hidden",
                      marginTop: "18px",
                    }}
                  >
                    <div
                      style={{
                        width:
                          `${percentage}%`,
                        height: "100%",
                        background:
                          status ===
                          "exceeded"
                            ? "#ff4d4d"
                            : status ===
                              "warning"
                              ? "#ffb020"
                              : "#12c9b5",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      marginTop: "12px",
                      color: "#aab6c5",
                      fontSize: "14px",
                    }}
                  >
                    <span>
                      {rawPercentage.toFixed(
                        0
                      )}
                      % used
                    </span>

                    <span>
                      {money(
                        limit.remaining
                      )}{" "}
                      remaining
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: "14px",
                      fontWeight: 700,
                      color:
                        status === "exceeded"
                          ? "#ff6464"
                          : status ===
                              "warning"
                            ? "#ffbd48"
                            : "#1dd6bc",
                    }}
                  >
                    {statusText}
                  </div>

                  {status === "exceeded" && (
                    <div
                      style={{
                        marginTop: "12px",
                        padding: "12px",
                        borderRadius: "10px",
                        background: "#351c23",
                        color: "#ff858f",
                        fontSize: "14px",
                        fontWeight: 700,
                      }}
                    >
                      🚨 Over budget by{" "}
                      {money(exceededBy)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================
          TODAY'S EXPENSE HISTORY
      ====================================================== */}

      <div style={largeCard}>
        <h2>
          📅 Today's Expense History
        </h2>

        <p style={mutedStyle}>
          Manually entered expenses for today.
        </p>

        {todayExpenses.length === 0 ? (
          <div style={emptyStyle}>
            <div
              style={{
                fontSize: "40px",
              }}
            >
              📝
            </div>

            <h3>
              No expenses recorded today
            </h3>

            <p style={mutedStyle}>
              Start by clicking
              "Add Today's Expense".
            </p>
          </div>
        ) : (
          <div>
            {todayExpenses.map(
              (expense) => (
                <div
                  key={expense.id}
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    padding: "16px 5px",
                    borderBottom:
                      "1px solid #243247",
                    gap: "20px",
                  }}
                >
                  <div>
                    <strong>
                      {expense.category}
                    </strong>

                    <div
                      style={{
                        color: "#8998aa",
                        fontSize: "14px",
                        marginTop: "4px",
                      }}
                    >
                      {expense.description ||
                        "Manual expense"}
                    </div>
                  </div>

                  <strong
                    style={{
                      color: "#ff6464",
                      whiteSpace:
                        "nowrap",
                    }}
                  >
                    -{" "}
                    {money(
                      expense.amount
                    )}
                  </strong>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* ======================================================
          MONTHLY CATEGORY ANALYSIS
      ====================================================== */}

      <div style={largeCard}>
        <h2>
          📊 Monthly Category Analysis
        </h2>

        <p style={mutedStyle}>
          See where your money is going this month.
        </p>

        {monthlySummary.categories.length ===
        0 ? (
          <div style={emptyStyle}>
            No monthly expense data yet.
          </div>
        ) : (
          monthlySummary.categories.map(
            (item) => (
              <div
                key={item.category}
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  padding: "14px 0",
                  borderBottom:
                    "1px solid #243247",
                }}
              >
                <span>
                  {item.category}
                </span>

                <strong>
                  {money(item.spent)}
                </strong>
              </div>
            )
          )
        )}
      </div>
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================

const buttonStyle = {
  border: "none",
  borderRadius: "12px",
  padding: "13px 20px",
  background:
    "linear-gradient(135deg,#10b5a8,#10b8d0)",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: "15px",
};

const secondaryButton = {
  border: "1px solid #2b4057",
  borderRadius: "10px",
  padding: "10px 16px",
  background: "#0b1726",
  color: "#cbd5e1",
  fontWeight: 700,
  cursor: "pointer",
};

const smallActionButton = {
  marginLeft: "15px",
  border: "none",
  borderRadius: "9px",
  padding: "8px 12px",
  background: "#0e9f92",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const cardStyle = {
  background: "#151a21",
  border: "1px solid #252d38",
  borderRadius: "18px",
  padding: "25px",
};

const largeCard = {
  background: "#171c23",
  border: "1px solid #252d38",
  borderRadius: "20px",
  padding: "28px",
  marginBottom: "25px",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "18px",
  marginBottom: "25px",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "18px",
  marginTop: "20px",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  marginTop: "8px",
  padding: "15px",
  borderRadius: "12px",
  border: "1px solid #26384e",
  background: "#091625",
  color: "#fff",
  fontSize: "15px",
  outline: "none",
};

const labelStyle = {
  color: "#9ba8b9",
  fontSize: "13px",
  fontWeight: 700,
  letterSpacing: "0.5px",
};

const mutedStyle = {
  color: "#8998aa",
  lineHeight: 1.6,
};

const errorStyle = {
  background: "#321d24",
  border: "1px solid #713743",
  color: "#ff9da8",
  padding: "15px",
  borderRadius: "12px",
  marginBottom: "20px",
};

const successStyle = {
  background: "#102e2b",
  border: "1px solid #1b7068",
  color: "#5ce0d1",
  padding: "15px",
  borderRadius: "12px",
  marginBottom: "20px",
};

const dangerAlertStyle = {
  background:
    "linear-gradient(135deg,#3b1820,#25151b)",
  border: "1px solid #ff4d5d",
  color: "#ffb5bd",
  padding: "20px",
  borderRadius: "15px",
  marginBottom: "20px",
  boxShadow:
    "0 0 25px rgba(255,77,77,0.12)",
};

const warningAlertStyle = {
  background:
    "linear-gradient(135deg,#3b2b12,#241d12)",
  border: "1px solid #ffb020",
  color: "#ffd98a",
  padding: "20px",
  borderRadius: "15px",
  marginBottom: "20px",
};

const infoAlertStyle = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "10px",
  background: "#10273a",
  border: "1px solid #24577a",
  color: "#9ed8ff",
  padding: "16px",
  borderRadius: "12px",
  marginBottom: "20px",
};

const emptyStyle = {
  textAlign: "center",
  padding: "45px 20px",
  color: "#8b99aa",
};

const deleteButton = {
  border: "none",
  background: "#34212a",
  color: "#ff6b7a",
  width: "32px",
  height: "32px",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "20px",
};
