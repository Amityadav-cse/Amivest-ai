import { useState, useEffect, useMemo } from "react";

const API_BASE =
  import.meta.env.VITE_BACKEND_URL?.trim() || "";

async function apiCall(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    method,
    credentials: "include",
    headers: {
      ...(method !== "GET" ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  let body = {};
  try {
    body = await response.json();
  } catch (_) {}

  if (!response.ok) {
    throw new Error(
      body?.error ||
        body?.message ||
        `Request failed with HTTP ${response.status}`
    );
  }

  return body;
}

const currency = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const card = {
  background: "#161a1f",
  border: "1px solid #242b35",
  borderRadius: "14px",
  padding: "22px",
};

const inputStyle = {
  width: "100%",
  background: "#0B1420",
  border: "1px solid #242b35",
  borderRadius: "8px",
  padding: "12px",
  color: "#fff",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

function pillStyle(active) {
  return {
    background: active ? "#0D9488" : "#0B1420",
    border: `1px solid ${active ? "#0D9488" : "#242b35"}`,
    color: "#fff",
    padding: "14px 10px",
    borderRadius: "10px",
    fontSize: "13px",
    cursor: "pointer",
    textAlign: "center",
  };
}

function emiFor(principal, annualRate, months) {
  const p = Number(principal || 0);
  const n = Number(months || 0);
  const r = Number(annualRate || 0) / 12 / 100;
  if (!p || !n) return 0;
  if (!r) return p / n;
  return (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

// ===================================================
// Interview wizard
// ===================================================
const LOAN_TYPES = ["Personal Loan", "Home Loan", "Education Loan", "Car Loan", "Business Loan", "Gold Loan"];
const AMOUNT_PRESETS = [50000, 200000, 1000000];
const PURPOSES = ["Education", "Medical", "House", "Business", "Vehicle", "Emergency"];
const EMPLOYMENT_TYPES = ["Student", "Salaried", "Self-employed", "Business Owner"];
const DURATIONS = [{ label: "1 Year", value: 1 }, { label: "3 Years", value: 3 }, { label: "5 Years", value: 5 }, { label: "10 Years", value: 10 }];

function InterviewWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    loan_type: "", requested_amount: "", loan_purpose: "", employment_status: "",
    existing_emi: "", duration_years: null, credit_score: "",
  });
  const [customAmount, setCustomAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const totalSteps = 6;
  const set = (k, v) => setAnswers((p) => ({ ...p, [k]: v }));
  const canProceed = () => {
    switch (step) {
      case 0: return !!answers.loan_type;
      case 1: return !!answers.requested_amount;
      case 2: return !!answers.loan_purpose;
      case 3: return !!answers.employment_status;
      case 4: return answers.existing_emi !== "";
      case 5: return !!answers.duration_years;
      default: return false;
    }
  };

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const data = await apiCall("/loans/profile", { method: "POST", body: JSON.stringify({ ...answers }) });
      if (data.success) onComplete();
      else setError(data.error || "Could not save your answers.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={card}>
      <div style={{ display: "flex", gap: "6px", marginBottom: "22px" }}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: "4px", borderRadius: "999px", background: i <= step ? "#0D9488" : "#242b35" }} />
        ))}
      </div>

      {step === 0 && (
        <>
          <h3 style={{ color: "#fff", marginTop: 0 }}>What type of loan do you need?</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {LOAN_TYPES.map((t) => <button key={t} onClick={() => set("loan_type", t)} style={pillStyle(answers.loan_type === t)}>{t}</button>)}
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <h3 style={{ color: "#fff", marginTop: 0 }}>Required loan amount?</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "12px" }}>
            {AMOUNT_PRESETS.map((a) => <button key={a} onClick={() => { set("requested_amount", a); setCustomAmount(""); }} style={pillStyle(answers.requested_amount === a)}>{currency(a)}</button>)}
          </div>
          <input type="number" placeholder="Custom amount" value={customAmount}
            onChange={(e) => { setCustomAmount(e.target.value); set("requested_amount", Number(e.target.value) || ""); }} autoComplete="off" style={inputStyle} />
        </>
      )}

      {step === 2 && (
        <>
          <h3 style={{ color: "#fff", marginTop: 0 }}>Loan purpose?</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {PURPOSES.map((p) => <button key={p} onClick={() => set("loan_purpose", p)} style={pillStyle(answers.loan_purpose === p)}>{p}</button>)}
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h3 style={{ color: "#fff", marginTop: 0 }}>Employment?</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
            {EMPLOYMENT_TYPES.map((e) => <button key={e} onClick={() => set("employment_status", e)} style={pillStyle(answers.employment_status === e)}>{e}</button>)}
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <h3 style={{ color: "#fff", marginTop: 0 }}>Existing EMI (₹/month)?</h3>
          <p style={{ color: "#9ca3af", fontSize: "13px", marginTop: 0 }}>Enter 0 if you don't have any ongoing loans.</p>
          <input type="number" placeholder="0" value={answers.existing_emi} onChange={(e) => set("existing_emi", e.target.value)} autoComplete="off" style={inputStyle} />
          <div style={{ marginTop: "16px" }}>
            <label style={{ display: "block", color: "#9ca3af", fontSize: "12px", marginBottom: "6px" }}>Credit score (optional)</label>
            <input type="number" placeholder="e.g. 750" value={answers.credit_score} onChange={(e) => set("credit_score", e.target.value)} autoComplete="off" style={inputStyle} />
          </div>
        </>
      )}

      {step === 5 && (
        <>
          <h3 style={{ color: "#fff", marginTop: 0 }}>Loan duration?</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {DURATIONS.map((d) => <button key={d.value} onClick={() => set("duration_years", d.value)} style={pillStyle(answers.duration_years === d.value)}>{d.label}</button>)}
          </div>
        </>
      )}

      {error && <div style={{ color: "#EF4444", fontSize: "13px", marginTop: "16px" }}>{error}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "26px" }}>
        <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}
          style={{ background: "none", border: "1px solid #242b35", color: "#9ca3af", padding: "10px 20px", borderRadius: "8px", cursor: step === 0 ? "default" : "pointer", opacity: step === 0 ? 0.4 : 1 }}>
          Back
        </button>
        {step < totalSteps - 1 ? (
          <button onClick={() => setStep((s) => Math.min(totalSteps - 1, s + 1))} disabled={!canProceed()}
            style={{ background: canProceed() ? "#0D9488" : "#1f262e", border: "none", color: "#fff", padding: "10px 24px", borderRadius: "8px", fontWeight: "700", cursor: canProceed() ? "pointer" : "default" }}>
            Next
          </button>
        ) : (
          <button onClick={submit} disabled={!canProceed() || saving}
            style={{ background: canProceed() ? "#0D9488" : "#1f262e", border: "none", color: "#fff", padding: "10px 24px", borderRadius: "8px", fontWeight: "700", cursor: canProceed() ? "pointer" : "default" }}>
            {saving ? "Analyzing…" : "Check My Eligibility"}
          </button>
        )}
      </div>
    </div>
  );
}


