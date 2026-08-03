import React, { useState } from "react";

const card = {
  background: "#161a1f",
  border: "1px solid #242b35",
  borderRadius: "16px",
  padding: "28px",
};

const inputStyle = {
  width: "100%",
  background: "#0d1117",
  border: "1px solid #242b35",
  borderRadius: "8px",
  padding: "12px 14px",
  color: "#ffffff",
  fontSize: "14px",
  marginTop: "6px",
  boxSizing: "border-box",
};

const labelStyle = { color: "#9ca3af", fontSize: "13px", fontWeight: 600 };

function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState(""); // "", "sending", "sent", "error"

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;

    setStatus("sending");
    try {
      // Wire this up to your backend contact route, e.g. POST /contact
      const res = await fetch("/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("sent");
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      setStatus("error");
    }
  };

  return (
    <div style={{ color: "#ffffff", maxWidth: "620px" }}>
      <div style={{ marginBottom: "35px" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 700 }}>Contact Us</h1>
        <p style={{ margin: "4px 0 0 0", color: "#9ca3af", fontSize: "14px" }}>
          Questions, feedback, or something not working right — tell us.
        </p>
      </div>

      <div style={card}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>
              Name
              <input
                style={inputStyle}
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Your name"
                required
              />
            </label>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>
              Email
              <input
                style={inputStyle}
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
              />
            </label>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>
              Message
              <textarea
                style={{ ...inputStyle, minHeight: "120px", resize: "vertical", fontFamily: "inherit" }}
                name="message"
                value={form.message}
                onChange={handleChange}
                placeholder="How can we help?"
                required
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={status === "sending"}
            style={{
              background: "#ff4500",
              color: "#fff",
              border: "none",
              padding: "12px 24px",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: status === "sending" ? "default" : "pointer",
              opacity: status === "sending" ? 0.7 : 1,
            }}
          >
            {status === "sending" ? "Sending..." : "Send Message"}
          </button>

          {status === "sent" && (
            <p style={{ color: "#10b981", marginTop: "14px", fontSize: "13px" }}>
              Message sent. We'll get back to you soon.
            </p>
          )}
          {status === "error" && (
            <p style={{ color: "#ef4444", marginTop: "14px", fontSize: "13px" }}>
              Something went wrong sending your message. Please try again.
            </p>
          )}
        </form>
      </div>

      <div style={{ ...card, marginTop: "20px" }}>
        <h3 style={{ marginTop: 0, marginBottom: "10px" }}>Other ways to reach us</h3>
        <p style={{ color: "#9ca3af", margin: 0, lineHeight: 1.8 }}>
          Email: support@amivest.ai<br />
          Response time: within 2 business days
        </p>
      </div>
    </div>
  );
}

export default Contact;
