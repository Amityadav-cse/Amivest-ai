import { useState, useEffect } from "react";

const BASE_IP = "http://127.0.0.1:5000";
const BASE_LOCAL = "http://localhost:5000";

async function apiCall(path, options = {}) {
  const urls = [path, `${BASE_IP}${path}`, `${BASE_LOCAL}${path}`];
  const attempts = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, options);
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

export default function TaxAlerts({ transactions } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const result = await apiCall("/tax/analysis?user_id=1", { method: "GET" });
      if (result.success) setData(result);
      else setError(result.error || "Could not load tax analysis.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const txSignature = transactions ? `${transactions.length}:${transactions.reduce((s, t) => s + (Number(t.amount) || 0), 0)}` : "";
  useEffect(() => {
    if (!txSignature) return;
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txSignature]);

  return (
    <div style={{ color: "#fff" }}>
      <div style={{ marginBottom: "26px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "700" }}>Tax Alerts</h1>
          <p style={{ margin: "4px 0 0 0", color: "#9ca3af", fontSize: "14px" }}>Estimated from your real income and investment plan — not a filed return.</p>
        </div>
        {data && <button onClick={() => load()} style={{ background: "none", border: "1px solid #242b35", color: "#9ca3af", padding: "8px 16px", borderRadius: "8px", fontSize: "12px", cursor: "pointer" }}>🔄 Refresh</button>}
      </div>

      {loading && <div style={{ color: "#9ca3af" }}>Calculating…</div>}

      {!loading && error && (
        <div style={{ background: "#161a1f", border: "1px solid #EF4444", borderRadius: "12px", padding: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#FCA5A5", fontWeight: "700" }}>⚠️ Something went wrong</span>
            <button onClick={() => load()} style={{ background: "none", border: "1px solid #EF4444", color: "#FCA5A5", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}>Retry</button>
          </div>
          <div style={{ marginTop: "10px", fontFamily: "monospace", fontSize: "12px", color: "#FCA5A5", opacity: 0.85 }}>
            {error.split("  |  ").map((line, i) => <div key={i}>{line}</div>)}
          </div>
        </div>
      )}

      {!loading && !error && data && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ ...card, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <div style={{ color: "#6b7280", fontSize: "12px", marginBottom: "4px" }}>ESTIMATED ANNUAL INCOME</div>
              <div style={{ color: "#10B981", fontSize: "24px", fontWeight: "800" }}>{currency(data.annual_income)}</div>
            </div>
            <div>
              <div style={{ color: "#6b7280", fontSize: "12px", marginBottom: "4px" }}>BETTER REGIME FOR YOU</div>
              <div style={{ color: "#0D9488", fontSize: "24px", fontWeight: "800" }}>{data.better_regime}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
            <div style={{ ...card, border: data.better_regime === "New Regime" ? "1px solid #0D9488" : "1px solid #242b35" }}>
              <h3 style={{ color: "#fff", marginTop: 0, marginBottom: "12px" }}>New Regime</h3>
              <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "4px" }}>Taxable Income</div>
              <div style={{ color: "#fff", fontSize: "16px", fontWeight: "700", marginBottom: "14px" }}>{currency(data.new_regime.taxable_income)}</div>
              <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "4px" }}>Estimated Tax</div>
              <div style={{ color: "#10B981", fontSize: "20px", fontWeight: "800" }}>{currency(data.new_regime.estimated_tax)}</div>
            </div>
            <div style={{ ...card, border: data.better_regime === "Old Regime" ? "1px solid #0D9488" : "1px solid #242b35" }}>
              <h3 style={{ color: "#fff", marginTop: 0, marginBottom: "12px" }}>Old Regime</h3>
              <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "4px" }}>Taxable Income (after 80C: {currency(data.old_regime.section_80c_used)})</div>
              <div style={{ color: "#fff", fontSize: "16px", fontWeight: "700", marginBottom: "14px" }}>{currency(data.old_regime.taxable_income)}</div>
              <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "4px" }}>Estimated Tax</div>
              <div style={{ color: "#10B981", fontSize: "20px", fontWeight: "800" }}>{currency(data.old_regime.estimated_tax)}</div>
            </div>
          </div>

          <div style={card}>
            <h3 style={{ color: "#fff", marginTop: 0, marginBottom: "14px" }}>🔔 Alerts</h3>
            {data.alerts.map((a, i) => (
              <div key={i} style={{ background: "#0B1420", borderRadius: "8px", padding: "12px 14px", color: "#CBD5E1", fontSize: "13px", marginBottom: "8px" }}>💡 {a}</div>
            ))}
          </div>

          <div style={{ ...card, background: "rgba(245,158,11,0.06)", border: "1px solid #F59E0B" }}>
            <p style={{ color: "#FCD34D", fontSize: "12px", margin: 0, lineHeight: "1.6" }}>⚠️ {data.disclaimer}</p>
          </div>
        </div>
      )}
    </div>
  );
}