// ===================================================
// Loan Command Center
// Practical affordability + stress testing + repayment math.
// This is planning support, not a lender approval decision.
// ===================================================
function LoanCommandCenter({ analysis, transactions = [] }) {
  const [amount, setAmount] = useState(Number(analysis?.requested_amount || 200000));
  const [rate, setRate] = useState(analysis?.assumed_rate_range ? 11 : 11);
  const [months, setMonths] = useState(Number(analysis?.duration_years || 5) * 12 || 60);
  const [shock, setShock] = useState(20);

  const cashflow = useMemo(() => {
    const income = transactions
      .filter((t) => String(t.type || "").toLowerCase() === "income")
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const expense = transactions
      .filter((t) => String(t.type || "").toLowerCase() === "expense")
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    return { income, expense, surplus: income - expense };
  }, [transactions]);

  const baseEmi = emiFor(amount, rate, months);
  const stressedEmi = emiFor(amount, rate + shock / 10, months);
  const emiShare =
    cashflow.income > 0 ? (baseEmi / cashflow.income) * 100 : null;
  const stressedShare =
    cashflow.income > 0 ? (stressedEmi / cashflow.income) * 100 : null;
  const totalInterest = Math.max(0, baseEmi * months - amount);

  const readiness =
    emiShare == null
      ? "Need income data"
      : emiShare <= 25
      ? "Comfortable range"
      : emiShare <= 35
      ? "Review carefully"
      : "High repayment pressure";

  return (
    <div style={{ ...card, marginBottom: "22px" }}>
      <div style={{ marginBottom: "16px" }}>
        <div style={{ color: "#5eead4", fontSize: "11px", fontWeight: "800", letterSpacing: ".12em" }}>
          FINSAATHI LOAN COMMAND CENTER
        </div>
        <h3 style={{ color: "#fff", margin: "6px 0 4px", fontSize: "20px" }}>
          Test the loan before you apply
        </h3>
        <p style={{ color: "#94a3b8", fontSize: "12px", margin: 0 }}>
          Adjust amount, rate and tenure to see EMI, interest cost and repayment pressure using your live transaction context.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: "12px" }}>
        <div>
          <label style={{ color: "#9ca3af", fontSize: "11px" }}>LOAN AMOUNT</label>
          <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} autoComplete="off" style={{ ...inputStyle, marginTop: "6px" }} />
        </div>
        <div>
          <label style={{ color: "#9ca3af", fontSize: "11px" }}>RATE %</label>
          <input type="number" step="0.1" value={rate} onChange={(e) => setRate(Number(e.target.value) || 0)} autoComplete="off" style={{ ...inputStyle, marginTop: "6px" }} />
        </div>
        <div>
          <label style={{ color: "#9ca3af", fontSize: "11px" }}>TENURE (MONTHS)</label>
          <input type="number" value={months} onChange={(e) => setMonths(Number(e.target.value) || 1)} autoComplete="off" style={{ ...inputStyle, marginTop: "6px" }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "10px", marginTop: "14px" }}>
        {[
          ["Monthly EMI", currency(baseEmi), "#10B981"],
          ["Total interest", currency(totalInterest), "#F59E0B"],
          ["Income share", emiShare == null ? "—" : `${emiShare.toFixed(1)}%`, emiShare != null && emiShare <= 35 ? "#10B981" : "#EF4444"],
          ["Planning status", readiness, emiShare != null && emiShare <= 25 ? "#10B981" : "#F59E0B"],
        ].map(([label, value, color]) => (
          <div key={label} style={{ background: "#0B1420", border: "1px solid #242b35", borderRadius: "10px", padding: "13px" }}>
            <div style={{ color: "#6b7280", fontSize: "10px" }}>{label.toUpperCase()}</div>
            <div style={{ color, fontSize: "17px", fontWeight: "800", marginTop: "5px" }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "16px", background: "#0B1420", borderRadius: "10px", padding: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", color: "#CBD5E1", fontSize: "12px", marginBottom: "8px" }}>
          <span>Stress test: rate shock</span>
          <strong>+{shock / 10}%</strong>
        </div>
        <input type="range" min="0" max="50" step="5" value={shock} onChange={(e) => setShock(Number(e.target.value))} style={{ width: "100%" }} />
        <div style={{ color: "#94a3b8", fontSize: "11px", marginTop: "7px" }}>
          Stress EMI: <b style={{ color: stressedEmi > baseEmi * 1.15 ? "#F59E0B" : "#10B981" }}>{currency(stressedEmi)}</b>
          {stressedShare != null ? ` · ${stressedShare.toFixed(1)}% of detected income` : ""}
        </div>
      </div>

      <div style={{ marginTop: "14px", color: "#64748b", fontSize: "11px", lineHeight: "1.6" }}>
        ⚠️ These calculations are indicative. Actual lender rates, fees, insurance, eligibility and approval depend on the lender's current underwriting.
      </div>
    </div>
  );
}

// ===================================================
// Result sections
// ===================================================
function EligibilityCard({ a }) {
  return (
    <div style={{ ...card, display: "flex", gap: "16px", alignItems: "flex-start" }}>
      <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "#0D9488", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>🤖</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
          <span style={{ color: "#fff", fontWeight: "700" }}>FinSaathi AI</span>
          <span style={{ background: a.eligible ? "#10B98122" : "#EF444422", color: a.eligible ? "#10B981" : "#EF4444", padding: "2px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "700" }}>
            {a.eligible ? "✅ Eligible" : "❌ Not Eligible Yet"}
          </span>
        </div>
        <p style={{ color: "#CBD5E1", fontSize: "14px", lineHeight: "1.6", margin: 0 }}>{a.ai_explanation}</p>
      </div>
    </div>
  );
}

function RecommendationCard({ a }) {
  return (
    <div style={card}>
      <h3 style={{ color: "#fff", marginTop: 0, marginBottom: "16px" }}>Recommended Loan</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "18px" }}>
        <div style={{ background: "#0B1420", borderRadius: "10px", padding: "16px" }}>
          <div style={{ color: "#6b7280", fontSize: "11px", marginBottom: "6px" }}>RECOMMENDED AMOUNT</div>
          <div style={{ color: "#10B981", fontSize: "22px", fontWeight: "800" }}>{currency(a.recommended_amount)}</div>
        </div>
        <div style={{ background: "#0B1420", borderRadius: "10px", padding: "16px" }}>
          <div style={{ color: "#6b7280", fontSize: "11px", marginBottom: "6px" }}>SUGGESTED EMI</div>
          <div style={{ color: "#fff", fontSize: "22px", fontWeight: "800" }}>{currency(a.suggested_emi)}<span style={{ fontSize: "12px", color: "#6b7280" }}>/mo</span></div>
        </div>
      </div>
      <div style={{ color: "#9ca3af", fontSize: "13px", marginBottom: "16px" }}>
        Assumed rate range: {a.assumed_rate_range} · Requested: {currency(a.requested_amount)} · Debt-to-income: {a.existing_dti}%
      </div>

      {a.warnings.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          {a.warnings.map((w, i) => (
            <div key={i} style={{ background: "rgba(245,158,11,0.12)", border: "1px solid #F59E0B", borderRadius: "8px", padding: "10px 14px", color: "#FCD34D", fontSize: "13px", marginBottom: "8px" }}>⚠ {w}</div>
          ))}
        </div>
      )}

      <div style={{ color: "#9ca3af", fontSize: "12px", fontWeight: "700", marginBottom: "8px" }}>WHY</div>
      {a.reasons.map((r, i) => <div key={i} style={{ color: "#CBD5E1", fontSize: "13px", marginBottom: "4px" }}>• {r}</div>)}
    </div>
  );
}

function RiskCard({ a }) {
  const color = a.risk_score >= 70 ? "#10B981" : a.risk_score >= 40 ? "#F59E0B" : "#EF4444";
  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h3 style={{ color: "#fff", margin: 0 }}>Risk Score</h3>
        <div style={{ fontSize: "28px", fontWeight: "800", color }}>{a.risk_score}/100</div>
      </div>
      <div style={{ background: "#0B1420", borderRadius: "999px", height: "10px", overflow: "hidden" }}>
        <div style={{ width: `${a.risk_score}%`, height: "100%", background: color, borderRadius: "999px" }} />
      </div>
    </div>
  );
}

