import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:5000";

export default function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [termsAccepted, setTermsAccepted] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();

    setError("");

    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters."
      );
      return;
    }

    if (!termsAccepted) {
      setError(
        "Please accept the Terms & Conditions."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
            termsAccepted,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Could not create your account."
        );
      }

      alert(
        "✅ Registration Successful. Please login."
      );

      navigate("/login");

    } catch (err) {
      setError(
        err.message ||
          "Unable to register."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>

        <h2 style={titleStyle}>
          Amivest AI Register
        </h2>

        <p style={subtitleStyle}>
          Create your financial guardian account
        </p>

        {error && (
          <div style={errorStyle}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleRegister}>

          <input
            style={inputStyle}
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            autoComplete="name"
          />

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
            autoComplete="new-password"
          />

          <label style={termsStyle}>

            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) =>
                setTermsAccepted(
                  e.target.checked
                )
              }
            />

            <span>
              I agree to the{" "}
              <Link
                to="/terms"
                style={linkStyle}
              >
                Terms & Conditions
              </Link>{" "}
              and{" "}
              <Link
                to="/privacy"
                style={linkStyle}
              >
                Privacy Policy
              </Link>
            </span>

          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...buttonStyle,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading
              ? "Creating Account..."
              : "Create Account"}
          </button>

        </form>

        <p style={loginTextStyle}>
          Already have an account?{" "}

          <Link
            to="/login"
            style={linkStyle}
          >
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
  padding: "20px",
};

const cardStyle = {
  width: "100%",
  maxWidth: 420,
  background: "#1e293b",
  padding: 30,
  borderRadius: 14,
  boxShadow: "0 0 30px rgba(0,0,0,.35)",
  boxSizing: "border-box",
};

const titleStyle = {
  color: "#fff",
  textAlign: "center",
  marginBottom: 8,
};

const subtitleStyle = {
  color: "#94a3b8",
  textAlign: "center",
  marginBottom: 25,
};

const errorStyle = {
  background: "#3f1515",
  border: "1px solid #ef4444",
  color: "#fca5a5",
  padding: 12,
  borderRadius: 8,
  marginBottom: 18,
};

const inputStyle = {
  width: "100%",
  padding: 14,
  marginBottom: 15,
  borderRadius: 8,
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#fff",
  fontSize: 15,
  boxSizing: "border-box",
};

const buttonStyle = {
  width: "100%",
  padding: 14,
  marginTop: 18,
  background: "#14b8a6",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: 16,
  fontWeight: "bold",
  cursor: "pointer",
};

const termsStyle = {
  display: "flex",
  gap: 9,
  alignItems: "flex-start",
  color: "#94a3b8",
  fontSize: 12,
  lineHeight: 1.5,
};

const linkStyle = {
  color: "#14b8a6",
  fontWeight: "bold",
  textDecoration: "none",
};

const loginTextStyle = {
  color: "#94a3b8",
  textAlign: "center",
  marginTop: 20,
};