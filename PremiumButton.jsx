import { useState, useEffect } from "react";

const BASE_IP = "http://127.0.0.1:5000";
const BASE_LOCAL = "http://localhost:5000";

async function apiCall(path, options = {}) {
  const urls = [path, `${BASE_IP}${path}`, `${BASE_LOCAL}${path}`];
  const method = (options.method || "GET").toUpperCase();
  const attempts = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        ...(method !== "GET" ? { headers: { "Content-Type": "application/json" } } : {}),
        ...options,
      });
      let body = null, parseFailed = false;
      try { body = await res.json(); } catch (_) { parseFailed = true; }
      if (res.ok && !parseFailed) return body || {};
      if (res.ok && parseFailed) { attempts.push(`${url} → HTTP ${res.status} but not JSON`); continue; }
      attempts.push(`${url} → HTTP ${res.status}: ${(body && (body.error || body.message)) || "no details"}`);
    } catch (err) {
      attempts.push(`${url} → ${err.name}: ${err.message}`);
    }
  }
  throw new Error(attempts.join("  |  "));
}

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Drop this where your "Premium Member" badge currently is (Navbar.jsx).
 * Shows "Upgrade to Premium — ₹199" for free users, or a Premium badge
 * for users who've actually completed a verified Razorpay payment.
 */
export default function PremiumButton() {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const loadStatus = async () => {
    setLoading(true);
    try {
      const data = await apiCall("/payment/status?user_id=1", { method: "GET" });
      if (data.success) setIsPremium(data.is_premium);
    } catch (_) {
      // non-fatal — just show as free until confirmed otherwise
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStatus(); }, []);

  const upgrade = async () => {
    setProcessing(true);
    setError("");
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setError("Could not load the payment checkout — check your internet connection.");
        setProcessing(false);
        return;
      }

      const order = await apiCall("/payment/create-order", {
        method: "POST",
        body: JSON.stringify({ user_id: 1 }),
      });

      if (!order.success) {
        setError(order.error || "Could not start checkout.");
        setProcessing(false);
        return;
      }

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: "FinSaathi AI",
        description: "Premium Plan",
        theme: { color: "#0D9488" },
        handler: async (response) => {
          try {
            const verifyRes = await apiCall("/payment/verify", {
              method: "POST",
              body: JSON.stringify({
                user_id: 1,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            if (verifyRes.success) {
              setIsPremium(true);
            } else {
              setError(verifyRes.error || "Payment could not be verified.");
            }
          } catch (err) {
            setError(err.message);
          } finally {
            setProcessing(false);
          }
        },
        modal: {
          ondismiss: () => setProcessing(false),
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.open();
    } catch (err) {
      setError(err.message);
      setProcessing(false);
    }
  };

  if (loading) return null;

  if (isPremium) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#F59E0B", fontSize: "13px", fontWeight: "700" }}>
        Premium Member <span>⭐</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
      <button
        onClick={upgrade}
        disabled={processing}
        style={{
          background: "#0D9488", border: "none", color: "#fff", padding: "8px 16px",
          borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: processing ? "default" : "pointer",
          opacity: processing ? 0.7 : 1, display: "flex", alignItems: "center", gap: "6px",
        }}
      >
        {processing ? "Opening checkout…" : "⭐ Upgrade to Premium — ₹199"}
      </button>
      {error && <div style={{ color: "#EF4444", fontSize: "10px", maxWidth: "220px", textAlign: "right" }}>{error}</div>}
    </div>
  );
}
