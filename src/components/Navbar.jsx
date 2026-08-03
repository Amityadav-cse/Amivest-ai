import React, { useState, useEffect } from "react";

function Navbar() {
  // Setup isolated authentication profile state managers
  const [userName, setUserName] = useState("Guest");
  const [userInitial, setUserInitial] = useState("G");

  // Read data securely within the layout lifecycle hook
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        const name = parsedUser?.name || "Guest";
        
        setUserName(name);
        
        // Dynamically extract the first character for the avatar layer hook
        if (name && name.length > 0) {
          setUserInitial(name.charAt(0).toUpperCase());
        }
      }
    } catch (err) {
      console.error("Error reading application profile tokens:", err);
    }
  }, []);

  return (
    <nav
      style={{
        height: "80px",
        background: "linear-gradient(90deg, #0F172A 0%, #1A1F3A 100%)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 35px",
        borderBottom: "3px solid #0D9488",
        position: "sticky",
        top: 0,
        zIndex: 1000,
        boxShadow: "0 15px 40px rgba(13, 148, 136, 0.2)",
        fontFamily: "sans-serif"
      }}
    >
      {/* Left Section: Branding Metrics */}
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: "30px",
            fontWeight: "800",
            background: "linear-gradient(90deg, #0D9488, #14B8A6, #06B6D4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "0.5px",
          }}
        >
          Amivest AI
        </h2>

        <p
          style={{
            marginTop: "4px",
            color: "#94A3B8",
            fontSize: "13px",
            fontWeight: "500",
          }}
        >
          Your AI Financial Guardian
        </p>
      </div>

      {/* Right Section: Interactive Control Panel */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "18px",
        }}
      >
        {/* Local Search Controller */}
        <input
          type="text"
          placeholder="Search transactions, goals..."
          style={{
            width: "220px",
            padding: "11px 18px",
            borderRadius: "30px",
            border: "2px solid #0D9488",
            background: "rgba(15, 23, 42, 0.6)",
            outline: "none",
            fontSize: "14px",
            color: "#E2E8F0",
            transition: "0.3s",
          }}
          onFocus={(e) => {
            e.target.style.border = "2px solid #06B6D4";
            e.target.style.background = "rgba(15, 23, 42, 0.9)";
            e.target.style.boxShadow = "0 0 15px rgba(6, 182, 212, 0.3)";
          }}
          onBlur={(e) => {
            e.target.style.border = "2px solid #0D9488";
            e.target.style.background = "rgba(15, 23, 42, 0.6)";
            e.target.style.boxShadow = "none";
          }}
        />

        {/* Notifications Alert Capsule */}
        <button
          style={{
            width: "46px",
            height: "46px",
            borderRadius: "50%",
            border: "2px solid #0D9488",
            background: "rgba(13, 148, 136, 0.15)",
            cursor: "pointer",
            fontSize: "20px",
            transition: "0.3s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={(e) => {
            e.target.style.background = "rgba(13, 148, 136, 0.3)";
            e.target.style.borderColor = "#06B6D4";
            e.target.style.boxShadow = "0 0 15px rgba(6, 182, 212, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "rgba(13, 148, 136, 0.15)";
            e.target.style.borderColor = "#0D9488";
            e.target.style.boxShadow = "none";
          }}
        >
          🔔
        </button>

        {/* Dynamic Connected Account Profile Pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "8px 18px",
            borderRadius: "50px",
            background: "rgba(15, 23, 42, 0.8)",
            border: "2px solid #0D9488",
            boxShadow: "0 10px 30px rgba(13, 148, 136, 0.2)",
            transition: "0.3s",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#06B6D4";
            e.currentTarget.style.boxShadow = "0 10px 30px rgba(6, 182, 212, 0.3)";
            e.currentTarget.style.background = "rgba(15, 23, 42, 0.95)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#0D9488";
            e.currentTarget.style.boxShadow = "0 10px 30px rgba(13, 148, 136, 0.2)";
            e.currentTarget.style.background = "rgba(15, 23, 42, 0.8)";
          }}
        >
          {/* First Initial Avatar Badge */}
          <div
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #0D9488, #14B8A6, #06B6D4)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: "#fff",
              fontWeight: "bold",
              fontSize: "18px",
              boxShadow: "0 5px 15px rgba(13, 148, 136, 0.4)",
            }}
          >
            {userInitial}
          </div>

          <div>
            {/* Logged In Username Token Display */}
            <div
              style={{
                fontWeight: "700",
                color: "#E2E8F0",
                fontSize: "15px",
              }}
            >
              {userName}
            </div>

            <div
              style={{
                color: "#94A3B8",
                fontSize: "12px",
              }}
            >
              Welcome Back 👋
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;