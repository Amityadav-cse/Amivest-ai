import { useState, useEffect } from "react";

const BASE_IP = "http://127.0.0.1:5000";
const BASE_LOCAL = "http://localhost:5000";

async function apiCall(path, options = {}) {
  const urls = [path, `${BASE_IP}${path}`, `${BASE_LOCAL}${path}`];
  const method = (options.method || "GET").toUpperCase();
  const attempts = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        ...(method !== "GET" ? { headers: { "Content-Type": "application/json" } } : {}),
        ...options,
      });
      let body = null, parseFailed = false;
      try { body = await res.json(); } catch (_) { parseFailed = true; }
      if (res.ok && !parseFailed) return body || {};
      if (res.ok && parseFailed) { attempts.push(`${url} → HTTP ${res.status} but not JSON`); continue; }
      attempts.push(`${url} → HTTP ${res.status}: ${(body && (body.error || body.message)) || "no details"}`);
    } catch (err) {
      attempts.push(`${url} → ${err.name}: ${err.message}`);
    }
  }
  throw new Error(attempts.join("  |  "));
}

const currency = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const card = { background: "#161a1f", border: "1px solid #242b35", borderRadius: "14px", padding: "22px" };
const inputStyle = { width: "100%", background: "#0B1420", border: "1px solid #242b35", borderRadius: "8px", padding: "10px 12px", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box" };

/**
 * Drop <BudgetLimits /> into your Goals page (Goals.jsx) — set a monthly
 * spending cap per category (e.g. ₹500 on Food), and it checks your REAL
 * imported transactions this month against that cap, live.
 */
export default function BudgetLimits() {
  const [limits, setLimits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ category: "", monthly_limit: "" });
  const [customCategory, setCustomCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [limitsRes, catsRes] = await Promise.all([
        apiCall("/budget/limits?user_id=1", { method: "GET" }),
        apiCall("/budget/categories?user_id=1", { method: "GET" }),
      ]);
      if (limitsRes.success) setLimits(limitsRes.limits);
      else setError(limitsRes.error || "Could not load budget limits.");
      if (catsRes.success) setCategories(catsRes.categories);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addLimit = async () => {
    const category = form.category === "__custom__" ? customCategory.trim() : form.category;
    const monthly_limit = Number(form.monthly_limit);
    if (!category || !monthly_limit) return;

    setSaving(true);
    try {
      await apiCall("/budget/limits", {
        method: "POST",
        body: JSON.stringify({ user_id: 1, category, monthly_limit }),
      });
      setShowAdd(false);
      setForm({ category: "", monthly_limit: "" });
      setCustomCategory("");
      load();
    } finally {
      setSaving(false);
    }
  };

  const removeLimit = async (id) => {
    await apiCall(`/budget/limits/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div>
          <h3 style={{ color: "#fff", margin: 0 }}>💸 Spending Limits</h3>
          <p style={{ color: "#9ca3af", fontSize: "12px", margin: "4px 0 0 0" }}>Checked against your real imported transactions this month.</p>
        </div>
        <button onClick={() => setShowAdd((s) => !s)} style={{ background: "#0D9488", border: "none", color: "#fff", padding: "8px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
          {showAdd ? "Cancel" : "+ Set Limit"}
        </button>
      </div>

      {showAdd && (
        <div style={{ background: "#0B1420", borderRadius: "10px", padding: "16px", marginBottom: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            style={inputStyle}
          >
            <option value="">Select a category…</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="__custom__">Custom category…</option>
          </select>
          {form.category === "__custom__" && (
            <input placeholder="Category name" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} style={inputStyle} />
          )}
          <input type="number" placeholder="Monthly limit (₹)" value={form.monthly_limit} onChange={(e) => setForm({ ...form, monthly_limit: e.target.value })} style={inputStyle} />
          <button onClick={addLimit} disabled={saving} style={{ background: "#0D9488", border: "none", color: "#fff", padding: "10px", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}>
            {saving ? "Saving…" : "Save Limit"}
          </button>
        </div>
      )}

      {loading && <div style={{ color: "#9ca3af", fontSize: "13px" }}>Loading…</div>}
      {error && <div style={{ color: "#EF4444", fontSize: "12px" }}>{error}</div>}
      {!loading && !error && limits.length === 0 && (
        <div style={{ color: "#6b7280", fontSize: "13px" }}>No spending limits set yet.</div>
      )}

      {limits.map((l) => {
        const barColor = l.exceeded ? "#EF4444" : l.percent_used >= 80 ? "#F59E0B" : "#10B981";
        return (
          <div key={l.id} style={{ background: "#0B1420", border: `1px solid ${l.exceeded ? "#EF4444" : "#242b35"}`, borderRadius: "10px", padding: "14px", marginBottom: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ color: "#fff", fontWeight: "700", fontSize: "14px" }}>{l.category}</span>
              <button onClick={() => removeLimit(l.id)} style={{ background: "none", border: "none", color: "#6b7280", fontSize: "11px", cursor: "pointer" }}>Remove</button>
            </div>
            <div style={{ background: "#071019", borderRadius: "999px", height: "8px", overflow: "hidden", marginBottom: "8px" }}>
              <div style={{ width: `${Math.min(100, l.percent_used)}%`, height: "100%", background: barColor }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: l.alert ? "8px" : 0 }}>
              <span style={{ color: barColor, fontWeight: "700" }}>{currency(l.spent_this_month)} spent</span>
              <span style={{ color: "#6b7280" }}>of {currency(l.monthly_limit)} ({l.percent_used}%)</span>
            </div>
            {l.alert && (
              <div style={{ color: l.exceeded ? "#FCA5A5" : "#FCD34D", fontSize: "12px", background: l.exceeded ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)", borderRadius: "6px", padding: "8px 10px" }}>
                {l.exceeded ? "⚠️" : "💡"} {l.alert}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