function LenderComparison({ a }) {
  return (
    <div style={card}>
      <h3 style={{ color: "#fff", marginTop: 0, marginBottom: "6px" }}>Compare Lenders</h3>
      <p style={{ color: "#9ca3af", fontSize: "12px", marginTop: 0, marginBottom: "16px" }}>
        Indicative rate ranges for comparison only — actual rates depend on the lender's own underwriting. Verify current rates before applying.
      </p>
      {a.lenders.map((l) => (
        <div key={l.name} style={{ background: l.name === a.best_lender ? "rgba(13,148,136,0.1)" : "#0B1420", border: `1px solid ${l.name === a.best_lender ? "#0D9488" : "#242b35"}`, borderRadius: "10px", padding: "14px", marginBottom: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ color: "#fff", fontWeight: "700", fontSize: "14px" }}>{l.name} {l.name === a.best_lender && <span style={{ color: "#0D9488", fontSize: "11px" }}>★ Best Match</span>}</span>
            <span style={{ color: "#6b7280", fontSize: "11px" }}>{l.kind}</span>
          </div>
          <div style={{ display: "flex", gap: "18px", marginBottom: "8px", fontSize: "12px" }}>
            <span style={{ color: "#9ca3af" }}>Rate: <span style={{ color: "#fff" }}>{l.rate_range}</span></span>
            <span style={{ color: "#9ca3af" }}>Est. EMI: <span style={{ color: "#10B981" }}>{currency(l.estimated_emi)}</span></span>
          </div>
          <div style={{ color: "#CBD5E1", fontSize: "12px" }}>✔ {l.pros}</div>
          <div style={{ color: "#6b7280", fontSize: "12px" }}>✘ {l.cons}</div>
        </div>
      ))}
    </div>
  );
}

