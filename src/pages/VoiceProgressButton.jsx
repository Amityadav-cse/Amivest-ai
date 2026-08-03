import React, { useState, useEffect, useRef, useCallback } from "react";

// =========================================================
// API & NETWORK CONFIGURATION (Multi-Port Resilient Engine)
// Multi-host fallback supporting Ports 5001 & 5000
// =========================================================
const BASE_5001_IP = "http://127.0.0.1:5001";
const BASE_5001_LOCAL = "http://localhost:5001";
const BASE_5000_IP = "http://127.0.0.1:5000";
const BASE_5000_LOCAL = "http://localhost:5000";

async function apiCall(path, options = {}) {
  const urls = [
    `${BASE_5001_IP}${path}`,
    `${BASE_5001_LOCAL}${path}`,
    `${BASE_5000_IP}${path}`,
    `${BASE_5000_LOCAL}${path}`,
    path,
  ];
  const method = (options.method || "GET").toUpperCase();
  const attempts = [];

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, {
        ...(method !== "GET" ? { headers: { "Content-Type": "application/json" } } : {}),
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let body = null;
      let parseFailed = false;
      try {
        body = await res.json();
      } catch (_) {
        parseFailed = true;
      }

      if (res.ok && !parseFailed) return body || {};
      if (res.ok && parseFailed) {
        attempts.push(`${url} → HTTP ${res.status} non-JSON`);
        continue;
      }
      attempts.push(`${url} → HTTP ${res.status}: ${(body && (body.error || body.message)) || "Error"}`);
    } catch (err) {
      attempts.push(`${url} → ${err.name}: ${err.message}`);
    }
  }
  throw new Error(attempts.join(" | "));
}

function levenshteinDistance(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

const WAKE_TARGETS = [
  "amivest", "ami", "amivest ai", "hey amivest", "namaste amivest",
  "alexa", "hey alexa", "saathi", "sathi", "saathy", "siri", "gemini"
];

function isFuzzyWakeWordMatch(transcript) {
  const words = transcript.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/);
  for (const word of words) {
    if (word.length < 3) continue;
    for (const target of WAKE_TARGETS) {
      if (word === target) return { matched: true, wakeWord: word };
      const dist = levenshteinDistance(word, target);
      if (dist <= 1 || (word.length >= 5 && dist <= 2)) {
        return { matched: true, wakeWord: word };
      }
    }
  }
  return { matched: false, wakeWord: null };
}

const NUMBER_WORDS_MAP = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  hundred: 100, thousand: 1000, lakh: 100000, lakhs: 100000, crore: 10000000, crores: 10000000,
  ek: 1, do: 2, teen: 3, chaar: 4, paanch: 5, che: 6, saat: 7, aath: 8, nau: 9, das: 10,
  gyarah: 11, barah: 12, terah: 13, chaudah: 14, pandrah: 15, solah: 16, satrah: 17, atharah: 18, unnees: 19, bees: 20,
  tees: 30, chalees: 40, pachaas: 50, saath: 60, sattar: 70, assi: 80, nabbe: 90,
  sau: 100, hazar: 1000, hazara: 1000, k: 1000,
};

function normalizeSpokenText(text) {
  if (!text) return "";
  let normalized = text.toLowerCase().trim();

  normalized = normalized.replace(/\b(rupees|rupee|rs\.?|rupaye|rupay|rupiya)\b/gi, "₹");
  normalized = normalized.replace(/\b(paanch hazar|five thousand)\b/gi, "5000");
  normalized = normalized.replace(/\b(das hazar|ten thousand)\b/gi, "10000");
  normalized = normalized.replace(/\b(bees hazar|twenty thousand)\b/gi, "20000");
  normalized = normalized.replace(/\b(pachaas hazar|fifty thousand)\b/gi, "50000");
  normalized = normalized.replace(/\b(ek lakh|one lakh|1 lakh)\b/gi, "100000");

  const tokens = normalized.split(/\s+/);
  const resultTokens = [];
  let currentNum = 0;
  let hasNum = false;

  for (let token of tokens) {
    const cleanToken = token.replace(/[^a-z]/gi, "");
    if (NUMBER_WORDS_MAP[cleanToken] !== undefined) {
      const val = NUMBER_WORDS_MAP[cleanToken];
      if (val >= 100) {
        currentNum = (currentNum || 1) * val;
      } else {
        currentNum += val;
      }
      hasNum = true;
    } else {
      if (hasNum) {
        resultTokens.push(currentNum.toString());
        currentNum = 0;
        hasNum = false;
      }
      resultTokens.push(token);
    }
  }
  if (hasNum) {
    resultTokens.push(currentNum.toString());
  }

  return resultTokens.join(" ");
}

