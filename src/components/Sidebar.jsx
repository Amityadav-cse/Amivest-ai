import { NavLink, useNavigate } from "react-router-dom";

function Sidebar() {
  const navigate = useNavigate();

  const menu = [
    { name: "Dashboard", path: "/" },
    { name: "Import Statement", path: "/import" },
    { name: "AI Talk", path: "/aitalk" },
    { name: "Goals", path: "/goals" },
    { name: "Investments", path: "/investments" },
    { name: "Loan Advisor", path: "/loan" },
    { name: "RBI Rules", path: "/rbi" },
    { name: "Tax Alerts", path: "/tax" },
    { name: "News", path: "/news" },
  ];

  return (
    <div
      style={{
        width: "280px",
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #0F172A 0%, #1A1F3A 50%, #0D1B2A 100%)",
        borderRight: "3px solid #0D9488",
        padding: "30px 18px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}
    >
      {/* Logo */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "45px",
          paddingBottom: "20px",
          borderBottom: "2px solid #0D9488",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "30px",
            fontWeight: "800",
            background: "linear-gradient(90deg, #0D9488, #14B8A6, #06B6D4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "1px",
          }}
        >
          Amivest AI
        </h1>

        <p
          style={{
            color: "#94A3B8",
            fontSize: "13px",
            marginTop: "8px",
            fontWeight: "500",
          }}
        >
          Your AI Financial Guardian
        </p>
      </div>

      {/* Menu */}
      {menu.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          style={({ isActive }) => ({
            display: "block",
            padding: "16px 22px",
            marginBottom: "12px",
            textDecoration: "none",
            borderRadius: "16px",
            fontWeight: "600",
            fontSize: "15px",
            transition: "0.3s",
            background: isActive
              ? "linear-gradient(90deg, #0D9488, #14B8A6)"
              : "rgba(13,148,136,0.08)",
            color: isActive ? "#fff" : "#CBD5E1",
            borderLeft: isActive
              ? "4px solid #06B6D4"
              : "4px solid transparent",
            boxShadow: isActive
              ? "0 10px 30px rgba(13,148,136,0.3)"
              : "none",
          })}
        >
          {item.name}
        </NavLink>
      ))}

      {/* Premium Card */}
      <div
        style={{
          marginTop: "45px",
          padding: "24px 20px",
          borderRadius: "18px",
          background:
            "linear-gradient(135deg,#0D9488 0%,#14B8A6 50%,#06B6D4 100%)",
          color: "#fff",
          boxShadow: "0 15px 40px rgba(13,148,136,0.4)",
          border: "2px solid #0D9488",
        }}
      >
        <h3 style={{ margin: 0 }}>🚀 AI Premium</h3>

        <p
          style={{
            fontSize: "13px",
            lineHeight: "22px",
            marginTop: "12px",
          }}
        >
          Unlock unlimited AI chats, premium financial insights, smart
          investment recommendations, fraud protection, and advanced analytics.
        </p>

        <button
          onClick={() => navigate("/premium")}
          style={{
            marginTop: "18px",
            width: "100%",
            padding: "13px",
            borderRadius: "12px",
            border: "none",
            background: "#0F172A",
            color: "#0D9488",
            fontWeight: "700",
            cursor: "pointer",
            fontSize: "15px",
          }}
        >
          ⭐ Upgrade Now
        </button>
      </div>
    </div>
  );
}

export default Sidebar;