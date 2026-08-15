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

  const [legalModal, setLegalModal] =
    useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();

    setError("");

    if (
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
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
        "Please accept the Terms & Conditions and Privacy Policy."
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
            termsAccepted: true,
          }),
        }
      );

      const data = await response.json();

      console.log("REGISTER RESPONSE:", data);

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Could not create your account."
        );
      }

      alert(
        "✅ Registration Successful!\n\nPlease login to continue."
      );

      navigate("/login");
    } catch (err) {
      console.error("REGISTER ERROR:", err);

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
          Amivest AI
        </h2>

        <p style={subtitleStyle}>
          Create your AI Financial Guardian account
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

          {/* TERMS CHECKBOX */}

          <div style={termsBoxStyle}>

            <input
              id="registerTerms"
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => {
                setTermsAccepted(
                  e.target.checked
                );
                setError("");
              }}
              style={checkboxStyle}
            />

            <label
              htmlFor="registerTerms"
              style={termsLabelStyle}
            >
              I agree to the{" "}

              <button
                type="button"
                onClick={() =>
                  setLegalModal("terms")
                }
                style={legalButtonStyle}
              >
                Terms & Conditions
              </button>

              {" "}and{" "}

              <button
                type="button"
                onClick={() =>
                  setLegalModal("privacy")
                }
                style={legalButtonStyle}
              >
                Privacy Policy
              </button>
            </label>

          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...buttonStyle,
              opacity: loading ? 0.6 : 1,
              cursor: loading
                ? "not-allowed"
                : "pointer",
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

function LegalModal({ type, onClose }) {
  const isTerms = type === "terms";

  return (
    <div style={modalOverlayStyle}>

      <div style={modalStyle}>

        <div style={modalHeaderStyle}>

          <h3 style={{ margin: 0 }}>
            {isTerms
              ? "Terms & Conditions"
              : "Privacy Policy"}
          </h3>

          <button
            type="button"
            onClick={onClose}
            style={closeButtonStyle}
          >
            ✕
          </button>

        </div>

        <div style={modalContentStyle}>

          {isTerms ? (
            <>
              <h4>1. Acceptance</h4>
              <p>
                By using Amivest AI, you agree to
                these Terms & Conditions.
              </p>

              <h4>2. Account</h4>
              <p>
                You are responsible for keeping
                your account information secure.
              </p>

              <h4>3. Financial Information</h4>
              <p>
                Amivest AI provides educational
                and informational financial
                assistance. It does not guarantee
                investment returns.
              </p>

              <h4>4. Responsible Use</h4>
              <p>
                You agree to use the application
                lawfully and responsibly.
              </p>
            </>
          ) : (
            <>
              <h4>1. Information</h4>
              <p>
                Amivest AI may collect information
                such as your name and email to
                provide account services.
              </p>

              <h4>2. Security</h4>
              <p>
                We use reasonable security
                measures to protect your account
                information.
              </p>

              <h4>3. Your Data</h4>
              <p>
                Your information is used to
                provide and improve Amivest AI
                services.
              </p>

              <h4>4. Contact</h4>
              <p>
                You can contact the Amivest AI
                team regarding privacy questions.
              </p>
            </>
          )}

        </div>

        <button
          type="button"
          onClick={onClose}
          style={modalDoneButtonStyle}
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
  padding: "20px",
  boxSizing: "border-box",
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
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#fff",
  fontSize: 15,
  boxSizing: "border-box",
  outline: "none",
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
};

const termsBoxStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: 9,
  marginTop: 4,
};

const checkboxStyle = {
  marginTop: 3,
  width: 16,
  height: 16,
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

const loginTextStyle = {
  color: "#94a3b8",
  textAlign: "center",
  marginTop: 20,
};


// =====================================================
// MODAL STYLES
// =====================================================

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.75)",
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
  boxShadow: "0 0 40px rgba(0,0,0,.6)",
  overflow: "hidden",
};

const modalHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "18px 22px",
  color: "#fff",
  borderBottom: "1px solid #334155",
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
  width: "calc(100% - 44px)",
  padding: 12,
  background: "#14b8a6",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontWeight: "bold",
  cursor: "pointer",
};