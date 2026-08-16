import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";

// Production-safe API base.
// Vercel uses the same-origin /api proxy (see vercel.json).
// Local Vite can also proxy /api to Flask.
const API_URL = (
  import.meta.env.VITE_API_URL || "/api"
).replace(/\/$/, "");

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export default function Login() {
  const navigate = useNavigate();

  const [mode, setMode] =
    useState("password");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [otp, setOtp] =
    useState("");

  const [termsAccepted, setTermsAccepted] =
    useState(false);

  const [legalModal, setLegalModal] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [otpSent, setOtpSent] =
    useState(false);

  const [error, setError] =
    useState("");


  // =====================================================
  // GOOGLE
  // =====================================================

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      return;
    }

    const existingScript =
      document.getElementById(
        "google-gsi-script"
      );

    if (existingScript) {
      initializeGoogle();
      return;
    }

    const script =
      document.createElement("script");

    script.id =
      "google-gsi-script";

    script.src =
      "https://accounts.google.com/gsi/client";

    script.async = true;
    script.defer = true;

    script.onload =
      initializeGoogle;

    document.body.appendChild(script);

    function initializeGoogle() {
      if (!window.google) {
        return;
      }

      const container =
        document.getElementById(
          "google-login-button"
        );

      if (!container) {
        return;
      }

      container.innerHTML = "";

      window.google.accounts.id.initialize({
        client_id:
          GOOGLE_CLIENT_ID,

        callback:
          handleGoogleResponse,
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
  }, [termsAccepted]);


  // =====================================================
  // GOOGLE LOGIN
  // =====================================================

  const handleGoogleResponse =
    async (response) => {

      if (!termsAccepted) {
        setError(
          "Please accept the Terms & Conditions and Privacy Policy before continuing with Google."
        );
        return;
      }

      setError("");
      setLoading(true);

      try {
        const res =
          await fetch(
            `${API_URL}/google-login`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              credentials: "include",

              body: JSON.stringify({
                credential:
                  response.credential,
              }),
            }
          );

        const data =
          await res.json();

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
              "Google login failed."
          );
        }

        localStorage.setItem(
          "user",
          JSON.stringify(
            data.user
          )
        );

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


  // =====================================================
  // PASSWORD LOGIN
  // =====================================================

  const handlePasswordLogin =
    async (e) => {

      e.preventDefault();

      setError("");

      if (!termsAccepted) {
        setError(
          "Please accept the Terms & Conditions and Privacy Policy."
        );
        return;
      }

      if (
        !email.trim() ||
        !password
      ) {
        setError(
          "Please enter Email and Password."
        );
        return;
      }

      setLoading(true);

      try {
        const response =
          await fetch(
            `${API_URL}/login`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              credentials: "include",

              body: JSON.stringify({
                email:
                  email.trim(),
                password,
              }),
            }
          );

        const data =
          await response.json();

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
              "Invalid Email or Password."
          );
        }

        localStorage.setItem(
          "user",
          JSON.stringify(
            data.user
          )
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

        console.log(
          "SESSION:",
          sessionData
        );

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


  // =====================================================
  // SEND OTP
  // =====================================================

  const handleSendOTP =
    async () => {

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

              headers: {
                "Content-Type":
                  "application/json",
              },

              credentials: "include",

              body: JSON.stringify({
                email:
                  email.trim(),
              }),
            }
          );

        const data =
          await response.json();

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
              "Unable to send OTP."
          );
        }

        setOtpSent(true);
        setOtp("");
        setError("");

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


  // =====================================================
  // VERIFY OTP
  // =====================================================

  const handleVerifyOTP =
    async (e) => {

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

              headers: {
                "Content-Type":
                  "application/json",
              },

              credentials: "include",

              body: JSON.stringify({
                email:
                  email.trim(),

                otp:
                  otp.trim(),
              }),
            }
          );

        const data =
          await response.json();

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
              "Invalid OTP."
          );
        }

        localStorage.setItem(
          "user",
          JSON.stringify(
            data.user
          )
        );

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


  // =====================================================
  // CHANGE MODE
  // =====================================================

  const changeMode =
    (newMode) => {

      setMode(newMode);
      setError("");

      if (
        newMode === "password"
      ) {
        setOtpSent(false);
        setOtp("");
      }
    };


  // =====================================================
  // UI
  // =====================================================

  return (
    <div style={containerStyle}>

      <div style={cardStyle}>

        <h2 style={titleStyle}>
          Amivest AI
        </h2>

        <p style={subtitleStyle}>
          Your AI Financial Guardian
        </p>


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
            }}
          />

        ) : (

          <button
            type="button"
            onClick={() =>
              setError(
                "Google login is not configured. Add VITE_GOOGLE_CLIENT_ID in Vercel."
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


        {/* MODE TABS */}

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


        {/* PASSWORD */}

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
                  loading ? 0.6 : 1,
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


        {/* OTP */}

        {mode === "otp" && (

          <form
            onSubmit={
              handleVerifyOTP
            }
          >

            <input
              style={inputStyle}
              type="email"
              name="otpEmail"
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
                      e.target.value
                        .replace(
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

        <div style={termsBoxStyle}>

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
            style={checkboxStyle}
          />

          <label
            htmlFor="loginTerms"
            style={termsLabelStyle}
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


// =====================================================
// LEGAL MODAL
// =====================================================

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


// =====================================================
// STYLES
// =====================================================

const containerStyle = {
  minHeight: "100vh",
  background: "#0f172a",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 20,
  boxSizing: "border-box",
};

const cardStyle = {
  width: "100%",
  maxWidth: 420,
  background: "#1e293b",
  padding: 30,
  borderRadius: 14,
  boxShadow:
    "0 0 35px rgba(0,0,0,.35)",
  boxSizing: "border-box",
};

const titleStyle = {
  color: "#fff",
  textAlign: "center",
  marginBottom: 6,
  fontSize: 28,
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
  fontSize: 14,
};

const inputStyle = {
  width: "100%",
  padding: 14,
  marginBottom: 15,
  borderRadius: 8,
  border:
    "1px solid #334155",
  background: "#0f172a",
  color: "#fff",
  fontSize: 15,
  boxSizing: "border-box",
  outline: "none",
};

const buttonStyle = {
  width: "100%",
  padding: 14,
  background: "#14b8a6",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: 16,
  fontWeight: "bold",
  cursor: "pointer",
};

const googleButtonStyle = {
  width: "100%",
  padding: 13,
  background: "#fff",
  color: "#111827",
  border: "none",
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
};

const dividerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#64748b",
  margin: "20px 0",
  fontSize: 12,
};

const modeContainerStyle = {
  display: "grid",
  gridTemplateColumns:
    "1fr 1fr",
  gap: 8,
  marginBottom: 18,
};

const modeButtonStyle = {
  padding: 10,
  border:
    "1px solid #334155",
  borderRadius: 8,
  fontWeight: 600,
  cursor: "pointer",
};

const resendButtonStyle = {
  width: "100%",
  padding: 10,
  marginTop: 10,
  background: "transparent",
  color: "#14b8a6",
  border:
    "1px solid #14b8a6",
  borderRadius: 8,
  cursor: "pointer",
};

const termsBoxStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: 9,
  marginTop: 20,
};

const checkboxStyle = {
  width: 16,
  height: 16,
  marginTop: 3,
  cursor: "pointer",
  accentColor: "#14b8a6",
  flexShrink: 0,
};

const termsLabelStyle = {
  color: "#94a3b8",
  fontSize: 12,
  lineHeight: 1.6,
};

const legalButtonStyle = {
  background: "none",
  border: "none",
  padding: 0,
  color: "#14b8a6",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: 12,
};

const linkStyle = {
  color: "#14b8a6",
  fontWeight: "bold",
  textDecoration: "none",
};

const registerTextStyle = {
  color: "#94a3b8",
  textAlign: "center",
  marginTop: 20,
};


// =====================================================
// MODAL
// =====================================================

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  background:
    "rgba(0,0,0,.75)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 20,
  zIndex: 9999,
};

const modalStyle = {
  width: "100%",
  maxWidth: 550,
  maxHeight: "80vh",
  background: "#1e293b",
  borderRadius: 14,
  boxShadow:
    "0 0 40px rgba(0,0,0,.6)",
  overflow: "hidden",
};

const modalHeaderStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  padding: "18px 22px",
  borderBottom:
    "1px solid #334155",
};

const closeButtonStyle = {
  background: "transparent",
  border: "none",
  color: "#94a3b8",
  fontSize: 20,
  cursor: "pointer",
};

const modalContentStyle = {
  padding: "20px 22px",
  color: "#cbd5e1",
  fontSize: 14,
  lineHeight: 1.6,
  overflowY: "auto",
  maxHeight: "55vh",
};

const modalDoneButtonStyle = {
  margin: "0 22px 20px",
  width:
    "calc(100% - 44px)",
  padding: 12,
  background: "#14b8a6",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontWeight: "bold",
  cursor: "pointer",
};