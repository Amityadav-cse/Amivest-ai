import { useEffect, useMemo, useState } from "react";

/* =========================================================
   API CONFIG
   =========================================================
   Production:
     Vercel -> /api -> Render backend

   Local:
     Vite proxy -> /api -> localhost:5000

   If VITE_API_URL is set, it can also point directly to
   your backend.
========================================================= */

const API_BASE = (
  import.meta.env.VITE_API_URL?.trim() || "/api"
).replace(/\/$/, "");

async function apiCall(path, options = {}) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const method = (options.method || "GET").toUpperCase();

    const response = await fetch(`${API_BASE}${cleanPath}`, {
      ...options,
      method,
      credentials: "include",
      signal: controller.signal,
      headers: {
        ...(method !== "GET"
          ? { "Content-Type": "application/json" }
          : {}),
        ...(options.headers || {}),
      },
    });

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          `Request failed with HTTP ${response.status}`
      );
    }

    return data;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/* =========================================================
   HELPERS
========================================================= */

const currency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const numberValue = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, numberValue(value)));

const formatDate = (value) => {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
};

/*
  Local EMI calculation is only used as a fallback when the
  backend does not return an EMI.
*/
function calculateEMI(principal, annualRate, months) {
  const P = numberValue(principal);
  const R = numberValue(annualRate) / 12 / 100;
  const N = numberValue(months);

  if (!P || !N) return 0;

  if (!R) {
    return P / N;
  }

  const factor = Math.pow(1 + R, N);

  return (P * R * factor) / (factor - 1);
}

/* =========================================================
   STYLES
========================================================= */

const COLORS = {
  bg: "#071019",
  card: "#101821",
  card2: "#0B1420",
  border: "#263241",
  text: "#FFFFFF",
  muted: "#94A3B8",
  soft: "#CBD5E1",
  teal: "#0D9488",
  green: "#10B981",
  yellow: "#F59E0B",
  red: "#EF4444",
  blue: "#3B82F6",
};

const cardStyle = {
  background: COLORS.card,
  border: `1px solid ${COLORS.border}`,
  borderRadius: "16px",
  padding: "20px",
};

const inputStyle = {
  width: "100%",
  background: COLORS.card2,
  border: `1px solid ${COLORS.border}`,
  borderRadius: "10px",
  padding: "12px 13px",
  color: COLORS.text,
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  color: COLORS.muted,
  fontSize: "12px",
  fontWeight: "600",
  marginBottom: "7px",
};

const primaryButton = {
  background: COLORS.teal,
  border: "none",
  color: "#fff",
  padding: "11px 18px",
  borderRadius: "9px",
  fontWeight: "700",
  cursor: "pointer",
};

const secondaryButton = {
  background: "transparent",
  border: `1px solid ${COLORS.border}`,
  color: COLORS.soft,
  padding: "10px 16px",
  borderRadius: "9px",
  fontWeight: "600",
  cursor: "pointer",
};

const dangerButton = {
  background: "transparent",
  border: "1px solid #4B2424",
  color: "#FCA5A5",
  padding: "9px 14px",
  borderRadius: "9px",
  fontWeight: "600",
  cursor: "pointer",
};

/* =========================================================
   LOAN CONSTANTS
========================================================= */

const LOAN_TYPES = [
  "Personal Loan",
  "Home Loan",
  "Education Loan",
  "Car Loan",
  "Business Loan",
  "Gold Loan",
];

const AMOUNT_PRESETS = [
  50000,
  100000,
  200000,
  500000,
  1000000,
];

const PURPOSES = [
  "Education",
  "Medical",
  "House",
  "Business",
  "Vehicle",
  "Emergency",
  "Other",
];

const EMPLOYMENT_TYPES = [
  "Student",
  "Salaried",
  "Self-employed",
  "Business Owner",
];

const DURATIONS = [
  { label: "1 Year", value: 1 },
  { label: "2 Years", value: 2 },
  { label: "3 Years", value: 3 },
  { label: "5 Years", value: 5 },
  { label: "7 Years", value: 7 },
  { label: "10 Years", value: 10 },
];

/* =========================================================
   SMALL UI COMPONENTS
========================================================= */