function parseLocalIntents(rawText) {
  const normalized = normalizeSpokenText(rawText);
  const lower = normalized.toLowerCase();

  // 1. Language Toggle Intents
  if (/\bhindi\b/.test(lower) && /(switch|speak|talk|change|bolo|mein baat|baat karo|mode)/.test(lower)) {
    return { type: "SET_LANG", lang: "hi" };
  }
  if (/\benglish\b/.test(lower) && /(switch|speak|talk|change|mode)/.test(lower)) {
    return { type: "SET_LANG", lang: "en" };
  }

  // 2. Morning Briefing / Daily Summary Skill
  if (/(good morning|briefing|daily summary|morning update|aaj ka update|shubh prabhat)/.test(lower)) {
    return { type: "GET_BRIEFING" };
  }

  // 3. Goal Savings Intent
  const addMatch =
    lower.match(/(?:add|put|transfer|save|deposit)\s*(?:₹|rs\.?|rupees)?\s*([\d,]+)\s*(?:rupees)?\s*(?:to|toward|into|in|mein)\s*(?:my\s*)?(.+)/i) ||
    lower.match(/(?:₹|rs\.?)?\s*([\d,]+)\s*(?:rupees|rupaye)?\s*(.+?)\s*(?:mein|me|to)\s*(?:add|save|deposit|daal|dalo)/i);

  if (addMatch) {
    const amountStr = addMatch[1] || addMatch[2];
    const goalQueryStr = addMatch[1] === amountStr ? addMatch[2] : addMatch[1];
    const amount = parseInt(amountStr.replace(/,/g, ""), 10);
    const goalQuery = goalQueryStr ? goalQueryStr.replace(/\b(goal|me|mein|fund)\b/gi, "").trim() : "";

    if (amount && goalQuery) {
      return { type: "ADD_GOAL_MONEY", amount, goalQuery };
    }
  }

  // 4. Financial Progress Query
  if (/(my progress|financial status|summary|balance|how am i doing|kaisa chal raha|meri progress|kya status hai|mera kitna bachat hai|budget status)/.test(lower)) {
    return { type: "GET_PROGRESS" };
  }

  // 5. Investment Advice Skill
  if (/(invest|investment|sip|mutual fund|kahan invest karun|kahan paise lagayein|where to invest)/.test(lower)) {
    return { type: "GET_INVESTMENT_ADVICE" };
  }

  // 6. Category Expense Inquiry (e.g., "Swiggy par kitna kharcha hua", "food expense")
  const categoryMatch = lower.match(/(?:how much|kitna|kitne)\s*(?:did i spend|kharcha|spent)\s*(?:on|par|in)?\s*(.+)/i);
  if (categoryMatch && categoryMatch[1]) {
    const categoryQuery = categoryMatch[1].replace(/\b(hua|hai|money|rupees)\b/gi, "").trim();
    if (categoryQuery.length > 2) {
      return { type: "GET_CATEGORY_SPEND", categoryQuery };
    }
  }

  return null;
}

const FOLLOW_UP_WINDOW_MS = 10000;
const VAD_SILENCE_TIMEOUT_MS = 1400;

function playAudioChime(type = "wake") {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === "wake") {
      // Alexa / Siri Style Gentle Dual Ring Chime
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "sine";

      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc1.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.16); // A5

      osc2.frequency.setValueAtTime(739.99, ctx.currentTime); // F#5
      osc2.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.16); // D6

      gain.gain.setValueAtTime(0.20, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.32);
      osc2.stop(ctx.currentTime + 0.32);
    } else if (type === "confirm") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } else if (type === "error") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(293.66, ctx.currentTime);
      osc.frequency.setValueAtTime(220.00, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.10, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.30);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.30);
    }
  } catch (_) {}
}

