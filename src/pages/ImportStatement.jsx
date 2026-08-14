import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// =====================================================
// API CONFIG
// =====================================================

const ENV_API_URL = import.meta.env.VITE_API_URL;

const BASE_API_URL =
  ENV_API_URL && ENV_API_URL.trim() !== ""
    ? ENV_API_URL.replace(/\/$/, "")
    : "http://127.0.0.1:5000";

// =====================================================
// UPLOAD API
// =====================================================

async function uploadFile(path, formData) {
  const urls = [
    `${BASE_API_URL}${path}`,
    path,
    `http://127.0.0.1:5000${path}`,
    `http://localhost:5000${path}`,
  ];

  const attempts = [];

  for (const url of [...new Set(urls)]) {
    try {
      console.log("Trying upload:", url);

      const response = await fetch(url, {
        method: "POST",
        body: formData,
      });

      const contentType =
        response.headers.get("content-type") || "";

      let data;

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = text;
      }

      console.log("Upload response:", data);

      if (response.ok) {
        if (typeof data === "object") {
          return data;
        }

        attempts.push(
          `${url} → HTTP ${response.status}, but response was not JSON`
        );

        continue;
      }

      const errorMessage =
        typeof data === "object"
          ? data?.error || data?.message
          : data;

      attempts.push(
        `${url} → HTTP ${response.status}: ${
          errorMessage || "Unknown server error"
        }`
      );
    } catch (error) {
      attempts.push(
        `${url} → ${error.name}: ${error.message}`
      );
    }
  }

  throw new Error(attempts.join("\n"));
}

// =====================================================
// IMPORT STATEMENT
// =====================================================

