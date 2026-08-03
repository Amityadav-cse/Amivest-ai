import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import AdvancedSiriAssistant from "./AdvancedSiriAssistant"; // CHANGED: replaces VoiceProgressButton

function Layout() {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#121212",
        color: "#ffffff",
      }}
    >
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
          <Outlet />
        </div>
      </div>

      {/* CHANGED: this is where you'll SEE the voice assistant — bottom-left
          teal "FinSaathi AI" capsule button, on every page since it lives
          outside <Outlet /> here in Layout. */}
      <AdvancedSiriAssistant />
    </div>
  );
}

export default Layout;
