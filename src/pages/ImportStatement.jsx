import React, {
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL?.trim() ||
  import.meta.env.VITE_API_URL?.trim() ||
  "http://127.0.0.1:5000";

function ImportStatement() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [pdfPassword, setPdfPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [user, setUser] =
    useState(null);

  useEffect(() => {
    try {
      const stored =
        localStorage.getItem("user");

      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (err) {
      console.error(
        "USER READ ERROR:",
        err
      );
    }
  }, []);

  const handleFileChange = (e) => {
    setError("");
    setMessage("");

    const selectedFile =
      e.target.files?.[0];

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    const fileName =
      selectedFile.name.toLowerCase();

    const validExtension =
      fileName.endsWith(".pdf") ||
      fileName.endsWith(".csv") ||
      fileName.endsWith(".xls") ||
      fileName.endsWith(".xlsx");

    if (
      !allowedTypes.includes(
        selectedFile.type
      ) &&
      !validExtension
    ) {
      setError(
        "Please select a PDF, CSV, XLS or XLSX file."
      );

      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    setError("");
    setMessage("");

    if (!file) {
      setError(
        "Please select your bank statement first."
      );
      return;
    }

    setLoading(true);

    try {
      /*
       * IMPORTANT:
       * Do NOT manually set Content-Type here.
       *
       * Browser automatically creates:
       * multipart/form-data; boundary=...
       */

      const formData =
        new FormData();

      formData.append("file", file);
      // Compatibility with backends that expect "statement".
      formData.append("statement", file);

      if (pdfPassword.trim()) {
        formData.append(
          "password",
          pdfPassword
        );

        // Some backends use pdf_password.
        formData.append(
          "pdf_password",
          pdfPassword
        );
      }

      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          const userId =
            parsedUser?.id ??
            parsedUser?.user_id ??
            parsedUser?.userId;
          if (userId) {
            formData.append("user_id", String(userId));
          }
        } catch (e) {
          console.warn("Could not read stored user:", e);
        }
      }

      const response =
        await fetch(
          `${BACKEND_URL}/upload`,
          {
            method: "POST",

            // ⭐ MOST IMPORTANT LINE
            credentials: "include",

            body: formData,
          }
        );

      let data = {};

      try {
        data =
          await response.json();
      } catch (_) {
        data = {};
      }

      console.log(
        "UPLOAD RESPONSE:",
        data
      );

      if (
        response.status === 401
      ) {
        throw new Error(
          "Authentication required. Please logout and login again."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            `Upload failed. HTTP ${response.status}`
        );
      }

      if (!data.success) {
        throw new Error(
          data.error ||
            data.message ||
            "Upload failed."
        );
      }

      setMessage(
        data.message ||
          "Statement uploaded successfully."
      );

      /*
       * Backend may return imported
       * transaction information.
       */

      if (
        data.transactions ||
        data.imported ||
        data.count
      ) {
        const count =
          data.count ??
          data.imported ??
          data.transactions?.length;

        if (count !== undefined) {
          setMessage(
            `✅ Statement processed successfully. ${count} transactions imported.`
          );
        }
      }

      /*
       * Clear file after successful upload.
       */

      setFile(null);
      setPdfPassword("");

      const fileInput =
        document.getElementById(
          "statement-file"
        );

      if (fileInput) {
        fileInput.value = "";
      }

    } catch (err) {
      console.error(
        "UPLOAD ERROR:",
        err
      );

      setError(
        err.message ||
          "Upload failed."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100%",
        padding: "35px",
        color: "#fff",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          marginBottom: "25px",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "32px",
            fontWeight: "900",
            color: "#F97316",
          }}
        >
          📄 Statement Importer
        </h1>

        <p
          style={{
            color: "#94a3b8",
            marginTop: "8px",
          }}
        >
          Upload your bank statement
          to automatically analyze
          your transactions.
        </p>
      </div>

      {/* USER */}

      {user && (
        <div
          style={{
            background:
              "rgba(13,148,136,0.08)",
            border:
              "1px solid rgba(13,148,136,0.25)",
            borderRadius: "12px",
            padding: "12px 15px",
            marginBottom: "20px",
            color: "#cbd5e1",
            fontSize: "13px",
          }}
        >
          👤 Logged in as{" "}
          <strong
            style={{
              color: "#14B8A6",
            }}
          >
            {user.name ||
              user.email ||
              "User"}
          </strong>
        </div>
      )}

      {/* UPLOAD CARD */}

      <div
        style={{
          background: "#161a1f",
          border:
            "1px solid #263244",
          borderRadius: "18px",
          padding: "30px",
          maxWidth: "850px",
        }}
      >
        {/* DROP AREA */}

        <label
          htmlFor="statement-file"
          style={{
            display: "block",
            border:
              "2px dashed #334155",
            borderRadius: "15px",
            padding: "45px 25px",
            textAlign: "center",
            cursor: "pointer",
            background:
              "#0B1420",
          }}
        >
          <div
            style={{
              fontSize: "55px",
              marginBottom: "15px",
            }}
          >
            📁
          </div>

          <h2
            style={{
              margin: 0,
              color: "#fff",
            }}
          >
            Select Bank Statement
          </h2>

          <p
            style={{
              color: "#94a3b8",
              fontSize: "13px",
            }}
          >
            Supported formats:
            PDF, CSV, XLS, XLSX
          </p>

          <input
            id="statement-file"
            type="file"
            accept=".pdf,.csv,.xls,.xlsx"
            onChange={
              handleFileChange
            }
            style={{
              display: "none",
            }}
          />

          <div
            style={{
              display: "inline-block",
              marginTop: "15px",
              padding:
                "10px 20px",
              borderRadius: "8px",
              background: "#0D9488",
              color: "#fff",
              fontWeight: "700",
              fontSize: "13px",
            }}
          >
            Choose File
          </div>
        </label>

        {/* SELECTED FILE */}

        {file && (
          <div
            style={{
              marginTop: "18px",
              padding: "14px",
              borderRadius: "10px",
              background:
                "rgba(13,148,136,0.1)",
              border:
                "1px solid rgba(13,148,136,0.3)",
            }}
          >
            <div
              style={{
                color: "#14B8A6",
                fontWeight: "700",
              }}
            >
              📄 {file.name}
            </div>

            <div
              style={{
                color: "#64748b",
                fontSize: "12px",
                marginTop: "4px",
              }}
            >
              {(
                file.size /
                1024 /
                1024
              ).toFixed(2)}{" "}
              MB
            </div>
          </div>
        )}

        {/* PASSWORD */}

        <div
          style={{
            marginTop: "22px",
          }}
        >
          <label
            style={{
              display: "block",
              color: "#cbd5e1",
              fontSize: "13px",
              marginBottom: "7px",
            }}
          >
            PDF Password
          </label>

          <input
            type="password"
            value={pdfPassword}
            onChange={(e) =>
              setPdfPassword(
                e.target.value
              )
            }
            placeholder="Enter PDF password (optional)"
            autoComplete="off"
            style={{
              width: "100%",
              boxSizing:
                "border-box",
              padding: "13px",
              borderRadius: "9px",
              border:
                "1px solid #334155",
              background:
                "#0B1420",
              color: "#fff",
              outline: "none",
            }}
          />
        </div>

        {/* ERROR */}

        {error && (
          <div
            style={{
              marginTop: "18px",
              padding: "13px",
              borderRadius: "10px",
              background:
                "rgba(239,68,68,0.1)",
              border:
                "1px solid rgba(239,68,68,0.35)",
              color: "#fca5a5",
              fontSize: "13px",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* SUCCESS */}

        {message && (
          <div
            style={{
              marginTop: "18px",
              padding: "13px",
              borderRadius: "10px",
              background:
                "rgba(16,185,129,0.1)",
              border:
                "1px solid rgba(16,185,129,0.35)",
              color: "#6ee7b7",
              fontSize: "13px",
            }}
          >
            {message}
          </div>
        )}

        {/* UPLOAD BUTTON */}

        <button
          onClick={handleUpload}
          disabled={
            loading || !file
          }
          style={{
            width: "100%",
            marginTop: "22px",
            padding: "15px",
            border: "none",
            borderRadius: "10px",
            background:
              loading || !file
                ? "#334155"
                : "linear-gradient(90deg,#0D9488,#06B6D4)",
            color: "#fff",
            fontSize: "15px",
            fontWeight: "800",
            cursor:
              loading || !file
                ? "not-allowed"
                : "pointer",
          }}
        >
          {loading
            ? "⏳ Processing Statement..."
            : "🚀 Process Statement"}
        </button>

        {/* BACK */}

        <button
          onClick={() =>
            navigate("/")
          }
          style={{
            width: "100%",
            marginTop: "12px",
            padding: "12px",
            border:
              "1px solid #263244",
            borderRadius: "10px",
            background:
              "transparent",
            color: "#94a3b8",
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