function DocumentsCard({ a }) {
  return (
    <div style={card}>
      <h3 style={{ color: "#fff", marginTop: 0, marginBottom: "16px" }}>📄 Required Documents</h3>
      {a.documents.map((d) => <div key={d} style={{ color: "#CBD5E1", fontSize: "13px", marginBottom: "8px" }}>✔ {d}</div>)}
    </div>
  );
}

const APPLY_PARTNERS = [
  { name: "SBI", url: "https://sbi.co.in" },
  { name: "HDFC Bank", url: "https://www.hdfcbank.com" },
  { name: "ICICI Bank", url: "https://www.icicibank.com" },
  { name: "Axis Bank", url: "https://www.axisbank.com" },
  { name: "Bajaj Finance", url: "https://www.bajajfinserv.in" },
  { name: "Tata Capital", url: "https://www.tatacapital.com" },
];

function ApplyCard() {
  return (
    <div style={card}>
      <h3 style={{ color: "#fff", marginTop: 0, marginBottom: "6px" }}>🏦 Apply Through an Official Partner</h3>
      <p style={{ color: "#9ca3af", fontSize: "13px", marginTop: 0, marginBottom: "16px" }}>
        This links to each lender's own official site — always apply directly with the lender, never through a third party asking for fees upfront.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px" }}>
        {APPLY_PARTNERS.map((p) => (
          <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer"
            style={{ background: "#0B1420", border: "1px solid #242b35", borderRadius: "10px", padding: "14px", color: "#fff", fontWeight: "700", fontSize: "13px", textDecoration: "none", textAlign: "center" }}>
            {p.name} →
          </a>
        ))}
      </div>
    </div>
  );
}

