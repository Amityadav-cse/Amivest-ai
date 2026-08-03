import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

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

export default function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!name || !email || !password) {
      alert("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const data = await apiCall("/register", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });

      if (data.success) {
        alert("✅ Registration Successful — please log in");
        navigate("/login");
      } else {
        alert(data.message || "Could not create your account.");
      }
    } catch (err) {
      alert(`Cannot connect to backend.\n\nDetails:\n${err.message}`);
    }

    setLoading(false);
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={{ color: "white", textAlign: "center", marginBottom: 25 }}>
          Amivest AI Register
        </h2>

        <form onSubmit={handleRegister}>
          <input
            style={inputStyle}
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

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
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <p style={{ color: "#94a3b8", textAlign: "center", marginTop: 20 }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#14b8a6", fontWeight: "bold", textDecoration: "none" }}>
            Login
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
