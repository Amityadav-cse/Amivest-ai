import React, { useEffect, useRef, useState } from "react";

function Navbar() {
  const [userName, setUserName] = useState("Guest");
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [userInitial, setUserInitial] = useState("G");

  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);

  const [language, setLanguage] = useState(
    localStorage.getItem("language") || "English"
  );

  const profileRef = useRef(null);

  // =========================
  // LOAD USER
  // =========================
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");

      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);

        const name =
          parsedUser?.name ||
          parsedUser?.username ||
          parsedUser?.full_name ||
          "Guest";

        const email =
          parsedUser?.email ||
          "";

        const id =
          parsedUser?.id ||
          parsedUser?.user_id ||
          "";

        setUserName(name);
        setUserEmail(email);
        setUserId(id);

        if (name.length > 0) {
          setUserInitial(name.charAt(0).toUpperCase());
        }
      }
    } catch (error) {
      console.error("Error reading user:", error);
    }
  }, []);

  // =========================
  // CLOSE PROFILE
  // WHEN CLICKING OUTSIDE
  // =========================
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
        setSettingsOpen(false);
        setLanguageOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  // =========================
  // LANGUAGE
  // =========================
  const changeLanguage = (selectedLanguage) => {
    setLanguage(selectedLanguage);

    localStorage.setItem(
      "language",
      selectedLanguage
    );

    setLanguageOpen(false);
  };

  // =========================
  // LOGOUT
  // =========================
  const handleLogout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.log("Logout request:", error);
    }

    localStorage.removeItem("user");
    localStorage.removeItem("token");

    window.location.href = "/login";
  };

  return (
    <nav
      style={{
        height: "80px",
        background:
          "linear-gradient(90deg, #0F172A 0%, #1A1F3A 100%)",
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
        boxShadow:
          "0 15px 40px rgba(13, 148, 136, 0.2)",
        fontFamily: "sans-serif",
      }}
    >
      {/* =========================
          LEFT - BRAND
      ========================= */}

      <div>
        <h2
          style={{
            margin: 0,
            fontSize: "30px",
            fontWeight: "800",
            background:
              "linear-gradient(90deg, #0D9488, #14B8A6, #06B6D4)",
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

      {/* =========================
          RIGHT SECTION
      ========================= */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "18px",
        }}
      >
        {/* SEARCH */}

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
          }}
          onFocus={(e) => {
            e.target.style.border =
              "2px solid #06B6D4";

            e.target.style.background =
              "rgba(15, 23, 42, 0.9)";

            e.target.style.boxShadow =
              "0 0 15px rgba(6, 182, 212, 0.3)";
          }}
          onBlur={(e) => {
            e.target.style.border =
              "2px solid #0D9488";

            e.target.style.background =
              "rgba(15, 23, 42, 0.6)";

            e.target.style.boxShadow = "none";
          }}
        />

        {/* =========================
            NOTIFICATION
        ========================= */}

        <button
          style={{
            width: "46px",
            height: "46px",
            borderRadius: "50%",
            border: "2px solid #0D9488",
            background:
              "rgba(13, 148, 136, 0.15)",
            cursor: "pointer",
            fontSize: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          🔔
        </button>

        {/* =========================
            USER PROFILE
        ========================= */}

        <div
          ref={profileRef}
          style={{
            position: "relative",
          }}
        >
          {/* PROFILE BUTTON */}

          <button
            onClick={() => {
              setProfileOpen(!profileOpen);
              setSettingsOpen(false);
              setLanguageOpen(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "8px 18px",
              borderRadius: "50px",
              background:
                "rgba(15, 23, 42, 0.8)",
              border: "2px solid #0D9488",
              boxShadow:
                "0 10px 30px rgba(13, 148, 136, 0.2)",
              cursor: "pointer",
              color: "white",
            }}
          >
            {/* AVATAR */}

            <div
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg, #0D9488, #14B8A6, #06B6D4)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                color: "#fff",
                fontWeight: "bold",
                fontSize: "18px",
              }}
            >
              {userInitial}
            </div>

            {/* NAME */}

            <div
              style={{
                textAlign: "left",
              }}
            >
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

            <span
              style={{
                marginLeft: "5px",
                color: "#94A3B8",
              }}
            >
              {profileOpen ? "▲" : "▼"}
            </span>
          </button>

          {/* =========================
              PROFILE DROPDOWN
          ========================= */}

          {profileOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "65px",
                width: "350px",
                background:
                  "linear-gradient(145deg, #111827, #17233A)",
                border:
                  "1px solid rgba(13, 148, 136, 0.5)",
                borderRadius: "20px",
                padding: "20px",
                boxShadow:
                  "0 25px 70px rgba(0,0,0,0.65)",
                zIndex: 99999,
                color: "white",
              }}
            >
              {/* PROFILE HEADER */}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "15px",
                  paddingBottom: "18px",
                  borderBottom:
                    "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div
                  style={{
                    width: "65px",
                    height: "65px",
                    borderRadius: "50%",
                    background:
                      "linear-gradient(135deg, #0D9488, #14B8A6, #06B6D4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "28px",
                    fontWeight: "800",
                  }}
                >
                  {userInitial}
                </div>

                <div>
                  <div
                    style={{
                      fontSize: "19px",
                      fontWeight: "800",
                    }}
                  >
                    {userName}
                  </div>

                  <div
                    style={{
                      fontSize: "13px",
                      color: "#94A3B8",
                      marginTop: "5px",
                      wordBreak: "break-word",
                    }}
                  >
                    {userEmail || "Email not available"}
                  </div>
                </div>
              </div>

              {/* =========================
                  ACCOUNT INFORMATION
              ========================= */}

              <div
                style={{
                  padding: "16px 4px",
                  borderBottom:
                    "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div
                  style={{
                    color: "#64748B",
                    fontSize: "11px",
                    fontWeight: "700",
                    marginBottom: "5px",
                  }}
                >
                  ACCOUNT ID
                </div>

                <div
                  style={{
                    color: "#E2E8F0",
                    fontSize: "15px",
                    fontWeight: "600",
                  }}
                >
                  {userId
                    ? `#${userId}`
                    : "Not available"}
                </div>
              </div>

              {/* =========================
                  PREMIUM
              ========================= */}

              <div
                style={{
                  marginTop: "15px",
                  padding: "14px",
                  borderRadius: "14px",
                  background:
                    "linear-gradient(135deg, #12365A, #143D50)",
                  border:
                    "1px solid rgba(6,182,212,0.25)",
                }}
              >
                <div
                  style={{
                    fontWeight: "800",
                    fontSize: "15px",
                  }}
                >
                  ⭐ AmiVest Premium
                </div>

                <div
                  style={{
                    color: "#94A3B8",
                    fontSize: "12px",
                    marginTop: "5px",
                  }}
                >
                  Advanced financial features
                </div>
              </div>

              {/* =========================
                  SETTINGS
              ========================= */}

              <button
                onClick={() => {
                  setSettingsOpen(!settingsOpen);
                  setLanguageOpen(false);
                }}
                style={menuButtonStyle}
              >
                <span>⚙️</span>

                <span>Settings</span>

                <span
                  style={{
                    marginLeft: "auto",
                  }}
                >
                  {settingsOpen ? "▲" : "›"}
                </span>
              </button>

              {settingsOpen && (
                <div
                  style={{
                    background: "#0B1220",
                    borderRadius: "12px",
                    padding: "8px",
                  }}
                >
                  <div style={subMenuStyle}>
                    👤 Account Settings
                  </div>

                  <div style={subMenuStyle}>
                    🔐 Privacy & Security
                  </div>

                  <div style={subMenuStyle}>
                    🔔 Notifications
                  </div>
                </div>
              )}

              {/* =========================
                  LANGUAGE
              ========================= */}

              <button
                onClick={() => {
                  setLanguageOpen(!languageOpen);
                  setSettingsOpen(false);
                }}
                style={menuButtonStyle}
              >
                <span>🌐</span>

                <span>Language</span>

                <span
                  style={{
                    marginLeft: "auto",
                    color: "#94A3B8",
                    fontSize: "13px",
                  }}
                >
                  {language}
                </span>
              </button>

              {languageOpen && (
                <div
                  style={{
                    background: "#0B1220",
                    borderRadius: "12px",
                    padding: "8px",
                  }}
                >
                  <button
                    onClick={() =>
                      changeLanguage("English")
                    }
                    style={languageStyle}
                  >
                    <span>🇬🇧 English</span>

                    {language === "English" && (
                      <span>✓</span>
                    )}
                  </button>

                  <button
                    onClick={() =>
                      changeLanguage("Hindi")
                    }
                    style={languageStyle}
                  >
                    <span>🇮🇳 हिंदी</span>

                    {language === "Hindi" && (
                      <span>✓</span>
                    )}
                  </button>
                </div>
              )}

              {/* DIVIDER */}

              <div
                style={{
                  height: "1px",
                  background:
                    "rgba(255,255,255,0.1)",
                  margin: "12px 0",
                }}
              />

              {/* =========================
                  LOGOUT
              ========================= */}

              <button
                onClick={handleLogout}
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: "12px",
                  padding: "14px",
                  background:
                    "rgba(239,68,68,0.12)",
                  color: "#F87171",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  fontSize: "15px",
                  fontWeight: "700",
                  textAlign: "left",
                }}
              >
                🚪
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

/* =========================
   MENU STYLES
========================= */

const menuButtonStyle = {
  width: "100%",
  border: "none",
  background: "transparent",
  color: "#E2E8F0",
  padding: "14px 8px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  cursor: "pointer",
  fontSize: "15px",
  fontWeight: "600",
  textAlign: "left",
  borderRadius: "10px",
};

const subMenuStyle = {
  padding: "11px",
  color: "#CBD5E1",
  fontSize: "13px",
};

const languageStyle = {
  width: "100%",
  border: "none",
  background: "transparent",
  color: "#E2E8F0",
  padding: "11px",
  display: "flex",
  justifyContent: "space-between",
  cursor: "pointer",
  borderRadius: "8px",
  fontSize: "14px",
};

export default Navbar;