// ===================================================
// Loan tracker
// ===================================================
function LoanTracker() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ lender: "", principal: "", annual_rate: "", tenure_months: "", start_date: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiCall("/loans/track", { method: "GET" });
      if (data.success) setLoans(data.loans);
    } catch (_) {
      // non-fatal, tracker is optional
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addLoan = async () => {
    setSaving(true);
    try {
      await apiCall("/loans/track", { method: "POST", body: JSON.stringify({ ...form }) });
      setShowAdd(false);
      setForm({ lender: "", principal: "", annual_rate: "", tenure_months: "", start_date: "" });
      load();
    } finally {
      setSaving(false);
    }
  };

  const removeLoan = async (id) => {
    await apiCall(`/loans/track/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h3 style={{ color: "#fff", margin: 0 }}>📊 Loan Tracker</h3>
        <button onClick={() => setShowAdd((s) => !s)} style={{ background: "#0D9488", border: "none", color: "#fff", padding: "8px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
          {showAdd ? "Cancel" : "+ Track a Loan"}
        </button>
      </div>

      {showAdd && (
        <div style={{ background: "#0B1420", borderRadius: "10px", padding: "16px", marginBottom: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <input placeholder="Lender name" value={form.lender} onChange={(e) => setForm({ ...form, lender: e.target.value })} autoComplete="off" style={inputStyle} />
          <input type="number" placeholder="Principal (₹)" value={form.principal} onChange={(e) => setForm({ ...form, principal: e.target.value })} autoComplete="off" style={inputStyle} />
          <input type="number" step="0.1" placeholder="Annual rate (%)" value={form.annual_rate} onChange={(e) => setForm({ ...form, annual_rate: e.target.value })} autoComplete="off" style={inputStyle} />
          <input type="number" placeholder="Tenure (months)" value={form.tenure_months} onChange={(e) => setForm({ ...form, tenure_months: e.target.value })} autoComplete="off" style={inputStyle} />
          <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} autoComplete="off" style={inputStyle} />
          <button onClick={addLoan} disabled={saving} style={{ background: "#0D9488", border: "none", color: "#fff", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}

      {loading && <div style={{ color: "#9ca3af", fontSize: "13px" }}>Loading…</div>}
      {!loading && loans.length === 0 && <div style={{ color: "#6b7280", fontSize: "13px" }}>No loans tracked yet.</div>}

      {loans.map((l) => (
        <div key={l.id} style={{ background: "#0B1420", border: "1px solid #242b35", borderRadius: "10px", padding: "14px", marginBottom: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ color: "#fff", fontWeight: "700", fontSize: "14px" }}>{l.lender}</span>
            <button onClick={() => removeLoan(l.id)} style={{ background: "none", border: "none", color: "#EF4444", fontSize: "12px", cursor: "pointer" }}>Remove</button>
          </div>
          <div style={{ background: "#071019", borderRadius: "999px", height: "8px", overflow: "hidden", marginBottom: "8px" }}>
            <div style={{ width: `${l.progress_pct}%`, height: "100%", background: "#0D9488" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", fontSize: "12px" }}>
            <div><span style={{ color: "#6b7280" }}>EMI: </span><span style={{ color: "#fff" }}>{currency(l.emi)}</span></div>
            <div><span style={{ color: "#6b7280" }}>Remaining: </span><span style={{ color: "#fff" }}>{currency(l.remaining_balance)}</span></div>
            <div><span style={{ color: "#6b7280" }}>Next due: </span><span style={{ color: "#fff" }}>{l.next_due_date}</span></div>
            <div><span style={{ color: "#6b7280" }}>Interest paid: </span><span style={{ color: "#F59E0B" }}>{currency(l.interest_paid_so_far)}</span></div>
            <div><span style={{ color: "#6b7280" }}>Progress: </span><span style={{ color: "#10B981" }}>{l.progress_pct}%</span></div>
          </div>
        </div>
      ))}

      <div style={{ marginTop: "14px", padding: "12px", background: "rgba(13,148,136,0.08)", border: "1px solid #0D9488", borderRadius: "8px", color: "#9ca3af", fontSize: "12px" }}>
        💡 Prepaying even 1 extra EMI a year can noticeably cut your total interest and tenure — check with your lender for prepayment charges first.
      </div>
    </div>
  );
}

// ===================================================
// Slideshow shell
// ===================================================
function ResultsSlideshow({ a, transactions = [], onRedoInterview }) {
  const [slide, setSlide] = useState(0);
  const slides = [
    { title: "Eligibility", content: <EligibilityCard a={a} /> },
    { title: "Recommendation", content: <RecommendationCard a={a} /> },
    { title: "Loan Simulator", content: <LoanCommandCenter analysis={a} transactions={transactions} /> },
    { title: "Risk Score", content: <RiskCard a={a} /> },
    { title: "Compare Lenders", content: <LenderComparison a={a} /> },
    { title: "Documents", content: <DocumentsCard a={a} /> },
    { title: "Apply", content: <ApplyCard /> },
    { title: "Loan Tracker", content: <LoanTracker /> },
  ];
  const isFirst = slide === 0;
  const isLast = slide === slides.length - 1;

  return (
    <div>
      <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
        {slides.map((s, i) => (
          <button key={s.title} onClick={() => setSlide(i)} title={s.title}
            style={{ flex: 1, height: "4px", borderRadius: "999px", background: i <= slide ? "#0D9488" : "#242b35", border: "none", cursor: "pointer", padding: 0 }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ color: "#fff", fontSize: "18px", margin: 0 }}>{slides[slide].title}</h2>
        <span style={{ color: "#6b7280", fontSize: "12px" }}>{slide + 1} / {slides.length}</span>
      </div>
      <div style={{ marginBottom: "22px" }}>{slides[slide].content}</div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button onClick={() => setSlide((s) => Math.max(0, s - 1))} disabled={isFirst}
          style={{ background: "none", border: "1px solid #242b35", color: "#9ca3af", padding: "10px 22px", borderRadius: "8px", cursor: isFirst ? "default" : "pointer", opacity: isFirst ? 0.4 : 1 }}>
          ← Back
        </button>
        {isLast ? (
          <button onClick={onRedoInterview} style={{ background: "none", border: "1px solid #242b35", color: "#9ca3af", padding: "10px 22px", borderRadius: "8px", fontSize: "13px", cursor: "pointer" }}>
            Redo the interview
          </button>
        ) : (
          <button onClick={() => setSlide((s) => Math.min(slides.length - 1, s + 1))}
            style={{ background: "#0D9488", border: "none", color: "#fff", padding: "10px 26px", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}>
            Next →
          </button>
        )}
      </div>
    </div>
  );
}

// ===================================================
// Floating AI chat — lets the person ask loan questions
// without leaving the page. Uses the same /chat endpoint
// as AI Talk, which now also knows their loan profile.
// ===================================================
function FloatingLoanChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { who: "ai", text: "👋 Ask me anything about your loan — eligibility, EMI, documents, or which lender might suit you." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim()) return;
    const question = input;
    setMessages((prev) => [...prev, { who: "user", text: question }]);
    setInput("");
    setLoading(true);

    try {
      const data = await apiCall("/chat", {
        method: "POST",
        body: JSON.stringify({ message: question }),
      });
      const reply = data.reply || data.response || "No response received.";
      setMessages((prev) => [...prev, { who: "ai", text: reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { who: "ai", text: `❌ Couldn't reach the AI right now. (${err.message})` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {open && (
        <div
          style={{
            position: "fixed", bottom: "90px", right: "24px", width: "340px", maxWidth: "90vw",
            height: "440px", background: "#161a1f", border: "1px solid #242b35", borderRadius: "16px",
            display: "flex", flexDirection: "column", overflow: "hidden", zIndex: 999,
            boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #242b35", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0B1420" }}>
            <span style={{ color: "#fff", fontWeight: "700", fontSize: "14px" }}>🤖 Loan Assistant</span>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "16px", cursor: "pointer" }}>✕</button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.who === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "85%", padding: "10px 14px", borderRadius: "12px", fontSize: "13px", lineHeight: "1.5", whiteSpace: "pre-wrap", background: m.who === "user" ? "#0D9488" : "#0B1420", color: "#fff" }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && <div style={{ color: "#6b7280", fontSize: "12px" }}>Thinking…</div>}
          </div>

          <div style={{ padding: "12px", borderTop: "1px solid #242b35", display: "flex", gap: "8px" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder="Ask about your loan…"
              style={{ flex: 1, background: "#0B1420", border: "1px solid #242b35", borderRadius: "8px", padding: "10px 12px", color: "#fff", fontSize: "13px", outline: "none" }}
            />
            <button onClick={send} style={{ background: "#0D9488", border: "none", color: "#fff", padding: "10px 14px", borderRadius: "8px", cursor: "pointer" }}>➤</button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "fixed", bottom: "24px", right: "24px", width: "56px", height: "56px", borderRadius: "50%",
          background: "#0D9488", border: "none", color: "#fff", fontSize: "24px", cursor: "pointer", zIndex: 999,
          boxShadow: "0 6px 18px rgba(13,148,136,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
        }}
        title="Ask about your loan"
      >
        {open ? "✕" : "🤖"}
      </button>
    </>
  );
}


