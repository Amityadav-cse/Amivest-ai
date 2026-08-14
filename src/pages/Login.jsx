import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:5000";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");

    if (!email.trim() || !password) {
      setError("Please enter Email and Password.");
      return;
    }

    setLoading(true);

    try {
      // ==========================================
      // LOGIN
      // ==========================================

      const response = await fetch(
        `${API_URL}/login`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          // VERY IMPORTANT
          // This allows browser to receive/store
          // the Flask session cookie.
          credentials: "include",

          body: JSON.stringify({
            email: email.trim(),
            password: password,
          }),
        }
      );

      const data = await response.json();

      console.log("LOGIN RESPONSE:", data);

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Invalid Email or Password."
        );
      }

      // ==========================================
      // SAVE USER FOR UI ONLY
      // ==========================================

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      // ==========================================
      // VERIFY FLASK SESSION
      // ==========================================

      const sessionResponse = await fetch(
        `${API_URL}/session`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      const sessionData =
        await sessionResponse.json();

      console.log(
        "SESSION AFTER LOGIN:",
        sessionData
      );

      if (
        !sessionResponse.ok ||
        !sessionData.authenticated
      ) {
        throw new Error(
          "Login succeeded, but Flask session was not created."
        );
      }

      // ==========================================
      // SUCCESS
      // ==========================================

      console.log(
        "✅ Authentication successful"
      );

      alert("✅ Login Successful");

      navigate("/");

    } catch (err) {
      console.error(
        "LOGIN ERROR:",
        err
      );

      setError(
        err.message ||
          "Unable to login."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>

        <h2
          style={{
            color: "white",
            textAlign: "center",
            marginBottom: 10,
          }}
        >
          Amivest AI Login
        </h2>

        <p
          style={{
            color: "#94a3b8",
            textAlign: "center",
            marginBottom: 25,
          }}
        >
          Your AI Financial Guardian
        </p>

        {/* ERROR */}

        {error && (
          <div
            style={{
              background: "#3f1515",
              border: "1px solid #ef4444",
              color: "#fca5a5",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "20px",
              fontSize: "14px",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* LOGIN FORM */}

        <form onSubmit={handleLogin}>

          <input
            style={inputStyle}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            autoComplete="email"
          />

          <input
            style={inputStyle}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            autoComplete="current-password"
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              ...buttonStyle,
              background: loading
                ? "#64748b"
                : "#14b8a6",
              cursor: loading
                ? "not-allowed"
                : "pointer",
            }}
          >
            {loading
              ? "Logging in..."
              : "Login"}
          </button>

        </form>

        <p
          style={{
            color: "#94a3b8",
            textAlign: "center",
            marginTop: 20,
          }}
        >
          Don't have an account?{" "}

          <Link
            to="/register"
            style={{
              color: "#14b8a6",
              fontWeight: "bold",
              textDecoration: "none",
            }}
          >
            Register
          </Link>
        </p>

      </div>
    </div>
  );
}


// =====================================================
// STYLES
// =====================================================

const containerStyle = {
  minHeight: "100vh",
  background: "#0f172a",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "20px",
  boxSizing: "border-box",
};

const cardStyle = {
  width: "100%",
  maxWidth: 420,
  background: "#1e293b",
  padding: 30,
  borderRadius: 12,
  boxShadow: "0 0 25px rgba(0,0,0,.3)",
  boxSizing: "border-box",
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
  outline: "none",
};

const buttonStyle = {
  width: "100%",
  padding: 14,
  color: "white",
  border: "none",
  borderRadius: 8,
  fontSize: 16,
  fontWeight: "bold",
};