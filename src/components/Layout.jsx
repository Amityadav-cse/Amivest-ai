import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import VoiceProgressButton from "../pages/VoiceProgressButton";

function Layout() {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#121212", // Dark background
        color: "#ffffff",      // White text
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Sidebar handles page navigation item triggers */}
      <Sidebar />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Navbar />

        <div
          style={{
            padding: "24px",
            overflowY: "auto",
          }}
        >
          {/* Outlet injects the matched child page component (Dashboard, Premium, etc.) */}
          <Outlet />
        </div>
      </div>

      {/* Sits outside <Outlet />, persisting across every single route layout pass */}
      <VoiceProgressButton />
    </div>
  );
}

export default Layout;