import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

function Dashboard({ transactions, setTransactions }) {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        // ==========================================
        // 1. CHECK FLASK SESSION
        // ==========================================

        const sessionResponse = await fetch(
          `${API_URL}/session`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        const sessionData = await sessionResponse.json();

        console.log("SESSION:", sessionData);

        if (!sessionResponse.ok || !sessionData.authenticated) {
          if (mounted) {
            setCurrentUser(null);
            setTransactions([]);
          }

          return;
        }

        const user = sessionData.user;

        if (mounted) {
          setCurrentUser(user);

          // Only for UI information.
          localStorage.setItem(
            "user",
            JSON.stringify(user)
          );
        }

        // ==========================================
        // 2. GET TRANSACTIONS
        //
        // IMPORTANT:
        // NO user_id here.
        // ==========================================

        const transactionResponse = await fetch(
          `${API_URL}/transactions`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        const transactionData =
          await transactionResponse.json();

        console.log(
          "TRANSACTIONS:",
          transactionData
        );

        if (!transactionResponse.ok) {
          throw new Error(
            transactionData.error ||
              transactionData.message ||
              `Server returned ${transactionResponse.status}`
          );
        }

        if (mounted) {
          setTransactions(
            Array.isArray(transactionData.transactions)
              ? transactionData.transactions
              : []
          );
        }
      } catch (err) {
        console.error("DASHBOARD ERROR:", err);

        if (mounted) {
          setError(err.message);
          setTransactions([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [setTransactions]);

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div
        style={{
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#9ca3af",
          fontSize: "18px",
        }}
      >
        Loading your financial dashboard...
      </div>
    );
  }

  // ==========================================
  // NOT LOGGED IN
  // ==========================================

  if (!currentUser) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "600px",
            background: "#161a1f",
            border: "1px solid #242b35",
            borderRadius: "16px",
            padding: "50px",
            textAlign: "center",
            color: "#fff",
          }}
        >
          <div style={{ fontSize: "50px" }}>🔒</div>

          <h2>Authentication Required</h2>

          <p style={{ color: "#9ca3af" }}>
            Please login to view your private financial dashboard.
          </p>

          <button
            onClick={() => navigate("/login")}
            style={{
              background: "#ff4500",
              color: "#fff",
              border: "none",
              padding: "12px 25px",
              borderRadius: "8px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // CALCULATE INCOME
  // ==========================================

  const totalIncome = transactions
    .filter((transaction) => {
      const amount = Number(transaction.amount || 0);

      const type = String(
        transaction.type || ""
      ).toLowerCase();

      return (
        amount > 0 ||
        type === "credit" ||
        type === "cr" ||
        type === "income"
      );
    })
    .reduce((sum, transaction) => {
      return (
        sum +
        Math.abs(
          Number(transaction.amount || 0)
        )
      );
    }, 0);

  // ==========================================
  // CALCULATE EXPENSES
  // ==========================================

  const totalExpenses = transactions
    .filter((transaction) => {
      const amount = Number(transaction.amount || 0);

      const type = String(
        transaction.type || ""
      ).toLowerCase();

      return (
        amount < 0 ||
        type === "debit" ||
        type === "dr" ||
        type === "expense"
      );
    })
    .reduce((sum, transaction) => {
      return (
        sum +
        Math.abs(
          Number(transaction.amount || 0)
        )
      );
    }, 0);

  const netSavings =
    totalIncome - totalExpenses;

  // ==========================================
  // FORMAT MONEY
  // ==========================================

  const money = (value) =>
    Number(value || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    });

  // ==========================================
  // DASHBOARD
  // ==========================================

  return (
    <div
      style={{
        color: "#fff",
        width: "100%",
      }}
    >
      {/* ======================================
          HEADER
      ====================================== */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
          marginBottom: "30px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "32px",
            }}
          >
            Dashboard for {currentUser.name}
          </h1>

          <p
            style={{
              color: "#9ca3af",
              marginTop: "8px",
            }}
          >
            Account ID: #{currentUser.id}
          </p>
        </div>

        <button
          onClick={() => navigate("/import")}
          style={{
            background: "#ff4500",
            color: "#fff",
            border: "none",
            padding: "13px 20px",
            borderRadius: "9px",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          📥 Import Statement
        </button>
      </div>

      {/* ======================================
          ERROR
      ====================================== */}

      {error && (
        <div
          style={{
            background: "#2a1515",
            border: "1px solid #ef4444",
            color: "#fca5a5",
            padding: "15px",
            borderRadius: "10px",
            marginBottom: "25px",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* ======================================
          NO TRANSACTIONS
      ====================================== */}

      {transactions.length === 0 ? (
        <div
          style={{
            background: "#161a1f",
            border: "1px solid #242b35",
            borderRadius: "16px",
            padding: "70px 30px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "55px",
              marginBottom: "15px",
            }}
          >
            📊
          </div>

          <h2>No Transactions Found</h2>

          <p
            style={{
              color: "#9ca3af",
            }}
          >
            Your account currently has no imported
            transactions.
          </p>

          <button
            onClick={() => navigate("/import")}
            style={{
              marginTop: "15px",
              background: "#ff4500",
              color: "#fff",
              border: "none",
              padding: "12px 24px",
              borderRadius: "8px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Import Statement
          </button>
        </div>
      ) : (
        <>
          {/* ====================================
              SUMMARY CARDS
          ==================================== */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "20px",
              marginBottom: "30px",
            }}
          >
            {/* INCOME */}

            <div
              style={{
                background: "#161a1f",
                border: "1px solid #242b35",
                borderRadius: "16px",
                padding: "25px",
              }}
            >
              <div
                style={{
                  color: "#9ca3af",
                  fontSize: "13px",
                }}
              >
                TOTAL DEPOSITS
              </div>

              <div
                style={{
                  color: "#10b981",
                  fontSize: "30px",
                  fontWeight: "700",
                  marginTop: "8px",
                }}
              >
                ₹{money(totalIncome)}
              </div>
            </div>

            {/* EXPENSE */}

            <div
              style={{
                background: "#161a1f",
                border: "1px solid #242b35",
                borderRadius: "16px",
                padding: "25px",
              }}
            >
              <div
                style={{
                  color: "#9ca3af",
                  fontSize: "13px",
                }}
              >
                TOTAL OUTFLOWS
              </div>

              <div
                style={{
                  color: "#ef4444",
                  fontSize: "30px",
                  fontWeight: "700",
                  marginTop: "8px",
                }}
              >
                ₹{money(totalExpenses)}
              </div>
            </div>

            {/* SAVINGS */}

            <div
              style={{
                background: "#161a1f",
                border: "1px solid #242b35",
                borderRadius: "16px",
                padding: "25px",
              }}
            >
              <div
                style={{
                  color: "#9ca3af",
                  fontSize: "13px",
                }}
              >
                NET SAVINGS
              </div>

              <div
                style={{
                  color:
                    netSavings >= 0
                      ? "#3b82f6"
                      : "#f59e0b",
                  fontSize: "30px",
                  fontWeight: "700",
                  marginTop: "8px",
                }}
              >
                ₹{money(netSavings)}
              </div>
            </div>
          </div>

          {/* ====================================
              TRANSACTION TABLE
          ==================================== */}

          <div
            style={{
              background: "#161a1f",
              border: "1px solid #242b35",
              borderRadius: "16px",
              padding: "25px",
              overflowX: "auto",
            }}
          >
            <h2
              style={{
                marginTop: 0,
              }}
            >
              📜 Your Transaction History
            </h2>

            <table
              style={{
                width: "100%",
                minWidth: "700px",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom:
                      "1px solid #242b35",
                    color: "#9ca3af",
                  }}
                >
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                    }}
                  >
                    Date
                  </th>

                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                    }}
                  >
                    Description
                  </th>

                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                    }}
                  >
                    Category
                  </th>

                  <th
                    style={{
                      padding: "12px",
                      textAlign: "right",
                    }}
                  >
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody>
                {transactions.map(
                  (transaction, index) => {
                    const amount = Number(
                      transaction.amount || 0
                    );

                    const type = String(
                      transaction.type || ""
                    ).toLowerCase();

                    const isCredit =
                      amount > 0 ||
                      type === "credit" ||
                      type === "cr" ||
                      type === "income";

                    return (
                      <tr
                        key={
                          transaction.id ||
                          index
                        }
                        style={{
                          borderBottom:
                            "1px solid #242b35",
                        }}
                      >
                        <td
                          style={{
                            padding: "14px 12px",
                            color: "#9ca3af",
                          }}
                        >
                          {transaction.transaction_date ||
                            transaction.date ||
                            "N/A"}
                        </td>

                        <td
                          style={{
                            padding: "14px 12px",
                          }}
                        >
                          {transaction.description ||
                            "Bank Transaction"}
                        </td>

                        <td
                          style={{
                            padding: "14px 12px",
                          }}
                        >
                          <span
                            style={{
                              background:
                                "rgba(255,69,0,0.12)",
                              color: "#ff7043",
                              padding:
                                "5px 9px",
                              borderRadius:
                                "6px",
                              fontSize: "12px",
                            }}
                          >
                            {transaction.category ||
                              "General"}
                          </span>
                        </td>

                        <td
                          style={{
                            padding: "14px 12px",
                            textAlign: "right",
                            fontWeight: "700",
                            color: isCredit
                              ? "#10b981"
                              : "#ef4444",
                          }}
                        >
                          {isCredit ? "+" : "-"}₹
                          {money(
                            Math.abs(amount)
                          )}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;