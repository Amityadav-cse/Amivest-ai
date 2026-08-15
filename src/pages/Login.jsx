import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:5000";

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export default function Login() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("password");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [termsAccepted, setTermsAccepted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");

  // =====================================================
  // GOOGLE SCRIPT
  // =====================================================

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      return;
    }

    if (document.getElementById("google-gsi-script")) {
      initializeGoogle();
      return;
    }

    const script = document.createElement("script");

    script.id = "google-gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    script.onload = initializeGoogle;

    document.body.appendChild(script);

    function initializeGoogle() {
      if (!window.google) return;

      const container =
        document.getElementById("google-login-button");

      if (!container) return;

      container.innerHTML = "";

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      });

      window.google.accounts.id.renderButton(
        container,
        {
          theme: "outline",
          size: "large",
          width: 340,
          text: "continue_with",
          shape: "rectangular",
        }
      );
    }

    return () => {
      // Google script is intentionally kept.
    };
  }, []);

  // =====================================================
  // GOOGLE LOGIN
  // =====================================================

  const handleGoogleResponse = async (response) => {
    if (!termsAccepted) {
      setError(
        "Please accept the Terms & Conditions before continuing."
      );
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch(
        `${API_URL}/google-login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            credential: response.credential,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.message ||
            "Google login failed."
        );
      }

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      navigate("/");
    } catch (err) {
      setError(
        err.message ||
          "Google login failed."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // PASSWORD LOGIN
  // =====================================================

  const handlePasswordLogin = async (e) => {
    e.preventDefault();

    setError("");

    if (!termsAccepted) {
      setError(
        "Please accept the Terms & Conditions."
      );
      return;
    }

    if (!email.trim() || !password) {
      setError(
        "Please enter Email and Password."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Invalid Email or Password."
        );
      }

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      const sessionResponse =
        await fetch(
          `${API_URL}/session`,
          {
            method: "GET",
            credentials: "include",
          }
        );

      const sessionData =
        await sessionResponse.json();

      if (
        !sessionResponse.ok ||
        !sessionData.authenticated
      ) {
        throw new Error(
          "Login succeeded, but session was not created."
        );
      }

      navigate("/");
    } catch (err) {
      setError(
        err.message ||
          "Unable to login."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // SEND OTP
  // =====================================================

  const handleSendOTP = async () => {
    setError("");

    if (!termsAccepted) {
      setError(
        "Please accept the Terms & Conditions."
      );
      return;
    }

    if (!email.trim()) {
      setError("Enter your email first.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/send-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email: email.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to send OTP."
        );
      }

      setOtpSent(true);

      setError("");

    } catch (err) {
      setError(
        err.message ||
          "Unable to send OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // VERIFY OTP
  // =====================================================

  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    setError("");

    if (!termsAccepted) {
      setError(
        "Please accept the Terms & Conditions."
      );
      return;
    }

    if (!email.trim() || !otp.trim()) {
      setError(
        "Enter your email and OTP."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/verify-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email: email.trim(),
            otp: otp.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Invalid OTP."
        );
      }

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      navigate("/");
    } catch (err) {
      setError(
        err.message ||
          "OTP verification failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>

        <h2 style={titleStyle}>
          Amivest AI
        </h2>

        <p style={subtitleStyle}>
          Your AI Financial Guardian
        </p>

        {error && (
          <div style={errorStyle}>
            ⚠️ {error}
          </div>
        )}

        {/* =================================================
            GOOGLE
        ================================================= */}

        <div
          id="google-login-button"
          style={{
            display: "flex",
            justifyContent: "center",
            minHeight: GOOGLE_CLIENT_ID
              ? "42px"
              : "0px",
          }}
        />

        {!GOOGLE_CLIENT_ID && (
          <button
            type="button"
            onClick={() =>
              setError(
                "Google login is not configured yet."
              )
            }
            style={googleButtonStyle}
          >
            <span style={{ fontSize: 20 }}>
              G
            </span>
            Continue with Google
          </button>
        )}

        <div style={dividerStyle}>
          <span>OR</span>
        </div>

        {/* =================================================
            MODE BUTTONS
        ================================================= */}

        <div style={modeContainerStyle}>

          <button
            type="button"
            onClick={() => {
              setMode("password");
              setError("");
              setOtpSent(false);
            }}
            style={{
              ...modeButtonStyle,
              background:
                mode === "password"
                  ? "#14b8a6"
                  : "#0f172a",
              color:
                mode === "password"
                  ? "#fff"
                  : "#94a3b8",
            }}
          >
            Password
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("otp");
              setError("");
            }}
            style={{
              ...modeButtonStyle,
              background:
                mode === "otp"
                  ? "#14b8a6"
                  : "#0f172a",
              color:
                mode === "otp"
                  ? "#fff"
                  : "#94a3b8",
            }}
          >
            Email OTP
          </button>

        </div>

        {/* =================================================
            PASSWORD LOGIN
        ================================================= */}

        {mode === "password" && (
          <form
            onSubmit={handlePasswordLogin}
          >

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
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading
                ? "Logging in..."
                : "Login"}
            </button>

          </form>
        )}

        {/* =================================================
            OTP LOGIN
        ================================================= */}

        {mode === "otp" && (
          <form
            onSubmit={handleVerifyOTP}
          >

            <input
              style={inputStyle}
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              autoComplete="email"
            />

            {!otpSent ? (
              <button
                type="button"
                disabled={loading}
                onClick={handleSendOTP}
                style={buttonStyle}
              >
                {loading
                  ? "Sending OTP..."
                  : "Send OTP"}
              </button>
            ) : (
              <>
                <input
                  style={{
                    ...inputStyle,
                    textAlign: "center",
                    letterSpacing: "8px",
                    fontSize: "20px",
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••••"
                  value={otp}
                  onChange={(e) =>
                    setOtp(
                      e.target.value
                        .replace(/\D/g, "")
                    )
                  }
                />

                <button
                  type="submit"
                  disabled={loading}
                  style={buttonStyle}
                >
                  {loading
                    ? "Verifying..."
                    : "Verify OTP & Login"}
                </button>

                <button
                  type="button"
                  onClick={handleSendOTP}
                  disabled={loading}
                  style={resendButtonStyle}
                >
                  Resend OTP
                </button>
              </>
            )}

          </form>
        )}

        {/* =================================================
            TERMS
        ================================================= */}

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

        <p style={registerTextStyle}>
          Don't have an account?{" "}

          <Link
            to="/register"
            style={linkStyle}
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
  maxWidth: "420px",
  background: "#1e293b",
  padding: "30px",
  borderRadius: "14px",
  boxShadow: "0 0 35px rgba(0,0,0,.35)",
  boxSizing: "border-box",
};

const titleStyle = {
  color: "#fff",
  textAlign: "center",
  marginBottom: "6px",
  fontSize: "28px",
};

const subtitleStyle = {
  color: "#94a3b8",
  textAlign: "center",
  marginBottom: "25px",
};

const errorStyle = {
  background: "#3f1515",
  border: "1px solid #ef4444",
  color: "#fca5a5",
  padding: "12px",
  borderRadius: "8px",
  marginBottom: "18px",
  fontSize: "14px",
};

const inputStyle = {
  width: "100%",
  padding: "14px",
  marginBottom: "15px",
  borderRadius: "8px",
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#fff",
  fontSize: "15px",
  boxSizing: "border-box",
  outline: "none",
};

const buttonStyle = {
  width: "100%",
  padding: "14px",
  background: "#14b8a6",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
};

const googleButtonStyle = {
  width: "100%",
  padding: "13px",
  background: "#fff",
  color: "#111827",
  border: "none",
  borderRadius: "8px",
  fontSize: "15px",
  fontWeight: "600",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
};

const dividerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#64748b",
  margin: "20px 0",
  fontSize: "12px",
};

const modeContainerStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "8px",
  marginBottom: "18px",
};

const modeButtonStyle = {
  padding: "10px",
  border: "1px solid #334155",
  borderRadius: "8px",
  fontWeight: "600",
  cursor: "pointer",
};

const resendButtonStyle = {
  width: "100%",
  padding: "10px",
  marginTop: "10px",
  background: "transparent",
  color: "#14b8a6",
  border: "1px solid #14b8a6",
  borderRadius: "8px",
  cursor: "pointer",
};

const termsStyle = {
  display: "flex",
  gap: "9px",
  alignItems: "flex-start",
  color: "#94a3b8",
  fontSize: "12px",
  lineHeight: "1.5",
  marginTop: "20px",
};

const linkStyle = {
  color: "#14b8a6",
  fontWeight: "bold",
  textDecoration: "none",
};

const registerTextStyle = {
  color: "#94a3b8",
  textAlign: "center",
  marginTop: "20px",
};