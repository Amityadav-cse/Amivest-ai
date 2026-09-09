import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

/*
  AmiVest Alexa AI - WORKABLE VERSION

  Main fixes:
  1. Text chat works even when /chat returns 401.
  2. Credentials are included for Flask session authentication.
  3. HTTP errors are handled correctly instead of pretending "Done".
  4. Hello / Hindi / English basic conversation works locally.
  5. Browser speech uses a fresh SpeechSynthesisUtterance for every response.
  6. Voice input displays live words while speaking.
  7. Voice output speaks the final response in Hindi or English.
  8. Existing goal/transaction/budget voice commands call the backend.
  9. Delete commands require an exact target when possible.
  10. UI never remains stuck on "Speaking".
  11. Voice input requests microphone permission before recognition.
  12. Live speech appears in the input while the user is talking.
  13. Final voice text is sent only once to the assistant.
  14. Hindi/English recognition follows the selected language.
  15. Microphone errors show actionable messages instead of silently failing.
*/

const DEFAULT_API_BASE = "http://127.0.0.1:5000";
const API_BASE = String(import.meta.env.VITE_API_URL || DEFAULT_API_BASE).replace(/\/+$/, "");

const WAKE_WORDS = [
  "suno",
  "sunoo",
  "sunno",
  "hey suno",
  "amivest",
  "alexa",
  "saathi",
];

const QUICK_ACTIONS = [
  { id: "goals", icon: "🎯", label: "Goals", command: "Show my goals" },
  { id: "transactions", icon: "💳", label: "Transactions", command: "Show my recent transactions" },
  { id: "budget", icon: "📊", label: "Budget", command: "Show my monthly budget" },
  { id: "food", icon: "🍔", label: "Add ₹500 food", command: "Add 500 in food" },
  { id: "savings", icon: "💰", label: "Savings", command: "How much should I save this month?" },
  { id: "investments", icon: "📈", label: "Investments", command: "Show my investments" },
  { id: "loans", icon: "🏦", label: "Loans", command: "Show my loans" },
];

