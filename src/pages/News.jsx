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

const card = { background: "#161a1f", border: "1px solid #242b35", borderRadius: "14px", padding: "22px" };

function timeAgo(pubDate) {
  if (!pubDate) return "";
  const diffMs = Date.now() - new Date(pubDate).getTime();
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function News() {
  const [sections, setSections] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiCall("/news/feed?user_id=1", { method: "GET" });
      if (data.success) setSections(data.sections);
      else setError(data.error || "Could not load news.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div style={{ color: "#fff" }}>
      <div style={{ marginBottom: "26px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "700" }}>News</h1>
          <p style={{ margin: "4px 0 0 0", color: "#9ca3af", fontSize: "14px" }}>Real headlines, personalized to your goals and loan interests.</p>
        </div>
        <button onClick={load} style={{ background: "none", border: "1px solid #242b35", color: "#9ca3af", padding: "8px 16px", borderRadius: "8px", fontSize: "12px", cursor: "pointer" }}>🔄 Refresh</button>
      </div>

      {loading && <div style={{ color: "#9ca3af" }}>Fetching latest headlines…</div>}

      {!loading && error && (
        <div style={{ background: "#161a1f", border: "1px solid #EF4444", borderRadius: "12px", padding: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#FCA5A5", fontWeight: "700" }}>⚠️ Something went wrong</span>
            <button onClick={load} style={{ background: "none", border: "1px solid #EF4444", color: "#FCA5A5", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}>Retry</button>
          </div>
          <div style={{ marginTop: "10px", fontFamily: "monospace", fontSize: "12px", color: "#FCA5A5", opacity: 0.85 }}>
            {error.split("  |  ").map((line, i) => <div key={i}>{line}</div>)}
          </div>
        </div>
      )}

      {!loading && !error && sections && Object.keys(sections).length === 0 && (
        <div style={{ ...card, textAlign: "center", color: "#9ca3af" }}>No headlines available right now — try refreshing in a bit.</div>
      )}

      {!loading && !error && sections && Object.entries(sections).map(([title, items]) => (
        <div key={title} style={{ ...card, marginBottom: "18px" }}>
          <h3 style={{ color: "#fff", marginTop: 0, marginBottom: "14px" }}>{title}</h3>
          {items.map((item, i) => (
            <a
              key={i}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "block", padding: "10px 0", borderBottom: i < items.length - 1 ? "1px solid #1f262e" : "none", textDecoration: "none" }}
            >
              <div style={{ color: "#CBD5E1", fontSize: "13px", lineHeight: "1.5", marginBottom: "4px" }}>{item.title}</div>
              <div style={{ color: "#6b7280", fontSize: "11px" }}>{item.source} · {timeAgo(item.published)}</div>
            </a>
          ))}
        </div>
      ))}
    </div>
  );
}