function ImportStatement({ setTransactions }) {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const navigate = useNavigate();

  // ===================================================
  // HANDLE FILE UPLOAD
  // ===================================================

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a bank statement first.");
      return;
    }

    // -------------------------------------------------
    // GET LOGGED-IN USER
    // -------------------------------------------------

    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      alert("You are not logged in. Please login first.");
      navigate("/login");
      return;
    }

    let currentUser;

    try {
      currentUser = JSON.parse(storedUser);
    } catch (error) {
      console.error("Invalid user session:", error);

      alert("Your login session is invalid. Please login again.");

      localStorage.removeItem("user");
      navigate("/login");

      return;
    }

    if (!currentUser?.id) {
      alert(
        "User ID was not found in your session. Please login again."
      );

      navigate("/login");
      return;
    }

    // -------------------------------------------------
    // START UPLOAD
    // -------------------------------------------------

    setIsProcessing(true);

    const formData = new FormData();

    formData.append("statement", file);
    formData.append("password", password);

    // IMPORTANT:
    // Send the logged-in user's ID to Flask
    formData.append(
      "user_id",
      String(currentUser.id)
    );

    try {
      console.log("Uploading statement...");
      console.log("User ID:", currentUser.id);
      console.log("File:", file.name);

      const data = await uploadFile(
        "/upload",
        formData
      );

      console.log("Backend upload result:", data);

      // -------------------------------------------------
      // SUCCESS
      // -------------------------------------------------

      if (data?.success === true) {
        let importedTransactions = [];

        if (Array.isArray(data.transactions)) {
          importedTransactions = data.transactions;
        } else if (Array.isArray(data.data)) {
          importedTransactions = data.data;
        }

        console.log(
          "Imported transactions:",
          importedTransactions
        );

        // -------------------------------------------------
        // UPDATE SHARED REACT STATE
        // -------------------------------------------------

        if (importedTransactions.length > 0) {
          setTransactions((previousTransactions) => {
            // Add the new transactions to existing state.
            // This avoids accidentally deleting previous imports.

            return [
              ...previousTransactions,
              ...importedTransactions,
            ];
          });

          alert(
            `Successfully imported ${importedTransactions.length} transactions.`
          );
        } else {
          alert(
            "Statement uploaded successfully, but no transactions were returned by the backend."
          );
        }

        // -------------------------------------------------
        // RETURN TO DASHBOARD
        // -------------------------------------------------

        navigate("/");
      } else {
        alert(
          data?.message ||
            data?.error ||
            "The statement could not be processed."
        );
      }
    } catch (error) {
      console.error("Upload failed:", error);

      alert(
        `Upload failed.\n\n${error.message}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // ===================================================
  // UI
  // ===================================================

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0d0f",
        padding: "40px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "800px",
          background: "#161a1f",
          borderRadius: "20px",
          padding: "40px",
          border: "1px solid #242b35",
          boxSizing: "border-box",
        }}
      >
        {/* HEADER */}

        <h1
          style={{
            color: "#ff4500",
            margin: "0 0 10px 0",
            fontSize: "26px",
          }}
        >
          📄 Statement Importer
        </h1>

        <p
          style={{
            color: "#9ca3af",
            marginBottom: "30px",
          }}
        >
          Upload your bank statement to analyze your
          transactions.
        </p>

        {/* FILE AREA */}

        <div
          style={{
            border: "2px dashed #374151",
            padding: "40px 20px",
            textAlign: "center",
            background: "#1f262e",
            borderRadius: "12px",
          }}
        >
          <div
            style={{
              fontSize: "45px",
              marginBottom: "15px",
            }}
          >
            📂
          </div>

          <h3
            style={{
              color: "#ffffff",
              marginBottom: "8px",
            }}
          >
            Select Bank Statement
          </h3>

          <p
            style={{
              color: "#9ca3af",
              fontSize: "13px",
              marginBottom: "20px",
            }}
          >
            Supported formats: PDF, CSV, XLS, XLSX
          </p>

          <input
            type="file"
            accept=".pdf,.csv,.xlsx,.xls"
            onChange={(event) => {
              const selectedFile =
                event.target.files?.[0];

              setFile(selectedFile || null);
            }}
            style={{
              color: "#9ca3af",
              cursor: "pointer",
              maxWidth: "100%",
            }}
          />

          {file && (
            <div
              style={{
                marginTop: "20px",
                padding: "12px",
                background: "#11161b",
                borderRadius: "8px",
                color: "#10b981",
                fontSize: "14px",
              }}
            >
              ✅ Selected: {file.name}
            </div>
          )}
        </div>

        {/* PASSWORD */}

        <div
          style={{
            marginTop: "20px",
          }}
        >
          <label
            style={{
              display: "block",
              color: "#d1d5db",
              fontSize: "13px",
              marginBottom: "8px",
            }}
          >
            PDF Password
          </label>

          <input
            type="password"
            placeholder="Enter PDF password (optional)"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              background: "#1f262e",
              color: "#ffffff",
              border: "1px solid #374151",
              boxSizing: "border-box",
              outline: "none",
            }}
          />
        </div>

        {/* UPLOAD BUTTON */}

        <button
          onClick={handleUpload}
          disabled={isProcessing || !file}
          style={{
            width: "100%",
            marginTop: "30px",
            padding: "14px",
            border: "none",
            borderRadius: "10px",
            background:
              isProcessing || !file
                ? "#4b5563"
                : "#ff4500",
            color: "#ffffff",
            fontWeight: "700",
            cursor:
              isProcessing || !file
                ? "not-allowed"
                : "pointer",
          }}
        >
          {isProcessing
            ? "⏳ Processing Statement..."
            : "🚀 Upload and Analyze Statement"}
        </button>

        {/* BACK BUTTON */}

        <button
          onClick={() => navigate("/")}
          disabled={isProcessing}
          style={{
            width: "100%",
            marginTop: "12px",
            padding: "12px",
            border: "1px solid #374151",
            borderRadius: "10px",
            background: "transparent",
            color: "#9ca3af",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}

export default ImportStatement;