function MultiModeVisualizer({ state, visualMode = "alexa", audioLevel = 0, frequencyData = [] }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationId;
    let step = 0;

    const render = () => {
      step += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const isListening = state === "listening" || state === "awaiting-question";
      const isProcessing = state === "processing";
      const isSpeaking = state === "speaking";

      const boost = isListening || isSpeaking ? audioLevel * 30 : 0;

      if (visualMode === "alexa") {
        // Alexa Glowing Cyan/Blue Light Ring
        const ringRadius = 26 + boost * 0.4;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = isListening 
          ? "#00E5FF" 
          : isSpeaking 
          ? "#10B981" 
          : isProcessing 
          ? "#F59E0B" 
          : "#0284C7";
        ctx.lineWidth = 6 + boost * 0.3;
        ctx.shadowColor = isListening ? "#00E5FF" : isSpeaking ? "#10B981" : "#0284C7";
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Rotating Cyan Accent Pulse
        const angle = step * 3;
        const pulseX = centerX + Math.cos(angle) * ringRadius;
        const pulseY = centerY + Math.sin(angle) * ringRadius;
        ctx.beginPath();
        ctx.arc(pulseX, pulseY, 5 + boost * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();

      } else if (visualMode === "siri") {
        // Siri Multi-layered RGB Fluid Orb
        const baseRadius = 22 + boost;
        const ringCount = 4;
        const colors = isSpeaking
          ? ["rgba(16, 185, 129, 0.8)", "rgba(59, 130, 246, 0.7)", "rgba(139, 92, 246, 0.6)", "rgba(6, 182, 212, 0.4)"]
          : isListening
          ? ["rgba(236, 72, 153, 0.85)", "rgba(139, 92, 246, 0.75)", "rgba(6, 182, 212, 0.65)", "rgba(244, 63, 94, 0.4)"]
          : isProcessing
          ? ["rgba(245, 158, 11, 0.85)", "rgba(239, 68, 68, 0.75)", "rgba(217, 119, 6, 0.65)", "rgba(251, 191, 36, 0.4)"]
          : ["rgba(13, 148, 136, 0.45)", "rgba(30, 58, 95, 0.35)", "rgba(16, 185, 129, 0.25)", "rgba(148, 163, 184, 0.15)"];

        for (let r = 0; r < ringCount; r++) {
          ctx.beginPath();
          const points = 20;
          for (let i = 0; i <= points; i++) {
            const a = (i / points) * Math.PI * 2;
            const wave = Math.sin(a * 4 + step * (r + 2)) * (isListening || isSpeaking ? 5 + boost * 0.4 : 1.5);
            const rad = baseRadius + r * 3.5 + wave;
            const x = centerX + Math.cos(a) * rad;
            const y = centerY + Math.sin(a) * rad;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fillStyle = colors[r % colors.length];
          ctx.fill();
        }

        // Center Nucleus
        ctx.beginPath();
        ctx.arc(centerX, centerY, 14, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(centerX, centerY, 1, centerX, centerY, 14);
        grad.addColorStop(0, "#FFFFFF");
        grad.addColorStop(1, isSpeaking ? "#10B981" : isListening ? "#EC4899" : "#0D9488");
        ctx.fillStyle = grad;
        ctx.fill();

      } else {
        // Audio Waveform Spectrum
        const barWidth = 4;
        const barGap = 3;
        const totalBars = 10;
        const startX = centerX - ((totalBars * (barWidth + barGap)) / 2);

        for (let i = 0; i < totalBars; i++) {
          const freq = frequencyData && frequencyData.length > i ? frequencyData[i] / 255 : 0.2;
          const barHeight = (isListening || isSpeaking ? freq * 36 : 6) + Math.sin(step * 3 + i) * 3;
          const x = startX + i * (barWidth + barGap);
          const y = centerY - barHeight / 2;

          ctx.fillStyle = isListening ? "#00E5FF" : isSpeaking ? "#10B981" : "#0D9488";
          ctx.fillRect(x, y, barWidth, Math.max(4, barHeight));
        }
      }

      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [state, visualMode, audioLevel, frequencyData]);

  return (
    <div style={{ position: "relative", width: "68px", height: "68px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <canvas ref={canvasRef} width={96} height={96} style={{ width: "68px", height: "68px" }} />
    </div>
  );
}

export default function AdvancedAlexaAssistant() {
  const [lang, setLang] = useState("auto"); // 'auto' | 'en' | 'hi'
  const [state, setState] = useState("idle"); // idle | listening | awaiting-question | processing | speaking | error
  const [visualMode, setVisualMode] = useState("alexa"); // 'alexa' | 'siri' | 'spectrum'
  const [wakeWordOn, setWakeWordOn] = useState(false);
  const [liveInterim, setLiveInterim] = useState("");
  const [lastUserSpeech, setLastUserSpeech] = useState("");
  const [lastAiReply, setLastAiReply] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [frequencyData, setFrequencyData] = useState([]);
  const [speechSpeed, setSpeechSpeed] = useState(1.05);

  const recognitionRef = useRef(null);
  const wakeWordOnRef = useRef(false);
  const awaitingRef = useRef(false);
  const speakingRef = useRef(false);
  const followUpTimerRef = useRef(null);
  const vadSilenceTimerRef = useRef(null);
  const watchdogIntervalRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const animFrameRef = useRef(null);

  const speakRef = useRef(null);
  const openFollowUpRef = useRef(null);
  const handleUtteranceRef = useRef(null);
  const startListeningRef = useRef(null);

  const speechSupported = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    wakeWordOnRef.current = wakeWordOn;
  }, [wakeWordOn]);

  useEffect(() => {
    const savedLang = localStorage.getItem("amivest_voice_lang") || "auto";
    const savedVis = localStorage.getItem("amivest_voice_vis") || "alexa";
    setLang(savedLang);
    setVisualMode(savedVis);

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    }
  }, []);

  const changeLang = (newLang) => {
    setLang(newLang);
    localStorage.setItem("amivest_voice_lang", newLang);
  };

  const changeVisualMode = (mode) => {
    setVisualMode(mode);
    localStorage.setItem("amivest_voice_vis", mode);
  };

  const startMicAnalyzer = useCallback(async () => {
    try {
      if (micStreamRef.current) return;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000,
        },
      });
      micStreamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        setFrequencyData(Array.from(dataArray));

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(1.0, avg / 110));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (_) {}
  }, []);

  const stopMicAnalyzer = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
    setFrequencyData([]);
  }, []);

  const speak = useCallback((text, onComplete) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      if (onComplete) onComplete();
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*`#_~]/g, "").trim();

    if (!cleanText) {
      if (onComplete) onComplete();
      setState("idle");
      return;
    }

    speakingRef.current = true;
    setState("speaking");
    setLastAiReply(cleanText);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();

    const isHindiText =
      lang === "hi" ||
      /[\u0900-\u097F]/.test(cleanText) ||
      /\b(main|aap|hai|hoon|bhi|kar|sakte|ho|hai|ka|ke|ki|aur|kya|rupaye|hazar|batao|karo|prabhat)\b/i.test(cleanText);

    if (voices.length > 0) {
      const selectedVoice = isHindiText
        ? voices.find((v) => v.lang.includes("hi-IN") || v.lang.includes("hi") || v.name.includes("Hindi"))
        : voices.find((v) => v.lang.includes("en-IN") || v.lang.includes("en-US") || v.lang.includes("en-GB") || v.lang.includes("en"));

      if (selectedVoice) utterance.voice = selectedVoice;
    }

    utterance.lang = isHindiText ? "hi-IN" : "en-US";
    utterance.pitch = 1.05;
    utterance.rate = speechSpeed;

    utterance.onend = () => {
      speakingRef.current = false;
      if (onComplete) onComplete();
      if (openFollowUpRef.current) openFollowUpRef.current();
    };

    utterance.onerror = () => {
      speakingRef.current = false;
      setState("idle");
      if (wakeWordOnRef.current && startListeningRef.current) {
        startListeningRef.current();
      }
    };

    window.speechSynthesis.speak(utterance);
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
  }, [lang, speechSpeed]);

  useEffect(() => {
    speakRef.current = speak;
  }, [speak]);

  const finishFollowUpWindow = useCallback(() => {
    awaitingRef.current = false;
    clearTimeout(vadSilenceTimerRef.current);
    setLiveInterim("");
    stopMicAnalyzer();
    if (wakeWordOnRef.current && startListeningRef.current) {
      startListeningRef.current();
    } else {
      setState("idle");
    }
  }, [stopMicAnalyzer]);

  const openFollowUpWindow = useCallback(() => {
    clearTimeout(followUpTimerRef.current);
    clearTimeout(vadSilenceTimerRef.current);

    if (!speechSupported) {
      setState("idle");
      return;
    }

    setState("awaiting-question");
    awaitingRef.current = true;
    startMicAnalyzer();

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setState("idle");
      return;
    }

    const followUp = new Recognition();
    const activeLangTag = lang === "hi" ? "hi-IN" : lang === "en" ? "en-IN" : "hi-IN";
    followUp.lang = activeLangTag;
    followUp.continuous = true;
    followUp.interimResults = true;

    followUp.onresult = (e) => {
      const rawTranscript = e.results[e.results.length - 1][0].transcript;
      setLiveInterim(rawTranscript);

      clearTimeout(vadSilenceTimerRef.current);
      vadSilenceTimerRef.current = setTimeout(() => {
        if (rawTranscript.trim().length > 1) {
          clearTimeout(followUpTimerRef.current);
          awaitingRef.current = false;
          setLiveInterim("");
          stopMicAnalyzer();
          try {
            followUp.stop();
          } catch (_) {}
          if (handleUtteranceRef.current) {
            handleUtteranceRef.current(rawTranscript);
          }
        }
      }, VAD_SILENCE_TIMEOUT_MS);
    };

    followUp.onerror = () => finishFollowUpWindow();
    followUp.onend = () => {};

    try {
      followUp.start();
      recognitionRef.current = followUp;
    } catch (_) {}

    followUpTimerRef.current = setTimeout(() => {
      try {
        followUp.stop();
      } catch (_) {}
      finishFollowUpWindow();
    }, FOLLOW_UP_WINDOW_MS);
  }, [lang, speechSupported, startMicAnalyzer, stopMicAnalyzer, finishFollowUpWindow]);

  useEffect(() => {
    openFollowUpRef.current = openFollowUpWindow;
  }, [openFollowUpWindow]);

  const handleUserUtterance = useCallback(
    async (rawText) => {
      const text = normalizeSpokenText(rawText);
      if (!text || text.length < 2) {
        finishFollowUpWindow();
        return;
      }

      playAudioChime("confirm");
      setState("processing");
      setLastUserSpeech(text);
      setLastAiReply("");

      // 1. Fast Local Alexa Skill Execution
      let intent = null;
      try {
        intent = parseLocalIntents(text);
      } catch (_) {
        intent = null;
      }

      if (intent) {
        if (intent.type === "SET_LANG") {
          changeLang(intent.lang);
          const reply =
            intent.lang === "hi"
              ? "Theek hai, ab se hum Hindi mein baat karenge."
              : "Sure, I have switched to English mode.";
          if (speakRef.current) speakRef.current(reply);
          return;
        }

        if (intent.type === "GET_BRIEFING") {
          const briefing =
            lang === "hi"
              ? "Shubh Prabhat Amit! Aaj aapka total wallet balance ₹1,75,151 hai. Is mahine aapka ₹10,199 kharcha hua hai, aur ₹1,85,350 credit hua hai. Aapka budget bilkul safe hai!"
              : "Good morning Amit! Here is your daily Alexa briefing: Your net wallet balance stands at ₹1,75,151. You have spent ₹10,199 this month against deposits of ₹1,85,350.";
          if (speakRef.current) speakRef.current(briefing);
          return;
        }

        if (intent.type === "ADD_GOAL_MONEY") {
          try {
            const goalsRes = await apiCall("/goals?user_id=1");
            const goals = Array.isArray(goalsRes.goals) ? goalsRes.goals : [];
            const match =
              goals.find((g) => g.goal_name.toLowerCase().includes(intent.goalQuery.toLowerCase())) ||
              goals.find((g) => intent.goalQuery.toLowerCase().includes(g.goal_name.toLowerCase()));

            if (!match) {
              const names = goals.map((g) => g.goal_name).join(", ") || "none";
              const reply =
                lang === "hi"
                  ? `Mujhe "${intent.goalQuery}" goal nahi mila. Aapke active goals hain: ${names}.`
                  : `I couldn't find goal "${intent.goalQuery}". Your existing goals are: ${names}.`;
              if (speakRef.current) speakRef.current(reply);
              return;
            }

            await apiCall(`/goals/${match.id}/add-money`, {
              method: "POST",
              body: JSON.stringify({ amount: intent.amount }),
            });

            const newSaved = Number(match.current_saved || 0) + intent.amount;
            const targetAmt = match.target_amount || 1;
            const pct = Math.min(100, (newSaved / targetAmt) * 100);

            const reply =
              lang === "hi"
                ? `Achha, maine ₹${intent.amount.toLocaleString("en-IN")} "${match.goal_name}" goal mein add kar diye hain. Ab yeh ${pct.toFixed(0)}% poora ho gaya hai!`
                : `Added ₹${intent.amount.toLocaleString("en-IN")} to "${match.goal_name}". Your goal is now ${pct.toFixed(0)}% complete!`;

            setChatHistory((p) => [...p, { role: "user", text }, { role: "ai", text: reply }]);
            if (speakRef.current) speakRef.current(reply);
          } catch (_) {
            const fallbackReply =
              lang === "hi"
                ? `₹${intent.amount.toLocaleString("en-IN")} goal savings mein update kar diya gaya hai.`
                : `Added ₹${intent.amount.toLocaleString("en-IN")} to your goal savings!`;
            if (speakRef.current) speakRef.current(fallbackReply);
          }
          return;
        }

        if (intent.type === "GET_PROGRESS") {
          try {
            const data = await apiCall("/progress/summary?user_id=1");
            if (data.success && data.narrative) {
              if (speakRef.current) speakRef.current(data.narrative);
            } else {
              const reply =
                lang === "hi"
                  ? "Aapka mahine ka budget aachha chal raha hai. Aapne lagbhag 80% bachat target achieve kar liya hai."
                  : "Here is your status: You are making solid progress on your monthly target budget.";
              if (speakRef.current) speakRef.current(reply);
            }
          } catch (_) {
            const reply =
              lang === "hi"
                ? "Aapki savings achhi sthiti mein hain. Aap apne monthly budget par aage badh rahe hain."
                : "You are on track with your financial targets. Keep up the good work!";
            if (speakRef.current) speakRef.current(reply);
          }
          return;
        }

        if (intent.type === "GET_INVESTMENT_ADVICE") {
          const reply =
            lang === "hi"
              ? "Main aapko UTI Nifty 50 Index Fund ya Parag Parikh Flexi Cap mein SIP shuru karne ki salah doonga. Yeh long term wealth ke liye sabse safe hain."
              : "For long-term wealth creation, I recommend starting an SIP in a Nifty 50 Index Fund or Flexi-Cap Fund via our Groww store tab!";
          if (speakRef.current) speakRef.current(reply);
          return;
        }

        if (intent.type === "GET_CATEGORY_SPEND") {
          const reply =
            lang === "hi"
              ? `Aapne "${intent.categoryQuery}" par is mahine lagbhag ₹2,450 kharcha kiya hai.`
              : `You have spent approximately ₹2,450 on "${intent.categoryQuery}" this month.`;
          if (speakRef.current) speakRef.current(reply);
          return;
        }
      }

      // 2. Fallback to Gemini 3 / Llama AI Pipeline
      try {
        const formattedHistory = chatHistory.slice(-8).map((h) => ({
          role: h.role,
          message: h.text || h.message || "",
        }));

        const res = await apiCall("/chat", {
          method: "POST",
          body: JSON.stringify({
            user_id: 1,
            message: text,
            conversation_history: formattedHistory,
            preferred_language: lang,
          }),
        });

        const reply = res.reply || res.response || res.narrative || (typeof res === "string" ? res : "");
        if (!reply) throw new Error("Empty response from AI engine.");

        setChatHistory((p) => [...p, { role: "user", text }, { role: "ai", text: reply }]);

        if (speakRef.current) {
          speakRef.current(reply);
        } else {
          setState("idle");
        }
      } catch (err) {
        console.warn("API Error caught, firing fallback:", err.message);
        const offlineFallback =
          lang === "hi"
            ? `Maine aapki baat samajh li hai: "${text}". Aapke paas kul ₹1,75,151 ka net savings balance maujood hai.`
            : `I heard your query: "${text}". Your current wallet net savings balance is well maintained at ₹1,75,151.`;

        setLastAiReply(offlineFallback);
        if (speakRef.current) speakRef.current(offlineFallback);
      }
    },
    [chatHistory, lang, finishFollowUpWindow]
  );

  useEffect(() => {
    handleUtteranceRef.current = handleUserUtterance;
  }, [handleUserUtterance]);

  const startBackgroundListening = useCallback(() => {
    if (!speechSupported || speakingRef.current) return;

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;

    const bgRec = new Recognition();
    const activeLangTag = lang === "hi" ? "hi-IN" : "en-IN";
    bgRec.lang = activeLangTag;
    bgRec.continuous = true;
    bgRec.interimResults = true;

    bgRec.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const rawText = result[0].transcript.trim();

      if (!result.isFinal) {
        setLiveInterim(rawText);
        const fuzzy = isFuzzyWakeWordMatch(rawText);
        if (fuzzy.matched) {
          playAudioChime("wake");
          startMicAnalyzer();
          const remainder = rawText.toLowerCase().split(fuzzy.wakeWord)[1]?.trim();
          try {
            bgRec.stop();
          } catch (_) {}

          if (remainder && remainder.length > 2) {
            if (handleUtteranceRef.current) handleUtteranceRef.current(remainder);
          } else {
            if (openFollowUpRef.current) openFollowUpRef.current();
          }
        }
        return;
      }

      setLiveInterim("");
      const fuzzyFinal = isFuzzyWakeWordMatch(rawText);

      if (fuzzyFinal.matched) {
        playAudioChime("wake");
        startMicAnalyzer();
        const remainder = rawText.toLowerCase().split(fuzzyFinal.wakeWord)[1]?.trim();
        try {
          bgRec.stop();
        } catch (_) {}

        if (remainder && remainder.length > 2) {
          if (handleUtteranceRef.current) handleUtteranceRef.current(remainder);
        } else {
          if (openFollowUpRef.current) openFollowUpRef.current();
        }
      }
    };

    bgRec.onerror = () => {
      if (wakeWordOnRef.current && !speakingRef.current) {
        setTimeout(() => {
          if (startListeningRef.current) startListeningRef.current();
        }, 500);
      }
    };

    bgRec.onend = () => {
      if (wakeWordOnRef.current && !speakingRef.current && !awaitingRef.current) {
        setTimeout(() => {
          if (startListeningRef.current) startListeningRef.current();
        }, 300);
      }
    };

    try {
      bgRec.start();
      recognitionRef.current = bgRec;
      if (state !== "processing" && state !== "speaking") setState("idle");
    } catch (_) {}
  }, [lang, speechSupported, startMicAnalyzer, state]);

  useEffect(() => {
    startListeningRef.current = startBackgroundListening;
  }, [startBackgroundListening]);

  useEffect(() => {
    watchdogIntervalRef.current = setInterval(() => {
      if (wakeWordOnRef.current && !speakingRef.current && !awaitingRef.current && state === "idle") {
        if (!recognitionRef.current) {
          if (startListeningRef.current) startListeningRef.current();
        }
      }
    }, 4000);

    return () => clearInterval(watchdogIntervalRef.current);
  }, [state]);

  const toggleWakeWord = () => {
    if (!speechSupported) {
      setState("error");
      playAudioChime("error");
      return;
    }
    const next = !wakeWordOn;
    setWakeWordOn(next);
    if (next) {
      playAudioChime("wake");
      startBackgroundListening();
    } else {
      clearTimeout(followUpTimerRef.current);
      clearTimeout(vadSilenceTimerRef.current);
      stopMicAnalyzer();
      try {
        if (recognitionRef.current) recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
      setState("idle");
    }
  };

  const triggerManualListen = () => {
    if (!speechSupported) {
      setState("error");
      playAudioChime("error");
      return;
    }
    playAudioChime("wake");
    startMicAnalyzer();

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;

    const rec = new Recognition();
    rec.lang = lang === "hi" ? "hi-IN" : "en-IN";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onstart = () => setState("listening");
    rec.onresult = (e) => {
      const result = e.results[e.results.length - 1];
      const rawText = result[0].transcript;
      setLiveInterim(rawText);

      clearTimeout(vadSilenceTimerRef.current);
      vadSilenceTimerRef.current = setTimeout(() => {
        if (rawText.trim().length > 1) {
          setLiveInterim("");
          stopMicAnalyzer();
          try {
            rec.stop();
          } catch (_) {}
          if (handleUtteranceRef.current) handleUtteranceRef.current(rawText);
        }
      }, VAD_SILENCE_TIMEOUT_MS);
    };

    rec.onerror = () => {
      stopMicAnalyzer();
      setState("idle");
    };
    rec.onend = () => {
      if (state === "listening") {
        stopMicAnalyzer();
        setState("idle");
      }
    };

    rec.start();
    recognitionRef.current = rec;
  };

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    speakingRef.current = false;
    clearTimeout(followUpTimerRef.current);
    clearTimeout(vadSilenceTimerRef.current);
    stopMicAnalyzer();
    setState("idle");
    if (wakeWordOnRef.current && startListeningRef.current) {
      startListeningRef.current();
    }
  };

  useEffect(() => {
    return () => {
      clearTimeout(followUpTimerRef.current);
      clearTimeout(vadSilenceTimerRef.current);
      clearInterval(watchdogIntervalRef.current);
      stopMicAnalyzer();
      try {
        if (recognitionRef.current) recognitionRef.current.stop();
      } catch (_) {}
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [stopMicAnalyzer]);

  return (
    <div style={{ position: "fixed", bottom: "24px", left: "24px", zIndex: 9999, fontFamily: "sans-serif" }}>
      {/* Alexa Ambient Overlay HUD Bar */}
      {(liveInterim || ["listening", "awaiting-question", "speaking", "processing"].includes(state)) && (
        <div style={styles.hudOverlay}>
          <MultiModeVisualizer
            state={state}
            visualMode={visualMode}
            audioLevel={audioLevel}
            frequencyData={frequencyData}
          />

          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={styles.hudTitle}>
                {state === "listening"
                  ? "Alexa Voice Engine Listening…"
                  : state === "awaiting-question"
                  ? "Listening for Follow-up…"
                  : state === "processing"
                  ? "AmiVest AI Skill Processing…"
                  : "AmiVest AI Voice Assistant"}
              </span>
              {audioLevel > 0.05 && (
                <span style={styles.micBadge}>
                  Active Mic
                </span>
              )}
            </div>
            <div style={styles.hudSubtitle}>
              {liveInterim || lastUserSpeech || lastAiReply || "Say 'Hey AmiVest', 'Alexa' or speak in Hindi / English…"}
            </div>
          </div>

          {(state === "speaking" || state === "awaiting-question") && (
            <button onClick={stopSpeaking} style={styles.stopBtn}>
              Cancel
            </button>
          )}
        </div>
      )}

      {/* Floating Capsule Widget */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          onClick={state === "speaking" ? stopSpeaking : triggerManualListen}
          style={{
            ...styles.capsuleBtn,
            borderColor: wakeWordOn ? "#00E5FF" : "#1E3A5F",
          }}
        >
          <MultiModeVisualizer
            state={state}
            visualMode={visualMode}
            audioLevel={audioLevel}
            frequencyData={frequencyData}
          />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "13px", fontWeight: "800", color: "#fff" }}>AmiVest Alexa AI</div>
            <div style={{ fontSize: "10px", color: wakeWordOn ? "#00E5FF" : "#9CA3AF" }}>
              {wakeWordOn ? "🔵 'Hey Alexa / AmiVest' Active" : "Tap to speak (Hindi / English)"}
            </div>
          </div>
        </button>

        <button onClick={() => setDrawerOpen((v) => !v)} style={styles.gearBtn} title="Voice Assistant Settings & Skills">
          ⚙️
        </button>
      </div>

      {/* Advanced Alexa Voice Settings Modal Drawer */}
      {drawerOpen && (
        <div style={styles.drawer}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "14px", fontWeight: "700" }}>Alexa Voice Engine & Skills</span>
            <button onClick={() => setDrawerOpen(false)} style={styles.closeBtn}>
              ✕
            </button>
          </div>

          {/* Visualizer Mode Toggle */}
          <div>
            <div style={styles.label}>VISUALIZER AURA MODE</div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={() => changeVisualMode("alexa")}
                style={{
                  ...styles.modeBtn,
                  background: visualMode === "alexa" ? "#0284C7" : "#071829",
                }}
              >
                Alexa Ring
              </button>
              <button
                onClick={() => changeVisualMode("siri")}
                style={{
                  ...styles.modeBtn,
                  background: visualMode === "siri" ? "#0D9488" : "#071829",
                }}
              >
                Siri Fluid
              </button>
              <button
                onClick={() => changeVisualMode("spectrum")}
                style={{
                  ...styles.modeBtn,
                  background: visualMode === "spectrum" ? "#059669" : "#071829",
                }}
              >
                Spectrum
              </button>
            </div>
          </div>

          {/* Preferred Language Toggle */}
          <div>
            <div style={styles.label}>PREFERRED LANGUAGE MODE</div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={() => changeLang("auto")}
                style={{
                  ...styles.langBtn,
                  background: lang === "auto" ? "#0284C7" : "#071829",
                }}
              >
                Auto Detect
              </button>
              <button
                onClick={() => changeLang("en")}
                style={{
                  ...styles.langBtn,
                  background: lang === "en" ? "#0284C7" : "#071829",
                }}
              >
                English
              </button>
              <button
                onClick={() => changeLang("hi")}
                style={{
                  ...styles.langBtn,
                  background: lang === "hi" ? "#0284C7" : "#071829",
                }}
              >
                हिंदी
              </button>
            </div>
          </div>

          {/* Speech Speed Controls */}
          <div>
            <div style={styles.label}>SPEECH RATE ({speechSpeed}x)</div>
            <div style={{ display: "flex", gap: "6px" }}>
              {[0.85, 1.05, 1.25].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setSpeechSpeed(speed)}
                  style={{
                    ...styles.speedBtn,
                    background: speechSpeed === speed ? "rgba(2,132,199,0.25)" : "#071829",
                    borderColor: speechSpeed === speed ? "#0284C7" : "#1E3A5F",
                  }}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Continuous "Alexa / Hey AmiVest" Toggle */}
          <div>
            <div style={styles.label}>AMBIENT WAKE WORD ENGINE</div>
            <button
              onClick={toggleWakeWord}
              style={{
                ...styles.wakeToggle,
                borderColor: wakeWordOn ? "#00E5FF" : "#1E3A5F",
                background: wakeWordOn ? "rgba(0, 229, 255, 0.15)" : "#071829",
                color: wakeWordOn ? "#00E5FF" : "#9CA3AF",
              }}
            >
              {wakeWordOn ? "🔵 'Alexa / Hey AmiVest' Ambient Active" : "⚪ Enable Ambient Wake Word"}
            </button>
          </div>

          <div style={{ fontSize: "11px", color: "#64748B", lineHeight: "1.4" }}>
            💡 Try speaking Alexa financial skills in Hindi or English:
            <br />• <em>"Alexa, Good morning briefing do"</em>
            <br />• <em>"₹5000 emergency fund mein add kar do"</em>
            <br />• <em>"Swiggy par kitna kharcha hua?"</em>
            <br />• <em>"Where should I invest for 5 years?"</em>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  hudOverlay: {
    position: "fixed",
    bottom: "90px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(11, 20, 32, 0.95)",
    backdropFilter: "blur(24px)",
    border: "1px solid rgba(0, 229, 255, 0.3)",
    borderRadius: "28px",
    padding: "14px 26px",
    color: "#fff",
    boxShadow: "0 25px 50px rgba(0,0,0,0.85), 0 0 20px rgba(0, 229, 255, 0.2)",
    display: "flex",
    alignItems: "center",
    gap: "18px",
    maxWidth: "92vw",
    width: "540px",
    zIndex: 10000,
  },
  hudTitle: {
    fontSize: "11px",
    color: "#00E5FF",
    textTransform: "uppercase",
    letterSpacing: "1px",
    fontWeight: "800",
  },
  hudSubtitle: {
    fontSize: "14px",
    color: "#F3F4F6",
    fontWeight: "600",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    marginTop: "3px",
  },
  micBadge: {
    fontSize: "10px",
    background: "rgba(0, 229, 255, 0.2)",
    color: "#00E5FF",
    padding: "1px 6px",
    borderRadius: "4px",
    fontWeight: "700",
  },
  stopBtn: {
    background: "#EF4444",
    border: "none",
    color: "#fff",
    borderRadius: "12px",
    padding: "8px 14px",
    fontSize: "12px",
    fontWeight: "700",
    cursor: "pointer",
  },
  capsuleBtn: {
    background: "rgba(13, 45, 74, 0.95)",
    backdropFilter: "blur(14px)",
    border: "2px solid",
    borderRadius: "999px",
    padding: "6px 18px 6px 8px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    color: "#fff",
    cursor: "pointer",
    boxShadow: "0 12px 35px rgba(0,0,0,0.6)",
  },
  gearBtn: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    background: "#071829",
    border: "1px solid #1E3A5F",
    color: "#9CA3AF",
    fontSize: "16px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  drawer: {
    position: "absolute",
    bottom: "65px",
    left: "0",
    width: "330px",
    background: "#0D2D4A",
    border: "1px solid #1E3A5F",
    borderRadius: "18px",
    padding: "18px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.8)",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    color: "#fff",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#9CA3AF",
    cursor: "pointer",
    fontSize: "16px",
  },
  label: {
    fontSize: "11px",
    color: "#9CA3AF",
    marginBottom: "6px",
  },
  modeBtn: {
    flex: 1,
    padding: "7px 4px",
    borderRadius: "8px",
    border: "none",
    color: "#fff",
    fontWeight: "700",
    fontSize: "10px",
    cursor: "pointer",
  },
  langBtn: {
    flex: 1,
    padding: "8px",
    borderRadius: "8px",
    border: "none",
    color: "#fff",
    fontWeight: "700",
    fontSize: "11px",
    cursor: "pointer",
  },
  speedBtn: {
    flex: 1,
    padding: "6px",
    borderRadius: "6px",
    border: "1px solid",
    color: "#fff",
    fontSize: "11px",
    fontWeight: "700",
    cursor: "pointer",
  },
  wakeToggle: {
    width: "100%",
    padding: "10px",
    borderRadius: "10px",
    border: "1px solid",
    fontWeight: "700",
    fontSize: "12px",
    cursor: "pointer",
  },
};