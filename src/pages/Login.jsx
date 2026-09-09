import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";

/*
===========================================================
API CONFIGURATION
===========================================================

LOCAL:
http://127.0.0.1:5000

PRODUCTION:
Set VITE_BACKEND_URL in Vercel.

Example:
VITE_BACKEND_URL=https://your-backend.onrender.com
*/

const API_URL = (
  import.meta.env.VITE_BACKEND_URL?.trim() ||
  import.meta.env.VITE_API_URL?.trim() ||
  (window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:5000"
    : "/api")
).replace(/\/$/, "");

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || "";

function Login() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("password");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [termsAccepted, setTermsAccepted] = useState(false);

  const [legalModal, setLegalModal] = useState(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  /*
  =========================================================
  GOOGLE LOGIN INITIALIZATION
  =========================================================
  */

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn(
        "VITE_GOOGLE_CLIENT_ID is not configured."
      );
      return;
    }

    const initializeGoogle = () => {
      if (!window.google?.accounts?.id) {
        console.error(
          "Google Identity Services is not available."
        );
        return;
      }

      const container =
        document.getElementById("google-login-button");

      if (!container) {
        return;
      }

      container.innerHTML = "";

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,

        callback: handleGoogleResponse,

        auto_select: false,

        cancel_on_tap_outside: true,
      });

      window.google.accounts.id.renderButton(
        container,
        {
          theme: "outline",
          size: "large",
          width: 340,
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
        }
      );
    };

    const existingScript =
      document.getElementById(
        "google-gsi-script"
      );

    if (existingScript) {
      if (window.google?.accounts?.id) {
        initializeGoogle();
      } else {
        existingScript.addEventListener(
          "load",
          initializeGoogle,
          { once: true }
        );
      }

      return;
    }

    const script =
      document.createElement("script");

    script.id = "google-gsi-script";

    script.src =
      "https://accounts.google.com/gsi/client";

    script.async = true;
    script.defer = true;

    script.onload = initializeGoogle;

    script.onerror = () => {
      setError(
        "Unable to load Google Login. Check your internet connection."
      );
    };

    document.body.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, [termsAccepted]);

  /*
  =========================================================
  GOOGLE LOGIN
  =========================================================
  */

  const handleGoogleResponse = async (
    response
  ) => {
    if (!termsAccepted) {
      setError(
        "Please accept the Terms & Conditions and Privacy Policy before continuing with Google."
      );
      return;
    }

    if (!response?.credential) {
      setError(
        "Google authentication failed. Please try again."
      );
      return;
    }

    setError("");
    setLoading(true);

    try {
      console.log(
        "GOOGLE LOGIN API:",
        `${API_URL}/google-login`
      );

      const res = await fetch(
        `${API_URL}/google-login`,
        {
          method: "POST",

          credentials: "include",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            credential:
              response.credential,
          }),
        }
      );

      let data = {};

      try {
        data = await res.json();
      } catch {
        data = {};
      }

      console.log(
        "GOOGLE RESPONSE:",
        data
      );

      if (
        !res.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            data.error ||
            "Google login failed."
        );
      }

      if (data.user) {
        localStorage.setItem(
          "user",
          JSON.stringify(data.user)
        );
      }

      if (data.user_id) {
        localStorage.setItem(
          "user_id",
          String(data.user_id)
        );
      }

      navigate("/");

    } catch (err) {
      console.error(
        "GOOGLE LOGIN ERROR:",
        err
      );

      setError(
        err.message ||
          "Google login failed."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
  =========================================================
  PASSWORD LOGIN
  =========================================================
  */

  const handlePasswordLogin = async (
    e
  ) => {
    e.preventDefault();

    setError("");

    if (!termsAccepted) {
      setError(
        "Please accept the Terms & Conditions and Privacy Policy."
      );
      return;
    }

    if (!email.trim()) {
      setError(
        "Please enter your email."
      );
      return;
    }

    if (!password) {
      setError(
        "Please enter your password."
      );
      return;
    }

    setLoading(true);

    try {
      console.log(
        "LOGIN API:",
        `${API_URL}/login`
      );

      const response =
        await fetch(
          `${API_URL}/login`,
          {
            method: "POST",

            credentials: "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              email:
                email.trim(),
              password,
            }),
          }
        );

      let data = {};

      try {
        data =
          await response.json();
      } catch {
        data = {};
      }

      console.log(
        "LOGIN RESPONSE:",
        data
      );

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            data.error ||
            "Invalid Email or Password."
        );
      }

      if (data.user) {
        localStorage.setItem(
          "user",
          JSON.stringify(data.user)
        );
      } else {
        localStorage.setItem(
          "user",
          JSON.stringify({
            email:
              email.trim(),
            name:
              data.name ||
              email
                .split("@")[0],
          })
        );
      }

      if (data.user_id) {
        localStorage.setItem(
          "user_id",
          String(data.user_id)
        );
      }

      /*
      -------------------------------------------------------
      VERIFY SESSION
      -------------------------------------------------------
      */

      try {
        const sessionResponse =
          await fetch(
            `${API_URL}/session`,
            {
              method: "GET",
              credentials:
                "include",
            }
          );

        const sessionData =
          await sessionResponse.json();

        console.log(
          "SESSION:",
          sessionData
        );

        if (
          !sessionResponse.ok ||
          sessionData.authenticated === false
        ) {
          throw new Error(
            "Login succeeded, but session was not created."
          );
        }
      } catch (sessionError) {
        console.warn(
          "SESSION CHECK:",
          sessionError
        );

        /*
        Don't block login if the backend
        does not provide /session.
        */
      }

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

  /*
  =========================================================
  SEND OTP
  =========================================================
  */

  const handleSendOTP = async () => {
    setError("");

    if (!termsAccepted) {
      setError(
        "Please accept the Terms & Conditions and Privacy Policy."
      );
      return;
    }

    if (!email.trim()) {
      setError(
        "Please enter your email first."
      );
      return;
    }

    setLoading(true);

    try {
      const response =
        await fetch(
          `${API_URL}/send-otp`,
          {
            method: "POST",

            credentials: "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              email:
                email.trim(),
            }),
          }
        );

      let data = {};

      try {
        data =
          await response.json();
      } catch {
        data = {};
      }

      console.log(
        "SEND OTP RESPONSE:",
        data
      );

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            data.error ||
            "Unable to send OTP."
        );
      }

      setOtpSent(true);
      setOtp("");

      alert(
        "✅ OTP sent to your email."
      );

    } catch (err) {
      console.error(
        "OTP SEND ERROR:",
        err
      );

      setError(
        err.message ||
          "Unable to send OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
  =========================================================
  VERIFY OTP
  =========================================================
  */

  const handleVerifyOTP = async (
    e
  ) => {
    e.preventDefault();

    setError("");

    if (!termsAccepted) {
      setError(
        "Please accept the Terms & Conditions and Privacy Policy."
      );
      return;
    }

    if (!email.trim()) {
      setError(
        "Please enter your email."
      );
      return;
    }

    if (!otp.trim()) {
      setError(
        "Please enter the OTP."
      );
      return;
    }

    if (otp.length !== 6) {
      setError(
        "OTP must contain 6 digits."
      );
      return;
    }

    setLoading(true);

    try {
      const response =
        await fetch(
          `${API_URL}/verify-otp`,
          {
            method: "POST",

            credentials: "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              email:
                email.trim(),

              otp:
                otp.trim(),
            }),
          }
        );

      let data = {};

      try {
        data =
          await response.json();
      } catch {
        data = {};
      }

      console.log(
        "VERIFY OTP RESPONSE:",
        data
      );

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            data.error ||
            "Invalid OTP."
        );
      }

      if (data.user) {
        localStorage.setItem(
          "user",
          JSON.stringify(data.user)
        );
      }

      if (data.user_id) {
        localStorage.setItem(
          "user_id",
          String(data.user_id)
        );
      }

      navigate("/");

    } catch (err) {
      console.error(
        "OTP VERIFY ERROR:",
        err
      );

      setError(
        err.message ||
          "OTP verification failed."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
  =========================================================
  CHANGE LOGIN MODE
  =========================================================
  */

  const changeMode = (
    newMode
  ) => {
    setMode(newMode);

    setError("");

    if (
      newMode === "password"
    ) {
      setOtpSent(false);
      setOtp("");
    }
  };

  /*
  =========================================================
  UI
  =========================================================
  */

  return (
    <div style={containerStyle}>

      <div style={cardStyle}>

        {/* LOGO */}

        <h2 style={titleStyle}>
          Amivest AI
        </h2>

        <p style={subtitleStyle}>
          Your AI Financial Guardian
        </p>

        {/* TITLE */}

        <h2
          style={{
            color: "#fff",
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          Welcome Back 👋
        </h2>

        {/* ERROR */}

        {error && (
          <div style={errorStyle}>
            ⚠️ {error}
          </div>
        )}

        {/* GOOGLE */}

        {GOOGLE_CLIENT_ID ? (
          <div
            id="google-login-button"
            style={{
              display: "flex",
              justifyContent:
                "center",
              minHeight: 42,
              marginBottom: 5,
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() =>
              setError(
                "Google login is not configured. Add VITE_GOOGLE_CLIENT_ID to your frontend environment."
              )
            }
            style={
              googleButtonStyle
            }
          >
            <span
              style={{
                fontSize: 20,
                fontWeight: "bold",
              }}
            >
              G
            </span>

            Continue with Google
          </button>
        )}

        {/* DIVIDER */}

        <div style={dividerStyle}>
          <span>OR</span>
        </div>

        {/* MODE BUTTONS */}

        <div
          style={
            modeContainerStyle
          }
        >

          <button
            type="button"
            onClick={() =>
              changeMode(
                "password"
              )
            }
            style={{
              ...modeButtonStyle,

              background:
                mode ===
                "password"
                  ? "#14b8a6"
                  : "#0f172a",

              color:
                mode ===
                "password"
                  ? "#fff"
                  : "#94a3b8",
            }}
          >
            Password
          </button>

          <button
            type="button"
            onClick={() =>
              changeMode("otp")
            }
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

        {/* PASSWORD LOGIN */}

        {mode === "password" && (
          <form
            onSubmit={
              handlePasswordLogin
            }
          >

            <input
              style={inputStyle}
              type="email"
              name="email"
              placeholder="Email"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              autoComplete="email"
            />

            <input
              style={inputStyle}
              type="password"
              name="password"
              placeholder="Password"
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              autoComplete="current-password"
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                ...buttonStyle,

                opacity:
                  loading
                    ? 0.6
                    : 1,

                cursor:
                  loading
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {loading
                ? "Logging in..."
                : "Login"}
            </button>

          </form>
        )}

        {/* OTP LOGIN */}

        {mode === "otp" && (
          <form
            onSubmit={
              handleVerifyOTP
            }
          >

            <input
              style={inputStyle}
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              autoComplete="email"
            />

            {!otpSent ? (
              <button
                type="button"
                onClick={
                  handleSendOTP
                }
                disabled={loading}
                style={{
                  ...buttonStyle,
                  opacity:
                    loading
                      ? 0.6
                      : 1,
                }}
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
                    textAlign:
                      "center",
                    letterSpacing:
                      "8px",
                    fontSize:
                      "20px",
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••••"
                  value={otp}
                  onChange={(e) =>
                    setOtp(
                      e.target.value.replace(
                        /\D/g,
                        ""
                      )
                    )
                  }
                />

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    ...buttonStyle,
                    opacity:
                      loading
                        ? 0.6
                        : 1,
                  }}
                >
                  {loading
                    ? "Verifying..."
                    : "Verify OTP & Login"}
                </button>

                <button
                  type="button"
                  onClick={
                    handleSendOTP
                  }
                  disabled={loading}
                  style={
                    resendButtonStyle
                  }
                >
                  Resend OTP
                </button>
              </>
            )}

          </form>
        )}

        {/* TERMS */}

        <div
          style={
            termsBoxStyle
          }
        >

          <input
            id="loginTerms"
            type="checkbox"
            checked={
              termsAccepted
            }
            onChange={(e) => {
              setTermsAccepted(
                e.target.checked
              );

              setError("");
            }}
            style={
              checkboxStyle
            }
          />

          <label
            htmlFor="loginTerms"
            style={
              termsLabelStyle
            }
          >
            I agree to the{" "}

            <button
              type="button"
              onClick={() =>
                setLegalModal(
                  "terms"
                )
              }
              style={
                legalButtonStyle
              }
            >
              Terms & Conditions
            </button>

            {" "}and{" "}

            <button
              type="button"
              onClick={() =>
                setLegalModal(
                  "privacy"
                )
              }
              style={
                legalButtonStyle
              }
            >
              Privacy Policy
            </button>

          </label>

        </div>

        {/* REGISTER */}

        <p
          style={
            registerTextStyle
          }
        >
          Don't have an account?{" "}

          <Link
            to="/register"
            style={linkStyle}
          >
            Register
          </Link>
        </p>

      </div>

      {/* LEGAL MODAL */}

      {legalModal && (
        <LegalModal
          type={legalModal}
          onClose={() =>
            setLegalModal(null)
          }
        />
      )}

    </div>
  );
}

/*
===========================================================
LEGAL MODAL
===========================================================
*/

function LegalModal({
  type,
  onClose,
}) {
  const isTerms =
    type === "terms";

  return (
    <div
      style={
        modalOverlayStyle
      }
    >

      <div
        style={modalStyle}
      >

        <div
          style={
            modalHeaderStyle
          }
        >

          <h3
            style={{
              margin: 0,
              color: "#fff",
            }}
          >
            {isTerms
              ? "Terms & Conditions"
              : "Privacy Policy"}
          </h3>

          <button
            type="button"
            onClick={onClose}
            style={
              closeButtonStyle
            }
          >
            ✕
          </button>

        </div>

        <div
          style={
            modalContentStyle
          }
        >

          {isTerms ? (
            <>
              <h4>
                1. Acceptance
              </h4>

              <p>
                By using Amivest AI,
                you agree to these
                Terms & Conditions.
              </p>

              <h4>
                2. Account
              </h4>

              <p>
                You are responsible
                for keeping your
                account information
                secure.
              </p>

              <h4>
                3. Financial Information
              </h4>

              <p>
                Amivest AI provides
                educational and
                informational
                financial assistance.
                It does not guarantee
                investment returns.
              </p>

              <h4>
                4. Responsible Use
              </h4>

              <p>
                You agree to use
                the application
                lawfully and
                responsibly.
              </p>
            </>
          ) : (
            <>
              <h4>
                1. Information
              </h4>

              <p>
                Amivest AI may
                collect information
                such as your name
                and email to provide
                account services.
              </p>

              <h4>
                2. Security
              </h4>

              <p>
                We use reasonable
                security measures
                to protect your
                account information.
              </p>

              <h4>
                3. Your Data
              </h4>

              <p>
                Your information
                is used to provide
                and improve Amivest
                AI services.
              </p>

              <h4>
                4. Contact
              </h4>

              <p>
                You can contact
                the Amivest AI team
                regarding privacy
                questions.
              </p>
            </>
          )}

        </div>

        <button
          type="button"
          onClick={onClose}
          style={
            modalDoneButtonStyle
          }
        >
          Close
        </button>

      </div>

    </div>
  );
}

/*
===========================================================
STYLES
===========================================================
*/

const containerStyle = {
  minHeight: "100vh",

  background:
    "linear-gradient(135deg,#020617,#0f172a,#111827)",

  display: "flex",

  justifyContent:
    "center",

  alignItems:
    "center",

  padding: 20,

  boxSizing:
    "border-box",
};

const cardStyle = {
  width: "100%",

  maxWidth: 540,

  background:
    "#111827",

  padding: 38,

  borderRadius: 20,

  border:
    "1px solid #263244",

  boxShadow:
    "0 25px 70px rgba(0,0,0,.45)",

  boxSizing:
    "border-box",
};

const titleStyle = {
  color: "#14b8a6",

  textAlign:
    "center",

  marginBottom:
    6,

  fontSize:
    34,

  fontWeight:
    900,
};

const subtitleStyle = {
  color:
    "#94a3b8",

  textAlign:
    "center",

  marginBottom:
    28,

  fontSize:
    14,
};

const errorStyle = {
  background:
    "rgba(239,68,68,.12)",

  border:
    "1px solid rgba(239,68,68,.4)",

  color:
    "#fca5a5",

  padding:
    12,

  borderRadius:
    8,

  marginBottom:
    18,

  fontSize:
    14,
};

const inputStyle = {
  width:
    "100%",

  padding:
    "14px",

  marginBottom:
    15,

  borderRadius:
    10,

  border:
    "1px solid #334155",

  background:
    "#0b1420",

  color:
    "#fff",

  fontSize:
    15,

  boxSizing:
    "border-box",

  outline:
    "none",
};

const buttonStyle = {
  width:
    "100%",

  padding:
    14,

  background:
    "linear-gradient(90deg,#0d9488,#06b6d4)",

  color:
    "#fff",

  border:
    "none",

  borderRadius:
    10,

  fontSize:
    16,

  fontWeight:
    "bold",

  cursor:
    "pointer",
};

const googleButtonStyle = {
  width:
    "100%",

  padding:
    13,

  background:
    "#fff",

  color:
    "#111827",

  border:
    "none",

  borderRadius:
    8,

  fontSize:
    15,

  fontWeight:
    600,

  cursor:
    "pointer",

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  gap:
    10,
};

const dividerStyle = {
  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  color:
    "#64748b",

  margin:
    "20px 0",

  fontSize:
    12,
};

const modeContainerStyle = {
  display:
    "grid",

  gridTemplateColumns:
    "1fr 1fr",

  gap:
    8,

  marginBottom:
    18,
};

const modeButtonStyle = {
  padding:
    10,

  border:
    "1px solid #334155",

  borderRadius:
    8,

  fontWeight:
    600,

  cursor:
    "pointer",
};

const resendButtonStyle = {
  width:
    "100%",

  padding:
    10,

  marginTop:
    10,

  background:
    "transparent",

  color:
    "#14b8a6",

  border:
    "1px solid #14b8a6",

  borderRadius:
    8,

  cursor:
    "pointer",
};

const termsBoxStyle = {
  display:
    "flex",

  alignItems:
    "flex-start",

  gap:
    9,

  marginTop:
    20,
};

const checkboxStyle = {
  width:
    16,

  height:
    16,

  marginTop:
    3,

  cursor:
    "pointer",

  accentColor:
    "#14b8a6",

  flexShrink:
    0,
};

const termsLabelStyle = {
  color:
    "#94a3b8",

  fontSize:
    12,

  lineHeight:
    1.6,
};

const legalButtonStyle = {
  background:
    "none",

  border:
    "none",

  padding:
    0,

  color:
    "#14b8a6",

  fontWeight:
    "bold",

  cursor:
    "pointer",

  fontSize:
    12,
};

const linkStyle = {
  color:
    "#14b8a6",

  fontWeight:
    "bold",

  textDecoration:
    "none",
};

const registerTextStyle = {
  color:
    "#94a3b8",

  textAlign:
    "center",

  marginTop:
    20,
};

/*
===========================================================
MODAL
===========================================================
*/

const modalOverlayStyle = {
  position:
    "fixed",

  inset:
    0,

  background:
    "rgba(0,0,0,.75)",

  display:
    "flex",

  justifyContent:
    "center",

  alignItems:
    "center",

  padding:
    20,

  zIndex:
    9999,
};

const modalStyle = {
  width:
    "100%",

  maxWidth:
    550,

  maxHeight:
    "80vh",

  background:
    "#1e293b",

  borderRadius:
    14,

  boxShadow:
    "0 0 40px rgba(0,0,0,.6)",

  overflow:
    "hidden",
};

const modalHeaderStyle = {
  display:
    "flex",

  justifyContent:
    "space-between",

  alignItems:
    "center",

  padding:
    "18px 22px",

  borderBottom:
    "1px solid #334155",
};

const closeButtonStyle = {
  background:
    "transparent",

  border:
    "none",

  color:
    "#94a3b8",

  fontSize:
    20,

  cursor:
    "pointer",
};

const modalContentStyle = {
  padding:
    "20px 22px",

  color:
    "#cbd5e1",

  fontSize:
    14,

  lineHeight:
    1.6,

  overflowY:
    "auto",

  maxHeight:
    "55vh",
};

const modalDoneButtonStyle = {
  margin:
    "0 22px 20px",

  width:
    "calc(100% - 44px)",

  padding:
    12,

  background:
    "#14b8a6",

  color:
    "#fff",

  border:
    "none",

  borderRadius:
    8,

  fontWeight:
    "bold",

  cursor:
    "pointer",
};

export default Login;