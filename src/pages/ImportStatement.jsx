import { useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_IP = "http://127.0.0.1:5000";
const BASE_LOCAL = "http://localhost:5000";

// Tries the same-origin relative path first (goes through the Vite proxy,
// avoiding CORS/browser-network issues entirely), then falls back to direct
// URLs. FormData uploads must NOT have a manual Content-Type header — the
// browser sets the multipart boundary itself.
async function uploadFile(path, formData) {
  const urls = [path, `${BASE_IP}${path}`, `${BASE_LOCAL}${path}`];
  const attempts = [];

  for (const url of urls) {
    try {
      const res = await fetch(url, { method: "POST", body: formData });

      let body = null;
      let parseFailed = false;
      try {
        body = await res.json();
      } catch (_) {
        parseFailed = true;
      }

      if (res.ok && !parseFailed) return body;
      if (res.ok && parseFailed) {
        attempts.push(`${url} → HTTP ${res.status} but not JSON`);
        continue;
      }
      attempts.push(`${url} → HTTP ${res.status}: ${(body && (body.error || body.message)) || "no details"}`);
    } catch (err) {
      attempts.push(`${url} → ${err.name}: ${err.message}`);
    }
  }

  throw new Error(attempts.join("\n"));
}

function ImportStatement({ setTransactions }) { // <-- Accept the shared context state setter
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a statement.");
      return;
    }

    setIsProcessing(true);
    const formData = new FormData();
    formData.append("statement", file);
    formData.append("password", password);

    try {
      const data = await uploadFile("/upload", formData);

      if (data.success === true) {
        if (data.transactions && Array.isArray(data.transactions)) {
          // KEY STEP: Injects the parsed rows directly into the global layout memory state space
          setTransactions(data.transactions);
          alert(`Success! Imported ${data.transactions.length} transactions.`);
          navigate("/"); // Return to index page cleanly
        } else {
          alert("Statement parsed, but backend data array structure format returned empty.");
        }
      } else {
        alert(data.message || data.error || "Upload process failure codes isolated.");
      }
    } catch (error) {
      // Shows the REAL reason instead of a generic message, same pattern
      // used on Goals/Investments — makes this diagnosable without DevTools.
      alert(`Upload failed. Details:\n\n${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0b0d0f", padding: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: "800px", background: "#161a1f", borderRadius: "20px", padding: "40px", border: "1px solid #242b35" }}>
        <h1 style={{ color: "#ff4500", marginBottom: "15px", fontSize: "26px" }}>📄 Statement Importer</h1>
        <div style={{ border: "2px dashed #374151", padding: "40px", textAlign: "center", background: "#1f262e", borderRadius: "12px" }}>
          <input
            type="file"
            accept=".pdf,.csv,.xlsx,.xls"
            onChange={(e) => setFile(e.target.files[0])}
            style={{ color: "#9ca3af", cursor: "pointer" }}
          />
        </div>
        <div style={{ marginTop: "20px" }}>
          <input
            type="password"
            placeholder="Enter PDF Password (optional)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "#1f262e", color: "#fff", border: "1px solid #374151" }}
          />
        </div>
        <button
          onClick={handleUpload}
          disabled={isProcessing}
          style={{ width: "100%", marginTop: "30px", padding: "14px", border: "none", borderRadius: "10px", background: "#ff4500", color: "#fff", fontWeight: "700", cursor: "pointer" }}
        >
          {isProcessing ? "Running AI Tokenizers..." : "🚀 Upload and Analyze Statement"}
        </button>
      </div>
    </div>
  );
}

export default ImportStatement;
