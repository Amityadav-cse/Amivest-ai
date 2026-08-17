import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL?.trim() || "";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError("Please enter your email.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${BACKEND_URL}/login`,
        {
          method: "POST",

          /*
           * IMPORTANT
           * This allows Flask session cookies
           * to be stored and sent with future
           * requests such as /upload.
           */
          credentials: "include",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email: cleanEmail,
            password: password,
          }),
        }
      );

      let data = {};

      try {
        data = await response.json();
      } catch (jsonError) {
        console.error(
          "Could not parse login response:",
          jsonError
        );
      }

      console.log("LOGIN STATUS:", response.status);
      console.log("LOGIN RESPONSE:", data);

      /*
       * Login failed
       */
      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            data.message ||
            "Invalid email or password."
        );
      }

      /*
       * Save basic user information locally
       * for displaying the name/avatar.
       *
       * Authentication itself is handled
       * by the Flask session cookie.
       */

      let loggedInUser = null;

      if (data.user) {
        loggedInUser = data.user;
      } else {
        loggedInUser = {
          id: data.user_id || null,
          user_id: data.user_id || null,
          name:
            data.name ||
            cleanEmail
              .split("@")[0]
              .replace(/^./, (char) =>
                char.toUpperCase()
              ),
          email: cleanEmail,
        };
      }

      localStorage.setItem(
        "user",
        JSON.stringify(loggedInUser)
      );

      /*
       * Keep user_id only for UI compatibility.
       *
       * Backend authorization should still
       * use Flask session, NOT this value.
       */
      if (
        data.user_id !== undefined &&
        data.user_id !== null
      ) {
        localStorage.setItem(
          "user_id",
          String(data.user_id)
        );
      } else if (
        loggedInUser.user_id !== undefined &&
        loggedInUser.user_id !== null
      ) {
        localStorage.setItem(
          "user_id",
          String(loggedInUser.user_id)
        );
      }

      /*
       * Optional login marker.
       * Do NOT treat this as real authentication.
       */
      localStorage.setItem(
        "logged_in",
        "true"
      );

      /*
       * Small delay so the browser has time
       * to process the Set-Cookie response
       * before navigating.
       */
      await new Promise((resolve) =>
        setTimeout(resolve, 100)
      );

      /*
       * Go to dashboard.
       */
      navigate("/");

    } catch (err) {
      console.error(
        "LOGIN ERROR:",
        err
      );

      setError(
        err?.message ||
          "Login failed. Please try again."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background:
          "linear-gradient(135deg, #020617, #0f172a, #111827)",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "430px",
          background: "#111827",
          border: "1px solid #263244",
          borderRadius: "20px",
          padding: "35px",
          boxShadow:
            "0 25px 70px rgba(0,0,0,0.45)",
        }}
      >
        {/* =========================
            LOGO
        ========================== */}

        <div
          style={{
            textAlign: "center",
            marginBottom: "30px",
          }}
        >
          <div
            style={{
              fontSize: "36px",
              fontWeight: "900",
              background:
                "linear-gradient(90deg,#0D9488,#14B8A6,#06B6D4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor:
                "transparent",
            }}
          >
            Amivest AI
          </div>

          <div
            style={{
              color: "#94a3b8",
              marginTop: "7px",
              fontSize: "14px",
            }}
          >
            Your AI Financial Guardian
          </div>
        </div>

        {/* =========================
            TITLE
        ========================== */}

        <h2
          style={{
            color: "#fff",
            textAlign: "center",
            marginBottom: "25px",
          }}
        >
          Welcome Back 👋
        </h2>

        <form onSubmit={handleLogin}>
          {/* =========================
              EMAIL
          ========================== */}

          <label
            htmlFor="login-email"
            style={{
              color: "#cbd5e1",
              fontSize: "13px",
              display: "block",
              marginBottom: "7px",
            }}
          >
            Email
          </label>

          <input
            id="login-email"
            type="email"
            name="email"
            autoComplete="username"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder="Enter your email"
            disabled={loading}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "13px 14px",
              borderRadius: "10px",
              border:
                "1px solid #334155",
              background: "#0B1420",
              color: "#fff",
              outline: "none",
              marginBottom: "18px",
              fontSize: "14px",
            }}
          />

          {/* =========================
              PASSWORD
          ========================== */}

          <label
            htmlFor="login-password"
            style={{
              color: "#cbd5e1",
              fontSize: "13px",
              display: "block",
              marginBottom: "7px",
            }}
          >
            Password
          </label>

          <div
            style={{
              position: "relative",
              marginBottom: "20px",
            }}
          >
            <input
              id="login-password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Enter your password"
              disabled={loading}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding:
                  "13px 65px 13px 14px",
                borderRadius: "10px",
                border:
                  "1px solid #334155",
                background: "#0B1420",
                color: "#fff",
                outline: "none",
                fontSize: "14px",
              }}
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  (current) => !current
                )
              }
              disabled={loading}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform:
                  "translateY(-50%)",
                border: "none",
                background: "transparent",
                color: "#94a3b8",
                cursor: loading
                  ? "not-allowed"
                  : "pointer",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              {showPassword
                ? "Hide"
                : "Show"}
            </button>
          </div>

          {/* =========================
              ERROR
          ========================== */}

          {error && (
            <div
              style={{
                background:
                  "rgba(239,68,68,0.1)",
                border:
                  "1px solid rgba(239,68,68,0.35)",
                color: "#fca5a5",
                borderRadius: "10px",
                padding: "11px",
                marginBottom: "18px",
                fontSize: "13px",
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* =========================
              LOGIN BUTTON
          ========================== */}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              border: "none",
              borderRadius: "10px",
              background: loading
                ? "#475569"
                : "linear-gradient(90deg,#0D9488,#06B6D4)",
              color: "#fff",
              fontWeight: "800",
              fontSize: "15px",
              cursor: loading
                ? "not-allowed"
                : "pointer",
              transition:
                "all 0.2s ease",
            }}
          >
            {loading
              ? "Signing in..."
              : "Login"}
          </button>
        </form>

        {/* =========================
            REGISTER
        ========================== */}

        <div
          style={{
            textAlign: "center",
            marginTop: "22px",
            color: "#94a3b8",
            fontSize: "13px",
          }}
        >
          Don't have an account?{" "}

          <Link
            to="/register"
            style={{
              color: "#14B8A6",
              fontWeight: "700",
              textDecoration: "none",
            }}
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Login;