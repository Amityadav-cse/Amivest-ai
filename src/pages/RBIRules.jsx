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

export default function RBIRules({ transactions } = {}) {
  const [topics, setTopics] = useState([]);
  const [check, setCheck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const [topicsRes, checkRes] = await Promise.all([
        apiCall("/rbi/topics", { method: "GET" }),
        apiCall("/rbi/check?user_id=1", { method: "GET" }),
      ]);
      if (topicsRes.success) setTopics(topicsRes.topics);
      if (checkRes.success) setCheck(checkRes);
      if (!topicsRes.success) setError(topicsRes.error || "Could not load RBI reference content.");
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
      <div style={{ marginBottom: "26px" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "700" }}>RBI Rules</h1>
        <p style={{ margin: "4px 0 0 0", color: "#9ca3af", fontSize: "14px" }}>Key regulations that affect your everyday banking, plus one check based on your real balance.</p>
      </div>

      {loading && <div style={{ color: "#9ca3af" }}>Loading…</div>}

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

      {!loading && !error && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {check && check.checks && (
            <div style={card}>
              <h3 style={{ color: "#fff", marginTop: 0, marginBottom: "16px" }}>🔍 Checks Based on Your Real Data</h3>
              {check.checks.map((c, i) => {
                const style = c.status === "warning"
                  ? { bg: "rgba(245,158,11,0.12)", border: "#F59E0B", color: "#FCD34D", icon: "⚠️" }
                  : c.status === "ok"
                  ? { bg: "rgba(16,185,129,0.1)", border: "#10B981", color: "#CBD5E1", icon: "✅" }
                  : { bg: "rgba(59,130,246,0.1)", border: "#3B82F6", color: "#CBD5E1", icon: "ℹ️" };
                return (
                  <div key={i} style={{ background: style.bg, border: `1px solid ${style.border}`, borderRadius: "10px", padding: "14px 16px", marginBottom: "10px" }}>
                    <div style={{ color: "#fff", fontWeight: "700", fontSize: "13px", marginBottom: "4px" }}>{style.icon} {c.title}</div>
                    <div style={{ color: style.color, fontSize: "13px", lineHeight: "1.5" }}>{c.message}</div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={card}>
            <h3 style={{ color: "#fff", marginTop: 0, marginBottom: "16px" }}>📘 Key RBI Regulations</h3>
            {topics.map((t) => (
              <div key={t.title} style={{ padding: "12px 0", borderBottom: "1px solid #1f262e" }}>
                <div style={{ color: "#0D9488", fontWeight: "700", fontSize: "13px", marginBottom: "4px" }}>{t.title}</div>
                <div style={{ color: "#9ca3af", fontSize: "12px", lineHeight: "1.6" }}>{t.detail}</div>
              </div>
            ))}
            <p style={{ color: "#6b7280", fontSize: "11px", marginTop: "14px", marginBottom: 0 }}>
              General information only, not legal advice — rules change, so confirm current circulars at rbi.org.in.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
