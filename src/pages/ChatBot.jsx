import { useState, useEffect, useRef } from "react";

// ==========================================
// SYSTEM CONFIGURATION
// Local: Vite proxy -> http://127.0.0.1:5000
// Production: Vercel /api -> Render backend
// ==========================================
const BACKEND_PORT = "5000";
const API_BASE = import.meta.env.PROD ? "/api" : ""; 

/**
 * Clean and convert raw currency strings (e.g. "₹106,198.00" or "15,000") 
 * into accurate mathematical floats to avoid standard JavaScript parsing truncation.
 */
const cleanNumericString = (val) => {
  if (val === undefined || val === null) return 0;
  if (typeof val === "number") return val;
  // Remove currency signs, commas, and spaces, leaving only numbers, decimals, and minus signs
  const cleaned = String(val).replace(/[^\d.-]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

function ChatBot({
  transactions: propTransactions,
  setTransactions: propSetTransactions,
  totalIncome: dashboardTotalIncome,
  totalExpenses: dashboardTotalExpenses,
  netSavings: dashboardNetSavings,
}) {
  const [messages, setMessages] = useState([
    {
      who: "ai",
      text: "👋 Namaste! Main Amivest AI hoon.\n\nMain aapke transactions, goals aur financial data ke basis par personalized advice de sakta hoon. Aap Hindi ya English dono mein baat kar sakte hain. 💰",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [localTransactions, setLocalTransactions] = useState([]);
  const [syncStatus, setSyncStatus] = useState("idle"); // idle, syncing, success, error
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);

  const messagesEndRef = useRef(null);

  // Fallback-only calculation. Only used when the Dashboard hasn't passed
  // totalIncome/totalExpenses/netSavings props down to this component.
  const calculateFinancials = (items) => {
    let income = 0;
    let expenses = 0;

    items.forEach((t) => {
      const rawAmount = t.amount !== undefined ? t.amount : (t.value || 0);
      const numericAmount = cleanNumericString(rawAmount);
      const amount = Math.abs(numericAmount);
      const rawType = String(t.type || "").toLowerCase().trim();

      // IMPORTANT: this must stay identical to Dashboard.jsx's formula so the
      // two screens can never disagree on the same transaction data.
      const isCredit = numericAmount > 0 || rawType === "credit";

      if (isCredit) {
        income += amount;
      } else {
        expenses += amount;
      }
    });

    return {
      totalIncome: income,
      totalExpenses: expenses,
      netSavings: income - expenses,
    };
  };

  // Prefer the props coming straight from the Dashboard. Only fall
  // back to local recalculation if the Dashboard didn't pass them in.
  const usingDashboardValues =
    dashboardTotalIncome !== undefined &&
    dashboardTotalExpenses !== undefined &&
    dashboardNetSavings !== undefined;

  const fallbackCalc = calculateFinancials(localTransactions);

  const totalIncome = usingDashboardValues ? dashboardTotalIncome : fallbackCalc.totalIncome;
  const totalExpenses = usingDashboardValues ? dashboardTotalExpenses : fallbackCalc.totalExpenses;
  const netSavings = usingDashboardValues ? dashboardNetSavings : fallbackCalc.netSavings;

  // Pulls transaction logs from Vite proxy gateway endpoint
  const syncTransactions = async () => {
    setSyncStatus("syncing");
    
    try {
      const response = await fetch(`${API_BASE}/transactions`, { method: "GET", credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        let fetchedList = [];
        
        if (Array.isArray(data)) {
          fetchedList = data;
        } else if (data.transactions && Array.isArray(data.transactions)) {
          fetchedList = data.transactions;
        }

        if (fetchedList.length > 0) {
          setLocalTransactions(fetchedList);
          
          localStorage.setItem("amivest_transactions", JSON.stringify(fetchedList));
          localStorage.setItem("transactions", JSON.stringify(fetchedList));

          if (propSetTransactions) {
            propSetTransactions(fetchedList);
          }
          setSyncStatus("success");
          setTimeout(() => setSyncStatus("idle"), 3000);
          return;
        }
      }
      throw new Error("Invalid structure received from endpoint lookup");
    } catch (err) {
      console.error(err);
      const fallbackCached = retrieveLocalData();
      if (fallbackCached && fallbackCached.length > 0) {
        setLocalTransactions(fallbackCached);
        setSyncStatus("success");
      } else {
        setSyncStatus("error");
      }
      setTimeout(() => setSyncStatus("idle"), 4000);
    }
  };

  const retrieveLocalData = () => {
    const backupKeys = ["transactions", "finsaathi_transactions", "dashboard_transactions"];
    for (const key of backupKeys) {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch (_) {}
      }
    }
    return null;
  };

  // Get the currently logged-in user's ID.
  const getCurrentUserId = () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      return user?.id || user?.user_id || 1;
    } catch (_) {
      return 1;
    }
  };

  // Load saved conversation using the local Vite proxy or production /api proxy.
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await fetch(`${API_BASE}/chat/history?user_id=${getCurrentUserId()}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.messages) && data.messages.length > 0) {
            setMessages((prev) => [...prev, ...data.messages]);
          }
        }
      } catch (err) {
        console.error("Error loading conversation history via proxy:", err);
      }
    };
    loadHistory();
  }, []);

  useEffect(() => {
    if (propTransactions && propTransactions.length > 0) {
      setLocalTransactions(propTransactions);
      return;
    }

    const initialCache = retrieveLocalData();
    if (initialCache && initialCache.length > 0) {
      setLocalTransactions(initialCache);
    }

    syncTransactions();
  }, [propTransactions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const speakMessage = (text, index) => {
    try {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeakingIndex(null);

      const cleanText = text.replace(/[👋💰❌🤖📊🎯📈⚖💸🛡*`#_]/g, "").trim();
      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voices = window.speechSynthesis.getVoices();
      
      const isHindi = /[\u0900-\u097F]/.test(text) || /\b(main|aap|hai|hoon|bhi|kar|sakte|ho|hai|ka|ke|ki|aur)\b/i.test(text);

      if (voices && voices.length > 0) {
        if (isHindi) {
          const hiVoice = voices.find((v) => v.lang.includes("hi-IN") || v.lang.includes("hi"));
          if (hiVoice) utterance.voice = hiVoice;
          utterance.lang = "hi-IN";
        } else {
          const enVoice = voices.find((v) => v.lang.includes("en-IN") || v.lang.includes("en-US") || v.lang.includes("en-GB") || v.lang.includes("en"));
          if (enVoice) utterance.voice = enVoice;
          utterance.lang = "en-US";
        }
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        setSpeakingIndex(index);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setSpeakingIndex(null);
      };

      utterance.onerror = (err) => {
        console.error("Speech Synthesis run failure:", err);
        setIsSpeaking(false);
        setSpeakingIndex(null);
      };

      window.speechSynthesis.speak(utterance);
    } catch (speechErr) {
      console.error("Critical Speech Engine Lockup:", speechErr);
      setIsSpeaking(false);
      setSpeakingIndex(null);
    }
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setSpeakingIndex(null);
  };

  const send = async () => {
    if (!input.trim()) return;

    const question = input;
    setMessages((prev) => [...prev, { who: "user", text: question }]);
    setInput("");
    setLoading(true);

    const condensedTransactions = localTransactions.slice(-10);

    const promptWithDashboardContext = `[SYSTEM CONTEXT: The user's active dashboard displays these exact values: Total Deposits (Income) = ₹${totalIncome.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, Total Outflows (Expenses) = ₹${totalExpenses.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, and Net Wallet Savings (Surplus) = ₹${netSavings.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. There are currently ${localTransactions.length} transactions loaded. You MUST use these exact numbers to answer any questions about the user's balance, income, or expenses. Do not hallucinate or state other metrics.]\n\nUser Question: ${question}`;

    const payloadContext = {
      user_id: getCurrentUserId(),
      message: promptWithDashboardContext,
      conversation_history: messages.map((m) => ({
        role: m.who === "user" ? "user" : "assistant",
        message: m.text,
      })),
      summary_context: {
        total_income: totalIncome,
        total_expenses: totalExpenses,
        net_savings: netSavings,
        total_record_count: localTransactions.length,
      },
      transactions_context: condensedTransactions.map((t) => ({
        date: t.transaction_date || t.date || "",
        description: t.description || "",
        amount: cleanNumericString(t.amount),
        type: t.type || "",
        category: t.category || "Other",
      })),
    };

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadContext),
      });

      if (!response.ok) {
        throw new Error(`Server returned status code: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.reply || data.response || data.message || "No response received.";
      setMessages((prev) => [...prev, { who: "ai", text: aiResponse }]);
    } catch (err) {
      console.error(err);

      setMessages((prev) => [
        ...prev,
        {
          who: "ai",
          text: `❌ Error: ${err.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: "100%", padding: "10px", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#fff", margin: 0 }}>
          💬 FinSaathi AI Chatbot
        </h1>
        
        <button
          onClick={syncTransactions}
          disabled={syncStatus === "syncing"}
          style={{
            background: syncStatus === "syncing" ? "#1E3A5F" : "#0D9488",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            padding: "8px 16px",
            fontSize: "13px",
            cursor: "pointer",
            fontWeight: "bold",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          {syncStatus === "syncing" && "🔄 Syncing Ledger..."}
          {syncStatus === "success" && "✅ Dashboard Synced!"}
          {syncStatus === "error" && "⚠️ Sync Error"}
          {syncStatus === "idle" && "🔄 Sync Dashboard Data"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px", height: "80vh" }}>
        <div
          style={{
            background: "#0D2D4A",
            borderRadius: "14px",
            display: "flex",
            flexDirection: "column",
            border: "1px solid #1E3A5F",
            overflow: "hidden"
          }}
        >
          <div
            style={{
              padding: "18px 24px",
              borderBottom: "1px solid #1E3A5F",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  background: "#0D9488",
                  borderRadius: "50%",
                  width: "42px",
                  height: "42px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px"
                }}
              >
                🤖
              </div>
              <div>
                <div style={{ color: "#fff", fontSize: "15px", fontWeight: "bold" }}>
                  FinSaathi AI
                </div>
                <div style={{ color: "#10B981", fontSize: "12px", marginTop: "2px" }}>
                  ● Connected to {import.meta.env.PROD ? "Production API" : `Port ${BACKEND_PORT}`}
                </div>
              </div>
            </div>

            <div style={{ color: "#94A3B8", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
              📊 Scanning {localTransactions.length} Transactions
            </div>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: m.who === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "75%",
                    padding: "12px 18px",
                    borderRadius: "14px",
                    fontSize: "15px",
                    lineHeight: "1.6",
                    whiteSpace: "pre-wrap",
                    background: m.who === "user" ? "#0D9488" : "#1E3A5F",
                    color: "#fff",
                  }}
                >
                  {m.text}

                  {m.who === "ai" && (
                    <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                      <button
                        onClick={() => speakMessage(m.text, i)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          background: isSpeaking && speakingIndex === i ? "#071829" : "rgba(255, 255, 255, 0.12)",
                          border: isSpeaking && speakingIndex === i ? "1px solid #0D9488" : "none",
                          color: isSpeaking && speakingIndex === i ? "#10B981" : "#E2E8F0",
                          borderRadius: "6px",
                          padding: "6px 12px",
                          fontSize: "12px",
                          cursor: "pointer",
                          fontWeight: "bold",
                          transition: "all 0.2s",
                        }}
                      >
                        {isSpeaking && speakingIndex === i ? "🔊 Speaking..." : "🔊 Listen"}
                      </button>

                      {isSpeaking && speakingIndex === i && (
                        <button
                          onClick={stopSpeaking}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            background: "rgba(239, 68, 68, 0.2)",
                            border: "1px solid rgba(239, 68, 68, 0.4)",
                            color: "#FCA5A5",
                            borderRadius: "6px",
                            padding: "6px 12px",
                            fontSize: "12px",
                            cursor: "pointer",
                            fontWeight: "bold",
                            transition: "all 0.2s",
                          }}
                        >
                          ⏹ Stop
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div
                  style={{
                    background: "#1E3A5F",
                    padding: "12px 18px",
                    borderRadius: "14px",
                    color: "#94A3B8",
                    fontSize: "14px",
                  }}
                >
                  🤖 FinSaathi AI is calculating insights...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div
            style={{
              padding: "18px",
              borderTop: "1px solid #1E3A5F",
              display: "flex",
              gap: "12px",
              background: "#071829"
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              placeholder="Ex: What is my current savings balance?"
              style={{
                flex: 1,
                background: "#0D2D4A",
                border: "1px solid #1E3A5F",
                borderRadius: "8px",
                padding: "12px 16px",
                color: "#fff",
                fontSize: "15px",
                outline: "none",
              }}
            />

            <button
              onClick={send}
              style={{
                background: "#0D9488",
                border: "none",
                borderRadius: "8px",
                padding: "12px 24px",
                color: "#fff",
                fontSize: "15px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Send ➤
            </button>
          </div>
        </div>

        <div
          style={{
            background: "#0D2D4A",
            borderRadius: "14px",
            padding: "24px",
            border: "1px solid #1E3A5F",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }}
        >
          <div>
            <h3 style={{ color: "#fff", fontSize: "18px", marginBottom: "18px", borderBottom: "1px solid #1E3A5F", paddingBottom: "10px" }}>
              📝 Live Dashboard HUD
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "24px" }}>
              <div style={{ background: "#071829", padding: "16px", borderRadius: "8px", borderLeft: "4px solid #10B981" }}>
                <div style={{ fontSize: "11px", color: "#94A3B8", letterSpacing: "0.05em" }}>TOTAL DEPOSITS (INCOME)</div>
                <div style={{ fontSize: "22px", fontWeight: "bold", color: "#10B981", marginTop: "6px" }}>
                  ₹{totalIncome.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
              </div>

              <div style={{ background: "#071829", padding: "16px", borderRadius: "8px", borderLeft: "4px solid #EF4444" }}>
                <div style={{ fontSize: "11px", color: "#94A3B8", letterSpacing: "0.05em" }}>TOTAL OUTFLOWS (EXPENSES)</div>
                <div style={{ fontSize: "22px", fontWeight: "bold", color: "#EF4444", marginTop: "6px" }}>
                  ₹{totalExpenses.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
              </div>

              <div style={{ background: "#071829", padding: "16px", borderRadius: "8px", borderLeft: "4px solid #3B82F6" }}>
                <div style={{ fontSize: "11px", color: "#94A3B8", letterSpacing: "0.05em" }}>NET WALLET SAVINGS</div>
                <div style={{ fontSize: "22px", fontWeight: "bold", color: "#3B82F6", marginTop: "6px" }}>
                  ₹{netSavings.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>

            <h4 style={{ color: "#94A3B8", fontSize: "14px", marginBottom: "10px" }}>AI Directives</h4>
            <ul style={{ color: "#CBD5E1", fontSize: "13px", lineHeight: "1.8", paddingLeft: "20px", margin: 0 }}>
              <li>Ask for statement analysis</li>
              <li>Break down your expenses</li>
              <li>Review your net wallet savings</li>
              <li>Get advice in English or Hindi</li>
            </ul>
          </div>

          <div style={{ borderTop: "1px solid #1E3A5F", paddingTop: "14px", color: "#64748B", fontSize: "11px", textAlign: "center" }}>
            amivest AI • {import.meta.env.PROD ? "Production API" : `Listening on Port ${BACKEND_PORT}`}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatBot;