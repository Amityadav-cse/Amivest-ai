import React, { useEffect, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

function Navbar({ onSearchFilter = () => {}, onQuickAdd = () => {} }) {
  // =====================================
  // AUTHENTICATION & USER DATA STATES
  // =====================================
  const [user, setUser] = useState(null);
  const [userInitial, setUserInitial] = useState("G");
  const [currency, setCurrency] = useState(localStorage.getItem("app_currency") || "INR");

  // Navigation Drawers & Dropdowns
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchFilterOpen, setSearchFilterOpen] = useState(false);
  const [activePanel, setActivePanel] = useState(null);

  // Active Modals
  const [activeModal, setActiveModal] = useState(null); // 'edit_profile' | 'change_password' | 'privacy'

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [filterMinAmount, setFilterMinAmount] = useState("");

  // Edit Profile Form State
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  // Real Dynamic Notifications
  const [notifList, setNotifList] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  // User App Preferences
  const [language, setLanguage] = useState(localStorage.getItem("language") || "English");
  const [notifications, setNotifications] = useState(localStorage.getItem("notifications") !== "false");
  const [darkMode, setDarkMode] = useState(localStorage.getItem("darkMode") !== "false");
  const [twoFactor, setTwoFactor] = useState(localStorage.getItem("twoFactor") === "true");

  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const searchRef = useRef(null);

  // =====================================
  // INITIALIZE USER FROM STORAGE
  // =====================================
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setEditName(parsedUser?.name || "");
        setEditEmail(parsedUser?.email || "");

        const displayName = parsedUser?.name || parsedUser?.username || "Guest";
        if (displayName && displayName.length > 0) {
          setUserInitial(displayName.charAt(0).toUpperCase());
        }

        // Fetch user-isolated notifications
        if (parsedUser?.id) {
          fetchUserNotifications(parsedUser.id);
        }
      } else {
        setUser(null);
        setNotifList([]);
      }
    } catch (error) {
      console.error("Unable to load session:", error);
      setUser(null);
    }
  }, []);

  // =====================================
  // FETCH USER NOTIFICATIONS (NO FAKE DATA)
  // =====================================
  const fetchUserNotifications = async (userId) => {
    try {
      setLoadingNotifs(true);
      const res = await fetch(`${API_BASE}/api/notifications?user_id=${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.notifications)) {
          setNotifList(data.notifications);
        } else {
          setNotifList([]);
        }
      } else {
        setNotifList([]);
      }
    } catch (err) {
      console.warn("Real-time notifications service unavailable:", err.message);
      setNotifList([]);
    } finally {
      setLoadingNotifs(false);
    }
  };

  // =====================================
  // CLICK OUTSIDE HANDLERS
  // =====================================
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
        setActivePanel(null);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // =====================================
  // ACTIONS & HANDLERS
  // =====================================
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onSearchFilter({
      query: searchTerm,
      category: filterCategory,
      type: filterType,
      minAmount: filterMinAmount,
    });
    setSearchFilterOpen(false);
  };

  const markAllNotificationsAsRead = async () => {
    if (!user?.id) return;
    try {
      await fetch(`${API_BASE}/api/notifications/read-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });
      setNotifList((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (_) {
      setNotifList((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  };

  const changeCurrency = (val) => {
    setCurrency(val);
    localStorage.setItem("app_currency", val);
  };

  const handleUpdateProfile = () => {
    if (!user) return;
    const updated = { ...user, name: editName, email: editEmail };
    localStorage.setItem("user", JSON.stringify(updated));
    setUser(updated);
    if (editName) setUserInitial(editName.charAt(0).toUpperCase());
    setActiveModal(null);
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/logout`, { method: "POST", credentials: "include" });
    } catch (_) {}
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const unreadCount = notifList.filter((n) => !n.is_read).length;

  return (
    <>
      <nav
        style={{
          height: "80px",
          background: "linear-gradient(90deg, #0F172A, #1A1F3A)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 35px",
          borderBottom: "3px solid #0D9488",
          position: "sticky",
          top: 0,
          zIndex: 1000,
          fontFamily: "sans-serif",
        }}
      >
        {/* BRAND */}
        <div style={{ cursor: "pointer" }} onClick={() => (window.location.href = "/dashboard")}>
          <h2
            style={{
              margin: 0,
              fontSize: "28px",
              fontWeight: "800",
              background: "linear-gradient(90deg, #0D9488, #14B8A6, #06B6D4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Amivest AI
          </h2>
          <p style={{ marginTop: "3px", color: "#94A3B8", fontSize: "12px" }}>
            Your AI Financial Guardian
          </p>
        </div>

        {/* SEARCH & FILTERS HUB */}
        <div ref={searchRef} style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <form onSubmit={handleSearchSubmit} style={{ display: "flex", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Search transactions, goals, tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setSearchFilterOpen(true)}
              style={{
                width: "280px",
                padding: "10px 42px 10px 18px",
                borderRadius: "30px",
                border: "2px solid #0D9488",
                background: "rgba(15, 23, 42, 0.7)",
                color: "#fff",
                outline: "none",
                fontSize: "13px",
              }}
            />
            <button
              type="button"
              onClick={() => setSearchFilterOpen(!searchFilterOpen)}
              style={{
                position: "absolute",
                right: "12px",
                background: "none",
                border: "none",
                color: "#0D9488",
                cursor: "pointer",
                fontSize: "14px",
              }}
              title="Search Filters"
            >
              ⚙️
            </button>
          </form>

          {/* DYNAMIC SEARCH FILTERS */}
          {searchFilterOpen && (
            <div
              style={{
                position: "absolute",
                top: "52px",
                left: 0,
                width: "320px",
                background: "#080F1C",
                border: "1px solid #0D9488",
                borderRadius: "14px",
                padding: "16px",
                boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
                zIndex: 1100,
                color: "#fff",
              }}
            >
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#0D9488", marginBottom: "12px" }}>
                FILTER DATA
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label style={filterLabel}>Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  style={filterInput}
                >
                  <option>All</option>
                  <option>Income & Deposits</option>
                  <option>Groceries & Food</option>
                  <option>EMI & Loans</option>
                  <option>Entertainment</option>
                  <option>Shopping</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                <div>
                  <label style={filterLabel}>Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    style={filterInput}
                  >
                    <option>All</option>
                    <option>Credit (+)</option>
                    <option>Debit (-)</option>
                  </select>
                </div>
                <div>
                  <label style={filterLabel}>Min Amount ({currency})</label>
                  <input
                    type="number"
                    placeholder="Min Value"
                    value={filterMinAmount}
                    onChange={(e) => setFilterMinAmount(e.target.value)}
                    style={filterInput}
                  />
                </div>
              </div>

              <button
                onClick={handleSearchSubmit}
                style={{
                  width: "100%",
                  padding: "8px",
                  background: "#0D9488",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontWeight: "700",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Apply Filters
              </button>
            </div>
          )}
        </div>

        {/* RIGHT CONTROLS */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {/* CURRENCY SELECTOR */}
          <select
            value={currency}
            onChange={(e) => changeCurrency(e.target.value)}
            style={{
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid #0D9488",
              color: "#0D9488",
              padding: "8px 12px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="INR">₹ INR</option>
            <option value="USD">$ USD</option>
            <option value="EUR">€ EUR</option>
          </select>

          {/* QUICK ADD BUTTON */}
          <button
            onClick={onQuickAdd}
            style={{
              background: "linear-gradient(135deg, #0D9488, #14B8A6)",
              border: "none",
              color: "#fff",
              padding: "9px 16px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 4px 15px rgba(13, 148, 136, 0.3)",
            }}
          >
            <span>+</span> Quick Add
          </button>

          {/* NOTIFICATION CENTER */}
          <div ref={notifRef} style={{ position: "relative" }}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                border: "2px solid #0D9488",
                background: "rgba(13, 148, 136, 0.15)",
                cursor: "pointer",
                fontSize: "18px",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              🔔
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "4px",
                    right: "4px",
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    background: "#EF4444",
                    color: "#fff",
                    fontSize: "10px",
                    fontWeight: "900",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {/* REAL NOTIFICATIONS FEED */}
            {notifOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "55px",
                  width: "340px",
                  background: "#080F1C",
                  border: "1px solid #0D9488",
                  borderRadius: "16px",
                  padding: "16px",
                  boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
                  zIndex: 1100,
                  color: "#fff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ fontSize: "14px", fontWeight: "700" }}>Live Alerts</span>
                  {notifList.length > 0 && (
                    <button
                      onClick={markAllNotificationsAsRead}
                      style={{ background: "none", border: "none", color: "#0D9488", fontSize: "11px", cursor: "pointer", fontWeight: "600" }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "280px", overflowY: "auto" }}>
                  {loadingNotifs ? (
                    <div style={{ textAlign: "center", color: "#94A3B8", fontSize: "12px", padding: "16px" }}>Checking alerts...</div>
                  ) : notifList.length === 0 ? (
                    <div style={{ textAlign: "center", color: "#64748B", fontSize: "12px", padding: "20px" }}>
                      No new notifications
                    </div>
                  ) : (
                    notifList.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          padding: "10px",
                          background: item.is_read ? "rgba(255,255,255,0.02)" : "rgba(13, 148, 136, 0.12)",
                          borderLeft: `3px solid ${item.is_read ? "#334155" : "#0D9488"}`,
                          borderRadius: "6px",
                          display: "flex",
                          gap: "10px",
                          alignItems: "flex-start",
                        }}
                      >
                        <span style={{ fontSize: "16px" }}>{item.icon || "🔔"}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "12px", fontWeight: "700" }}>{item.title}</div>
                          <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>{item.message}</div>
                          <div style={{ fontSize: "9px", color: "#64748B", marginTop: "4px" }}>{item.created_at || "Recently"}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* DYNAMIC PROFILE CONTROLLER */}
          <div ref={profileRef} style={{ position: "relative" }}>
            <button
              onClick={() => {
                setProfileOpen(!profileOpen);
                setActivePanel(null);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "6px 16px",
                borderRadius: "50px",
                background: "rgba(15, 23, 42, 0.9)",
                border: "2px solid #0D9488",
                cursor: "pointer",
                color: "#fff",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #0D9488, #14B8A6, #06B6D4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  fontWeight: "bold",
                }}
              >
                {userInitial}
              </div>

              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: "700", fontSize: "13px" }}>{user?.name || "Guest"}</div>
                <div style={{ fontSize: "11px", color: "#94A3B8" }}>
                  {user ? "Active Account" : "Unauthenticated"}
                </div>
              </div>

              <span style={{ fontSize: "11px", marginLeft: "4px" }}>{profileOpen ? "▲" : "▼"}</span>
            </button>

            {/* PROFILE MENU MODAL */}
            {profileOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "60px",
                  width: "360px",
                  background: "linear-gradient(145deg, #111827, #17233A)",
                  border: "1px solid #0D9488",
                  borderRadius: "20px",
                  padding: "18px",
                  boxShadow: "0 25px 70px rgba(0,0,0,0.8)",
                  color: "#fff",
                  zIndex: 1100,
                }}
              >
                {/* REAL USER CARD */}
                <div style={{ display: "flex", alignItems: "center", gap: "14px", paddingBottom: "14px", borderBottom: "1px solid #334155" }}>
                  <div
                    style={{
                      width: "55px",
                      height: "55px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #0D9488, #06B6D4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "22px",
                      fontWeight: "800",
                    }}
                  >
                    {userInitial}
                  </div>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: "800" }}>{user?.name || "Guest"}</div>
                    <div style={{ color: "#94A3B8", fontSize: "12px" }}>{user?.email || "No email available"}</div>
                    <div style={{ color: "#0D9488", fontSize: "11px", marginTop: "2px" }}>
                      User ID: #{user?.id || "Unregistered"}
                    </div>
                  </div>
                </div>

                {user && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "8px", marginTop: "12px" }}>
                    <button onClick={() => setActiveModal("edit_profile")} style={quickBtnStyle}>
                      ✏️ Edit Account Profile
                    </button>
                  </div>
                )}

                {/* SETTINGS MENU ACCORDION */}
                <button onClick={() => setActivePanel(activePanel === "settings" ? null : "settings")} style={menuStyle}>
                  ⚙️ <span>Preferences & Settings</span>
                  <span style={{ marginLeft: "auto" }}>{activePanel === "settings" ? "▲" : "›"}</span>
                </button>

                {activePanel === "settings" && (
                  <div style={panelStyle}>
                    <div style={settingRow}>
                      <div>
                        <b>🌐 Language</b>
                        <div style={smallText}>App Interface Language</div>
                      </div>
                      <select
                        value={language}
                        onChange={(e) => {
                          setLanguage(e.target.value);
                          localStorage.setItem("language", e.target.value);
                        }}
                        style={selectStyle}
                      >
                        <option>English</option>
                        <option>Hindi</option>
                      </select>
                    </div>

                    <div style={settingRow}>
                      <div>
                        <b>🔔 Notifications</b>
                        <div style={smallText}>Financial Alerts & Push</div>
                      </div>
                      <button
                        onClick={() => {
                          const n = !notifications;
                          setNotifications(n);
                          localStorage.setItem("notifications", String(n));
                        }}
                        style={toggleStyle(notifications)}
                      >
                        {notifications ? "ON" : "OFF"}
                      </button>
                    </div>

                    <div style={settingRow}>
                      <div>
                        <b>🌙 Dark Mode</b>
                        <div style={smallText}>System Display Theme</div>
                      </div>
                      <button
                        onClick={() => {
                          const d = !darkMode;
                          setDarkMode(d);
                          localStorage.setItem("darkMode", String(d));
                          document.body.style.background = d ? "#050816" : "#ffffff";
                        }}
                        style={toggleStyle(darkMode)}
                      >
                        {darkMode ? "ON" : "OFF"}
                      </button>
                    </div>
                  </div>
                )}

                {/* SECURITY MENU ACCORDION */}
                <button onClick={() => setActivePanel(activePanel === "security" ? null : "security")} style={menuStyle}>
                  🔐 <span>Privacy & Security</span>
                  <span style={{ marginLeft: "auto" }}>{activePanel === "security" ? "▲" : "›"}</span>
                </button>

                {activePanel === "security" && (
                  <div style={panelStyle}>
                    <div style={settingRow}>
                      <div>
                        <b>🔑 Two-Factor Auth</b>
                        <div style={smallText}>Login Verification</div>
                      </div>
                      <button
                        onClick={() => {
                          const t = !twoFactor;
                          setTwoFactor(t);
                          localStorage.setItem("twoFactor", String(t));
                        }}
                        style={toggleStyle(twoFactor)}
                      >
                        {twoFactor ? "ON" : "OFF"}
                      </button>
                    </div>
                    <button onClick={() => setActiveModal("privacy")} style={securityButton}>
                      🛡️ Privacy Policy & Security Scoping
                    </button>
                  </div>
                )}

                {/* LOGOUT */}
                <div style={{ height: "1px", background: "#334155", margin: "10px 0" }} />
                <button onClick={handleLogout} style={logoutBtnStyle}>
                  🚪 Logout Session
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* REAL EDIT PROFILE MODAL */}
      {activeModal === "edit_profile" && (
        <div style={modalBackdrop} onClick={() => setActiveModal(null)}>
          <div style={modalBody} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 16px 0", color: "#0D9488" }}>Edit Account Profile</h3>
            <label style={filterLabel}>Full Name</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              style={{ ...filterInput, marginBottom: "12px" }}
            />
            <label style={filterLabel}>Email Address</label>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              style={{ ...filterInput, marginBottom: "18px" }}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleUpdateProfile} style={submitModalBtn}>
                Save Changes
              </button>
              <button onClick={() => setActiveModal(null)} style={cancelModalBtn}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REAL PRIVACY MODAL */}
      {activeModal === "privacy" && (
        <div style={modalBackdrop} onClick={() => setActiveModal(null)}>
          <div style={modalBody} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 12px 0", color: "#0D9488" }}>Privacy & Data Protections</h3>
            <p style={{ fontSize: "13px", color: "#94A3B8", lineHeight: "1.6" }}>
              Your financial records, bank statement extractions, and goals are strictly encrypted and scoped to Account ID: #{user?.id || "Unregistered"}. No outside sessions have access to your telemetry.
            </p>
            <button onClick={() => setActiveModal(null)} style={{ ...submitModalBtn, marginTop: "12px" }}>
              Understood
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// =====================================
// STYLES
// =====================================
const filterLabel = { display: "block", color: "#94A3B8", fontSize: "11px", marginBottom: "4px", fontWeight: "600" };
const filterInput = { width: "100%", padding: "8px 10px", background: "#0F172A", border: "1px solid #334155", color: "#fff", borderRadius: "8px", fontSize: "12px", outline: "none", boxSizing: "border-box" };
const quickBtnStyle = { width: "100%", padding: "10px", background: "#0F172A", border: "1px solid #334155", color: "#CBD5E1", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer", textAlign: "center" };
const menuStyle = { width: "100%", padding: "10px 6px", marginTop: "4px", border: "none", background: "transparent", color: "#E2E8F0", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "13px", fontWeight: "600", textAlign: "left", borderRadius: "8px" };
const panelStyle = { background: "#080F1C", borderRadius: "10px", padding: "8px 10px", marginTop: "2px" };
const settingRow = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" };
const smallText = { color: "#64748B", fontSize: "10px", marginTop: "2px" };
const selectStyle = { background: "#17233A", color: "#fff", border: "1px solid #0D9488", borderRadius: "6px", padding: "4px 8px", fontSize: "11px", cursor: "pointer" };
const toggleStyle = (active) => ({ minWidth: "44px", padding: "4px 8px", border: "none", borderRadius: "16px", background: active ? "#0D9488" : "#475569", color: "#fff", fontWeight: "700", fontSize: "10px", cursor: "pointer" });
const securityButton = { width: "100%", padding: "8px", marginTop: "6px", border: "1px solid #334155", borderRadius: "6px", background: "#111827", color: "#CBD5E1", fontSize: "12px", cursor: "pointer", textAlign: "left" };
const logoutBtnStyle = { width: "100%", padding: "10px", border: "none", borderRadius: "10px", background: "rgba(239,68,68,0.12)", color: "#F87171", fontSize: "13px", fontWeight: "700", cursor: "pointer", textAlign: "left" };
const modalBackdrop = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: "20px" };
const modalBody = { background: "#111827", border: "1px solid #0D9488", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "380px", color: "#fff" };
const submitModalBtn = { flex: 1, padding: "10px", background: "#0D9488", border: "none", color: "#fff", borderRadius: "8px", fontWeight: "700", fontSize: "12px", cursor: "pointer" };
const cancelModalBtn = { flex: 1, padding: "10px", background: "#334155", border: "none", color: "#fff", borderRadius: "8px", fontWeight: "700", fontSize: "12px", cursor: "pointer" };

export default Navbar;