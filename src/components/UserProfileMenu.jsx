import React, { useEffect, useRef, useState } from "react";

export default function UserProfileMenu() {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [language, setLanguage] = useState(
    localStorage.getItem("language") || "English"
  );

  const menuRef = useRef(null);

  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  };

  const user = getUser();

  const name =
    user?.name ||
    user?.username ||
    user?.full_name ||
    "Amit Yadav";

  const email =
    user?.email ||
    "No email available";

  const userId =
    user?.id ||
    user?.user_id ||
    "N/A";

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setOpen(false);
        setSettingsOpen(false);
        setLanguageOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  const changeLanguage = (value) => {
    setLanguage(value);
    localStorage.setItem("language", value);
    setLanguageOpen(false);
  };

  const logout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.log("Logout request failed:", error);
    }

    localStorage.removeItem("user");
    localStorage.removeItem("token");

    window.location.href = "/login";
  };

  return (
    <div
      ref={menuRef}
      style={{
        position: "relative",
        display: "inline-block",
      }}
    >
      {/* PROFILE BUTTON */}

      <button
        onClick={() => {
          setOpen(!open);
          setSettingsOpen(false);
          setLanguageOpen(false);
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          padding: "12px 18px",
          borderRadius: "18px",
          border: "1px solid rgba(0, 255, 220, 0.5)",
          background:
            "linear-gradient(135deg, #10182d, #17243c)",
          color: "white",
          cursor: "pointer",
          minWidth: "220px",
          boxShadow:
            "0 0 25px rgba(0,255,220,0.12)",
        }}
      >
        {/* AVATAR */}

        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, #11cbb8, #00a8ff)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "22px",
            fontWeight: "700",
            color: "white",
            flexShrink: 0,
          }}
        >
          {name.charAt(0).toUpperCase()}
        </div>

        {/* NAME */}

        <div style={{ textAlign: "left", flex: 1 }}>
          <div
            style={{
              fontSize: "17px",
              fontWeight: "700",
            }}
          >
            {name}
          </div>

          <div
            style={{
              fontSize: "13px",
              opacity: 0.7,
              marginTop: "3px",
            }}
          >
            Welcome back 👋
          </div>
        </div>

        <span style={{ fontSize: "18px" }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {/* DROPDOWN */}

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "70px",
            width: "340px",
            background: "#111827",
            border:
              "1px solid rgba(0,255,220,0.35)",
            borderRadius: "20px",
            padding: "18px",
            zIndex: 99999,
            boxShadow:
              "0 20px 60px rgba(0,0,0,0.55)",
            color: "white",
          }}
        >
          {/* USER HEADER */}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              paddingBottom: "18px",
              borderBottom:
                "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div
              style={{
                width: "58px",
                height: "58px",
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg,#11cbb8,#008cff)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "25px",
                fontWeight: "700",
              }}
            >
              {name.charAt(0).toUpperCase()}
            </div>

            <div>
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "700",
                }}
              >
                {name}
              </div>

              <div
                style={{
                  fontSize: "13px",
                  opacity: 0.7,
                  marginTop: "4px",
                }}
              >
                {email}
              </div>
            </div>
          </div>

          {/* ACCOUNT INFORMATION */}

          <div
            style={{
              padding: "15px 4px",
              borderBottom:
                "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                opacity: 0.55,
                marginBottom: "5px",
              }}
            >
              ACCOUNT ID
            </div>

            <div
              style={{
                fontSize: "15px",
                fontWeight: "600",
              }}
            >
              #{userId}
            </div>
          </div>

          {/* PREMIUM */}

          <div
            style={{
              marginTop: "14px",
              padding: "13px",
              borderRadius: "13px",
              background:
                "linear-gradient(135deg,#172b50,#173c55)",
              border:
                "1px solid rgba(0,255,220,0.2)",
            }}
          >
            <div
              style={{
                fontWeight: "700",
                fontSize: "15px",
              }}
            >
              ⭐ AmiVest Premium
            </div>

            <div
              style={{
                fontSize: "12px",
                opacity: 0.7,
                marginTop: "4px",
              }}
            >
              Advanced financial features enabled
            </div>
          </div>

          {/* SETTINGS */}

          <button
            onClick={() => {
              setSettingsOpen(!settingsOpen);
              setLanguageOpen(false);
            }}
            style={menuButtonStyle}
          >
            <span>⚙️</span>
            <span>Settings</span>
            <span style={{ marginLeft: "auto" }}>
              {settingsOpen ? "▲" : "›"}
            </span>
          </button>

          {settingsOpen && (
            <div
              style={{
                marginTop: "5px",
                marginBottom: "5px",
                padding: "8px",
                background: "#0d1526",
                borderRadius: "12px",
              }}
            >
              <div style={subItemStyle}>
                👤 Account settings
              </div>

              <div style={subItemStyle}>
                🔐 Privacy & Security
              </div>

              <div style={subItemStyle}>
                🔔 Notifications
              </div>
            </div>
          )}

          {/* LANGUAGE */}

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
                fontSize: "13px",
                opacity: 0.7,
              }}
            >
              {language}
            </span>
          </button>

          {languageOpen && (
            <div
              style={{
                marginTop: "5px",
                marginBottom: "5px",
                padding: "8px",
                background: "#0d1526",
                borderRadius: "12px",
              }}
            >
              <button
                onClick={() =>
                  changeLanguage("English")
                }
                style={languageButtonStyle}
              >
                🇬🇧 English
                {language === "English" && (
                  <span>✓</span>
                )}
              </button>

              <button
                onClick={() =>
                  changeLanguage("Hindi")
                }
                style={languageButtonStyle}
              >
                🇮🇳 हिंदी
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
              margin: "10px 0",
            }}
          />

          {/* LOGOUT */}

          <button
            onClick={logout}
            style={{
              width: "100%",
              border: "none",
              borderRadius: "12px",
              padding: "13px",
              background:
                "rgba(255,70,70,0.12)",
              color: "#ff7070",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "15px",
              fontWeight: "600",
            }}
          >
            🚪
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}

const menuButtonStyle = {
  width: "100%",
  border: "none",
  background: "transparent",
  color: "white",
  padding: "13px 8px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  cursor: "pointer",
  fontSize: "15px",
  textAlign: "left",
  borderRadius: "10px",
};

const subItemStyle = {
  padding: "10px",
  fontSize: "13px",
  opacity: 0.8,
};

const languageButtonStyle = {
  width: "100%",
  border: "none",
  background: "transparent",
  color: "white",
  padding: "11px",
  display: "flex",
  justifyContent: "space-between",
  cursor: "pointer",
  borderRadius: "8px",
  fontSize: "14px",
};