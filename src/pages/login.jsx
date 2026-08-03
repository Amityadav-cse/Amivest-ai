import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

// CHANGED: proxy-first fetch (works even when direct browser->127.0.0.1
// connections are blocked by a VPN/antivirus, same fix applied everywhere
// else in this app), plus it surfaces the REAL error instead of one
// generic alert every time.
const BASE_IP = "http://127.0.0.1:5000";
const BASE_LOCAL = "http://localhost:5000";

async function apiCall(path, options = {}) {
  const urls = [path, `${BASE_IP}${path}`, `${BASE_LOCAL}${path}`];
  const attempts = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...options,
      });
      let body = null, parseFailed = false;
      try { body = await res.json(); } catch (_) { parseFailed = true; }
      if (res.ok && !parseFailed) return body || {};
      if (res.ok && parseFailed) { attempts.push(`${url} → HTTP ${res.status} but not JSON`); continue; }
      attempts.push(`${url} → HTTP ${res.status}: ${(body && (body.message || body.error)) || "no details"}`);
    } catch (err) {
      attempts.push(`${url} → ${err.name}: ${err.message}`);
    }
  }
  throw new Error(attempts.join("\n"));
}

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      alert("Please enter Email and Password");
      return;
    }

    setLoading(true);

    try {
      const data = await apiCall("/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (data.success) {
        localStorage.setItem("user", JSON.stringify(data.user));
        alert("✅ Login Successful");
        navigate("/");
      } else {
        alert(data.message || "Invalid Email or Password");
      }
    } catch (err) {
      // CHANGED: shows the real per-URL reason instead of one generic message
      alert(`Cannot connect to backend.\n\nDetails:\n${err.message}`);
    }

    setLoading(false);
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={{ color: "white", textAlign: "center", marginBottom: 25 }}>
          Amivest AI Login
        </h2>

        <form onSubmit={handleLogin}>
          <input
            style={inputStyle}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            style={inputStyle}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p style={{ color: "#94a3b8", textAlign: "center", marginTop: 20 }}>
          Don't have an account?{" "}
          <Link to="/register" style={{ color: "#14b8a6", fontWeight: "bold", textDecoration: "none" }}>
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

const containerStyle = {
  minHeight: "100vh",
  background: "#0f172a",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const cardStyle = {
  width: 420,
  background: "#1e293b",
  padding: 30,
  borderRadius: 12,
  boxShadow: "0 0 25px rgba(0,0,0,.3)",
};

const inputStyle = {
  width: "100%",
  padding: 14,
  marginBottom: 15,
  borderRadius: 8,
  border: "1px solid #334155",
  background: "#0f172a",
  color: "white",
  fontSize: 15,
  boxSizing: "border-box",
};

const buttonStyle = {
  width: "100%",
  padding: 14,
  background: "#14b8a6",
  color: "white",
  border: "none",
  borderRadius: 8,
  fontSize: 16,
  fontWeight: "bold",
  cursor: "pointer",
};