function safeText(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function cleanSpeechText(value) {
  return safeText(value)
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/`/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/₹/g, " rupees ")
    .replace(/\bRs\.?\s*/gi, " rupees ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectLanguage(text, selected = "hi") {
  const value = safeText(text);
  if (/[\u0900-\u097f]/.test(value)) return "hi";
  return selected === "en" ? "en" : "hi";
}

/* ------------------------------------------------------------------ */
/* Reliable browser TTS                                               */
/* ------------------------------------------------------------------ */

function stopBrowserSpeech() {
  try {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    }
  } catch (_) {}
}

function chooseVoice(language) {
  if (!("speechSynthesis" in window)) return null;

  const voices = window.speechSynthesis.getVoices() || [];
  if (!voices.length) return null;

  if (language === "hi") {
    return (
      voices.find((v) => /^hi[-_]/i.test(v.lang)) ||
      voices.find((v) => String(v.lang).toLowerCase().includes("hi")) ||
      voices.find((v) => /hindi/i.test(v.name)) ||
      voices.find((v) => /en[-_]in/i.test(v.lang)) ||
      null
    );
  }

  return (
    voices.find((v) => /en[-_]in/i.test(v.lang)) ||
    voices.find((v) => /en[-_]us/i.test(v.lang)) ||
    voices.find((v) => /^en/i.test(v.lang)) ||
    null
  );
}

function splitSpeech(text) {
  const clean = cleanSpeechText(text);
  if (!clean) return [];

  const sentences = clean
    .replace(/\n+/g, ". ")
    .split(/(?<=[.!?।])\s+/)
    .filter(Boolean);

  const chunks = [];

  for (const sentence of sentences) {
    if (sentence.length <= 160) {
      chunks.push(sentence);
      continue;
    }

    const words = sentence.split(/\s+/);
    let current = "";

    for (const word of words) {
      if ((current + " " + word).trim().length > 150) {
        if (current.trim()) chunks.push(current.trim());
        current = word;
      } else {
        current = (current + " " + word).trim();
      }
    }

    if (current.trim()) chunks.push(current.trim());
  }

  return chunks;
}

function normalizeSpeechChunk(text) {
  return safeText(text)
    .replace(/^[\s\u200B-\u200D\uFEFF]+/g, "")
    .replace(/^(?:[^\p{L}\p{N}\u0900-\u097F]+)+/u, "")
    .replace(/^[₹$€£¥]+\s*/g, "")
    .trim();
}

/*
 * Safari-safe TTS priming.
 *
 * Safari can reject speech started only after an async fetch. We therefore
 * create a tiny silent utterance directly from the user's click/submit event.
 * The real response is still spoken later.
 */
function primeSafariSpeech() {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window) ||
    typeof window.SpeechSynthesisUtterance === "undefined"
  ) {
    return false;
  }

  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    synth.resume();

    const primer = new SpeechSynthesisUtterance(" ");
    primer.volume = 0;
    primer.rate = 10;
    primer.pitch = 1;
    primer.lang = "en-IN";

    synth.speak(primer);

    setTimeout(() => {
      try {
        synth.cancel();
        synth.resume();
      } catch (_) {}
    }, 40);

    return true;
  } catch (error) {
    console.warn("Safari speech prime failed:", error);
    return false;
  }
}

function speakText(text, language, onStart, onEnd, onError) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onError?.("Your browser does not support text-to-speech.");
    onEnd?.();
    return;
  }

  const clean = cleanSpeechText(text);
  if (!clean) {
    onEnd?.();
    return;
  }

  const synth = window.speechSynthesis;

  try {
    synth.resume();
  } catch (_) {}
  const chunks = splitSpeech(clean)
    .map(normalizeSpeechChunk)
    .filter(Boolean);

  if (!chunks.length) {
    onEnd?.();
    return;
  }

  let index = 0;
  let finished = false;
  let started = false;
  let currentRetry = 0;
  let watchdog = null;
  let keepAlive = null;

  const clearTimers = () => {
    if (watchdog) {
      clearTimeout(watchdog);
      watchdog = null;
    }
    if (keepAlive) {
      clearInterval(keepAlive);
      keepAlive = null;
    }
  };

  const finish = (errorMessage = "") => {
    if (finished) return;
    finished = true;
    clearTimers();
    if (errorMessage) onError?.(errorMessage);
    onEnd?.();
  };

  const skipCurrentChunk = () => {
    if (finished) return;
    clearTimers();
    currentRetry = 0;
    index += 1;
    setTimeout(() => {
      if (!finished) speakNext();
    }, 90);
  };

  const speakNext = () => {
    if (finished) return;

    if (index >= chunks.length) {
      finish();
      return;
    }

    const part = normalizeSpeechChunk(chunks[index]);

    if (!part) {
      skipCurrentChunk();
      return;
    }

    const detected = detectLanguage(part, language);
    const lang = detected === "hi" ? "hi-IN" : "en-IN";

    try {
      if (synth.paused) synth.resume();
      else if (synth.speaking) synth.cancel();
    } catch (_) {}

    const utterance = new SpeechSynthesisUtterance(part);
    utterance.lang = lang;
    utterance.rate = detected === "hi" ? 0.90 : 0.96;
    utterance.pitch = 1;
    utterance.volume = 1;

    // First attempt uses the best installed voice.
    // Retry intentionally removes the selected voice.
    if (currentRetry === 0) {
      const voice = chooseVoice(detected);
      if (voice) utterance.voice = voice;
    }

    let hasStarted = false;

    utterance.onstart = () => {
      hasStarted = true;

      if (!started) {
        started = true;
        onStart?.();
      }

      if (watchdog) {
        clearTimeout(watchdog);
        watchdog = null;
      }
    };

    utterance.onend = () => {
      if (finished) return;

      if (watchdog) {
        clearTimeout(watchdog);
        watchdog = null;
      }

      currentRetry = 0;
      index += 1;

      setTimeout(() => {
        if (!finished) speakNext();
      }, 70);
    };

    utterance.onerror = (event) => {
      if (finished) return;

      if (watchdog) {
        clearTimeout(watchdog);
        watchdog = null;
      }

      const error = event?.error || "unknown";

      // User intentionally stopped speech.
      if (error === "canceled" || error === "interrupted") {
        finish();
        return;
      }

      /*
       * IMPORTANT:
       * A failed first chunk must NOT terminate the whole response.
       * Retry once, then skip ONLY this chunk.
       */
      if (currentRetry === 0) {
        currentRetry = 1;

        setTimeout(() => {
          if (!finished) speakNext();
        }, 100);

        return;
      }

      skipCurrentChunk();
    };

    try {
      synth.speak(utterance);

      // Wake Chrome/Safari speech queue after speak().
      setTimeout(() => {
        try {
          if (!finished) synth.resume();
        } catch (_) {}
      }, 100);

      keepAlive = setInterval(() => {
        if (finished) {
          clearTimers();
          return;
        }

        try {
          if (synth.paused) synth.resume();
        } catch (_) {}
      }, 1200);

      /*
       * If Safari/Chrome silently refuses to start this chunk,
       * retry once and then SKIP the stuck chunk.
       */
      watchdog = setTimeout(() => {
        if (finished || hasStarted) return;

        try {
          synth.cancel();
          synth.resume();
        } catch (_) {}

        if (currentRetry === 0) {
          currentRetry = 1;

          setTimeout(() => {
            if (!finished) speakNext();
          }, 100);
        } else {
          skipCurrentChunk();
        }
      }, 3500);
    } catch (_) {
      // Synchronous failure: retry once, then skip only this chunk.
      if (currentRetry === 0) {
        currentRetry = 1;

        setTimeout(() => {
          if (!finished) speakNext();
        }, 100);
      } else {
        skipCurrentChunk();
      }
    }
  };

  speakNext();
}

/* ------------------------------------------------------------------ */
/* Local assistant fallback                                            */
/* ------------------------------------------------------------------ */

function localAssistant(text, language) {
  const value = safeText(text).trim();
  const lower = value.toLowerCase();

  const isHindi = language === "hi";

  if (
    lower === "hello" ||
    lower === "hi" ||
    lower === "hey" ||
    lower.includes("hello alexa") ||
    lower.includes("hi alexa")
  ) {
    return isHindi
      ? "नमस्ते! मैं AmiVest Alexa हूँ। मैं आपके खर्च, goals, budget, transactions, savings और investments में मदद कर सकती हूँ।"
      : "Hello! I am AmiVest Alexa. I can help you with your expenses, goals, budget, transactions, savings and investments.";
  }

  if (
    lower.includes("who are you") ||
    lower.includes("what are you") ||
    lower.includes("tum kaun") ||
    lower.includes("aap kaun")
  ) {
    return isHindi
      ? "मैं AmiVest Alexa हूँ, आपके personal finance assistant की तरह काम करती हूँ।"
      : "I am AmiVest Alexa, your personal finance assistant.";
  }

  if (
    lower.includes("thank") ||
    lower.includes("thanks") ||
    lower.includes("dhanyavaad")
  ) {
    return isHindi
      ? "आपका स्वागत है! मैं आपकी financial planning में मदद करने के लिए तैयार हूँ।"
      : "You're welcome! I am ready to help with your financial planning.";
  }

  if (
    lower.includes("good morning") ||
    lower.includes("good evening") ||
    lower.includes("good afternoon")
  ) {
    return isHindi
      ? "नमस्ते! आपका AmiVest dashboard तैयार है। आज हम क्या manage करें?"
      : "Hello! Your AmiVest dashboard is ready. What would you like to manage today?";
  }

  if (
    lower.includes("what can you do") ||
    lower.includes("kya kar sakti") ||
    lower.includes("kya karte ho")
  ) {
    return isHindi
      ? "मैं goals, expenses, transactions, budgets, savings, investments और loans को view और manage करने में आपकी मदद कर सकती हूँ।"
      : "I can help you view and manage goals, expenses, transactions, budgets, savings, investments and loans.";
  }

  if (
    lower.includes("show my goals") ||
    lower === "goals" ||
    lower.includes("mere goals")
  ) {
    return isHindi
      ? "मैं आपके goals दिखा सकती हूँ। Goals page खोलें या backend connection उपलब्ध होने पर मैं आपके saved goals पढ़ूँगी।"
      : "I can show your goals. Open the Goals page, or I can read your saved goals when the backend connection is available.";
  }

  if (
    lower.includes("show my budget") ||
    lower.includes("monthly budget") ||
    lower === "budget"
  ) {
    return isHindi
      ? "मैं आपका monthly budget दिखा सकती हूँ। Budget page में आपकी limits और spending दिखाई जाएगी।"
      : "I can show your monthly budget, including your limits and spending.";
  }

  if (
    lower.includes("show my transactions") ||
    lower.includes("recent transactions") ||
    lower === "transactions"
  ) {
    return isHindi
      ? "मैं आपकी recent transactions दिखा सकती हूँ। Transactions page खोलें या backend connection से मैं उन्हें पढ़ सकती हूँ।"
      : "I can show your recent transactions. Open the Transactions page or let me read them from the backend.";
  }

  if (
    lower.includes("add") &&
    (lower.includes("food") || lower.includes("expense"))
  ) {
    return isHindi
      ? "मैं expense add करने के लिए तैयार हूँ। Amount और category बताइए, जैसे: food में 500 रुपये add करो।"
      : "I am ready to add the expense. Tell me the amount and category, for example: add 500 in food.";
  }

  if (
    lower.includes("save") ||
    lower.includes("saving") ||
    lower.includes("bachat")
  ) {
    return isHindi
      ? "Saving के लिए पहले आपकी monthly income और essential expenses देखना बेहतर होगा।"
      : "For a useful saving plan, I should first consider your monthly income and essential expenses.";
  }

  return isHindi
    ? `मैंने सुना: "${value}". मैं इस request को समझने की कोशिश कर रही हूँ। आप goals, expenses, budget या transactions के बारे में पूछ सकते हैं।`
    : `I heard: "${value}". I am ready to help. You can ask about goals, expenses, budget or transactions.`;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function AmiVestAlexaPro({
  onRefresh,
  initiallyOpen = false,
  position = "bottom-left",
}) {
  const navigate = useNavigate();

  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const wakeRecognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const sendLockRef = useRef(false);

  const [open, setOpen] = useState(initiallyOpen);
  const [language, setLanguage] = useState(
    () => localStorage.getItem("amivest_alexa_language") || "en"
  );

  const [message, setMessage] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      text: "Hello! I am AmiVest Alexa. How can I help you with your finances today?",
    },
  ]);

  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [connected, setConnected] = useState(false);
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState("");
  const [wakeWordActive, setWakeWordActive] = useState(false);

  const positionStyle = useMemo(() => {
    if (position === "bottom-right") {
      return { right: 16, left: "auto" };
    }
    return { left: 16, right: "auto" };
  }, [position]);

  const pushMessage = useCallback((role, text) => {
    const clean = safeText(text).trim();
    if (!clean) return;

    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        role,
        text: clean,
      },
    ]);
  }, []);

  const refreshApp = useCallback(
    (payload = {}) => {
      try {
        if (typeof onRefresh === "function") onRefresh(payload);
      } catch (_) {}

      try {
        window.dispatchEvent(
          new CustomEvent("amivest:data-changed", { detail: payload })
        );
      } catch (_) {}
    },
    [onRefresh]
  );

  const checkSession = useCallback(async () => {
    let localId = null;

    try {
      const stored = localStorage.getItem("user");

      if (stored) {
        const parsed = JSON.parse(stored);
        localId = parsed?.id ?? parsed?.user_id ?? null;
      }
    } catch (_) {}

    /*
      We deliberately do not block the assistant when session lookup
      fails. The assistant can still answer normal questions locally.
    */
    setUserId(localId);
    setConnected(Boolean(localId));

    return {
      authenticated: Boolean(localId),
      user_id: localId,
    };
  }, []);

  useEffect(() => {
    checkSession();

    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.getVoices();

        const old = window.speechSynthesis.onvoiceschanged;

        window.speechSynthesis.onvoiceschanged = () => {
          try {
            window.speechSynthesis.getVoices();
          } catch (_) {}

          if (typeof old === "function") old();
        };
      } catch (_) {}
    }

    return () => {
      try {
        recognitionRef.current?.stop();
      } catch (_) {}

      try {
        wakeRecognitionRef.current?.stop();
      } catch (_) {}

      stopBrowserSpeech();
    };
  }, [checkSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, thinking, liveTranscript]);

  const stopSpeaking = useCallback(() => {
    stopBrowserSpeech();
    setSpeaking(false);
  }, []);

  const speakReply = useCallback(
    (text) => {
      if (!text) return;

      setSpeaking(true);
      setError("");

      speakText(
        text,
        language,
        () => {
          setSpeaking(true);
        },
        () => {
          setSpeaking(false);
        },
        (speechError) => {
          setSpeaking(false);
          if (speechError) setError(speechError);
        }
      );
    },
    [language]
  );

  /* -------------------------------------------------------------- */
  /* Backend command helpers                                        */
  /* -------------------------------------------------------------- */

  const apiRequest = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    let data = {};

    try {
      data = await response.json();
    } catch (_) {}

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  }, []);

  const executeVoiceCommand = useCallback(
    async (text, uid) => {
      const lower = text.toLowerCase().trim();

      /* ---------- Delete all goals ---------- */
      if (
        (lower.includes("delete all") ||
          lower.includes("remove all") ||
          lower.includes("clear all")) &&
        (lower.includes("goal") || lower.includes("goals"))
      ) {
        const result = await apiRequest(
          `/api/voice/goals/all?user_id=${encodeURIComponent(uid)}`,
          { method: "DELETE" }
        );

        if (!result.ok) {
          return {
            handled: true,
            success: false,
            reply:
              result.status === 401
                ? "I could not delete the goals because your login session has expired. Please log in again and retry."
                : `I could not delete the goals. Server returned ${result.status}.`,
          };
        }

        refreshApp({ type: "goals-deleted-all" });

        return {
          handled: true,
          success: true,
          reply:
            language === "hi"
              ? "सभी goals सफलतापूर्वक delete कर दिए गए हैं।"
              : "All your goals have been successfully deleted.",
        };
      }

      /* ---------- Delete a specific goal ---------- */
      if (
        (lower.includes("delete") ||
          lower.includes("remove") ||
          lower.includes("hata") ||
          lower.includes("हटा")) &&
        lower.includes("goal")
      ) {
        /*
          Try to send the complete command to the backend chat first.
          This keeps matching logic in one place if your backend already
          supports natural-language goal deletion.
        */
        return {
          handled: false,
          requiresBackend: true,
        };
      }

      /* ---------- Delete all transactions ---------- */
      if (
        (lower.includes("delete all") ||
          lower.includes("remove all") ||
          lower.includes("clear all")) &&
        (lower.includes("transaction") ||
          lower.includes("transactions") ||
          lower.includes("expense"))
      ) {
        const result = await apiRequest(
          `/api/voice/transactions/all?user_id=${encodeURIComponent(uid)}`,
          { method: "DELETE" }
        );

        if (!result.ok) {
          return {
            handled: true,
            success: false,
            reply: `I could not delete the transactions. Server returned ${result.status}.`,
          };
        }

        refreshApp({ type: "transactions-deleted-all" });

        return {
          handled: true,
          success: true,
          reply:
            language === "hi"
              ? "सभी transactions delete कर दिए गए हैं।"
              : "All transaction records have been deleted.",
        };
      }

      /* ---------- Delete all budgets ---------- */
      if (
        (lower.includes("delete all") ||
          lower.includes("remove all") ||
          lower.includes("clear all")) &&
        (lower.includes("budget") || lower.includes("limit"))
      ) {
        const result = await apiRequest(
          `/api/voice/budgets/all?user_id=${encodeURIComponent(uid)}`,
          { method: "DELETE" }
        );

        if (!result.ok) {
          return {
            handled: true,
            success: false,
            reply: `I could not delete the budgets. Server returned ${result.status}.`,
          };
        }

        refreshApp({ type: "budgets-deleted-all" });

        return {
          handled: true,
          success: true,
          reply:
            language === "hi"
              ? "सभी budget limits delete कर दी गई हैं।"
              : "All budget limits have been deleted.",
        };
      }

      return { handled: false };
    },
    [apiRequest, language, refreshApp]
  );

  /* -------------------------------------------------------------- */
  /* Main send                                                       */
  /* -------------------------------------------------------------- */

  const sendMessage = useCallback(
    async (overrideText = null) => {
      const text = safeText(overrideText ?? message).trim();

      if (!text || thinking || sendLockRef.current) return;

      sendLockRef.current = true;
      setError("");
      setLiveTranscript("");
      setMessage("");
      setThinking(true);

      // IMPORTANT: call this before any await/fetch. Safari requires
      // speech activity to originate from the user's interaction.
      primeSafariSpeech();

      pushMessage("user", text);

      /*
        Speak basic local answers immediately. This means "hello"
        will always get a response even if Flask/Gemini is offline.
      */
      const localReply = localAssistant(text, language);
      const lower = text.toLowerCase();

      const isSimpleConversation =
        lower === "hello" ||
        lower === "hi" ||
        lower === "hey" ||
        lower.includes("who are you") ||
        lower.includes("what are you") ||
        lower.includes("what can you do") ||
        lower.includes("thank") ||
        lower.includes("good morning") ||
        lower.includes("good evening") ||
        lower.includes("good afternoon");

      try {
        const session = await checkSession();
        const uid = session.user_id;

        /* Execute direct destructive commands first. */
        if (uid) {
          const commandResult = await executeVoiceCommand(text, uid);

          if (commandResult.handled) {
            pushMessage("assistant", commandResult.reply);
            setTimeout(() => speakReply(commandResult.reply), 80);
            return;
          }
        }

        /*
          Normal greeting/basic conversation should not depend on the
          backend. This specifically fixes the "hello does nothing" case.
        */
        if (isSimpleConversation) {
          pushMessage("assistant", localReply);
          setTimeout(() => speakReply(localReply), 80);
          return;
        }

        /*
          Backend AI request.
          credentials: include is essential for Flask session cookies.
        */
        let backendWorked = false;

        try {
          const response = await fetch(`${API_BASE}/chat`, {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              user_id: uid || undefined,
              message: text,
            }),
          });

          let data = {};

          try {
            data = await response.json();
          } catch (_) {}

          if (response.ok) {
            const responseText = safeText(
              data.reply ||
                data.response ||
                data.answer ||
                data.message ||
                data.data?.reply
            ).trim();

            if (responseText) {
              backendWorked = true;

              pushMessage("assistant", responseText);
              setTimeout(() => speakReply(responseText), 80);
              refreshApp(data);
              return;
            }
          }

          /*
            401 is the exact error that was appearing in your Flask
            terminal. Do not leave the UI blank. Fall back to a useful
            local answer and clearly tell the user what happened.
          */
          if (response.status === 401) {
            setConnected(false);

            const fallback =
              language === "hi"
                ? `${localReply}\n\nनोट: AI server ने login session के कारण 401 दिया है। Basic Alexa अभी भी काम कर रही है।`
                : `${localReply}\n\nNote: The AI server returned 401 because the login session is not authenticated. Basic Alexa is still working.`;

            pushMessage("assistant", fallback);
            setTimeout(() => speakReply(fallback), 80);
            return;
          }

          if (!response.ok) {
            const fallback =
              language === "hi"
                ? `${localReply}\n\nServer error ${response.status}.`
                : `${localReply}\n\nServer error ${response.status}.`;

            pushMessage("assistant", fallback);
            setTimeout(() => speakReply(fallback), 80);
            return;
          }
        } catch (networkError) {
          /*
            If Flask is completely unavailable, the assistant still
            replies instead of appearing dead.
          */
          const fallback =
            language === "hi"
              ? `${localReply}\n\nAI server अभी उपलब्ध नहीं है, इसलिए मैंने offline assistant से जवाब दिया है।`
              : `${localReply}\n\nThe AI server is not available right now, so I answered using the offline assistant.`;

          pushMessage("assistant", fallback);
          speakReply(fallback);
          return;
        }

        if (!backendWorked) {
          pushMessage("assistant", localReply);
          setTimeout(() => speakReply(localReply), 80);
        }
      } catch (err) {
        const fallback =
          language === "hi"
            ? "माफ़ कीजिए, request process करते समय समस्या हुई। कृपया फिर से कोशिश करें।"
            : "Sorry, there was a problem processing your request. Please try again.";

        setError(err?.message || "Request failed.");
        pushMessage("assistant", fallback);
        setTimeout(() => speakReply(fallback), 80);
      } finally {
        setThinking(false);
        sendLockRef.current = false;
      }
    },
    [
      checkSession,
      executeVoiceCommand,
      language,
      message,
      pushMessage,
      refreshApp,
      speakReply,
      thinking,
    ]
  );

  /* -------------------------------------------------------------- */
  /* Speech recognition                                              */
  /* -------------------------------------------------------------- */

  const startVoice = useCallback(async () => {
    setError("");

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        "Voice input is not available in this browser. Use Chrome or Edge and allow microphone access."
      );
      return;
    }

    // If already listening, the microphone button becomes a real STOP button.
    if (listening) {
      try {
        recognitionRef.current?.stop();
      } catch (_) {}

      recognitionRef.current = null;
      setListening(false);
      setLiveTranscript("");
      return;
    }

    // Never start listening while Alexa is speaking.
    stopSpeaking();

    /*
     * Explicitly request microphone permission first.
     * This makes the permission state much more reliable on Chrome/Safari.
     * The audio stream is immediately released because SpeechRecognition
     * owns the actual recognition session.
     */
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (permissionError) {
      console.error("Microphone permission:", permissionError);

      const name = permissionError?.name || "";

      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setError(
          "Microphone permission is blocked. Click the lock icon in the browser address bar and allow Microphone for AmiVest."
        );
      } else if (name === "NotFoundError") {
        setError("No microphone was found. Connect or enable a microphone.");
      } else {
        setError(
          "AmiVest could not access the microphone. Check your browser microphone settings."
        );
      }

      setListening(false);
      return;
    }

    let recognition;

    try {
      recognition = new SpeechRecognition();
    } catch (error) {
      console.error("Recognition creation failed:", error);
      setError("Could not create the voice recognition session.");
      return;
    }

    const selectedLanguage =
      localStorage.getItem("amivest_alexa_language") ||
      localStorage.getItem("amivest_language") ||
      language ||
      "en";

    /*
     * Hindi mode -> hi-IN
     * English mode -> en-IN
     *
     * The assistant still detects Hindi text after recognition and can
     * respond in Hindi/English through the existing TTS engine.
     */
    recognition.lang =
      selectedLanguage === "hi" ||
      selectedLanguage === "hindi"
        ? "hi-IN"
        : "en-IN";

    /*
     * continuous=true gives the user a natural speaking window.
     * interimResults=true makes the typed words appear while speaking.
     */
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 5;

    let finalTranscript = "";
    let endedNormally = false;
    let resultReceived = false;

    recognition.onstart = () => {
      setOpen(true);
      setListening(true);
      setLiveTranscript("");
      setError("");
      finalTranscript = "";
      resultReceived = false;
    };

    recognition.onaudiostart = () => {
      setListening(true);
      setError("");
    };

    recognition.onsoundstart = () => {
      setListening(true);
    };

    recognition.onspeechstart = () => {
      setListening(true);
      setError("");
    };

    recognition.onresult = (event) => {
      let interimText = "";
      let finalText = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i += 1
      ) {
        const result = event.results[i];

        if (!result || !result[0]) continue;

        const transcript = safeText(
          result[0].transcript
        ).trim();

        if (!transcript) continue;

        resultReceived = true;

        if (result.isFinal) {
          finalText += `${transcript} `;
        } else {
          interimText += `${transcript} `;
        }
      }

      if (finalText.trim()) {
        finalTranscript =
          `${finalTranscript} ${finalText}`.replace(/\s+/g, " ").trim();
      }

      const visible =
        `${finalTranscript} ${interimText}`
          .replace(/\s+/g, " ")
          .trim();

      if (visible) {
        // IMPORTANT: show exactly what the microphone is hearing.
        setLiveTranscript(visible);
        setMessage(visible);
      }

      /*
       * Send ONLY final text.
       * Previously, a recognition event could be ended before the UI had
       * enough time to display the final transcript.
       */
      if (finalTranscript.trim()) {
        endedNormally = true;

        const command = finalTranscript.trim();

        setListening(false);

        // Give React one frame to display the recognized words.
        setTimeout(() => {
          setLiveTranscript("");

          if (command) {
            sendMessage(command);
          }
        }, 120);

        try {
          recognition.stop();
        } catch (_) {}
      }
    };

    recognition.onerror = (event) => {
      const code = event?.error || "unknown";

      console.warn("AmiVest voice recognition:", code);

      /*
       * These are normal browser lifecycle events and should NOT show
       * scary errors to the user.
       */
      if (
        code === "aborted" ||
        code === "service-not-allowed"
      ) {
        setListening(false);
        return;
      }

      if (code === "no-speech") {
        setListening(false);

        if (!resultReceived) {
          setError(
            "I did not hear you. Tap the microphone and speak clearly."
          );
        }

        return;
      }

      if (code === "not-allowed") {
        setListening(false);
        setError(
          "Microphone permission denied. Allow Microphone for this AmiVest site and try again."
        );
        return;
      }

      if (code === "audio-capture") {
        setListening(false);
        setError(
          "No working microphone was detected. Check your Mac microphone input."
        );
        return;
      }

      if (code === "network") {
        setListening(false);
        setError(
          "Voice recognition network service failed. Check your internet connection and try again."
        );
        return;
      }

      setListening(false);
      setError(`Voice recognition error: ${code}`);
    };

    recognition.onend = () => {
      setListening(false);

      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }

      /*
       * If the browser ends recognition after receiving a final command,
       * do nothing. sendMessage() has already been scheduled.
       */
      if (endedNormally || finalTranscript.trim()) {
        return;
      }

      setLiveTranscript("");

      // No result: don't silently leave the UI in a fake listening state.
      if (!resultReceived) {
        setError((current) =>
          current ||
          "Microphone stopped listening. Tap 🎤 and try again."
        );
      }
    };

    recognition.onnomatch = () => {
      setListening(false);
      setError("I couldn't understand that. Please speak again.");
    };

    recognitionRef.current = recognition;

    try {
      /*
       * speechRecognition.start() must happen as part of the user's
       * microphone-button action. Do not delay this call.
       */
      recognition.start();
    } catch (error) {
      console.error("Recognition start failed:", error);

      recognitionRef.current = null;
      setListening(false);

      if (error?.name === "InvalidStateError") {
        setError("Voice recognition is already running. Tap 🎤 again.");
      } else {
        setError(
          "Could not start the microphone. Allow microphone access and try again."
        );
      }
    }
  }, [language, listening, sendMessage, stopSpeaking]);

  /* -------------------------------------------------------------- */
  /* Optional wake word                                               */
  /* -------------------------------------------------------------- */

  useEffect(() => {
    if (!wakeWordActive) {
      try {
        wakeRecognitionRef.current?.stop();
      } catch (_) {}

      wakeRecognitionRef.current = null;
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition || listening || speaking || thinking) return;

    let alive = true;

    const recognition = new SpeechRecognition();

    recognition.lang = language === "hi" ? "hi-IN" : "en-IN";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      if (!alive) return;

      const last = event.results[event.results.length - 1];
      const transcript = safeText(last?.[0]?.transcript).toLowerCase().trim();

      const matched = WAKE_WORDS.some((word) =>
        transcript.includes(word)
      );

      if (!matched) return;

      try {
        recognition.stop();
      } catch (_) {}

      setOpen(true);

      const reply =
        language === "hi"
          ? "हाँ, कहिए। मैं सुन रही हूँ।"
          : "Yes, I am listening. How can I help?";

      pushMessage("assistant", reply);
      speakReply(reply);

      setTimeout(() => {
        if (alive) startVoice();
      }, 1100);
    };

    recognition.onerror = () => {
      /* Background wake listening is optional; do not show an error. */
    };

    recognition.onend = () => {
      if (!alive) return;

      if (wakeWordActive && !listening && !speaking && !thinking) {
        setTimeout(() => {
          if (!alive) return;

          try {
            recognition.start();
          } catch (_) {}
        }, 800);
      }
    };

    try {
      recognition.start();
      wakeRecognitionRef.current = recognition;
    } catch (_) {}

    return () => {
      alive = false;

      try {
        recognition.stop();
      } catch (_) {}

      if (wakeRecognitionRef.current === recognition) {
        wakeRecognitionRef.current = null;
      }
    };
  }, [
    language,
    listening,
    pushMessage,
    speakReply,
    speaking,
    startVoice,
    thinking,
    wakeWordActive,
  ]);

  const handleManualSpeak = useCallback(
    (text) => {
      setOpen(true);
      setError("");
      stopSpeaking();
      primeSafariSpeech();

      /*
        Important: this function is triggered directly by a button click,
        which satisfies Chrome's user-interaction requirement.
      */
      setTimeout(() => {
        speakReply(text);
      }, 30);
    },
    [speakReply, stopSpeaking]
  );

  const testVoice = useCallback(() => {
    primeSafariSpeech();

    const text =
      language === "hi"
        ? "नमस्ते। AmiVest Alexa की आवाज़ अभी काम कर रही है।"
        : "Hello. AmiVest Alexa voice is working correctly.";

    handleManualSpeak(text);
  }, [handleManualSpeak, language]);

  return (
    <>
      <style>{`
        @keyframes amivestAlexaPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 12px rgba(14,165,233,.25);
          }
          50% {
            transform: scale(1.04);
            box-shadow: 0 0 30px rgba(14,165,233,.65);
          }
        }

        @keyframes amivestListening {
          0%, 100% {
            box-shadow: 0 0 15px rgba(239,68,68,.25);
          }
          50% {
            box-shadow: 0 0 35px rgba(239,68,68,.75);
          }
        }

        @keyframes amivestSpeaking {
          0%, 100% {
            box-shadow: 0 0 18px rgba(34,211,238,.25);
          }
          50% {
            box-shadow: 0 0 42px rgba(34,211,238,.8);
          }
        }

        .amivest-alexa-scroll::-webkit-scrollbar {
          width: 4px;
        }

        .amivest-alexa-scroll::-webkit-scrollbar-thumb {
          background: #16466b;
          border-radius: 20px;
        }
      `}</style>

      {!open && (
        <div
          onClick={() => setOpen(true)}
          style={{
            ...positionStyle,
            position: "fixed",
            bottom: 20,
            zIndex: 99999,
            width: 220,
            minHeight: 68,
            padding: "10px 12px",
            borderRadius: 22,
            background: "linear-gradient(145deg,#061426,#0b2944)",
            border: "1px solid #0ea5e9",
            boxShadow: "0 18px 45px rgba(0,0,0,.55)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: "#fff",
            cursor: "pointer",
            animation: listening
              ? "amivestListening 1.2s infinite"
              : speaking
              ? "amivestSpeaking 1.2s infinite"
              : "amivestAlexaPulse 2s infinite",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              flexShrink: 0,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              background:
                "radial-gradient(circle,#e0f2fe 0 25%,#38bdf8 26% 55%,#075985 56% 100%)",
              fontSize: 22,
            }}
          >
            🤖
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 12 }}>
              AmiVest Alexa AI
            </div>

            <div
              style={{
                marginTop: 4,
                fontSize: 9,
                color: "#93c5fd",
              }}
            >
              {listening
                ? "🎤 Listening..."
                : speaking
                ? "🔊 Speaking..."
                : "Tap to talk"}
            </div>
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              startVoice();
            }}
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              border: "1px solid #0ea5e9",
              background: listening ? "#dc2626" : "#0b4164",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            {listening ? "■" : "🎤"}
          </button>
        </div>
      )}

      {open && (
        <div
          style={{
            ...positionStyle,
            position: "fixed",
            bottom: 18,
            zIndex: 99999,
            width: 410,
            maxWidth: "calc(100vw - 28px)",
            height: 590,
            maxHeight: "calc(100vh - 36px)",
            borderRadius: 22,
            background: "linear-gradient(180deg,#061426,#082945)",
            border: "1px solid #164e70",
            boxShadow: "0 25px 70px rgba(0,0,0,.75)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            color: "#fff",
          }}
        >
          {/* HEADER */}
          <div
            style={{
              padding: "12px 14px",
              borderBottom: "1px solid #16466b",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  background:
                    "radial-gradient(circle,#e0f2fe 0 24%,#38bdf8 25% 52%,#075985 53% 100%)",
                  animation: listening
                    ? "amivestListening 1.2s infinite"
                    : speaking
                    ? "amivestSpeaking 1.2s infinite"
                    : "none",
                }}
              >
                🤖
              </div>

              <div>
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: 13,
                  }}
                >
                  AmiVest Alexa AI
                </div>

                <div
                  style={{
                    fontSize: 9,
                    color: connected ? "#34d399" : "#fbbf24",
                    marginTop: 3,
                  }}
                >
                  ● {connected ? `Connected • ${userId}` : "Offline assistant ready"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 5 }}>
              <button
                type="button"
                onClick={testVoice}
                title="Test speaker"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  border: "1px solid #1e5c80",
                  background: "#0b3552",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                🔊
              </button>

              <button
                type="button"
                onClick={() => setWakeWordActive((v) => !v)}
                title="Wake word"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  border: "1px solid #1e5c80",
                  background: wakeWordActive ? "#0d9488" : "#0b3552",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                ⚡
              </button>

              {speaking && (
                <button
                  type="button"
                  onClick={stopSpeaking}
                  title="Stop speaking"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    border: "none",
                    background: "#dc2626",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  ■
                </button>
              )}

              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  border: "1px solid #1e5c80",
                  background: "#0b3552",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                −
              </button>
            </div>
          </div>

          {/* STATUS */}
          <div
            style={{
              padding: "8px 12px",
              background: "rgba(2,12,24,.45)",
              borderBottom: "1px solid #123d5b",
              minHeight: 45,
            }}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: 11,
                color: speaking
                  ? "#67e8f9"
                  : listening
                  ? "#fca5a5"
                  : "#bfdbfe",
              }}
            >
              {speaking
                ? "🔊 AmiVest is speaking..."
                : listening
                ? "🎤 AmiVest is listening..."
                : thinking
                ? "🧠 AmiVest is thinking..."
                : "🟢 AmiVest is ready"}
            </div>

            <div
              style={{
                fontSize: 9,
                color: "#7895ad",
                marginTop: 3,
              }}
            >
              Speak or type. You can ask, add, edit, delete or view data.
            </div>
          </div>

          {/* MESSAGES */}
          <div
            className="amivest-alexa-scroll"
            style={{
              flex: 1,
              padding: 12,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {messages.map((item) => (
              <div
                key={item.id}
                style={{
                  alignSelf:
                    item.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "90%",
                }}
              >
                <div
                  style={{
                    padding: "9px 11px",
                    borderRadius:
                      item.role === "user"
                        ? "14px 14px 3px 14px"
                        : "14px 14px 14px 3px",
                    background:
                      item.role === "user" ? "#0d9488" : "#0c3556",
                    border:
                      item.role === "user"
                        ? "1px solid #14b8a6"
                        : "1px solid #164e70",
                    fontSize: 11,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {item.text}

                  {item.role === "assistant" && (
                    <div
                      style={{
                        marginTop: 6,
                        display: "flex",
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleManualSpeak(item.text)}
                        style={{
                          background: "rgba(14,165,233,.10)",
                          border: "1px solid #0ea5e9",
                          color: "#7dd3fc",
                          padding: "3px 8px",
                          borderRadius: 7,
                          fontSize: 9,
                          cursor: "pointer",
                        }}
                      >
                        🔊 Listen
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {liveTranscript && (
              <div
                style={{
                  alignSelf: "flex-end",
                  maxWidth: "90%",
                  padding: "7px 10px",
                  borderRadius: 10,
                  border: "1px dashed #22d3ee",
                  color: "#67e8f9",
                  fontSize: 10,
                }}
              >
                🎤 {liveTranscript}
              </div>
            )}

            {thinking && (
              <div
                style={{
                  fontSize: 10,
                  color: "#93a9bb",
                  padding: "4px 2px",
                }}
              >
                🧠 Thinking...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ERROR */}
          {error && (
            <div
              style={{
                margin: "0 12px 7px",
                padding: "7px 9px",
                borderRadius: 7,
                background: "rgba(127,29,29,.45)",
                border: "1px solid #7f1d1d",
                color: "#fecaca",
                fontSize: 9,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* LANGUAGE */}
          <div
            style={{
              display: "flex",
              gap: 5,
              padding: "0 12px 7px",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setLanguage("en");
                localStorage.setItem("amivest_alexa_language", "en");
              }}
              style={{
                flex: 1,
                padding: 6,
                borderRadius: 7,
                border: "1px solid #164e70",
                background: language === "en" ? "#0d9488" : "#08243b",
                color: "#fff",
                fontSize: 10,
                cursor: "pointer",
              }}
            >
              🇮🇳 English
            </button>

            <button
              type="button"
              onClick={() => {
                setLanguage("hi");
                localStorage.setItem("amivest_alexa_language", "hi");
              }}
              style={{
                flex: 1,
                padding: 6,
                borderRadius: 7,
                border: "1px solid #164e70",
                background: language === "hi" ? "#0d9488" : "#08243b",
                color: "#fff",
                fontSize: 10,
                cursor: "pointer",
              }}
            >
              🇮🇳 हिन्दी
            </button>
          </div>

          {/* INPUT */}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
            style={{
              padding: "0 12px 8px",
              display: "flex",
              gap: 6,
            }}
          >
            <input
              ref={inputRef}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={
                language === "hi"
                  ? "पूछें या आदेश दें..."
                  : "Ask AmiVest Alexa..."
              }
              style={{
                flex: 1,
                minWidth: 0,
                padding: "9px 11px",
                background: "#041522",
                border: "1px solid #164e70",
                borderRadius: 9,
                color: "#fff",
                fontSize: 11,
                outline: "none",
              }}
            />

            <button
              type="button"
              onClick={startVoice}
              style={{
                width: 40,
                background: listening ? "#dc2626" : "#2563eb",
                border: "none",
                borderRadius: 9,
                color: "#fff",
                cursor: "pointer",
                fontSize: 15,
              }}
            >
              {listening ? "■" : "🎤"}
            </button>

            <button
              type="submit"
              disabled={thinking || !message.trim()}
              style={{
                padding: "0 12px",
                background:
                  thinking || !message.trim() ? "#24415b" : "#0d9488",
                border: "none",
                borderRadius: 9,
                color: "#fff",
                fontWeight: 800,
                fontSize: 11,
                cursor:
                  thinking || !message.trim() ? "not-allowed" : "pointer",
              }}
            >
              Send
            </button>
          </form>

          {/* QUICK ACTIONS */}
          <div
            style={{
              padding: "0 12px 12px",
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
            }}
          >
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => sendMessage(action.command)}
                style={{
                  padding: "5px 8px",
                  background: "#08243b",
                  border: "1px solid #164e70",
                  borderRadius: 14,
                  color: "#9db4c8",
                  fontSize: 9,
                  cursor: "pointer",
                }}
              >
                {action.icon} {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
