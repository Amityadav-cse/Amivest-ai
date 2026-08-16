import { useState, useEffect, useMemo } from "react";
import BudgetLimits from "./BudgetLimits";

// ==========================================
// CONFIG — production + local
// ==========================================
const API_BASE =
  import.meta.env.VITE_BACKEND_URL?.trim() || "";

const CATEGORIES = [
  { key: "Emergency Fund", icon: "🛟", color: "#EF4444" },
  { key: "Buy Car", icon: "🚗", color: "#3B82F6" },
  { key: "Buy House", icon: "🏠", color: "#F59E0B" },
  { key: "Education", icon: "🎓", color: "#8B5CF6" },
  { key: "Vacation", icon: "🏖️", color: "#0EA5E9" },
  { key: "Retirement", icon: "🌴", color: "#10B981" },
];

const categoryMeta = (key) =>
  CATEGORIES.find((c) => c.key === key) || { icon: "🎯", color: "#0D9488" };

const currency = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

async function apiCall(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const method = (options.method || "GET").toUpperCase();

  const response = await fetch(url, {
    ...options,
    method,
    credentials: "include",
    headers: {
      ...(method !== "GET" ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  let body = {};
  try {
    body = await response.json();
  } catch (_) {}

  if (!response.ok) {
    throw new Error(
      body?.error ||
        body?.message ||
        `Request failed with HTTP ${response.status}`
    );
  }

  return body;
}

function downloadCertificate(goal) {
  const canvas = document.createElement("canvas");
  canvas.width = 1000;
  canvas.height = 700;
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, 1000, 700);
  bg.addColorStop(0, "#0D2D4A");
  bg.addColorStop(1, "#071829");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1000, 700);

  ctx.strokeStyle = "#0D9488";
  ctx.lineWidth = 6;
  ctx.strokeRect(30, 30, 940, 640);
  ctx.strokeStyle = "#10B981";
  ctx.lineWidth = 1;
  ctx.strokeRect(46, 46, 908, 608);

  ctx.textAlign = "center";

  ctx.fillStyle = "#0D9488";
  ctx.font = "bold 22px Georgia";
  ctx.fillText("F I N S A A T H I   A I", 500, 130);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 44px Georgia";
  ctx.fillText("Certificate of Achievement", 500, 210);

  ctx.fillStyle = "#9ca3af";
  ctx.font = "18px Georgia";
  ctx.fillText("This certifies that the goal below has been successfully completed", 500, 260);

  ctx.fillStyle = "#10B981";
  ctx.font = "bold 40px Georgia";
  ctx.fillText(goal.goal_name, 500, 350);

  ctx.fillStyle = "#ffffff";
  ctx.font = "26px Georgia";
  ctx.fillText(`₹${Number(goal.target_amount).toLocaleString("en-IN")} saved`, 500, 400);

  ctx.fillStyle = "#9ca3af";
  ctx.font = "16px Georgia";
  ctx.fillText(goal.category, 500, 435);

  ctx.fillStyle = "#6b7280";
  ctx.font = "15px Georgia";
  ctx.fillText(`Achieved on ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`, 500, 560);

  ctx.font = "40px Georgia";
  ctx.fillText("🏆", 500, 620);

  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${goal.goal_name.replace(/\s+/g, "_")}_certificate.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

function ProgressBar({ percent, color }) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div style={{ background: "#0B1420", borderRadius: "999px", height: "10px", overflow: "hidden" }}>
      <div
        style={{
          width: `${clamped}%`,
          height: "100%",
          background: clamped >= 100 ? "#10B981" : color,
          borderRadius: "999px",
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div
      style={{
        background: "#161a1f",
        border: "1px solid #242b35",
        borderRadius: "16px",
        padding: "60px 30px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎯</div>
      <h3 style={{ color: "#fff", margin: "0 0 8px 0" }}>No goals yet</h3>
      <p style={{ color: "#9ca3af", margin: "0 0 22px 0", fontSize: "14px" }}>
        Set a target — emergency fund, a car, a trip — and FinSaathi AI will work out how much to save each month.
      </p>
      <button
        onClick={onCreate}
        style={{
          background: "#0D9488",
          color: "#fff",
          border: "none",
          padding: "12px 24px",
          borderRadius: "8px",
          fontWeight: "600",
          fontSize: "14px",
          cursor: "pointer",
        }}
      >
        + Create Goal
      </button>
    </div>
  );
}

function GoalCard({ goal, onOpen }) {
  const meta = categoryMeta(goal.category);
  const percent = goal.target_amount > 0 ? (goal.current_saved / goal.target_amount) * 100 : 0;
  const isComplete = percent >= 100;

  return (
    <div
      onClick={() => onOpen(goal)}
      style={{
        background: "#161a1f",
        border: `1px solid ${isComplete ? "#10B981" : "#242b35"}`,
        borderRadius: "14px",
        padding: "20px",
        cursor: "pointer",
        transition: "transform 0.15s ease, border-color 0.15s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: `${meta.color}22`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
            }}
          >
            {meta.icon}
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: "600", fontSize: "15px" }}>{goal.goal_name}</div>
            <div style={{ color: "#9ca3af", fontSize: "12px" }}>{goal.category}</div>
          </div>
        </div>
        {isComplete && <span style={{ fontSize: "20px" }}>🎉</span>}
      </div>

      <ProgressBar percent={percent} color={meta.color} />

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px", fontSize: "13px" }}>
        <span style={{ color: "#10B981", fontWeight: "600" }}>{currency(goal.current_saved)} saved</span>
        <span style={{ color: "#9ca3af" }}>of {currency(goal.target_amount)}</span>
      </div>

      <div style={{ marginTop: "10px", fontSize: "11px", color: "#6b7280" }}>
        {isComplete ? "Goal completed" : `Target: ${goal.target_date || "No date set"}`}
      </div>
    </div>
  );
}

function CreateGoalModal({ onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    goal_name: "",
    category: CATEGORIES[0].key,
    target_amount: "",
    target_date: "",
    monthly_saving: "",
  });
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const suggestMonthlySaving = async () => {
    if (!form.target_amount || !form.target_date) return;
    setSuggesting(true);
    setError("");
    try {
      const data = await apiCall("/goals/suggest-plan", {
        method: "POST",
        body: JSON.stringify({
          goal_name: form.goal_name,
          category: form.category,
          target_amount: Number(form.target_amount),
          target_date: form.target_date,
        }),
      });
      if (data.success && data.monthly_saving) {
        update("monthly_saving", data.monthly_saving);
      }
    } catch (err) {
      console.warn("AI suggestion unavailable:", err.message);
    } finally {
      setSuggesting(false);
    }
  };

  const handleCreate = async () => {
    if (!form.goal_name || !form.target_amount || !form.target_date) {
      setError("Fill in the goal name, target amount, and target date.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const data = await apiCall("/goals", {
        method: "POST",
        body: JSON.stringify({
          goal_name: form.goal_name,
          category: form.category,
          target_amount: Number(form.target_amount),
          target_date: form.target_date,
          monthly_saving: Number(form.monthly_saving) || 0,
        }),
      });
      if (data.success) {
        onCreated();
      } else {
        setError(data.error || "Could not save the goal. Try again.");
      }
    } catch (err) {
      setError(err.message || "Could not reach the backend.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#161a1f",
          border: "1px solid #242b35",
          borderRadius: "16px",
          padding: "28px",
          width: "100%",
          maxWidth: "440px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" }}>
          <h3 style={{ color: "#fff", margin: 0 }}>Create a goal</h3>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "18px", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={labelStyle}>Goal name</label>
            <input
              value={form.goal_name}
              onChange={(e) => update("goal_name", e.target.value)}
              placeholder="e.g. Emergency Fund"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Category</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => update("category", c.key)}
                  style={{
                    background: form.category === c.key ? `${c.color}22` : "#0B1420",
                    border: `1px solid ${form.category === c.key ? c.color : "#242b35"}`,
                    borderRadius: "8px",
                    padding: "10px 6px",
                    color: "#fff",
                    fontSize: "11px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>{c.icon}</span>
                  {c.key}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Target amount (₹)</label>
              <input
                type="number"
                value={form.target_amount}
                onChange={(e) => update("target_amount", e.target.value)}
                placeholder="200000"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Target date</label>
              <input
                type="date"
                value={form.target_date}
                onChange={(e) => update("target_date", e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={labelStyle}>Monthly saving plan (₹)</label>
              <button
                onClick={suggestMonthlySaving}
                disabled={suggesting || !form.target_amount || !form.target_date}
                style={{
                  background: "none",
                  border: "none",
                  color: "#0D9488",
                  fontSize: "12px",
                  cursor: "pointer",
                  fontWeight: "600",
                  opacity: !form.target_amount || !form.target_date ? 0.5 : 1,
                }}
              >
                {suggesting ? "Calculating…" : "✨ Ask AI"}
              </button>
            </div>
            <input
              type="number"
              value={form.monthly_saving}
              onChange={(e) => update("monthly_saving", e.target.value)}
              placeholder="e.g. 8000"
              style={inputStyle}
            />
          </div>

          {error && <div style={{ color: "#EF4444", fontSize: "13px" }}>{error}</div>}

          <button
            onClick={handleCreate}
            disabled={saving}
            style={{
              background: "#0D9488",
              color: "#fff",
              border: "none",
              padding: "13px",
              borderRadius: "8px",
              fontWeight: "700",
              fontSize: "14px",
              cursor: "pointer",
              marginTop: "6px",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving…" : "Create Goal"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GoalDetailModal({ goal, onClose, onUpdated, onDeleted }) {
  const meta = categoryMeta(goal.category);
  const percent = goal.target_amount > 0 ? (goal.current_saved / goal.target_amount) * 100 : 0;
  const isComplete = percent >= 100;

  const [addAmount, setAddAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tips, setTips] = useState("");
  const [loadingTips, setLoadingTips] = useState(false);
  const [error, setError] = useState("");

  const deleteGoal = async () => {
    if (!window.confirm(`Delete "${goal.goal_name}"? This can't be undone.`)) return;
    setDeleting(true);
    try {
      const data = await apiCall(`/goals/${goal.id}`, { method: "DELETE" });
      if (data.success) {
        onDeleted();
        onClose();
      } else {
        setError(data.error || "Could not delete the goal.");
      }
    } catch (err) {
      setError(err.message || "Could not reach the backend.");
    } finally {
      setDeleting(false);
    }
  };

  const addMoney = async () => {
    const amount = Number(addAmount);
    if (!amount || amount <= 0) return;
    setSaving(true);
    setError("");
    try {
      const data = await apiCall(`/goals/${goal.id}/add-money`, {
        method: "POST",
        body: JSON.stringify({ amount }),
      });
      if (data.success) {
        setAddAmount("");
        onUpdated();
      } else {
        setError(data.error || "Could not update the goal.");
      }
    } catch (err) {
      setError(err.message || "Could not reach the backend.");
    } finally {
      setSaving(false);
    }
  };

  const getTips = async () => {
    setLoadingTips(true);
    try {
      const data = await apiCall(`/goals/${goal.id}/tips`, { method: "GET" });
      if (data.success) setTips(data.tips);
    } catch (err) {
      setTips("Could not reach the AI advisor right now.");
    } finally {
      setLoadingTips(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#161a1f",
          border: "1px solid #242b35",
          borderRadius: "16px",
          padding: "28px",
          width: "100%",
          maxWidth: "460px",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: `${meta.color}22`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
              }}
            >
              {meta.icon}
            </div>
            <div>
              <h3 style={{ color: "#fff", margin: 0 }}>{goal.goal_name}</h3>
              <div style={{ color: "#9ca3af", fontSize: "12px" }}>{goal.category}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "18px", cursor: "pointer" }}>
            ✕
          </button>
        </div>

        <button
          onClick={deleteGoal}
          disabled={deleting}
          style={{
            background: "none",
            border: "1px solid #3f2020",
            color: "#EF4444",
            padding: "8px 14px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: "600",
            cursor: "pointer",
            marginBottom: "18px",
          }}
        >
          {deleting ? "Deleting…" : "🗑 Delete Goal"}
        </button>

        {isComplete && (
          <div
            style={{
              background: "rgba(16,185,129,0.12)",
              border: "1px solid #10B981",
              borderRadius: "12px",
              padding: "18px",
              textAlign: "center",
              marginBottom: "18px",
            }}
          >
            <div style={{ fontSize: "30px" }}>🎉</div>
            <div style={{ color: "#10B981", fontWeight: "700", margin: "6px 0 2px 0" }}>Goal completed!</div>
            <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "14px" }}>
              You reached {currency(goal.target_amount)}. Time to set your next target.
            </div>
            <button
              onClick={() => downloadCertificate(goal)}
              style={{
                background: "#10B981",
                color: "#04241a",
                border: "none",
                padding: "10px 18px",
                borderRadius: "8px",
                fontWeight: "700",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              🏆 Download Certificate
            </button>
          </div>
        )}

        <ProgressBar percent={percent} color={meta.color} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px", marginBottom: "20px", fontSize: "13px" }}>
          <span style={{ color: "#10B981", fontWeight: "700" }}>{currency(goal.current_saved)} saved</span>
          <span style={{ color: "#9ca3af" }}>{Math.min(100, percent).toFixed(0)}% of {currency(goal.target_amount)}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
          <div style={statBox}>
            <div style={statLabel}>TARGET DATE</div>
            <div style={statValue}>{goal.target_date || "—"}</div>
          </div>
          <div style={statBox}>
            <div style={statLabel}>MONTHLY PLAN</div>
            <div style={statValue}>{currency(goal.monthly_saving)}</div>
          </div>
        </div>

        {!isComplete && (
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Add money to this goal</label>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="number"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                placeholder="Amount in ₹"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={addMoney}
                disabled={saving}
                style={{
                  background: "#0D9488",
                  color: "#fff",
                  border: "none",
                  padding: "0 18px",
                  borderRadius: "8px",
                  fontWeight: "700",
                  cursor: "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "…" : "Add"}
              </button>
            </div>
            {error && <div style={{ color: "#EF4444", fontSize: "12px", marginTop: "6px" }}>{error}</div>}
          </div>
        )}

        <div>
          <button
            onClick={getTips}
            disabled={loadingTips}
            style={{
              background: "rgba(13,148,136,0.15)",
              border: "1px solid #0D9488",
              color: "#0D9488",
              padding: "10px 16px",
              borderRadius: "8px",
              fontWeight: "600",
              fontSize: "13px",
              cursor: "pointer",
              width: "100%",
            }}
          >
            {loadingTips ? "Thinking…" : isComplete ? "✨ What should I save for next?" : "✨ Get AI tips to reach this faster"}
          </button>
          {tips && (
            <div style={{ marginTop: "12px", background: "#0B1420", border: "1px solid #242b35", borderRadius: "10px", padding: "14px", color: "#CBD5E1", fontSize: "13px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
              {tips}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const labelStyle = { display: "block", color: "#9ca3af", fontSize: "12px", marginBottom: "6px", fontWeight: "600" };
const inputStyle = {
  width: "100%",
  background: "#0B1420",
  border: "1px solid #242b35",
  borderRadius: "8px",
  padding: "10px 12px",
  color: "#fff",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};
const statBox = { background: "#0B1420", border: "1px solid #242b35", borderRadius: "10px", padding: "12px" };
const statLabel = { color: "#6b7280", fontSize: "10px", letterSpacing: "0.05em", marginBottom: "4px" };
const statValue = { color: "#fff", fontSize: "15px", fontWeight: "700" };

function SummaryStats({ refreshKey }) {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiCall("/goals/summary", { method: "GET" })
      .then((data) => {
        if (!cancelled && data.success) setSummary(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (!summary) return null;

  const stats = [
    { label: "TOTAL GOALS", value: summary.total_goals, icon: "🎯", color: "#3B82F6" },
    { label: "TOTAL SAVED", value: currency(summary.total_saved), icon: "💰", color: "#10B981" },
    { label: "COMPLETED", value: summary.completed_goals, icon: "🏆", color: "#F59E0B" },
    { label: "OVERALL PROGRESS", value: `${summary.overall_progress}%`, icon: "📈", color: "#0D9488" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", marginBottom: "26px" }}>
      {stats.map((s) => (
        <div key={s.label} style={{ background: "#161a1f", border: "1px solid #242b35", borderRadius: "12px", padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <span>{s.icon}</span>
            <span style={{ color: "#6b7280", fontSize: "11px", letterSpacing: "0.05em" }}>{s.label}</span>
          </div>
          <div style={{ color: s.color, fontSize: "22px", fontWeight: "700" }}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}

function SuggestionBanner({ onApplied, refreshKey }) {
  const [suggestion, setSuggestion] = useState(null);
  const [applying, setApplying] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiCall("/goals/suggest-allocation", { method: "GET" })
      .then((data) => {
        if (cancelled) return;
        if (data.success && data.suggestions && data.suggestions.length > 0) {
          setSuggestion(data);
        } else {
          setSuggestion(false);
        }
      })
      .catch((err) => {
        console.warn("Savings suggestion unavailable:", err.message);
        setSuggestion(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  if (!suggestion) return null;

  const applySuggestion = async (goalId, amount) => {
    setApplying(goalId);
    try {
      await apiCall(`/goals/${goalId}/add-money`, {
        method: "POST",
        body: JSON.stringify({ amount }),
      });
      setSuggestion((prev) => ({
        ...prev,
        suggestions: prev.suggestions.filter((s) => s.goal_id !== goalId),
      }));
      onApplied();
    } catch (err) {
      // stay on the banner, let them retry
    } finally {
      setApplying(null);
    }
  };

  return (
    <div
      style={{
        background: "rgba(13,148,136,0.12)",
        border: "1px solid #0D9488",
        borderRadius: "14px",
        padding: "18px 20px",
        marginBottom: "26px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        <span style={{ fontSize: "18px" }}>✨</span>
        <div>
          <div style={{ color: "#fff", fontWeight: "700", fontSize: "14px" }}>
            You have {currency(suggestion.available_amount)} in unallocated savings
          </div>
          <div style={{ color: "#9ca3af", fontSize: "12px" }}>
            Based on your income, expenses, and current monthly goal plans — want to put some toward a goal?
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {suggestion.suggestions.map((s) => (
          <div
            key={s.goal_id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#0B1420",
              borderRadius: "8px",
              padding: "10px 14px",
            }}
          >
            <span style={{ color: "#fff", fontSize: "13px" }}>
              {s.goal_name} <span style={{ color: "#10B981", fontWeight: "700" }}>+{currency(s.suggested_amount)}</span>
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => applySuggestion(s.goal_id, s.suggested_amount)}
                disabled={applying === s.goal_id}
                style={{
                  background: "#0D9488",
                  border: "none",
                  color: "#fff",
                  padding: "6px 14px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                {applying === s.goal_id ? "Adding…" : "Yes, add it"}
              </button>
              <button
                onClick={() =>
                  setSuggestion((prev) => ({
                    ...prev,
                    suggestions: prev.suggestions.filter((x) => x.goal_id !== s.goal_id),
                  }))
                }
                style={{
                  background: "none",
                  border: "1px solid #242b35",
                  color: "#9ca3af",
                  padding: "6px 14px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Skip
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ===================================================
// Goal Intelligence — practical "what happens next"
// Uses only the goal data already returned by the backend.
// ===================================================
function GoalIntelligence({ goals, transactions = [] }) {
  const [extraMonthly, setExtraMonthly] = useState(0);

  const insight = useMemo(() => {
    if (!goals.length) return null;

    const today = new Date();
    const active = goals.filter(
      (g) => Number(g.target_amount) > Number(g.current_saved || 0)
    );

    let totalTarget = 0;
    let totalSaved = 0;
    let monthlyNeed = 0;
    let atRisk = 0;
    let onTrack = 0;

    const details = active.map((g) => {
      const target = Number(g.target_amount || 0);
      const saved = Number(g.current_saved || 0);
      const monthly = Number(g.monthly_saving || 0);
      const remaining = Math.max(0, target - saved);

      let months = 0;
      if (g.target_date) {
        const targetDate = new Date(`${g.target_date}T00:00:00`);
        months = Math.max(
          1,
          (targetDate.getFullYear() - today.getFullYear()) * 12 +
            targetDate.getMonth() -
            today.getMonth()
        );
      }

      const required = months > 0 ? remaining / months : remaining;
      const pace = monthly > 0 ? monthly / Math.max(required, 1) : 0;
      const risk = months > 0 && monthly > 0 && pace < 0.85;
      if (risk) atRisk += 1;
      else onTrack += 1;

      totalTarget += target;
      totalSaved += saved;
      monthlyNeed += required;

      return {
        ...g,
        remaining,
        required,
        pace,
        months,
        risk,
      };
    });

    const income = transactions
      .filter((t) => String(t.type || "").toLowerCase() === "income")
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const expense = transactions
      .filter((t) => String(t.type || "").toLowerCase() === "expense")
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const cashflow = income - expense;
    const safeExtra = Math.max(0, Math.floor(cashflow * 0.25));
    const totalMonthlyPlan =
      active.reduce((s, g) => s + Number(g.monthly_saving || 0), 0);

    const health = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          active.length
            ? active.reduce((s, g) => s + Math.min(100, g.pace * 100), 0) /
                active.length
            : 100
        )
      )
    );

    return {
      active,
      details,
      totalTarget,
      totalSaved,
      monthlyNeed,
      totalMonthlyPlan,
      cashflow,
      safeExtra,
      health,
      atRisk,
      onTrack,
    };
  }, [goals, transactions]);

  if (!insight) return null;

  const projected = insight.details.map((g) => {
    const plan = Number(g.monthly_saving || 0) + Number(extraMonthly || 0);
    const months = plan > 0 ? Math.ceil(g.remaining / plan) : Infinity;
    return { ...g, projectedMonths: months };
  });

  const healthLabel =
    insight.health >= 85
      ? "Excellent pace"
      : insight.health >= 65
      ? "Mostly on track"
      : insight.health >= 40
      ? "Needs attention"
      : "At risk";

  return (
    <div
      style={{
        background:
          "linear-gradient(135deg, rgba(13,148,136,.16), rgba(15,23,42,.9))",
        border: "1px solid #245d5a",
        borderRadius: "16px",
        padding: "20px",
        marginBottom: "26px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          alignItems: "flex-start",
          flexWrap: "wrap",
          marginBottom: "18px",
        }}
      >
        <div>
          <div style={{ color: "#5eead4", fontSize: "11px", fontWeight: "800", letterSpacing: ".12em" }}>
            FINSAATHI GOAL INTELLIGENCE
          </div>
          <h3 style={{ color: "#fff", margin: "6px 0 4px", fontSize: "20px" }}>
            Your goals have a live action plan
          </h3>
          <div style={{ color: "#94a3b8", fontSize: "12px" }}>
            Indicative planning based on your saved amounts, target dates and available transaction data.
          </div>
        </div>
        <div
          style={{
            minWidth: "120px",
            textAlign: "center",
            background: "#071019",
            border: "1px solid #243241",
            borderRadius: "12px",
            padding: "12px",
          }}
        >
          <div style={{ color: "#6b7280", fontSize: "10px" }}>GOAL HEALTH</div>
          <div style={{ color: insight.health >= 65 ? "#10B981" : "#F59E0B", fontSize: "28px", fontWeight: "800" }}>
            {insight.health}
          </div>
          <div style={{ color: "#CBD5E1", fontSize: "11px" }}>{healthLabel}</div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))",
          gap: "10px",
          marginBottom: "16px",
        }}
      >
        {[
          ["🎯", "Active goals", insight.active.length],
          ["💰", "Saved", currency(insight.totalSaved)],
          ["📅", "Required / month", currency(insight.monthlyNeed)],
          ["⚠️", "Need attention", insight.atRisk],
        ].map(([icon, label, value]) => (
          <div key={label} style={{ background: "#071019", border: "1px solid #243241", borderRadius: "11px", padding: "12px" }}>
            <div style={{ fontSize: "11px", color: "#6b7280" }}>{icon} {label}</div>
            <div style={{ color: "#fff", fontSize: "16px", fontWeight: "800", marginTop: "5px" }}>{value}</div>
          </div>
        ))}
      </div>

      {insight.cashflow > 0 && (
        <div style={{ background: "#071019", borderRadius: "11px", padding: "14px", marginBottom: "14px" }}>
          <div style={{ color: "#CBD5E1", fontSize: "12px", marginBottom: "8px" }}>
            What-if planner: add extra money to your goal plan
          </div>
          <input
            type="range"
            min="0"
            max={Math.max(1000, Math.round(insight.safeExtra * 2))}
            step="500"
            value={extraMonthly}
            onChange={(e) => setExtraMonthly(Number(e.target.value))}
            style={{ width: "100%" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: "11px", marginTop: "5px" }}>
            <span>Extra: {currency(extraMonthly)}/month</span>
            <span>Suggested ceiling: {currency(insight.safeExtra)}</span>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {projected.slice(0, 4).map((g) => (
          <div key={g.id} style={{ background: "#071019", borderRadius: "10px", padding: "12px 14px", border: "1px solid #1d2935" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
              <div>
                <span style={{ color: "#fff", fontWeight: "700", fontSize: "13px" }}>{g.goal_name}</span>
                <span style={{ color: "#64748b", fontSize: "11px", marginLeft: "8px" }}>
                  {g.risk ? "⚠️ behind pace" : "✓ on pace"}
                </span>
              </div>
              <span style={{ color: "#5eead4", fontSize: "12px", fontWeight: "700" }}>
                {g.projectedMonths === Infinity ? "No monthly plan" : `~${g.projectedMonths} months`}
              </span>
            </div>
            <div style={{ color: "#94a3b8", fontSize: "11px", marginTop: "5px" }}>
              Need {currency(g.remaining)} more · Recommended baseline {currency(g.required)}/month
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


export default function Goals({ transactions } = {}) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [bannerRefreshKey, setBannerRefreshKey] = useState(0);

  const loadGoals = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiCall("/goals", { method: "GET" });
      if (data.success === false) throw new Error(data.error || "Could not load goals.");
      setGoals(Array.isArray(data.goals) ? data.goals : []);
    } catch (err) {
      setError(err.message || "Could not load your goals.");
    } finally {
      setLoading(false);
    }
  };

  const txSignature = transactions
    ? `${transactions.length}:${transactions.reduce((s, t) => s + (Number(t.amount) || 0), 0)}`
    : "";

  useEffect(() => {
    if (!txSignature) return;
    setBannerRefreshKey((k) => k + 1);
  }, [txSignature]);

  useEffect(() => {
    loadGoals();
  }, []);

  const activeGoals = goals.filter((g) => (g.target_amount ? g.current_saved / g.target_amount : 0) < 1);
  const completedGoals = goals.filter((g) => (g.target_amount ? g.current_saved / g.target_amount : 0) >= 1);

  return (
    <div style={{ color: "#fff" }}>
      <div style={{ marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "700" }}>Goals</h1>
          <p style={{ margin: "4px 0 0 0", color: "#9ca3af", fontSize: "14px" }}>
            Track what you're saving for, and let AI keep the plan on pace.
          </p>
        </div>
        {goals.length > 0 && (
          <button
            onClick={() => setShowCreate(true)}
            style={{
              background: "#0D9488",
              color: "#fff",
              border: "none",
              padding: "12px 20px",
              borderRadius: "8px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            + Add Goal
          </button>
        )}
      </div>

      <SummaryStats refreshKey={goals.length + goals.reduce((sum, g) => sum + Number(g.current_saved || 0), 0)} />

      {!loading && !error && goals.length > 0 && (
        <GoalIntelligence goals={goals} transactions={transactions || []} />
      )}

      {/* CHANGED: added — real spending-limit tracker */}
      <BudgetLimits />

      {!loading && !error && goals.length > 0 && <SuggestionBanner onApplied={loadGoals} refreshKey={bannerRefreshKey} />}

      {loading && <div style={{ color: "#9ca3af" }}>Loading goals…</div>}

      {!loading && error && (
        <div style={{ background: "#161a1f", border: "1px solid #EF4444", borderRadius: "12px", padding: "18px", color: "#FCA5A5", fontSize: "13px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: error.includes("|") ? "10px" : 0 }}>
            <span style={{ fontWeight: "700" }}>⚠️ Could not load goals</span>
            <button
              onClick={loadGoals}
              style={{
                background: "none",
                border: "1px solid #EF4444",
                color: "#FCA5A5",
                padding: "8px 16px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Retry
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontFamily: "monospace", fontSize: "12px", opacity: 0.85 }}>
            {error.split("  |  ").map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && goals.length === 0 && <EmptyState onCreate={() => setShowCreate(true)} />}

      {!loading && !error && goals.length > 0 && (
        <>
          {activeGoals.length > 0 && (
            <>
              <h4 style={{ color: "#9ca3af", fontSize: "13px", letterSpacing: "0.05em", marginBottom: "14px" }}>IN PROGRESS</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px", marginBottom: "34px" }}>
                {activeGoals.map((g) => (
                  <GoalCard key={g.id} goal={g} onOpen={setSelectedGoal} />
                ))}
              </div>
            </>
          )}

          {completedGoals.length > 0 && (
            <>
              <h4 style={{ color: "#9ca3af", fontSize: "13px", letterSpacing: "0.05em", marginBottom: "14px" }}>COMPLETED 🎉</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px" }}>
                {completedGoals.map((g) => (
                  <GoalCard key={g.id} goal={g} onOpen={setSelectedGoal} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {showCreate && (
        <CreateGoalModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            loadGoals();
          }}
        />
      )}

      {selectedGoal && (
        <GoalDetailModal
          goal={goals.find((g) => g.id === selectedGoal.id) || selectedGoal}
          onClose={() => setSelectedGoal(null)}
          onUpdated={loadGoals}
          onDeleted={loadGoals}
        />
      )}
    </div>
  );
}