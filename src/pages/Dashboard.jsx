import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// CHANGED: reads the backend URL from VITE_API_URL (set in your .env
// files) instead of hardcoding localhost. In dev this falls back to
// 127.0.0.1:5000 automatically; in production it uses whatever you
// set VITE_API_URL to on Vercel (your Render backend URL).
const ENV_API_URL = import.meta.env.VITE_API_URL;
const BASE_IP = ENV_API_URL || "http://127.0.0.1:5000";
const BASE_LOCAL = ENV_API_URL || "http://localhost:5000";

async function apiCall(path, options = {}) {
  const urls = ENV_API_URL
    ? [`${ENV_API_URL}${path}`]
    : [path, `${BASE_IP}${path}`, `${BASE_LOCAL}${path}`];
  const attempts = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, options);
      let body = null, parseFailed = false;
      try { body = await res.json(); } catch (_) { parseFailed = true; }
      if (res.ok && !parseFailed) return body;
      if (res.ok && parseFailed) { attempts.push(`${url} → HTTP ${res.status} but not JSON`); continue; }
      attempts.push(`${url} → HTTP ${res.status}: ${(body && (body.error || body.message)) || "no details"}`);
    } catch (err) {
      attempts.push(`${url} → ${err.name}: ${err.message}`);
    }
  }
  throw new Error(attempts.join("  |  "));
}

function Dashboard({ transactions, setTransactions }) {
  const [loading, setLoading] = useState(transactions.length === 0);
  const [loadError, setLoadError] = useState("");
  const navigate = useNavigate();

  // FIXED: previously depended on [transactions, setTransactions], which
  // re-triggered this effect every time setTransactions ran inside it —
  // causing rapid re-renders/flicker. Now it only runs once on mount.
  useEffect(() => {
    if (transactions.length > 0) {
      setLoading(false);
      return;
    }

    const loadHistoricData = async () => {
      setLoadError("");
      try {
        const data = await apiCall("/transactions", { method: "GET" });
        if (Array.isArray(data)) {
          setTransactions(data);
        } else if (data.transactions && Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
        }
      } catch (err) {
        console.error("Dashboard fetching connection exception:", err.message);
        setLoadError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadHistoricData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalIncome = transactions
    .filter(t => t.amount > 0 || String(t.type).toLowerCase() === "credit")
    .reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);

  const totalExpenses = transactions
    .filter(t => t.amount < 0 || String(t.type).toLowerCase() === "debit")
    .reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);

  const netSavings = totalIncome - totalExpenses;

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "70vh", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>
        <h3>Loading your Amivest AI Dashboard...</h3>
      </div>
    );
  }

  return (
    <div style={{ color: "#ffffff" }}>
      <div style={{ marginBottom: "35px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "700" }}>Dashboard</h1>
          <p style={{ margin: "4px 0 0 0", color: "#9ca3af", fontSize: "14px" }}>Telemetry results from your bank statements file mapping.</p>
        </div>
        <button onClick={() => navigate("/import")} style={{ background: "#ff4500", color: "#fff", border: "none", padding: "12px 20px", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}>
          📥 Import Statement
        </button>
      </div>

      {loadError && (
        <div style={{ background: "#161a1f", border: "1px solid #EF4444", borderRadius: "12px", padding: "16px 18px", marginBottom: "24px" }}>
          <div style={{ color: "#FCA5A5", fontWeight: "700", fontSize: "13px", marginBottom: "6px" }}>⚠️ Couldn't load your saved transactions from the database</div>
          <div style={{ color: "#FCA5A5", fontSize: "12px", fontFamily: "monospace", opacity: 0.85 }}>{loadError}</div>
        </div>
      )}

      {transactions.length === 0 ? (
        <div style={{ background: "#161a1f", padding: "50px", borderRadius: "16px", textAlign: "center", border: "1px solid #242b35" }}>
          <h3>No Statements Imported Yet</h3>
          <p style={{ color: "#9ca3af" }}>Please go to the importer page to process statement files.</p>
        </div>
      ) : (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "40px" }}>
            <div style={{ background: "#161a1f", padding: "24px", borderRadius: "16px", border: "1px solid #242b35" }}>
              <div style={{ color: "#9ca3af", fontSize: "13px", marginBottom: "6px" }}>TOTAL DEPOSITS</div>
              <div style={{ fontSize: "28px", fontWeight: "700", color: "#10b981" }}>₹{totalIncome.toLocaleString()}</div>
            </div>
            <div style={{ background: "#161a1f", padding: "24px", borderRadius: "16px", border: "1px solid #242b35" }}>
              <div style={{ color: "#9ca3af", fontSize: "13px", marginBottom: "6px" }}>TOTAL OUTFLOWS</div>
              <div style={{ fontSize: "28px", fontWeight: "700", color: "#ef4444" }}>₹{totalExpenses.toLocaleString()}</div>
            </div>
            <div style={{ background: "#161a1f", padding: "24px", borderRadius: "16px", border: "1px solid #242b35" }}>
              <div style={{ color: "#9ca3af", fontSize: "13px", marginBottom: "6px" }}>NET WALLET SAVINGS</div>
              <div style={{ fontSize: "28px", fontWeight: "700", color: netSavings >= 0 ? "#3b82f6" : "#f59e0b" }}>₹{netSavings.toLocaleString()}</div>
            </div>
          </div>

          <div style={{ background: "#161a1f", padding: "24px", borderRadius: "16px", border: "1px solid #242b35" }}>
            <h3 style={{ marginBottom: "20px" }}>📜 Extracted Transaction History</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #242b35", color: "#9ca3af" }}>
                  <th style={{ padding: "10px" }}>Date</th>
                  <th style={{ padding: "10px" }}>Description</th>
                  <th style={{ padding: "10px" }}>Category</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn, idx) => (
                  <tr key={txn.id || idx} style={{ borderBottom: "1px solid #1f262e" }}>
                    <td style={{ padding: "12px 10px", color: "#9ca3af" }}>{txn.transaction_date || txn.date || "N/A"}</td>
                    <td style={{ padding: "12px 10px", fontWeight: "500" }}>{txn.description}</td>
                    <td style={{ padding: "12px 10px" }}>
                      <span style={{ background: "rgba(255,69,0,0.1)", color: "#ff4500", padding: "4px 8px", borderRadius: "6px", fontSize: "12px" }}>
                        {txn.category || "General"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 10px", textAlign: "right", fontWeight: "700", color: txn.amount > 0 || String(txn.type).toLowerCase() === "credit" ? "#10b981" : "#ffffff" }}>
                      ₹{Math.abs(Number(txn.amount || 0)).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
