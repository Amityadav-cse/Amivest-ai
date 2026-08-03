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

function PrivacyPolicy() {
  return (
    <div style={{ color: "#ffffff", maxWidth: "820px" }}>
      <div style={{ marginBottom: "35px" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 700 }}>Privacy Policy</h1>
        <p style={{ margin: "4px 0 0 0", color: "#9ca3af", fontSize: "14px" }}>
          Last updated: [Insert Date]
        </p>
      </div>

      <div style={card}>
        <h3 style={h3}>What we collect</h3>
        <p style={p}>
          When you use Amivest AI, we collect the information you provide directly —
          your name, email, and the bank statements or transaction data you choose to
          import — along with basic usage data such as pages visited and features used,
          to help us improve the product.
        </p>
      </div>

      <div style={card}>
        <h3 style={h3}>How we use your data</h3>
        <p style={p}>
          Your transaction data is used only to power the features you use directly:
          categorizing spending, answering your questions, and generating the summaries
          shown on your dashboard. We do not sell your financial data to third parties.
        </p>
      </div>

      <div style={card}>
        <h3 style={h3}>Third-party services</h3>
        <p style={p}>
          We use third-party AI providers to generate conversational responses to your
          questions. Relevant excerpts of your data (such as recent transaction context)
          may be sent to these providers solely to generate a response, subject to their
          own data-handling terms.
        </p>
      </div>

      <div style={card}>
        <h3 style={h3}>Data storage &amp; security</h3>
        <p style={p}>
          Your data is stored in a secured database and is only accessible to your
          account. We take reasonable technical measures to protect it, but no system
          is perfectly secure, and you use the service at your own risk.
        </p>
      </div>

      <div style={card}>
        <h3 style={h3}>Your choices</h3>
        <p style={p}>
          You may request deletion of your account and associated data at any time by
          contacting us. You can also stop using the service and remove any imported
          statements from your dashboard.
        </p>
      </div>

      <div style={card}>
        <h3 style={h3}>Changes to this policy</h3>
        <p style={p}>
          We may update this policy from time to time. Material changes will be
          reflected with an updated "last updated" date above.
        </p>
      </div>

      <div style={card}>
        <h3 style={h3}>Contact</h3>
        <p style={p}>
          Questions about this policy? Reach us at privacy@amivest.ai.
        </p>
      </div>
    </div>
  );
}

export default PrivacyPolicy;