function SectionTitle({ icon, title, subtitle, right }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "16px",
        marginBottom: "18px",
      }}
    >
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "9px",
          }}
        >
          {icon && <span style={{ fontSize: "20px" }}>{icon}</span>}

          <h2
            style={{
              margin: 0,
              color: COLORS.text,
              fontSize: "18px",
              fontWeight: "750",
            }}
          >
            {title}
          </h2>
        </div>

        {subtitle && (
          <p
            style={{
              margin: "5px 0 0",
              color: COLORS.muted,
              fontSize: "13px",
              lineHeight: "1.5",
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {right}
    </div>
  );
}

function StatBox({ label, value, sub, color = COLORS.text }) {
  return (
    <div
      style={{
        background: COLORS.card2,
        border: `1px solid ${COLORS.border}`,
        borderRadius: "12px",
        padding: "15px",
      }}
    >
      <div
        style={{
          color: COLORS.muted,
          fontSize: "10px",
          letterSpacing: "0.05em",
          fontWeight: "700",
          marginBottom: "7px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          color,
          fontSize: "20px",
          fontWeight: "800",
        }}
      >
        {value}
      </div>

      {sub && (
        <div
          style={{
            color: "#64748B",
            fontSize: "11px",
            marginTop: "4px",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ eligible }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 10px",
        borderRadius: "999px",
        background: eligible
          ? "rgba(16,185,129,0.12)"
          : "rgba(239,68,68,0.12)",
        border: `1px solid ${
          eligible ? "rgba(16,185,129,0.35)" : "rgba(239,68,68,0.35)"
        }`,
        color: eligible ? "#34D399" : "#FCA5A5",
        fontSize: "12px",
        fontWeight: "700",
      }}
    >
      {eligible ? "✓ Eligible" : "Not Eligible Yet"}
    </span>
  );
}

function ErrorBox({ message, onRetry }) {
  if (!message) return null;

  return (
    <div
      style={{
        ...cardStyle,
        borderColor: "#7F1D1D",
        background: "rgba(127,29,29,0.12)",
        marginBottom: "18px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "15px",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              color: "#FCA5A5",
              fontWeight: "750",
              fontSize: "14px",
            }}
          >
            ⚠️ Something went wrong
          </div>

          <div
            style={{
              color: "#F87171",
              fontSize: "12px",
              marginTop: "7px",
              lineHeight: "1.5",
              wordBreak: "break-word",
            }}
          >
            {message}
          </div>
        </div>

        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              ...secondaryButton,
              borderColor: "#7F1D1D",
              color: "#FCA5A5",
              flexShrink: 0,
            }}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

function LoadingBox({ text = "Loading..." }) {
  return (
    <div
      style={{
        ...cardStyle,
        textAlign: "center",
        padding: "45px 20px",
      }}
    >
      <div
        style={{
          width: "34px",
          height: "34px",
          borderRadius: "50%",
          border: "3px solid #263241",
          borderTopColor: COLORS.teal,
          margin: "0 auto 15px",
          animation: "spin 0.8s linear infinite",
        }}
      />

      <div
        style={{
          color: COLORS.soft,
          fontSize: "14px",
        }}
      >
        {text}
      </div>
    </div>
  );
}

/* =========================================================
   INTERVIEW WIZARD
========================================================= */

function InterviewWizard({ onComplete }) {
  const [step, setStep] = useState(0);

  const [answers, setAnswers] = useState({
    loan_type: "",
    requested_amount: "",
    loan_purpose: "",
    employment_status: "",
    existing_emi: "",
    duration_years: null,
    credit_score: "",
  });

  const [customAmount, setCustomAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const totalSteps = 6;

  const update = (field, value) => {
    setAnswers((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const canProceed = useMemo(() => {
    switch (step) {
      case 0:
        return Boolean(answers.loan_type);

      case 1:
        return numberValue(answers.requested_amount) > 0;

      case 2:
        return Boolean(answers.loan_purpose);

      case 3:
        return Boolean(answers.employment_status);

      case 4:
        return answers.existing_emi !== "";

      case 5:
        return Boolean(answers.duration_years);

      default:
        return false;
    }
  }, [answers, step]);

  const next = () => {
    if (!canProceed) return;

    setError("");

    setStep((current) =>
      Math.min(totalSteps - 1, current + 1)
    );
  };

  const back = () => {
    setError("");

    setStep((current) => Math.max(0, current - 1));
  };

  const submit = async () => {
    if (!canProceed) return;

    setSaving(true);
    setError("");

    try {
      const payload = {
        ...answers,
        requested_amount: Number(answers.requested_amount),
        existing_emi: Number(answers.existing_emi || 0),
        duration_years: Number(answers.duration_years),
        credit_score:
          answers.credit_score === ""
            ? ""
            : Number(answers.credit_score),
      };

      if (
        payload.credit_score &&
        (payload.credit_score < 300 ||
          payload.credit_score > 900)
      ) {
        throw new Error(
          "Credit score should normally be between 300 and 900."
        );
      }

      const data = await apiCall("/loans/profile", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!data?.success) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Could not save your loan profile."
        );
      }

      await onComplete();
    } catch (err) {
      setError(err.message || "Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  };

  const stepTitles = [
    "Loan type",
    "Loan amount",
    "Purpose",
    "Employment",
    "Current debt",
    "Duration",
  ];

  return (
    <div style={cardStyle}>
      <div style={{ marginBottom: "24px" }}>
        <div
          style={{
            color: COLORS.teal,
            fontSize: "12px",
            fontWeight: "800",
            letterSpacing: "0.06em",
            marginBottom: "6px",
          }}
        >
          LOAN PROFILE
        </div>

        <h2
          style={{
            margin: 0,
            color: COLORS.text,
            fontSize: "23px",
          }}
        >
          Let&apos;s understand your loan need
        </h2>

        <p
          style={{
            color: COLORS.muted,
            fontSize: "13px",
            lineHeight: "1.5",
            margin: "7px 0 0",
          }}
        >
          Answer a few questions and FinSaathi will prepare
          an indicative loan analysis.
        </p>
      </div>

      {/* Progress */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${totalSteps}, 1fr)`,
          gap: "5px",
          marginBottom: "9px",
        }}
      >
        {stepTitles.map((title, index) => (
          <button
            key={title}
            type="button"
            onClick={() => {
              if (index <= step) setStep(index);
            }}
            style={{
              height: "5px",
              border: "none",
              borderRadius: "999px",
              background:
                index <= step ? COLORS.teal : "#263241",
              cursor: index <= step ? "pointer" : "default",
              padding: 0,
            }}
          />
        ))}
      </div>

      <div
        style={{
          color: COLORS.muted,
          fontSize: "11px",
          marginBottom: "24px",
        }}
      >
        Step {step + 1} of {totalSteps} · {stepTitles[step]}
      </div>

      {/* STEP 1 */}
      {step === 0 && (
        <div>
          <h3 style={{ color: COLORS.text, marginTop: 0 }}>
            What type of loan do you need?
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(145px,1fr))",
              gap: "10px",
            }}
          >
            {LOAN_TYPES.map((type) => {
              const active = answers.loan_type === type;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => update("loan_type", type)}
                  style={{
                    background: active
                      ? "rgba(13,148,136,0.15)"
                      : COLORS.card2,
                    border: `1px solid ${
                      active ? COLORS.teal : COLORS.border
                    }`,
                    color: COLORS.text,
                    padding: "15px 12px",
                    borderRadius: "11px",
                    fontSize: "13px",
                    fontWeight: active ? "700" : "500",
                    cursor: "pointer",
                  }}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step === 1 && (
        <div>
          <h3 style={{ color: COLORS.text, marginTop: 0 }}>
            How much do you need?
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(120px,1fr))",
              gap: "9px",
              marginBottom: "14px",
            }}
          >
            {AMOUNT_PRESETS.map((amount) => {
              const active =
                numberValue(answers.requested_amount) === amount;

              return (
                <button
                  key={amount}
                  type="button"
                  onClick={() => {
                    update("requested_amount", amount);
                    setCustomAmount("");
                  }}
                  style={{
                    background: active
                      ? "rgba(13,148,136,0.15)"
                      : COLORS.card2,
                    border: `1px solid ${
                      active ? COLORS.teal : COLORS.border
                    }`,
                    color: COLORS.text,
                    padding: "13px 8px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontWeight: active ? "700" : "500",
                  }}
                >
                  {currency(amount)}
                </button>
              );
            })}
          </div>

          <label style={labelStyle}>Or enter a custom amount</label>

          <input
            type="number"
            min="1"
            value={customAmount}
            placeholder="Example: 350000"
            onChange={(event) => {
              const value = event.target.value;

              setCustomAmount(value);
              update(
                "requested_amount",
                Number(value) || ""
              );
            }}
            style={inputStyle}
          />

          {numberValue(answers.requested_amount) > 0 && (
            <div
              style={{
                marginTop: "12px",
                color: COLORS.teal,
                fontSize: "13px",
                fontWeight: "700",
              }}
            >
              Requested amount:{" "}
              {currency(answers.requested_amount)}
            </div>
          )}
        </div>
      )}

      {/* STEP 3 */}
      {step === 2 && (
        <div>
          <h3 style={{ color: COLORS.text, marginTop: 0 }}>
            What is the main purpose?
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(145px,1fr))",
              gap: "10px",
            }}
          >
            {PURPOSES.map((purpose) => {
              const active =
                answers.loan_purpose === purpose;

              return (
                <button
                  key={purpose}
                  type="button"
                  onClick={() =>
                    update("loan_purpose", purpose)
                  }
                  style={{
                    background: active
                      ? "rgba(13,148,136,0.15)"
                      : COLORS.card2,
                    border: `1px solid ${
                      active ? COLORS.teal : COLORS.border
                    }`,
                    color: COLORS.text,
                    padding: "15px 12px",
                    borderRadius: "11px",
                    cursor: "pointer",
                    fontWeight: active ? "700" : "500",
                  }}
                >
                  {purpose}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 4 */}
      {step === 3 && (
        <div>
          <h3 style={{ color: COLORS.text, marginTop: 0 }}>
            What is your employment status?
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(160px,1fr))",
              gap: "10px",
            }}
          >
            {EMPLOYMENT_TYPES.map((employment) => {
              const active =
                answers.employment_status === employment;

              return (
                <button
                  key={employment}
                  type="button"
                  onClick={() =>
                    update(
                      "employment_status",
                      employment
                    )
                  }
                  style={{
                    background: active
                      ? "rgba(13,148,136,0.15)"
                      : COLORS.card2,
                    border: `1px solid ${
                      active ? COLORS.teal : COLORS.border
                    }`,
                    color: COLORS.text,
                    padding: "16px 12px",
                    borderRadius: "11px",
                    cursor: "pointer",
                    fontWeight: active ? "700" : "500",
                  }}
                >
                  {employment}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 5 */}
      {step === 4 && (
        <div>
          <h3 style={{ color: COLORS.text, marginTop: 0 }}>
            Tell us about your current debt
          </h3>

          <label style={labelStyle}>
            Existing EMI per month
          </label>

          <input
            type="number"
            min="0"
            value={answers.existing_emi}
            placeholder="Enter 0 if you have no EMI"
            onChange={(event) =>
              update("existing_emi", event.target.value)
            }
            style={inputStyle}
          />

          <p
            style={{
              color: "#64748B",
              fontSize: "11px",
              marginTop: "6px",
            }}
          >
            This helps estimate your existing debt burden.
          </p>

          <div style={{ marginTop: "20px" }}>
            <label style={labelStyle}>
              Credit score
              <span
                style={{
                  color: "#64748B",
                  fontWeight: "400",
                  marginLeft: "5px",
                }}
              >
                optional
              </span>
            </label>

            <input
              type="number"
              min="300"
              max="900"
              value={answers.credit_score}
              placeholder="Example: 750"
              onChange={(event) =>
                update("credit_score", event.target.value)
              }
              style={inputStyle}
            />

            <p
              style={{
                color: "#64748B",
                fontSize: "11px",
                marginTop: "6px",
              }}
            >
              Leave empty if you do not know your score.
            </p>
          </div>
        </div>
      )}

      {/* STEP 6 */}
      {step === 5 && (
        <div>
          <h3 style={{ color: COLORS.text, marginTop: 0 }}>
            How long would you like to repay?
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(130px,1fr))",
              gap: "10px",
            }}
          >
            {DURATIONS.map((duration) => {
              const active =
                answers.duration_years === duration.value;

              return (
                <button
                  key={duration.value}
                  type="button"
                  onClick={() =>
                    update(
                      "duration_years",
                      duration.value
                    )
                  }
                  style={{
                    background: active
                      ? "rgba(13,148,136,0.15)"
                      : COLORS.card2,
                    border: `1px solid ${
                      active ? COLORS.teal : COLORS.border
                    }`,
                    color: COLORS.text,
                    padding: "15px 10px",
                    borderRadius: "11px",
                    cursor: "pointer",
                    fontWeight: active ? "700" : "500",
                  }}
                >
                  {duration.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: "18px",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid #7F1D1D",
            borderRadius: "9px",
            padding: "11px 13px",
            color: "#FCA5A5",
            fontSize: "12px",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "10px",
          marginTop: "28px",
        }}
      >
        <button
          type="button"
          onClick={back}
          disabled={step === 0 || saving}
          style={{
            ...secondaryButton,
            opacity: step === 0 ? 0.4 : 1,
          }}
        >
          ← Back
        </button>

        {step < totalSteps - 1 ? (
          <button
            type="button"
            onClick={next}
            disabled={!canProceed || saving}
            style={{
              ...primaryButton,
              opacity: !canProceed || saving ? 0.45 : 1,
            }}
          >
            Continue →
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!canProceed || saving}
            style={{
              ...primaryButton,
              opacity: !canProceed || saving ? 0.45 : 1,
            }}
          >
            {saving
              ? "Analyzing..."
              : "Check My Eligibility"}
          </button>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   OVERVIEW
========================================================= */

function Overview({ analysis }) {
  const a = analysis || {};

  const riskScore = clamp(a.risk_score, 0, 100);

  const riskColor =
    riskScore >= 70
      ? COLORS.green
      : riskScore >= 40
      ? COLORS.yellow
      : COLORS.red;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(190px,1fr))",
          gap: "12px",
        }}
      >
        <StatBox
          label="ELIGIBILITY"
          value={
            a.eligible
              ? "Eligible"
              : "Needs Improvement"
          }
          color={a.eligible ? COLORS.green : COLORS.yellow}
          sub="Indicative assessment"
        />

        <StatBox
          label="REQUESTED AMOUNT"
          value={currency(a.requested_amount)}
          color={COLORS.text}
        />

        <StatBox
          label="RECOMMENDED AMOUNT"
          value={currency(a.recommended_amount)}
          color={COLORS.teal}
        />

        <StatBox
          label="SUGGESTED EMI"
          value={currency(a.suggested_emi)}
          color={COLORS.green}
          sub="per month"
        />
      </div>

      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "15px",
          }}
        >
          <div>
            <div
              style={{
                color: COLORS.muted,
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "0.05em",
                marginBottom: "7px",
              }}
            >
              FINSAATHI ASSESSMENT
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <h3
                style={{
                  color: COLORS.text,
                  margin: 0,
                  fontSize: "19px",
                }}
              >
                Loan eligibility
              </h3>

              <StatusBadge eligible={Boolean(a.eligible)} />
            </div>
          </div>

          <div
            style={{
              width: "45px",
              height: "45px",
              borderRadius: "50%",
              background: "rgba(13,148,136,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
            }}
          >
            🤖
          </div>
        </div>

        <p
          style={{
            color: COLORS.soft,
            fontSize: "14px",
            lineHeight: "1.7",
            marginBottom: 0,
          }}
        >
          {a.ai_explanation ||
            "Your loan analysis is ready."}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(250px,1fr))",
          gap: "16px",
        }}
      >
        <div style={cardStyle}>
          <SectionTitle
            icon="📊"
            title="Risk score"
            subtitle="Higher is generally better in this FinSaathi indicator."
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <span
              style={{
                color: COLORS.muted,
                fontSize: "12px",
              }}
            >
              Score
            </span>

            <strong
              style={{
                color: riskColor,
                fontSize: "26px",
              }}
            >
              {riskScore}/100
            </strong>
          </div>

          <div
            style={{
              height: "10px",
              background: "#071019",
              borderRadius: "999px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${riskScore}%`,
                height: "100%",
                background: riskColor,
                borderRadius: "999px",
                transition: "width .4s ease",
              }}
            />
          </div>

          <div
            style={{
              color: COLORS.muted,
              fontSize: "11px",
              marginTop: "9px",
            }}
          >
            This is an indicative product score, not a
            lender&apos;s credit decision.
          </div>
        </div>

        <div style={cardStyle}>
          <SectionTitle
            icon="💳"
            title="Loan snapshot"
            subtitle="Key numbers from your profile."
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            <StatBox
              label="RATE RANGE"
              value={a.assumed_rate_range || "—"}
            />

            <StatBox
              label="CURRENT DTI"
              value={
                a.existing_dti !== undefined
                  ? `${a.existing_dti}%`
                  : "—"
              }
            />

            <StatBox
              label="TENURE"
              value={
                a.duration_years
                  ? `${a.duration_years} yrs`
                  : "—"
              }
            />

            <StatBox
              label="PURPOSE"
              value={a.loan_purpose || "—"}
            />
          </div>
        </div>
      </div>

      {Array.isArray(a.warnings) &&
        a.warnings.length > 0 && (
          <div style={cardStyle}>
            <SectionTitle
              icon="⚠️"
              title="Things to check"
              subtitle="Review these before applying."
            />

            {a.warnings.map((warning, index) => (
              <div
                key={`${warning}-${index}`}
                style={{
                  background:
                    "rgba(245,158,11,0.08)",
                  border:
                    "1px solid rgba(245,158,11,0.35)",
                  borderRadius: "9px",
                  padding: "11px 13px",
                  color: "#FCD34D",
                  fontSize: "13px",
                  marginBottom:
                    index === a.warnings.length - 1
                      ? 0
                      : "8px",
                  lineHeight: "1.5",
                }}
              >
                ⚠ {warning}
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

/* =========================================================
   RECOMMENDATION
========================================================= */

function Recommendation({ analysis }) {
  const a = analysis || {};

  const reasons = Array.isArray(a.reasons)
    ? a.reasons
    : [];

  return (
    <div style={cardStyle}>
      <SectionTitle
        icon="💡"
        title="Loan recommendation"
        subtitle="An indicative recommendation based on your submitted profile."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(200px,1fr))",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        <StatBox
          label="RECOMMENDED AMOUNT"
          value={currency(a.recommended_amount)}
          color={COLORS.green}
        />

        <StatBox
          label="SUGGESTED EMI"
          value={currency(a.suggested_emi)}
          color={COLORS.teal}
          sub="/ month"
        />

        <StatBox
          label="REQUESTED"
          value={currency(a.requested_amount)}
        />

        <StatBox
          label="DTI"
          value={
            a.existing_dti !== undefined
              ? `${a.existing_dti}%`
              : "—"
          }
        />
      </div>

      <div
        style={{
          background: COLORS.card2,
          border: `1px solid ${COLORS.border}`,
          borderRadius: "11px",
          padding: "14px",
          marginBottom: "18px",
        }}
      >
        <div
          style={{
            color: COLORS.muted,
            fontSize: "11px",
            fontWeight: "700",
            marginBottom: "7px",
          }}
        >
          ASSUMED RATE
        </div>

        <div
          style={{
            color: COLORS.text,
            fontWeight: "700",
            fontSize: "15px",
          }}
        >
          {a.assumed_rate_range || "Indicative rate range unavailable"}
        </div>

        <div
          style={{
            color: "#64748B",
            fontSize: "11px",
            marginTop: "6px",
          }}
        >
          Actual rate, approval and final EMI are decided by
          the lender after its own checks.
        </div>
      </div>

      <div>
        <div
          style={{
            color: COLORS.muted,
            fontSize: "11px",
            fontWeight: "700",
            marginBottom: "10px",
          }}
        >
          WHY THIS RECOMMENDATION?
        </div>

        {reasons.length === 0 ? (
          <div
            style={{
              color: COLORS.muted,
              fontSize: "13px",
            }}
          >
            No detailed reasons were returned by the backend.
          </div>
        ) : (
          reasons.map((reason, index) => (
            <div
              key={`${reason}-${index}`}
              style={{
                display: "flex",
                gap: "9px",
                color: COLORS.soft,
                fontSize: "13px",
                lineHeight: "1.5",
                marginBottom: "8px",
              }}
            >
              <span style={{ color: COLORS.green }}>
                ✓
              </span>
              <span>{reason}</span>
            </div>
          ))
        )}
      </div>

      <div
        style={{
          marginTop: "20px",
          padding: "13px",
          background: "rgba(13,148,136,0.08)",
          border: "1px solid rgba(13,148,136,0.25)",
          borderRadius: "10px",
          color: COLORS.muted,
          fontSize: "12px",
          lineHeight: "1.6",
        }}
      >
        ℹ️ FinSaathi is providing educational and
        indicative financial information. It does not guarantee
        loan approval or act as a lender.
      </div>
    </div>
  );
}

/* =========================================================
   LENDER COMPARISON
========================================================= */

function LenderComparison({ analysis }) {
  const a = analysis || {};

  const lenders = Array.isArray(a.lenders)
    ? a.lenders
    : [];

  if (!lenders.length) {
    return (
      <div style={cardStyle}>
        <SectionTitle
          icon="🏦"
          title="Lender comparison"
          subtitle="No lender comparison was returned by the backend."
        />

        <div
          style={{
            color: COLORS.muted,
            fontSize: "13px",
          }}
        >
          Try refreshing your analysis.
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <SectionTitle
        icon="🏦"
        title="Compare lenders"
        subtitle="Use these figures for comparison only. Verify current rates and terms directly with each lender."
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {lenders.map((lender, index) => {
          const isBest =
            lender.name === a.best_lender;

          return (
            <div
              key={`${lender.name || "lender"}-${index}`}
              style={{
                background: isBest
                  ? "rgba(13,148,136,0.08)"
                  : COLORS.card2,
                border: `1px solid ${
                  isBest
                    ? COLORS.teal
                    : COLORS.border
                }`,
                borderRadius: "12px",
                padding: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                  marginBottom: "10px",
                }}
              >
                <div>
                  <span
                    style={{
                      color: COLORS.text,
                      fontSize: "15px",
                      fontWeight: "750",
                    }}
                  >
                    {lender.name || "Lender"}
                  </span>

                  {isBest && (
                    <span
                      style={{
                        marginLeft: "8px",
                        color: COLORS.teal,
                        fontSize: "11px",
                        fontWeight: "800",
                      }}
                    >
                      ★ BEST MATCH
                    </span>
                  )}
                </div>

                <span
                  style={{
                    color: COLORS.muted,
                    fontSize: "11px",
                  }}
                >
                  {lender.kind || "Lender"}
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit,minmax(130px,1fr))",
                  gap: "9px",
                  marginBottom: "10px",
                }}
              >
                <StatBox
                  label="RATE"
                  value={lender.rate_range || "—"}
                />

                <StatBox
                  label="EST. EMI"
                  value={currency(
                    lender.estimated_emi
                  )}
                  color={COLORS.green}
                />
              </div>

              {lender.pros && (
                <div
                  style={{
                    color: COLORS.soft,
                    fontSize: "12px",
                    lineHeight: "1.5",
                    marginBottom: "5px",
                  }}
                >
                  ✓ {lender.pros}
                </div>
              )}

              {lender.cons && (
                <div
                  style={{
                    color: COLORS.muted,
                    fontSize: "12px",
                    lineHeight: "1.5",
                  }}
                >
                  − {lender.cons}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================
   DOCUMENTS
========================================================= */

function Documents({ analysis }) {
  const documents = Array.isArray(analysis?.documents)
    ? analysis.documents
    : [];

  return (
    <div style={cardStyle}>
      <SectionTitle
        icon="📄"
        title="Required documents"
        subtitle="The exact documents depend on the lender and your profile."
      />

      {documents.length === 0 ? (
        <div
          style={{
            color: COLORS.muted,
            fontSize: "13px",
          }}
        >
          No document list was returned.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(240px,1fr))",
            gap: "10px",
          }}
        >
          {documents.map((document, index) => (
            <div
              key={`${document}-${index}`}
              style={{
                background: COLORS.card2,
                border: `1px solid ${COLORS.border}`,
                borderRadius: "10px",
                padding: "13px",
                color: COLORS.soft,
                fontSize: "13px",
              }}
            >
              <span
                style={{
                  color: COLORS.green,
                  marginRight: "8px",
                }}
              >
                ✓
              </span>

              {document}
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          marginTop: "18px",
          padding: "13px",
          borderRadius: "10px",
          background: "rgba(245,158,11,0.08)",
          border: "1px solid rgba(245,158,11,0.25)",
          color: "#FCD34D",
          fontSize: "12px",
          lineHeight: "1.6",
        }}
      >
        ⚠️ Never upload documents to an unknown person or
        third-party website. Verify that you are dealing with
        the official lender.
      </div>
    </div>
  );
}

/* =========================================================
   OFFICIAL APPLY LINKS
========================================================= */

const APPLY_PARTNERS = [
  {
    name: "SBI",
    url: "https://sbi.co.in",
  },
  {
    name: "HDFC Bank",
    url: "https://www.hdfcbank.com",
  },
  {
    name: "ICICI Bank",
    url: "https://www.icicibank.com",
  },
  {
    name: "Axis Bank",
    url: "https://www.axisbank.com",
  },
  {
    name: "Bajaj Finance",
    url: "https://www.bajajfinserv.in",
  },
  {
    name: "Tata Capital",
    url: "https://www.tatacapital.com",
  },
];

function ApplyLoan() {
  return (
    <div style={cardStyle}>
      <SectionTitle
        icon="🚀"
        title="Apply safely"
        subtitle="Open the official lender website and complete the application there."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(180px,1fr))",
          gap: "10px",
        }}
      >
        {APPLY_PARTNERS.map((partner) => (
          <a
            key={partner.name}
            href={partner.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: COLORS.card2,
              border: `1px solid ${COLORS.border}`,
              borderRadius: "11px",
              padding: "16px",
              color: COLORS.text,
              textDecoration: "none",
              fontWeight: "700",
              fontSize: "13px",
              textAlign: "center",
              transition: "border-color .2s ease",
            }}
          >
            {partner.name}
            <span
              style={{
                color: COLORS.teal,
                marginLeft: "6px",
              }}
            >
              ↗
            </span>
          </a>
        ))}
      </div>

      <div
        style={{
          marginTop: "18px",
          padding: "14px",
          borderRadius: "10px",
          background: "rgba(13,148,136,0.08)",
          border: "1px solid rgba(13,148,136,0.25)",
          color: COLORS.muted,
          fontSize: "12px",
          lineHeight: "1.6",
        }}
      >
        🔐 Safety tip: FinSaathi will never ask you to pay
        an upfront fee to unlock a loan. Check the lender&apos;s
        official terms before submitting personal documents.
      </div>
    </div>
  );
}

/* =========================================================
   LOAN TRACKER
========================================================= */

function LoanTracker() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    lender: "",
    principal: "",
    annual_rate: "",
    tenure_months: "",
    start_date: "",
  });

  const loadLoans = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiCall("/loans/track");

      if (!data?.success) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Could not load tracked loans."
        );
      }

      setLoans(
        Array.isArray(data.loans)
          ? data.loans
          : []
      );
    } catch (err) {
      setError(
        err.message || "Could not load loan tracker."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLoans();
  }, []);

  const update = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const addLoan = async () => {
    setError("");

    const principal = numberValue(form.principal);
    const annualRate = numberValue(form.annual_rate);
    const tenure = numberValue(form.tenure_months);

    if (!form.lender.trim()) {
      setError("Enter the lender name.");
      return;
    }

    if (principal <= 0) {
      setError("Enter a valid principal amount.");
      return;
    }

    if (annualRate < 0 || annualRate > 100) {
      setError("Enter a valid annual interest rate.");
      return;
    }

    if (tenure <= 0) {
      setError("Enter a valid tenure in months.");
      return;
    }

    setSaving(true);

    try {
      const data = await apiCall("/loans/track", {
        method: "POST",
        body: JSON.stringify({
          lender: form.lender.trim(),
          principal,
          annual_rate: annualRate,
          tenure_months: tenure,
          start_date: form.start_date,
        }),
      });

      if (!data?.success) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Could not save this loan."
        );
      }

      setForm({
        lender: "",
        principal: "",
        annual_rate: "",
        tenure_months: "",
        start_date: "",
      });

      setShowAdd(false);

      await loadLoans();
    } catch (err) {
      setError(
        err.message || "Could not save this loan."
      );
    } finally {
      setSaving(false);
    }
  };

  const removeLoan = async (id) => {
    if (!window.confirm("Remove this tracked loan?")) {
      return;
    }

    setDeleting(id);
    setError("");

    try {
      const data = await apiCall(
        `/loans/track/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        }
      );

      if (!data?.success) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Could not remove the loan."
        );
      }

      await loadLoans();
    } catch (err) {
      setError(
        err.message || "Could not remove the loan."
      );
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div style={cardStyle}>
      <SectionTitle
        icon="📊"
        title="Loan tracker"
        subtitle="Keep your existing loans in one place."
        right={
          <button
            onClick={() => {
              setShowAdd((value) => !value);
              setError("");
            }}
            style={primaryButton}
          >
            {showAdd ? "Cancel" : "+ Track Loan"}
          </button>
        }
      />

      {error && (
        <div
          style={{
            marginBottom: "15px",
            color: "#FCA5A5",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid #7F1D1D",
            padding: "10px 12px",
            borderRadius: "9px",
            fontSize: "12px",
          }}
        >
          {error}
        </div>
      )}

      {showAdd && (
        <div
          style={{
            background: COLORS.card2,
            border: `1px solid ${COLORS.border}`,
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "18px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(190px,1fr))",
              gap: "12px",
            }}
          >
            <div>
              <label style={labelStyle}>
                Lender name
              </label>

              <input
                value={form.lender}
                onChange={(event) =>
                  update("lender", event.target.value)
                }
                placeholder="Example: SBI"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Principal (₹)
              </label>

              <input
                type="number"
                min="1"
                value={form.principal}
                onChange={(event) =>
                  update(
                    "principal",
                    event.target.value
                  )
                }
                placeholder="500000"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Annual interest (%)
              </label>

              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.annual_rate}
                onChange={(event) =>
                  update(
                    "annual_rate",
                    event.target.value
                  )
                }
                placeholder="10.5"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Tenure (months)
              </label>

              <input
                type="number"
                min="1"
                value={form.tenure_months}
                onChange={(event) =>
                  update(
                    "tenure_months",
                    event.target.value
                  )
                }
                placeholder="60"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Start date
              </label>

              <input
                type="date"
                value={form.start_date}
                onChange={(event) =>
                  update(
                    "start_date",
                    event.target.value
                  )
                }
                style={inputStyle}
              />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
              }}
            >
              <button
                onClick={addLoan}
                disabled={saving}
                style={{
                  ...primaryButton,
                  width: "100%",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Saving..." : "Save Loan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div
          style={{
            color: COLORS.muted,
            fontSize: "13px",
            padding: "15px 0",
          }}
        >
          Loading loans...
        </div>
      ) : loans.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "30px 10px",
            color: COLORS.muted,
          }}
        >
          <div style={{ fontSize: "34px" }}>💳</div>

          <div
            style={{
              color: COLORS.soft,
              fontWeight: "700",
              marginTop: "8px",
            }}
          >
            No loans tracked yet
          </div>

          <div
            style={{
              fontSize: "12px",
              marginTop: "5px",
            }}
          >
            Add your existing loan to track EMI and
            repayment progress.
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {loans.map((loan) => {
            const progress = clamp(
              loan.progress_pct,
              0,
              100
            );

            return (
              <div
                key={loan.id}
                style={{
                  background: COLORS.card2,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: "12px",
                  padding: "15px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "12px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: COLORS.text,
                        fontWeight: "750",
                        fontSize: "14px",
                      }}
                    >
                      {loan.lender}
                    </div>

                    <div
                      style={{
                        color: COLORS.muted,
                        fontSize: "11px",
                        marginTop: "3px",
                      }}
                    >
                      {loan.start_date
                        ? `Started ${formatDate(
                            loan.start_date
                          )}`
                        : "Loan details"}
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      removeLoan(loan.id)
                    }
                    disabled={deleting === loan.id}
                    style={{
                      ...dangerButton,
                      opacity:
                        deleting === loan.id
                          ? 0.5
                          : 1,
                    }}
                  >
                    {deleting === loan.id
                      ? "Removing..."
                      : "Remove"}
                  </button>
                </div>

                <div
                  style={{
                    height: "8px",
                    background: "#071019",
                    borderRadius: "999px",
                    overflow: "hidden",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      width: `${progress}%`,
                      height: "100%",
                      background: COLORS.teal,
                      borderRadius: "999px",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit,minmax(130px,1fr))",
                    gap: "9px",
                  }}
                >
                  <StatBox
                    label="EMI"
                    value={currency(loan.emi)}
                    color={COLORS.green}
                  />

                  <StatBox
                    label="REMAINING"
                    value={currency(
                      loan.remaining_balance
                    )}
                  />

                  <StatBox
                    label="NEXT DUE"
                    value={
                      loan.next_due_date
                        ? formatDate(
                            loan.next_due_date
                          )
                        : "—"
                    }
                  />

                  <StatBox
                    label="PROGRESS"
                    value={`${progress.toFixed(0)}%`}
                    color={COLORS.teal}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div
        style={{
          marginTop: "16px",
          padding: "12px",
          background: "rgba(13,148,136,0.07)",
          border: "1px solid rgba(13,148,136,0.2)",
          borderRadius: "9px",
          color: COLORS.muted,
          fontSize: "11px",
          lineHeight: "1.6",
        }}
      >
        💡 Before making an extra payment or prepayment,
        check your lender&apos;s current prepayment rules and
        charges.
      </div>
    </div>
  );
}

/* =========================================================
   EMI CALCULATOR
========================================================= */

function EMICalculator() {
  const [amount, setAmount] = useState("500000");
  const [rate, setRate] = useState("10");
  const [months, setMonths] = useState("60");

  const emi = useMemo(
    () =>
      calculateEMI(
        amount,
        rate,
        months
      ),
    [amount, rate, months]
  );

  const totalPayment =
    emi * numberValue(months);

  const totalInterest =
    totalPayment - numberValue(amount);

  return (
    <div style={cardStyle}>
      <SectionTitle
        icon="🧮"
        title="EMI calculator"
        subtitle="Quick estimate. Actual EMI depends on the lender's final rate and terms."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(180px,1fr))",
          gap: "12px",
        }}
      >
        <div>
          <label style={labelStyle}>
            Loan amount (₹)
          </label>

          <input
            type="number"
            min="0"
            value={amount}
            onChange={(event) =>
              setAmount(event.target.value)
            }
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>
            Annual rate (%)
          </label>

          <input
            type="number"
            min="0"
            step="0.1"
            value={rate}
            onChange={(event) =>
              setRate(event.target.value)
            }
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>
            Tenure (months)
          </label>

          <input
            type="number"
            min="1"
            value={months}
            onChange={(event) =>
              setMonths(event.target.value)
            }
            style={inputStyle}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(180px,1fr))",
          gap: "10px",
          marginTop: "16px",
        }}
      >
        <StatBox
          label="MONTHLY EMI"
          value={currency(emi)}
          color={COLORS.green}
        />

        <StatBox
          label="TOTAL INTEREST"
          value={currency(
            Math.max(0, totalInterest)
          )}
          color={COLORS.yellow}
        />

        <StatBox
          label="TOTAL PAYMENT"
          value={currency(totalPayment)}
          color={COLORS.teal}
        />
      </div>
    </div>
  );
}

/* =========================================================
   AI CHAT
========================================================= */

function FloatingLoanChat() {
  const [open, setOpen] = useState(false);

  const [messages, setMessages] = useState([
    {
      who: "ai",
      text:
        "👋 Hi! Ask me about loan eligibility, EMI, documents, repayment, or lender comparison.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const suggestions = [
    "What documents do I need?",
    "How can I reduce my EMI?",
    "Explain my loan eligibility",
  ];

  const sendMessage = async (preset = null) => {
    const question = String(
      preset ?? input
    ).trim();

    if (!question || loading) return;

    setMessages((previous) => [
      ...previous,
      {
        who: "user",
        text: question,
      },
    ]);

    setInput("");
    setLoading(true);

    try {
      const data = await apiCall("/chat", {
        method: "POST",
        body: JSON.stringify({
          message: question,
        }),
      });

      const reply =
        data?.reply ||
        data?.response ||
        data?.message ||
        "I couldn't generate a response.";

      setMessages((previous) => [
        ...previous,
        {
          who: "ai",
          text: reply,
        },
      ]);
    } catch (err) {
      setMessages((previous) => [
        ...previous,
        {
          who: "ai",
          text:
            "❌ I couldn't reach the AI right now. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {open && (
        <div
          style={{
            position: "fixed",
            right: "22px",
            bottom: "88px",
            width: "360px",
            maxWidth: "calc(100vw - 30px)",
            height: "470px",
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: "17px",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 2000,
            boxShadow:
              "0 18px 50px rgba(0,0,0,0.55)",
          }}
        >
          <div
            style={{
              padding: "15px",
              background: COLORS.card2,
              borderBottom: `1px solid ${COLORS.border}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  color: COLORS.text,
                  fontWeight: "800",
                  fontSize: "14px",
                }}
              >
                🤖 Loan Assistant
              </div>

              <div
                style={{
                  color: COLORS.muted,
                  fontSize: "10px",
                  marginTop: "3px",
                }}
              >
                FinSaathi AI
              </div>
            </div>

            <button
              onClick={() => setOpen(false)}
              style={{
                background: "none",
                border: "none",
                color: COLORS.muted,
                fontSize: "18px",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "13px",
              display: "flex",
              flexDirection: "column",
              gap: "9px",
            }}
          >
            {messages.map((message, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  justifyContent:
                    message.who === "user"
                      ? "flex-end"
                      : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "86%",
                    padding: "10px 12px",
                    borderRadius: "12px",
                    background:
                      message.who === "user"
                        ? COLORS.teal
                        : COLORS.card2,
                    border:
                      message.who === "user"
                        ? "none"
                        : `1px solid ${COLORS.border}`,
                    color: COLORS.text,
                    fontSize: "12px",
                    lineHeight: "1.5",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {message.text}
                </div>
              </div>
            ))}

            {messages.length === 1 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                  marginTop: "4px",
                }}
              >
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() =>
                      sendMessage(suggestion)
                    }
                    style={{
                      background: "transparent",
                      border: `1px solid ${COLORS.border}`,
                      color: COLORS.soft,
                      borderRadius: "999px",
                      padding: "7px 9px",
                      fontSize: "10px",
                      cursor: "pointer",
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div
                style={{
                  color: COLORS.muted,
                  fontSize: "11px",
                }}
              >
                Thinking...
              </div>
            )}
          </div>

          <div
            style={{
              padding: "10px",
              borderTop: `1px solid ${COLORS.border}`,
              display: "flex",
              gap: "7px",
            }}
          >
            <input
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  sendMessage();
                }
              }}
              placeholder="Ask about your loan..."
              style={{
                ...inputStyle,
                flex: 1,
                padding: "10px",
              }}
            />

            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                ...primaryButton,
                padding: "10px 13px",
                opacity:
                  loading || !input.trim()
                    ? 0.45
                    : 1,
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((value) => !value)}
        title="Ask Loan Assistant"
        style={{
          position: "fixed",
          right: "22px",
          bottom: "20px",
          width: "58px",
          height: "58px",
          borderRadius: "50%",
          background: COLORS.teal,
          border: "none",
          color: "#fff",
          fontSize: "23px",
          cursor: "pointer",
          zIndex: 2000,
          boxShadow:
            "0 7px 25px rgba(13,148,136,0.4)",
        }}
      >
        {open ? "✕" : "🤖"}
      </button>
    </>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function LoanAssistant({
  transactions = [],
} = {}) {
  const [analysisData, setAnalysisData] =
    useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [showInterview, setShowInterview] =
    useState(false);

  const [activeTab, setActiveTab] =
    useState("overview");

  const [lastUpdated, setLastUpdated] =
    useState(null);

  const loadAnalysis = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    setError("");

    try {
      const data = await apiCall("/loans/analysis");

      if (!data?.success) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Could not load your loan analysis."
        );
      }

      if (!data.profile_complete) {
        setAnalysisData(null);
        setShowInterview(true);
        return;
      }

      setAnalysisData(data);
      setShowInterview(false);
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to the loan service."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalysis();
  }, []);

  /*
    If transactions change, refresh the loan analysis.
    This keeps the page connected to the user's latest
    financial data.
  */
  const transactionSignature = useMemo(() => {
    if (!Array.isArray(transactions)) return "";

    return `${transactions.length}:${transactions.reduce(
      (sum, transaction) =>
        sum + numberValue(transaction?.amount),
      0
    )}`;
  }, [transactions]);

  useEffect(() => {
    if (!transactionSignature || showInterview) {
      return;
    }

    loadAnalysis(true);

    // We intentionally only react to transaction changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionSignature]);

  const handleInterviewComplete = async () => {
    await loadAnalysis();
  };

  const tabs = [
    {
      id: "overview",
      label: "Overview",
      icon: "📊",
    },
    {
      id: "recommendation",
      label: "Recommendation",
      icon: "💡",
    },
    {
      id: "lenders",
      label: "Lenders",
      icon: "🏦",
    },
    {
      id: "documents",
      label: "Documents",
      icon: "📄",
    },
    {
      id: "apply",
      label: "Apply",
      icon: "🚀",
    },
    {
      id: "tracker",
      label: "Tracker",
      icon: "📈",
    },
    {
      id: "calculator",
      label: "EMI",
      icon: "🧮",
    },
  ];

  return (
    <div
      style={{
        color: COLORS.text,
        maxWidth: "1200px",
        margin: "0 auto",
        paddingBottom: "100px",
      }}
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "15px",
          marginBottom: "22px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              color: COLORS.teal,
              fontSize: "11px",
              fontWeight: "800",
              letterSpacing: "0.08em",
              marginBottom: "5px",
            }}
          >
            FINSAATHI AI
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "29px",
              fontWeight: "800",
              letterSpacing: "-0.02em",
            }}
          >
            Loan Advisor
          </h1>

          <p
            style={{
              margin: "6px 0 0",
              color: COLORS.muted,
              fontSize: "13px",
              lineHeight: "1.5",
              maxWidth: "650px",
            }}
          >
            Understand your indicative eligibility, EMI,
            repayment risk and lender options in one place.
          </p>
        </div>

        {!showInterview && analysisData && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {lastUpdated && (
              <span
                style={{
                  color: "#64748B",
                  fontSize: "10px",
                }}
              >
                Updated{" "}
                {lastUpdated.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}

            <button
              onClick={() => loadAnalysis()}
              disabled={loading}
              style={{
                ...secondaryButton,
                opacity: loading ? 0.5 : 1,
              }}
            >
              🔄 Refresh
            </button>
          </div>
        )}
      </div>

      {/* =================================================
          LOADING
      ================================================= */}

      {loading && !analysisData && (
        <LoadingBox text="Analyzing your loan profile..." />
      )}

      {/* =================================================
          ERROR
      ================================================= */}

      {!loading && error && (
        <ErrorBox
          message={error}
          onRetry={() => loadAnalysis()}
        />
      )}

      {/* =================================================
          INTERVIEW
      ================================================= */}

      {!loading && !error && showInterview && (
        <>
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(13,148,136,0.12), rgba(59,130,246,0.05))",
              border: "1px solid rgba(13,148,136,0.25)",
              borderRadius: "14px",
              padding: "15px 17px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                color: COLORS.text,
                fontWeight: "700",
                fontSize: "13px",
              }}
            >
              🔐 Your information stays connected to your
              account
            </div>

            <div
              style={{
                color: COLORS.muted,
                fontSize: "11px",
                marginTop: "4px",
                lineHeight: "1.5",
              }}
            >
              Complete the profile below to generate your
              personalized loan analysis.
            </div>
          </div>

          <InterviewWizard
            onComplete={handleInterviewComplete}
          />
        </>
      )}

      {/* =================================================
          RESULTS
      ================================================= */}

      {!loading &&
        !error &&
        !showInterview &&
        analysisData && (
          <>
            {/* Quick summary */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(170px,1fr))",
                gap: "10px",
                marginBottom: "16px",
              }}
            >
              <StatBox
                label="STATUS"
                value={
                  analysisData.eligible
                    ? "Eligible"
                    : "Review"
                }
                color={
                  analysisData.eligible
                    ? COLORS.green
                    : COLORS.yellow
                }
              />

              <StatBox
                label="RECOMMENDED"
                value={currency(
                  analysisData.recommended_amount
                )}
                color={COLORS.teal}
              />

              <StatBox
                label="EMI"
                value={currency(
                  analysisData.suggested_emi
                )}
                color={COLORS.green}
              />

              <StatBox
                label="RISK"
                value={`${clamp(
                  analysisData.risk_score,
                  0,
                  100
                )}/100`}
                color={
                  clamp(
                    analysisData.risk_score,
                    0,
                    100
                  ) >= 70
                    ? COLORS.green
                    : COLORS.yellow
                }
              />
            </div>

            {/* Tabs */}
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: "13px",
                padding: "6px",
                marginBottom: "16px",
                display: "flex",
                gap: "5px",
                overflowX: "auto",
              }}
            >
              {tabs.map((tab) => {
                const active =
                  activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() =>
                      setActiveTab(tab.id)
                    }
                    style={{
                      flex: "0 0 auto",
                      background: active
                        ? COLORS.teal
                        : "transparent",
                      border: "none",
                      color: active
                        ? "#fff"
                        : COLORS.muted,
                      padding: "10px 13px",
                      borderRadius: "9px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: active
                        ? "750"
                        : "600",
                    }}
                  >
                    {tab.icon} {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            {activeTab === "overview" && (
              <Overview analysis={analysisData} />
            )}

            {activeTab === "recommendation" && (
              <Recommendation
                analysis={analysisData}
              />
            )}

            {activeTab === "lenders" && (
              <LenderComparison
                analysis={analysisData}
              />
            )}

            {activeTab === "documents" && (
              <Documents analysis={analysisData} />
            )}

            {activeTab === "apply" && (
              <ApplyLoan />
            )}

            {activeTab === "tracker" && (
              <LoanTracker />
            )}

            {activeTab === "calculator" && (
              <EMICalculator />
            )}

            {/* Redo profile */}
            <div
              style={{
                marginTop: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    color: COLORS.soft,
                    fontWeight: "700",
                    fontSize: "13px",
                  }}
                >
                  Want to update your loan profile?
                </div>

                <div
                  style={{
                    color: COLORS.muted,
                    fontSize: "11px",
                    marginTop: "3px",
                  }}
                >
                  You can redo the questionnaire whenever
                  your situation changes.
                </div>
              </div>

              <button
                onClick={() => {
                  setShowInterview(true);
                  setError("");
                }}
                style={secondaryButton}
              >
                Redo Loan Profile
              </button>
            </div>

            <div
              style={{
                marginTop: "15px",
                color: "#64748B",
                fontSize: "10px",
                lineHeight: "1.6",
              }}
            >
              Disclaimer: Loan eligibility, interest rates,
              approval, tenure and charges are determined by
              the lender. FinSaathi provides indicative
              financial information and should not be treated
              as professional financial advice.
            </div>
          </>
        )}

      <FloatingLoanChat />

      {/* Global animation */}
      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 600px) {
          h1 {
            font-size: 24px !important;
          }
        }
      `}</style>
    </div>
  );
}