function LiveLoanSnapshot({ analysis, transactions = [] }) {
  const income = transactions
    .filter((t) => String(t.type || "").toLowerCase() === "income")
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const expense = transactions
    .filter((t) => String(t.type || "").toLowerCase() === "expense")
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const surplus = income - expense;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "10px", marginBottom: "20px" }}>
      {[
        ["Live income", currency(income), "#10B981"],
        ["Live expenses", currency(expense), "#F59E0B"],
        ["Monthly surplus", currency(surplus), surplus >= 0 ? "#10B981" : "#EF4444"],
        ["Requested", currency(analysis?.requested_amount), "#60A5FA"],
      ].map(([label, value, color]) => (
        <div key={label} style={{ background: "#0B1420", border: "1px solid #242b35", borderRadius: "11px", padding: "12px 14px" }}>
          <div style={{ color: "#6b7280", fontSize: "10px", textTransform: "uppercase" }}>{label}</div>
          <div style={{ color, fontSize: "16px", fontWeight: "800", marginTop: "5px" }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

// ===================================================
// Main page
// ===================================================
export default function LoanAssistant({ transactions } = {}) {
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showInterview, setShowInterview] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const data = await apiCall("/loans/analysis", { method: "GET" });
      if (!data.success) setError(data.error || "Could not load your analysis.");
      else if (!data.profile_complete) setShowInterview(true);
      else { setAnalysisData(data); setShowInterview(false); }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const txSignature = transactions ? `${transactions.length}:${transactions.reduce((s, t) => s + (Number(t.amount) || 0), 0)}` : "";
  useEffect(() => {
    if (!txSignature || showInterview) return;
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txSignature]);

  return (
    <div style={{ color: "#fff" }}>
      <div style={{ marginBottom: "26px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "700" }}>Loan Advisor</h1>
          <p style={{ margin: "4px 0 0 0", color: "#9ca3af", fontSize: "14px" }}>Eligibility, EMI, and lender comparison based on your actual finances.</p>
        </div>
        {analysisData && !showInterview && (
          <button onClick={() => load()} style={{ background: "none", border: "1px solid #242b35", color: "#9ca3af", padding: "8px 16px", borderRadius: "8px", fontSize: "12px", cursor: "pointer" }}>🔄 Refresh</button>
        )}
      </div>

      {loading && <div style={{ color: "#9ca3af" }}>Analyzing your finances…</div>}

      {!loading && error && (
        <div style={{ background: "#161a1f", border: "1px solid #EF4444", borderRadius: "12px", padding: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#FCA5A5", fontWeight: "700" }}>⚠️ Something went wrong</span>
            <button onClick={() => load()} style={{ background: "none", border: "1px solid #EF4444", color: "#FCA5A5", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}>Retry</button>
          </div>
          <div style={{ marginTop: "10px", fontFamily: "monospace", fontSize: "12px", color: "#FCA5A5", opacity: 0.85 }}>
            {error.split("  |  ").map((line, i) => <div key={i}>{line}</div>)}
          </div>
        </div>
      )}

      {!loading && !error && showInterview && <InterviewWizard onComplete={() => load()} />}

      {!loading && !error && !showInterview && analysisData && (
        <>
          <LiveLoanSnapshot analysis={analysisData} transactions={transactions || []} />
          <ResultsSlideshow
            a={analysisData}
            transactions={transactions || []}
            onRedoInterview={() => setShowInterview(true)}
          />
        </>
      )}

      <FloatingLoanChat />
    </div>
  );
}