import React from "react";

const card = {
  background: "#161a1f",
  border: "1px solid #242b35",
  borderRadius: "16px",
  padding: "28px",
  marginBottom: "20px",
};

const h3 = { marginTop: 0, marginBottom: "12px" };
const p = { color: "#9ca3af", lineHeight: 1.7, margin: 0 };

function Disclaimer() {
  return (
    <div style={{ color: "#ffffff", maxWidth: "820px" }}>
      <div style={{ marginBottom: "35px" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 700 }}>Disclaimer</h1>
        <p style={{ margin: "4px 0 0 0", color: "#9ca3af", fontSize: "14px" }}>
          Please read before acting on anything Amivest AI tells you.
        </p>
      </div>

      <div style={{ ...card, borderColor: "#ff4500" }}>
        <h3 style={{ ...h3, color: "#ff4500" }}>Not financial, tax, or legal advice</h3>
        <p style={p}>
          Amivest AI is an informational tool. Responses about budgeting, savings,
          mutual funds, SIPs, loans, or taxes are general in nature and generated with
          the help of AI. They are not a substitute for advice from a licensed
          financial advisor, chartered accountant, or tax professional who understands
          your full situation.
        </p>
      </div>

      <div style={card}>
        <h3 style={h3}>AI-generated responses can be wrong</h3>
        <p style={p}>
          Amivest AI uses an AI model to generate answers based on your transaction
          data and general financial knowledge. Like any AI system, it can misread
          data, miscalculate, or give an incomplete answer. Always verify important
          numbers — especially balances, tax figures, and loan calculations — against
          your actual bank records before relying on them.
        </p>
      </div>

      <div style={card}>
        <h3 style={h3}>Investment risk</h3>
        <p style={p}>
          Mutual funds, SIPs, and other investment products are subject to market risk.
          Any mention of these in the app is educational and general — it does not
          constitute a recommendation to buy, sell, or hold any specific investment.
          Past performance is not indicative of future results.
        </p>
      </div>

      <div style={card}>
        <h3 style={h3}>Your responsibility</h3>
        <p style={p}>
          Decisions about your money — spending, saving, borrowing, or investing —
          are yours to make. Amivest AI does not take responsibility for outcomes
          resulting from decisions made using information from the app.
        </p>
      </div>

      <div style={card}>
        <h3 style={h3}>Questions</h3>
        <p style={p}>
          If something in the app seems inaccurate or unclear, please contact us at
          support@amivest.ai so we can look into it.
        </p>
      </div>
    </div>
  );
}

export default Disclaimer;
