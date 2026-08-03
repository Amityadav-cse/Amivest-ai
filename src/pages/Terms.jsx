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

function Terms() {
  return (
    <div style={{ color: "#ffffff", maxWidth: "820px" }}>
      <div style={{ marginBottom: "35px" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 700 }}>Terms of Service</h1>
        <p style={{ margin: "4px 0 0 0", color: "#9ca3af", fontSize: "14px" }}>
          Last updated: [Insert Date]
        </p>
      </div>

      <div style={card}>
        <h3 style={h3}>1. Acceptance of terms</h3>
        <p style={p}>
          By creating an account or using Amivest AI, you agree to these Terms of
          Service. If you don't agree, please don't use the service.
        </p>
      </div>

      <div style={card}>
        <h3 style={h3}>2. What the service does</h3>
        <p style={p}>
          Amivest AI helps you understand your finances by importing bank statements,
          categorizing transactions, and answering questions about your spending, saving,
          and financial goals through text and voice.
        </p>
      </div>

      <div style={card}>
        <h3 style={h3}>3. Not financial advice</h3>
        <p style={p}>
          Amivest AI provides general information and educational content, not licensed
          financial, investment, tax, or legal advice. Decisions about investments, loans,
          or taxes are yours to make, ideally with a qualified professional. See our
          Disclaimer for more detail.
        </p>
      </div>

      <div style={card}>
        <h3 style={h3}>4. Your account</h3>
        <p style={p}>
          You're responsible for keeping your login credentials secure and for all
          activity under your account. Let us know immediately if you suspect
          unauthorized access.
        </p>
      </div>

      <div style={card}>
        <h3 style={h3}>5. Acceptable use</h3>
        <p style={p}>
          You agree not to misuse the service — including attempting to access other
          users' data, uploading statements you're not authorized to use, or using the
          service for unlawful purposes.
        </p>
      </div>

      <div style={card}>
        <h3 style={h3}>6. Service availability</h3>
        <p style={p}>
          We aim for reliable uptime but don't guarantee the service will always be
          available, error-free, or uninterrupted.
        </p>
      </div>

      <div style={card}>
        <h3 style={h3}>7. Limitation of liability</h3>
        <p style={p}>
          Amivest AI is provided "as is." To the fullest extent permitted by law, we are
          not liable for financial decisions made based on information from the service.
        </p>
      </div>

      <div style={card}>
        <h3 style={h3}>8. Changes to these terms</h3>
        <p style={p}>
          We may update these terms from time to time. Continued use of the service
          after changes means you accept the updated terms.
        </p>
      </div>

      <div style={card}>
        <h3 style={h3}>9. Contact</h3>
        <p style={p}>
          Questions about these terms? Reach us at legal@amivest.ai.
        </p>
      </div>
    </div>
  );
}

export default Terms;
