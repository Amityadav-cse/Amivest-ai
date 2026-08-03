import React from "react";

function RefundPolicy() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0F172A",
        color: "#E2E8F0",
        padding: "40px",
        lineHeight: "1.8",
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          background: "#1E293B",
          padding: "40px",
          borderRadius: "16px",
          border: "1px solid #334155",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
        }}
      >
        <h1
          style={{
            color: "#14B8A6",
            fontSize: "38px",
            marginBottom: "10px",
          }}
        >
          Refund Policy
        </h1>

        <p style={{ color: "#94A3B8" }}>
          <strong>Effective Date:</strong> August 3, 2026
        </p>

        <hr
          style={{
            border: "1px solid #334155",
            margin: "25px 0",
          }}
        />

        <h2 style={{ color: "#14B8A6" }}>1. Introduction</h2>

        <p>
          Thank you for choosing <strong>Amivest AI</strong>. We aim to provide
          reliable AI-powered financial tools and premium services. Please read
          this Refund Policy carefully before purchasing any subscription or
          paid service.
        </p>

        <h2 style={{ color: "#14B8A6" }}>2. Premium Subscription</h2>

        <p>
          Premium subscriptions unlock additional features such as advanced AI
          insights, investment guidance, financial reports, and other premium
          services.
        </p>

        <h2 style={{ color: "#14B8A6" }}>3. Refund Eligibility</h2>

        <ul>
          <li>Duplicate payment for the same subscription.</li>
          <li>Payment was successful but Premium access was not activated.</li>
          <li>Technical issues caused by Amivest AI that permanently prevent access.</li>
        </ul>

        <h2 style={{ color: "#14B8A6" }}>4. Non-Refundable Cases</h2>

        <ul>
          <li>Change of mind after purchase.</li>
          <li>Partial usage of Premium features.</li>
          <li>Failure to cancel before renewal.</li>
          <li>User device or internet related issues.</li>
          <li>Violation of our Terms & Conditions.</li>
        </ul>

        <h2 style={{ color: "#14B8A6" }}>5. Cancellation</h2>

        <p>
          You may cancel your subscription at any time. Premium access will
          remain active until the end of your current billing period. No further
          charges will be made after cancellation.
        </p>

        <h2 style={{ color: "#14B8A6" }}>6. Refund Processing</h2>

        <p>
          Approved refunds are generally processed within <strong>7–10 business
          days</strong>. Refunds are issued to the original payment method used
          during purchase.
        </p>

        <h2 style={{ color: "#14B8A6" }}>7. Contact Us</h2>

        <p>
          For refund requests or billing support, please contact us with:
        </p>

        <ul>
          <li>Your Full Name</li>
          <li>Registered Email Address</li>
          <li>Transaction ID</li>
          <li>Date of Payment</li>
          <li>Reason for Refund Request</li>
        </ul>

        <div
          style={{
            marginTop: "20px",
            padding: "20px",
            background: "#0F172A",
            borderRadius: "10px",
            border: "1px solid #14B8A6",
          }}
        >
          <h3 style={{ color: "#14B8A6" }}>Support</h3>

          <p>
            📧 <strong>Email:</strong> amivest.support@gmail.com
          </p>

          <p>
            We aim to respond to all support requests within
            <strong> 24–48 business hours.</strong>
          </p>
        </div>

        <h2
          style={{
            marginTop: "35px",
            color: "#14B8A6",
          }}
        >
          8. Changes to this Policy
        </h2>

        <p>
          Amivest AI reserves the right to update or modify this Refund Policy
          at any time. Any changes will become effective immediately after being
          published on this page.
        </p>

        <hr
          style={{
            border: "1px solid #334155",
            margin: "30px 0",
          }}
        />

        <p
          style={{
            textAlign: "center",
            color: "#94A3B8",
          }}
        >
          © 2026 Amivest AI. All Rights Reserved.
        </p>
      </div>
    </div>
  );
}

export default RefundPolicy;