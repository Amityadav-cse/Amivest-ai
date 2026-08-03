import React, { useState, useEffect } from "react";

// =========================================================
// AMIVEST AI HEADER & SUBSCRIPTION MANAGEMENT SYSTEM
// Fully dynamic profile matching logged-in local storage metadata
// =========================================================
 
export default function Header({ searchQuery = "", setSearchQuery = () => {} }) {
  // Dynamic user data state variables
  const [userName, setUserName] = useState("Guest");
  const [userEmail, setUserEmail] = useState("guest@amivest.ai");
  const [userInitial, setUserInitial] = useState("G");

  // Plan management states
  const [currentPlan, setCurrentPlan] = useState("premium"); // 'free' | 'premium'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBilling, setSelectedBilling] = useState("monthly"); // 'monthly' | 'yearly'
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState("");
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("upi"); // 'upi' | 'card' | 'netbanking'
  const [upiId, setUpiId] = useState("user@upi");

  // Sync state with localStorage on mount safely
  useEffect(() => {
    // 1. Extract dynamic authentication profile data matrices
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        const name = parsedUser?.name || "Guest";
        setUserName(name);
        setUserEmail(parsedUser?.email || "user@amivest.ai");
        
        // Grab first letter dynamically for the circle avatar hook
        if (name && name.length > 0) {
          setUserInitial(name.charAt(0).toUpperCase());
        }
        
        // Setup initial default fallback UPI based on dynamic user name signature
        const cleanUpiPrefix = name.toLowerCase().replace(/\s+/g, "");
        setUpiId(`${cleanUpiPrefix}@upi`);
      }
    } catch (err) {
      console.error("Failed parsing user storage tokens:", err);
    }

    // 2. Synchronize active premium vs free tier tracking arrays
    const savedPlan = localStorage.getItem("amivest_user_plan");
    if (savedPlan) {
      setCurrentPlan(savedPlan);
    } else {
      localStorage.setItem("amivest_user_plan", "premium");
    }
  }, []);

  const handleUpgradeToPremium = () => {
    setShowCheckoutModal(true);
  };

  const handleConfirmPayment = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      setIsProcessingPayment(false);
      setShowCheckoutModal(false);
      setCurrentPlan("premium");
      localStorage.setItem("amivest_user_plan", "premium");
      setPaymentSuccessMsg("🎉 Welcome to AmiVest AI Premium! ₹299 payment successful.");
      setTimeout(() => setPaymentSuccessMsg(""), 5000);
    }, 1500);
  };

  const handleDowngradeToFree = () => {
    if (window.confirm("Are you sure you want to downgrade to the Free plan? You will lose Siri-Grade Voice features & Advanced Investment insights.")) {
      setCurrentPlan("free");
      localStorage.setItem("amivest_user_plan", "free");
      setPaymentSuccessMsg("Plan downgraded to Free Tier.");
      setTimeout(() => setPaymentSuccessMsg(""), 4000);
    }
  };

  const cardBg = "#0D2D4A";
  const darkBg = "#071829";
  const borderCol = "#1E3A5F";
  const accentTeal = "#0D9488";
  const emeraldCol = "#10B981";

  return (
    <>
      {/* Primary Global Application Bar */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 24px",
          background: "rgba(11, 20, 32, 0.85)",
          backdropFilter: "blur(16px)",
          borderBottom: `1px solid ${borderCol}`,
          position: "sticky",
          top: 0,
          zIndex: 900,
          fontFamily: "sans-serif",
        }}
      >
        {/* Left Branding Hub */}
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "22px",
              fontWeight: "900",
              color: "#fff",
              letterSpacing: "-0.5px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            AmiVest AI
            <span
              style={{
                fontSize: "11px",
                background: currentPlan === "premium" ? "rgba(16, 185, 129, 0.2)" : "rgba(156, 163, 175, 0.2)",
                color: currentPlan === "premium" ? emeraldCol : "#9CA3AF",
                border: `1px solid ${currentPlan === "premium" ? emeraldCol : borderCol}`,
                padding: "2px 8px",
                borderRadius: "12px",
                fontWeight: "700",
              }}
            >
              {currentPlan === "premium" ? "PRO ACTIVE ⭐" : "FREE TIER"}
            </span>
          </h1>
          <p style={{ margin: "2px 0 0 0", color: "#9CA3AF", fontSize: "12px" }}>
            Your AI Financial Guardian
          </p>
        </div>

        {/* Center Navigation Query Engine Input */}
        <div style={{ position: "relative", width: "320px" }}>
          <input
            type="text"
            placeholder="Search transactions, goals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              background: darkBg,
              border: `1px solid ${borderCol}`,
              borderRadius: "20px",
              padding: "10px 16px 10px 40px",
              color: "#fff",
              fontSize: "13px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <span
            style={{
              position: "absolute",
              left: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#9CA3AF",
              fontSize: "14px",
            }}
          >
            🔍
          </span>
        </div>

        {/* Right Dashboard Controls Matrix */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* Notifications Utility Trigger */}
          <button
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: darkBg,
              border: `1px solid ${borderCol}`,
              color: "#F59E0B",
              fontSize: "18px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
            title="Notifications"
          >
            🔔
            <span
              style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#EF4444",
              }}
            />
          </button>

          {/* Interactive Profile Pill Widget Container */}
          <div
            onClick={() => setIsModalOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              background: "rgba(13, 45, 74, 0.8)",
              border: `1px solid ${currentPlan === "premium" ? accentTeal : borderCol}`,
              borderRadius: "28px",
              padding: "6px 16px 6px 8px",
              cursor: "pointer",
              boxShadow: currentPlan === "premium" ? "0 0 15px rgba(13, 148, 136, 0.25)" : "none",
              transition: "all 0.2s ease",
            }}
            title="Manage Subscription & Profile"
          >
            {/* Dynamic Initial Avatar Circle */}
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: currentPlan === "premium" 
                  ? "linear-gradient(135deg, #06B6D4 0%, #10B981 100%)" 
                  : "linear-gradient(135deg, #475569 0%, #64748B 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: "900",
                fontSize: "16px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              }}
            >
              {userInitial}
            </div>

            {/* Dynamic UI Profile Text Fields */}
            <div style={{ textAlign: "left" }}>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "800",
                  color: "#fff",
                }}
              >
                {userName}
              </div>

              <div
                style={{
                  fontSize: "11px",
                  color: currentPlan === "premium" ? emeraldCol : "#9CA3AF",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                  fontWeight: "600",
                }}
              >
                {currentPlan === "premium" ? "Premium Member ⭐" : "Free Member"}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Real-time Dynamic Notification Toaster Notification Overlay */}
      {paymentSuccessMsg && (
        <div
          style={{
            position: "fixed",
            top: "80px",
            right: "24px",
            zIndex: 10000,
            background: "rgba(16, 185, 129, 0.95)",
            backdropFilter: "blur(10px)",
            color: "#fff",
            padding: "14px 22px",
            borderRadius: "12px",
            fontWeight: "700",
            fontSize: "13px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span>{paymentSuccessMsg}</span>
          <button
            onClick={() => setPaymentSuccessMsg("")}
            style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: "14px" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Central Interactive Settings Modal */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(12px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            fontFamily: "sans-serif",
          }}
        >
          <div
            style={{
              background: cardBg,
              border: `1px solid ${borderCol}`,
              borderRadius: "24px",
              maxWidth: "780px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
              padding: "28px",
              color: "#fff",
              position: "relative",
            }}
          >
            {/* Close Modal Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                background: darkBg,
                border: `1px solid ${borderCol}`,
                color: "#9CA3AF",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                cursor: "pointer",
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>

            {/* Profile Info Header Card Layer */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "18px",
                padding: "20px",
                background: darkBg,
                borderRadius: "16px",
                border: `1px solid ${borderCol}`,
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  background: currentPlan === "premium"
                    ? "linear-gradient(135deg, #06B6D4 0%, #10B981 100%)"
                    : "linear-gradient(135deg, #475569 0%, #64748B 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  fontWeight: "900",
                  color: "#fff",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.4)",
                }}
              >
                {userInitial}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800" }}>{userName}</h2>
                  <span
                    style={{
                      fontSize: "11px",
                      background: currentPlan === "premium" ? "rgba(16, 185, 129, 0.2)" : "rgba(156, 163, 175, 0.2)",
                      color: currentPlan === "premium" ? emeraldCol : "#9CA3AF",
                      padding: "3px 10px",
                      borderRadius: "12px",
                      fontWeight: "700",
                    }}
                  >
                    {currentPlan === "premium" ? "Active Premium Member ⭐" : "Free Member"}
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "4px" }}>
                  {userEmail} • Active Account Pipeline Node
                </div>
              </div>
            </div>

            {/* Subscription Section Header Context */}
            <div style={{ textAlign: "center", marginBottom: "22px" }}>
              <h3 style={{ margin: 0, fontSize: "22px", fontWeight: "900" }}>Choose Your AmiVest AI Plan</h3>
              <p style={{ margin: "6px 0 0 0", color: "#9CA3AF", fontSize: "13px" }}>
                Unlock Siri-Grade voice assistance, unlimited statement analysis, and automated investment advice.
              </p>
            </div>

            {/* Pricing Matrix Layout Panels */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
              
              {/* PLAN 1: FREE TIER DETAILS */}
              <div
                style={{
                  background: darkBg,
                  border: `2px solid ${currentPlan === "free" ? "#0D9488" : borderCol}`,
                  borderRadius: "18px",
                  padding: "22px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  position: "relative",
                }}
              >
                <div>
                  <div style={{ fontSize: "12px", color: "#9CA3AF", fontWeight: "700", textTransform: "uppercase" }}>
                    Standard Plan
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: "900", color: "#fff", margin: "10px 0 4px 0" }}>
                    Free
                  </div>
                  <div style={{ fontSize: "12px", color: "#9CA3AF", marginBottom: "18px" }}>
                    Forever free for basic financial tracking.
                  </div>

                  {/* Features Checklist */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px", color: "#CBD5E1" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: emeraldCol }}>✔</span> Up to 5 Bank Statement Uploads / mo
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: emeraldCol }}>✔</span> Standard Dashboard & Ledger Overview
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: emeraldCol }}>✔</span> Basic AI Chatbot Assistance
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", opacity: 0.4 }}>
                      <span>✕</span> <span style={{ textDecoration: "line-through" }}>Siri-Grade Voice Assistant ("Hey AmiVest")</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", opacity: 0.4 }}>
                      <span>✕</span> <span style={{ textDecoration: "line-through" }}>Groww In-App Mutual Funds Store</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", opacity: 0.4 }}>
                      <span>✕</span> <span style={{ textDecoration: "line-through" }}>RBI Rules & Tax Exemption Alerts</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={currentPlan === "premium" ? handleDowngradeToFree : null}
                  style={{
                    width: "100%",
                    marginTop: "24px",
                    padding: "12px",
                    borderRadius: "10px",
                    border: `1px solid ${currentPlan === "free" ? borderCol : "#EF4444"}`,
                    background: currentPlan === "free" ? "rgba(255,255,255,0.05)" : "transparent",
                    color: currentPlan === "free" ? "#9CA3AF" : "#EF4444",
                    fontWeight: "700",
                    fontSize: "13px",
                    cursor: currentPlan === "free" ? "default" : "pointer",
                  }}
                >
                  {currentPlan === "free" ? "Current Plan Active" : "Downgrade to Free"}
                </button>
              </div>

              {/* PLAN 2: PREMIUM TIER CONTROLS */}
              <div
                style={{
                  background: "linear-gradient(180deg, #0D3B66 0%, #071829 100%)",
                  border: `2px solid ${emeraldCol}`,
                  borderRadius: "18px",
                  padding: "22px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  position: "relative",
                  boxShadow: "0 10px 30px rgba(16, 185, 129, 0.25)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "-12px",
                    right: "20px",
                    background: emeraldCol,
                    color: "#071829",
                    fontSize: "10px",
                    fontWeight: "900",
                    padding: "3px 10px",
                    borderRadius: "10px",
                    textTransform: "uppercase",
                  }}
                >
                  RECOMMENDED
                </div>

                <div>
                  <div style={{ fontSize: "12px", color: emeraldCol, fontWeight: "800", textTransform: "uppercase" }}>
                    AmiVest AI Pro ⭐
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: "900", color: "#fff", margin: "10px 0 4px 0" }}>
                    ₹299 <span style={{ fontSize: "13px", color: "#9CA3AF", fontWeight: "500" }}>/ month</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#9CA3AF", marginBottom: "18px" }}>
                    Complete AI financial guardian suite.
                  </div>

                  {/* Features Checklist */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px", color: "#fff" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: emeraldCol }}>⚡</span> <strong>Unlimited</strong> Bank Statement OCR Uploads
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: emeraldCol }}>⚡</span> <strong>Siri-Grade Voice Assistant</strong> ("Hey AmiVest")
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: emeraldCol }}>⚡</span> <strong>Groww Mutual Fund Store</strong> & SIP Projections
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: emeraldCol }}>⚡</span> <strong>Real-time RBI & Tax Alerts</strong> (Section 80C/LTCG)
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: emeraldCol }}>⚡</span> <strong>24/7 Llama 3.3 70B</strong> Financial Copilot
                    </div>
                  </div>
                </div>

                <button
                  onClick={currentPlan === "free" ? handleUpgradeToPremium : null}
                  style={{
                    width: "100%",
                    marginTop: "24px",
                    padding: "12px",
                    borderRadius: "10px",
                    border: "none",
                    background: currentPlan === "premium" ? "rgba(16, 185, 129, 0.2)" : emeraldCol,
                    color: currentPlan === "premium" ? emeraldCol : "#071829",
                    fontWeight: "900",
                    fontSize: "13px",
                    cursor: currentPlan === "premium" ? "default" : "pointer",
                    boxShadow: currentPlan === "free" ? "0 4px 15px rgba(16, 185, 129, 0.4)" : "none",
                  }}
                >
                  {currentPlan === "premium" ? "✔ Current Plan Active ⭐" : "Upgrade Now for ₹299/mo"}
                </button>
              </div>
            </div>

            <div style={{ textAlign: "center", fontSize: "11px", color: "#64748B" }}>
              🔒 Safe & Encrypted Payments • Cancel or switch plans anytime from this settings modal.
            </div>
          </div>
        </div>
      )}

      {/* Checkout Payment Processing Interface Context Frame */}
      {showCheckoutModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(14px)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            fontFamily: "sans-serif",
          }}
        >
          <div
            style={{
              background: cardBg,
              border: `1px solid ${borderCol}`,
              borderRadius: "20px",
              maxWidth: "420px",
              width: "100%",
              padding: "24px",
              color: "#fff",
              position: "relative",
              boxShadow: "0 20px 50px rgba(0,0,0,0.9)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800" }}>Upgrade to AmiVest Premium</h3>
              <button
                onClick={() => setShowCheckoutModal(false)}
                style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", fontSize: "16px" }}
              >
                ✕
              </button>
            </div>

            {/* Price Plan Summary Box */}
            <div
              style={{
                background: darkBg,
                padding: "16px",
                borderRadius: "12px",
                border: `1px solid ${borderCol}`,
                marginBottom: "20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: "14px", fontWeight: "800" }}>AmiVest AI Pro Plan</div>
                <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "2px" }}>Monthly recurring subscription</div>
              </div>
              <div style={{ fontSize: "20px", fontWeight: "900", color: emeraldCol }}>₹299</div>
            </div>

            {/* Payment Sub-Method Switches */}
            <div style={{ marginBottom: "18px" }}>
              <label style={{ fontSize: "12px", color: "#9CA3AF", display: "block", marginBottom: "8px" }}>
                Select Payment Method
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                {["upi", "card"].map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "8px",
                      border: `1px solid ${paymentMethod === method ? accentTeal : borderCol}`,
                      background: paymentMethod === method ? "rgba(13,148,136,0.2)" : darkBg,
                      color: "#fff",
                      fontSize: "12px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      cursor: "pointer",
                    }}
                  >
                    {method === "upi" ? "⚡ UPI / GooglePay" : "💳 Credit/Debit Card"}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Interactive Input VPA Selector */}
            {paymentMethod === "upi" ? (
              <div style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "12px", color: "#9CA3AF", display: "block", marginBottom: "6px" }}>
                  Your VPA / UPI ID
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="username@upi"
                  style={{
                    width: "100%",
                    background: darkBg,
                    border: `1px solid ${borderCol}`,
                    borderRadius: "8px",
                    padding: "10px 12px",
                    color: "#fff",
                    fontSize: "13px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            ) : (
              <div style={{ marginBottom: "20px" }}>
                <input
                  type="text"
                  placeholder="Card Number (4111 .... .... 1111)"
                  defaultValue="4111 2222 3333 4444"
                  style={{
                    width: "100%",
                    background: darkBg,
                    border: `1px solid ${borderCol}`,
                    borderRadius: "8px",
                    padding: "10px 12px",
                    color: "#fff",
                    fontSize: "13px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            )}

            <button
              onClick={handleConfirmPayment}
              disabled={isProcessingPayment}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "10px",
                border: "none",
                background: emeraldCol,
                color: "#071829",
                fontWeight: "900",
                fontSize: "14px",
                cursor: isProcessingPayment ? "default" : "pointer",
                boxShadow: "0 4px 15px rgba(16, 185, 129, 0.4)",
              }}
            >
              {isProcessingPayment ? "Processing ₹299 Payment..." : "Pay ₹299 & Activate Premium"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}