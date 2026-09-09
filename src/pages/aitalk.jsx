import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

/* ============================================================
   BACKEND CONFIGURATION
   ============================================================ */

const BACKEND_URL = (
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:5000"
).replace(/\/+$/, "");


/* ============================================================
   API HELPER
   ============================================================ */

async function apiRequest(path, options = {}) {
  const url = `${BACKEND_URL}${path}`;

  const response = await fetch(url, {
    method: options.method || "GET",
    credentials: "include",
    mode: "cors",
    cache: "no-store",

    headers: {
      ...(options.body
        ? {
            "Content-Type": "application/json",
          }
        : {}),
      ...(options.headers || {}),
    },

    body: options.body,
  });

  const text = await response.text();

  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {
      message: text,
    };
  }

  if (!response.ok) {
    const errorMessage =
      data?.error ||
      data?.message ||
      data?.detail ||
      `Server error: ${response.status}`;

    const error = new Error(errorMessage);

    error.status = response.status;
    error.data = data;

    throw error;
  }

  return data;
}


/* ============================================================
   AMIVEST ALEXA AI
   ============================================================ */

function AITalk() {

  /* ----------------------------------------------------------
     MESSAGES
     ---------------------------------------------------------- */

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text:
        "Namaste! 👋 I am AmiVest Alexa AI.\n\n" +
        "Ask me about your spending, goals, budgets or transactions.\n\n" +
        'You can also say: "Add 500 in food".',
    },
  ]);


  /* ----------------------------------------------------------
     INPUT
     ---------------------------------------------------------- */

  const [input, setInput] = useState("");


  /* ----------------------------------------------------------
     STATES
     ---------------------------------------------------------- */

  const [loading, setLoading] = useState(false);

  const [listening, setListening] = useState(false);

  const [speaking, setSpeaking] = useState(false);

  const [error, setError] = useState("");

  const [language, setLanguageState] = useState(
    localStorage.getItem("amivest_language") || "english"
  );

  const [backendStatus, setBackendStatus] = useState("ready");


  /* ----------------------------------------------------------
     REFS
     ---------------------------------------------------------- */

  const recognitionRef = useRef(null);

  const endRef = useRef(null);

  const inputRef = useRef(null);

  /* ----------------------------------------------------------
     ADVANCED CAMERA / VISION
     ---------------------------------------------------------- */
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const visionFileInputRef = useRef(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraImage, setCameraImage] = useState("");
  const [cameraQuestion, setCameraQuestion] = useState("");
  const [visionLoading, setVisionLoading] = useState(false);
  const [visionError, setVisionError] = useState("");
  const [cameraFacingMode, setCameraFacingMode] = useState("environment");
  const [autoVisionSpeak, setAutoVisionSpeak] = useState(true);


  /* ==========================================================
     AUTO SCROLL
     ========================================================== */

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);


  /* ==========================================================
     TEXT TO SPEECH
     ========================================================== */

  const speak = useCallback((text) => {

    if (!text) return;

    if (!("speechSynthesis" in window)) {
      setError(
        "Voice output is not supported by this browser."
      );
      return;
    }

    try {
      window.speechSynthesis.cancel();
    } catch {}

    const utterance =
      new SpeechSynthesisUtterance(text);

    const selectedLanguage =
      localStorage.getItem("amivest_language") ||
      language ||
      "english";

    if (selectedLanguage === "hindi") {
      utterance.lang = "hi-IN";
    } else {
      utterance.lang = "en-IN";
    }

    const savedRate = Number(
      localStorage.getItem("amivest_speech_rate")
    );

    utterance.rate =
      savedRate > 0 ? savedRate : 1.05;

    utterance.pitch = 1;

    utterance.volume = 1;


    utterance.onstart = () => {
      setSpeaking(true);
    };


    utterance.onend = () => {
      setSpeaking(false);
    };


    utterance.onerror = () => {
      setSpeaking(false);
    };


    setSpeaking(true);

    window.speechSynthesis.speak(
      utterance
    );

  }, [language]);


  /* ==========================================================
     STOP SPEAKING
     ========================================================== */

  const stopSpeaking = useCallback(() => {

    try {
      window.speechSynthesis?.cancel();
    } catch {}

    setSpeaking(false);

  }, []);


  /* ==========================================================
     SEND MESSAGE
     ========================================================== */

  const sendMessage = useCallback(
    async (value = input) => {

      const text = String(value || "").trim();

      if (!text) {
        return;
      }

      if (loading) {
        return;
      }


      /* --------------------------------------------
         STOP CURRENT SPEECH
         -------------------------------------------- */

      stopSpeaking();


      /* --------------------------------------------
         RESET ERROR
         -------------------------------------------- */

      setError("");

      setBackendStatus("thinking");


      /* --------------------------------------------
         CLEAR INPUT
         -------------------------------------------- */

      setInput("");


      /* --------------------------------------------
         ADD USER MESSAGE
         -------------------------------------------- */

      setMessages((previous) => [
        ...previous,
        {
          role: "user",
          text,
        },
      ]);


      setLoading(true);


      try {

        /* ------------------------------------------
           BACKEND REQUEST
           ------------------------------------------ */

        const data = await apiRequest(
          "/chat",
          {
            method: "POST",

            body: JSON.stringify({
              message: text,
              prompt: text,
              text: text,
            }),
          }
        );


        /* ------------------------------------------
           GET AI RESPONSE
           ------------------------------------------ */

        const reply =
          data?.reply ||
          data?.response ||
          data?.message ||
          data?.answer;


        if (!reply) {
          throw new Error(
            "AmiVest AI returned an empty response."
          );
        }


        /* ------------------------------------------
           ADD AI MESSAGE
           ------------------------------------------ */

        setMessages((previous) => [
          ...previous,
          {
            role: "assistant",
            text: reply,
          },
        ]);


        setBackendStatus("ready");


        /* ------------------------------------------
           AUTO SPEAK
           ------------------------------------------ */

        const autoSpeak =
          localStorage.getItem(
            "amivest_auto_speak"
          );


        if (autoSpeak !== "false") {
          speak(reply);
        }

      } catch (err) {

        console.error(
          "AmiVest Alexa error:",
          err
        );


        setBackendStatus("error");


        /* ------------------------------------------
           AUTH ERROR
           ------------------------------------------ */

        if (err.status === 401) {

          const authMessage =
            "Authentication required. Please login again.";

          setError(authMessage);


          setMessages((previous) => [
            ...previous,
            {
              role: "assistant",
              text:
                "❌ Authentication required.\n\n" +
                "Please login again and then return to AmiVest Alexa AI.",
            },
          ]);

          return;
        }


        /* ------------------------------------------
           NETWORK ERROR
           ------------------------------------------ */

        if (
          err.message?.includes(
            "Failed to fetch"
          )
        ) {

          const networkMessage =
            `Cannot connect to AmiVest backend.\n\n` +
            `Backend: ${BACKEND_URL}\n\n` +
            `Make sure Flask is running on port 5000.`;

          setError(networkMessage);


          setMessages((previous) => [
            ...previous,
            {
              role: "assistant",
              text:
                "❌ Cannot connect to AmiVest backend.\n\n" +
                "Please make sure your Flask server is running.",
            },
          ]);

          return;
        }


        /* ------------------------------------------
           OTHER ERROR
           ------------------------------------------ */

        const message =
          err.message ||
          "Unable to connect to AmiVest AI.";


        setError(message);


        setMessages((previous) => [
          ...previous,
          {
            role: "assistant",
            text:
              `❌ ${message}`,
          },
        ]);

      } finally {

        setLoading(false);

      }

    },
    [
      input,
      loading,
      speak,
      stopSpeaking,
    ]
  );


  /* ==========================================================
     VOICE RECOGNITION
     ========================================================== */

  const startListening = useCallback(() => {

    const Recognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;


    if (!Recognition) {

      setError(
        "Voice input is not supported in this browser. Use Google Chrome."
      );

      return;
    }


    /* --------------------------------------------
       STOP PREVIOUS RECOGNITION
       -------------------------------------------- */

    if (recognitionRef.current) {

      try {
        recognitionRef.current.stop();
      } catch {}

      recognitionRef.current = null;
    }


    stopSpeaking();


    const recognition =
      new Recognition();


    const selectedLanguage =
      localStorage.getItem(
        "amivest_language"
      ) ||
      language ||
      "english";


    recognition.lang =
      selectedLanguage === "hindi"
        ? "hi-IN"
        : "en-IN";


    recognition.continuous = false;

    recognition.interimResults = true;

    recognition.maxAlternatives = 1;


    /* --------------------------------------------
       START
       -------------------------------------------- */

    recognition.onstart = () => {

      setListening(true);

      setError("");

    };


    /* --------------------------------------------
       RESULT
       -------------------------------------------- */

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        const result = event.results[index];
        const transcript =
          result?.[0]?.transcript?.trim() || "";

        if (!transcript) continue;

        if (result.isFinal) {
          finalTranscript += `${transcript} `;
        } else {
          interimTranscript += `${transcript} `;
        }
      }

      const liveText =
        `${finalTranscript} ${interimTranscript}`
          .replace(/\\s+/g, " ")
          .trim();

      // Show exactly what the browser is currently hearing.
      if (liveText) {
        setInput(liveText);
      }

      if (finalTranscript.trim()) {
        const finalText = finalTranscript.trim();

        setListening(false);
        recognitionRef.current = null;

        // Small delay gives the UI time to render the final transcript.
        setTimeout(() => {
          sendMessage(finalText);
        }, 80);
      }
    };


    /* --------------------------------------------
       ERROR
       -------------------------------------------- */

    recognition.onerror = (event) => {

      setListening(false);

      recognitionRef.current = null;


      switch (event.error) {

        case "not-allowed":

          setError(
            "Microphone permission denied. Allow microphone access in Chrome."
          );

          break;


        case "no-speech":

          setError(
            "I did not hear anything. Please speak again."
          );

          break;


        case "audio-capture":

          setError(
            "No microphone was detected."
          );

          break;


        case "network":

          setError(
            "Voice recognition network error."
          );

          break;


        default:

          setError(
            `Voice error: ${event.error}`
          );

      }

    };


    /* --------------------------------------------
       END
       -------------------------------------------- */

    recognition.onend = () => {

      setListening(false);

      recognitionRef.current = null;

    };


    recognitionRef.current =
      recognition;


    /* --------------------------------------------
       START MICROPHONE
       -------------------------------------------- */

    try {

      recognition.start();

    } catch (err) {

      console.error(err);

      setListening(false);

      recognitionRef.current = null;

      setError(
        "Could not start microphone. Please try again."
      );

    }

  }, [
    language,
    sendMessage,
    stopSpeaking,
  ]);



  /* ==========================================================
     ADVANCED CAMERA + VISION
     ========================================================== */

  const stopCamera = useCallback(() => {
    try {
      cameraStreamRef.current?.getTracks?.().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
    } catch {}

    cameraStreamRef.current = null;
    setCameraReady(false);
    setCameraOpen(false);
  }, []);

  const openCamera = useCallback(async () => {
    setVisionError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setVisionError(
        "Camera is not available. Use Chrome/Safari on HTTPS or localhost."
      );
      return;
    }

    try {
      recognitionRef.current?.stop();
    } catch {}

    setListening(false);
    stopSpeaking();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      cameraStreamRef.current = stream;
      setCameraOpen(true);

      requestAnimationFrame(() => {
        const video = videoRef.current;

        if (!video) return;

        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;

        const promise = video.play();

        promise?.catch?.((err) => {
          console.warn("Camera video play:", err);
        });

        setCameraReady(true);
      });
    } catch (err) {
      console.error("Camera error:", err);

      if (err?.name === "NotAllowedError") {
        setVisionError(
          "Camera permission denied. Allow camera access in browser settings."
        );
      } else if (err?.name === "NotFoundError") {
        setVisionError("No camera was found on this device.");
      } else if (err?.name === "NotReadableError") {
        setVisionError(
          "Camera is already being used by another application."
        );
      } else {
        setVisionError(
          "Could not open the camera. Use HTTPS/localhost and allow camera access."
        );
      }

      setCameraOpen(false);
      setCameraReady(false);
    }
  }, [cameraFacingMode, stopSpeaking]);

  const switchCamera = useCallback(async () => {
    const nextMode =
      cameraFacingMode === "environment"
        ? "user"
        : "environment";

    setCameraFacingMode(nextMode);

    try {
      cameraStreamRef.current?.getTracks?.().forEach((track) => {
        track.stop();
      });
    } catch {}

    cameraStreamRef.current = null;
    setCameraReady(false);

    // Give React a moment to update the selected mode.
    setTimeout(() => {
      // openCamera reads the current state after this update.
      setCameraOpen(false);
    }, 0);
  }, [cameraFacingMode]);

  useEffect(() => {
    if (!cameraOpen) return;

    // Re-open automatically after switching between front/back camera.
    const timer = setTimeout(() => {
      if (!cameraStreamRef.current) {
        openCamera();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [cameraFacingMode, cameraOpen, openCamera]);

  const captureCamera = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState < 2) {
      setVisionError("Camera is not ready yet.");
      return;
    }

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    if (!width || !height) {
      setVisionError("Could not read the camera frame.");
      return;
    }

    const maxWidth = 1280;
    const scale = Math.min(1, maxWidth / width);

    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      setVisionError("Could not prepare image capture.");
      return;
    }

    ctx.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const image = canvas.toDataURL("image/jpeg", 0.84);

    if (!image || image === "data:,") {
      setVisionError("Image capture failed.");
      return;
    }

    setCameraImage(image);
    setCameraQuestion("");
    setVisionError("");
    stopCamera();
  }, [stopCamera]);

  const handleVisionUpload = useCallback((event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setVisionError("Please choose an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setVisionError("Image is too large. Please choose an image under 10 MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setCameraImage(String(reader.result || ""));
      setCameraQuestion("");
      setVisionError("");
    };

    reader.onerror = () => {
      setVisionError("Could not read the selected image.");
    };

    reader.readAsDataURL(file);

    event.target.value = "";
  }, []);

  const clearCameraImage = useCallback(() => {
    setCameraImage("");
    setCameraQuestion("");
    setVisionError("");
  }, []);

  const analyzeImage = useCallback(
    async (questionOverride = null) => {
      const image = cameraImage;

      if (!image) {
        setVisionError("Capture or upload an image first.");
        return;
      }

      const question =
        String(
          questionOverride ?? cameraQuestion
        ).trim();

      if (!question) {
        setVisionError(
          language === "hindi"
            ? "कृपया image के बारे में अपना सवाल पूछें।"
            : "Ask a question about the image first."
        );
        return;
      }

      setVisionLoading(true);
      setVisionError("");
      setError("");
      stopSpeaking();

      setMessages((previous) => [
        ...previous,
        {
          role: "user",
          text: `📷 ${question}`,
        },
      ]);

      try {
        /*
         * Backend contract:
         * POST /vision/analyze
         *
         * {
         *   image: "data:image/jpeg;base64,...",
         *   question: "...",
         *   language: "english" | "hindi"
         * }
         *
         * Expected response can use:
         * reply / response / answer / message
         */
        const data = await apiRequest(
          "/vision/analyze",
          {
            method: "POST",
            body: JSON.stringify({
              image,
              question,
              language,
            }),
          }
        );

        const reply =
          data?.reply ||
          data?.response ||
          data?.answer ||
          data?.message;

        if (!reply) {
          throw new Error(
            "Vision AI returned an empty response."
          );
        }

        setMessages((previous) => [
          ...previous,
          {
            role: "assistant",
            text: reply,
          },
        ]);

        setCameraQuestion("");
        setBackendStatus("ready");

        if (autoVisionSpeak) {
          speak(reply);
        }
      } catch (err) {
        console.error("AmiVest Vision error:", err);
        setBackendStatus("error");

        let message =
          err?.message ||
          "I could not analyze this image.";

        if (err?.status === 404) {
          message =
            "Camera is working, but Flask does not have /vision/analyze yet.";
        }

        if (err?.status === 401) {
          message =
            "Authentication required. Please login again.";
        }

        setVisionError(message);

        setMessages((previous) => [
          ...previous,
          {
            role: "assistant",
            text: `❌ ${message}`,
          },
        ]);
      } finally {
        setVisionLoading(false);
      }
    },
    [
      autoVisionSpeak,
      cameraImage,
      cameraQuestion,
      language,
      speak,
      stopSpeaking,
    ]
  );

  const askAboutImageByVoice = useCallback(() => {
    if (!cameraImage) {
      setVisionError("Capture or upload an image first.");
      return;
    }

    const Recognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!Recognition) {
      setVisionError(
        "Voice recognition is not supported here. Use Chrome."
      );
      return;
    }

    try {
      recognitionRef.current?.stop();
    } catch {}

    stopSpeaking();
    setVisionError("");

    const recognition = new Recognition();

    recognition.lang =
      language === "hindi"
        ? "hi-IN"
        : "en-IN";

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        const result = event.results[index];
        const text =
          result?.[0]?.transcript?.trim() || "";

        if (!text) continue;

        if (result.isFinal) {
          finalText += `${text} `;
        } else {
          interimText += `${text} `;
        }
      }

      const visible =
        `${finalText} ${interimText}`
          .replace(/\\s+/g, " ")
          .trim();

      if (visible) {
        setCameraQuestion(visible);
      }

      if (finalText.trim()) {
        const question = finalText.trim();

        setTimeout(() => {
          analyzeImage(question);
        }, 100);
      }
    };

    recognition.onerror = (event) => {
      setListening(false);
      recognitionRef.current = null;

      if (event.error === "not-allowed") {
        setVisionError(
          "Microphone permission denied."
        );
      } else if (event.error === "no-speech") {
        setVisionError(
          "I did not hear your question."
        );
      } else {
        setVisionError(
          `Voice error: ${event.error}`
        );
      }
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      console.error(err);
      setListening(false);
      recognitionRef.current = null;
      setVisionError(
        "Could not start voice question mode."
      );
    }
  }, [
    analyzeImage,
    cameraImage,
    language,
    stopSpeaking,
  ]);

  /* ==========================================================
     STOP LISTENING
     ========================================================== */

  const stopListening = useCallback(() => {

    try {

      recognitionRef.current?.stop();

    } catch {}

    recognitionRef.current = null;

    setListening(false);

  }, []);


  /* ==========================================================
     LANGUAGE
     ========================================================== */

  const setLanguage = useCallback(
    (newLanguage) => {

      localStorage.setItem(
        "amivest_language",
        newLanguage
      );

      setLanguageState(
        newLanguage
      );

      setError("");

    },
    []
  );


  /* ==========================================================
     QUICK QUESTIONS
     ========================================================== */

  const quickQuestion = (question) => {

    setInput(question);

    sendMessage(question);

  };


  /* ==========================================================
     CLEANUP
     ========================================================== */

  useEffect(() => {

    return () => {

      try {
        recognitionRef.current?.stop();
      } catch {}

      try {
        window.speechSynthesis?.cancel();
      } catch {}

      try {
        cameraStreamRef.current?.getTracks?.().forEach((track) => {
          track.stop();
        });
      } catch {}

      cameraStreamRef.current = null;

    };

  }, []);


  /* ==========================================================
     FOCUS INPUT
     ========================================================== */

  useEffect(() => {

    inputRef.current?.focus();

  }, []);


  /* ==========================================================
     UI
     ========================================================== */

  return (

    <div
      style={{
        minHeight: "calc(100vh - 80px)",
        padding: "30px",
        color: "#fff",
      }}
    >

      {/* ======================================================
          HEADER
          ====================================================== */}

      <div
        style={{
          marginBottom: "25px",
        }}
      >

        <div
          style={{
            color: "#14B8A6",
            fontSize: "12px",
            fontWeight: 800,
            letterSpacing: "2px",
          }}
        >
          AMIVEST AI
        </div>


        <h1
          style={{
            margin: "8px 0 5px",
            fontSize: "34px",
            fontWeight: 800,
          }}
        >
          AmiVest Alexa AI 🎙️📷
        </h1>


        <p
          style={{
            color: "#94A3B8",
            margin: 0,
          }}
        >
          Talk naturally, show images, ask questions,
          and get spoken AI answers.
        </p>

      </div>


      {/* ======================================================
          MAIN CARD
          ====================================================== */}

      <div
        style={{
          maxWidth: "1000px",
          margin: "auto",
          background: "#0F2943",
          border: "1px solid #193E60",
          borderRadius: "20px",
          padding: "25px",
          boxShadow:
            "0 20px 60px rgba(0,0,0,.30)",
        }}
      >

        {/* ====================================================
            STATUS
            ==================================================== */}

        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            color:
              listening
                ? "#60A5FA"
                : speaking
                ? "#A78BFA"
                : loading
                ? "#F59E0B"
                : "#94A3B8",
            fontWeight: 700,
            marginBottom: "15px",
          }}
        >

          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background:
                listening
                  ? "#3B82F6"
                  : speaking
                  ? "#8B5CF6"
                  : loading
                  ? "#F59E0B"
                  : backendStatus === "error"
                  ? "#EF4444"
                  : "#10B981",
              boxShadow:
                listening ||
                speaking
                  ? "0 0 12px currentColor"
                  : "none",
            }}
          />


          {listening
            ? "🎤 Listening..."
            : speaking
            ? "🔊 Speaking..."
            : loading
            ? "🤖 Thinking..."
            : backendStatus === "error"
            ? "🔴 Connection problem"
            : "AmiVest is ready"}

        </div>


        {/* ====================================================
            CAMERA / VISION
            ==================================================== */}

        <div
          style={{
            marginBottom: "15px",
            background: "#0B1C2D",
            border: "1px solid #193E60",
            borderRadius: "14px",
            padding: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "10px",
              marginBottom: "10px",
            }}
          >
            <div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: "14px",
                }}
              >
                📷 AmiVest Vision
              </div>

              <div
                style={{
                  color: "#64748B",
                  fontSize: "11px",
                  marginTop: "3px",
                }}
              >
                Show me something, ask about it, and I can answer.
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "6px",
              }}
            >
              <button
                type="button"
                onClick={openCamera}
                style={{
                  border: 0,
                  borderRadius: "8px",
                  padding: "8px 10px",
                  background: "#2563EB",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 800,
                }}
              >
                📷 Camera
              </button>

              <button
                type="button"
                onClick={() =>
                  visionFileInputRef.current?.click()
                }
                style={{
                  border: "1px solid #315474",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  background: "#10283E",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                🖼️ Upload
              </button>

              <input
                ref={visionFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleVisionUpload}
                style={{ display: "none" }}
              />
            </div>
          </div>

          {cameraOpen && (
            <div
              style={{
                background: "#020B14",
                borderRadius: "12px",
                padding: "8px",
                border: "1px solid #315474",
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{
                  width: "100%",
                  maxHeight: "320px",
                  objectFit: "cover",
                  display: "block",
                  borderRadius: "9px",
                  background: "#000",
                }}
              />

              <canvas
                ref={canvasRef}
                style={{ display: "none" }}
              />

              <div
                style={{
                  display: "flex",
                  gap: "7px",
                  marginTop: "8px",
                }}
              >
                <button
                  type="button"
                  disabled={!cameraReady}
                  onClick={captureCamera}
                  style={{
                    flex: 1,
                    border: 0,
                    borderRadius: "8px",
                    padding: "10px",
                    background:
                      cameraReady
                        ? "#0D9488"
                        : "#334155",
                    color: "#fff",
                    cursor:
                      cameraReady
                        ? "pointer"
                        : "not-allowed",
                    fontWeight: 800,
                  }}
                >
                  📸 Capture
                </button>

                <button
                  type="button"
                  onClick={switchCamera}
                  style={{
                    border: "1px solid #315474",
                    borderRadius: "8px",
                    padding: "10px 13px",
                    background: "#10283E",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                  title="Switch camera"
                >
                  🔄
                </button>

                <button
                  type="button"
                  onClick={stopCamera}
                  style={{
                    border: "1px solid #7F1D1D",
                    borderRadius: "8px",
                    padding: "10px 13px",
                    background: "#3B1111",
                    color: "#FCA5A5",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {cameraImage && (
            <div
              style={{
                marginTop: "10px",
                background: "#020B14",
                borderRadius: "12px",
                padding: "8px",
                border: "1px solid #315474",
              }}
            >
              <img
                src={cameraImage}
                alt="Captured image for AmiVest Vision"
                style={{
                  width: "100%",
                  maxHeight: "280px",
                  objectFit: "contain",
                  display: "block",
                  borderRadius: "9px",
                  background: "#000",
                }}
              />

              <div
                style={{
                  display: "flex",
                  gap: "7px",
                  marginTop: "8px",
                }}
              >
                <input
                  value={cameraQuestion}
                  onChange={(event) =>
                    setCameraQuestion(
                      event.target.value
                    )
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey
                    ) {
                      event.preventDefault();
                      analyzeImage();
                    }
                  }}
                  placeholder={
                    language === "hindi"
                      ? "इस तस्वीर के बारे में पूछें..."
                      : "Ask about this image..."
                  }
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: "11px 12px",
                    borderRadius: "8px",
                    border: "1px solid #315474",
                    background: "#0B1C2D",
                    color: "#fff",
                    outline: "none",
                  }}
                />

                <button
                  type="button"
                  onClick={askAboutImageByVoice}
                  disabled={visionLoading}
                  title="Ask about image by voice"
                  style={{
                    width: "50px",
                    border: 0,
                    borderRadius: "8px",
                    background:
                      listening
                        ? "#EF4444"
                        : "#2563EB",
                    color: "#fff",
                    cursor: visionLoading
                      ? "not-allowed"
                      : "pointer",
                    fontSize: "19px",
                  }}
                >
                  {listening ? "⏹" : "🎤"}
                </button>

                <button
                  type="button"
                  onClick={() => analyzeImage()}
                  disabled={
                    visionLoading ||
                    !cameraQuestion.trim()
                  }
                  style={{
                    border: 0,
                    borderRadius: "8px",
                    padding: "0 15px",
                    background:
                      visionLoading ||
                      !cameraQuestion.trim()
                        ? "#334155"
                        : "#0D9488",
                    color: "#fff",
                    cursor:
                      visionLoading ||
                      !cameraQuestion.trim()
                        ? "not-allowed"
                        : "pointer",
                    fontWeight: 800,
                  }}
                >
                  {visionLoading
                    ? "..."
                    : "Ask AI"}
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "8px",
                }}
              >
                <button
                  type="button"
                  onClick={clearCameraImage}
                  style={{
                    border: 0,
                    background: "transparent",
                    color: "#FCA5A5",
                    cursor: "pointer",
                    fontSize: "11px",
                  }}
                >
                  🗑️ Remove image
                </button>

                <label
                  style={{
                    display: "flex",
                    gap: "6px",
                    alignItems: "center",
                    color: "#94A3B8",
                    fontSize: "11px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={autoVisionSpeak}
                    onChange={(event) =>
                      setAutoVisionSpeak(
                        event.target.checked
                      )
                    }
                  />
                  🔊 Speak answer
                </label>
              </div>
            </div>
          )}

          {visionError && (
            <div
              style={{
                marginTop: "8px",
                background:
                  "rgba(239,68,68,.12)",
                border:
                  "1px solid rgba(239,68,68,.30)",
                color: "#FCA5A5",
                padding: "9px",
                borderRadius: "8px",
                fontSize: "12px",
                whiteSpace: "pre-wrap",
              }}
            >
              ⚠️ {visionError}
            </div>
          )}

          {!cameraImage && !cameraOpen && (
            <div
              style={{
                padding: "8px 2px 2px",
                color: "#64748B",
                fontSize: "11px",
              }}
            >
              Examples: "What is this?", "Read this text",
              "What does this receipt say?", "Explain this chart",
              or ask in Hindi.
            </div>
          )}
        </div>

        {/* ====================================================
            CHAT AREA
            ==================================================== */}

        <div
          style={{
            height: "430px",
            overflowY: "auto",
            padding: "10px",
            scrollBehavior: "smooth",
          }}
        >

          {messages.map(
            (message, index) => (

              <div
                key={`${index}-${message.role}`}
                style={{
                  display: "flex",
                  justifyContent:
                    message.role === "user"
                      ? "flex-end"
                      : "flex-start",
                  marginBottom: "15px",
                }}
              >

                <div
                  style={{
                    maxWidth: "78%",
                    padding:
                      "15px 18px",
                    borderRadius: "15px",

                    background:
                      message.role ===
                      "user"
                        ? "#0D9488"
                        : "#203F63",

                    lineHeight: 1.6,

                    whiteSpace:
                      "pre-wrap",

                    boxShadow:
                      "0 5px 20px rgba(0,0,0,.12)",
                  }}
                >

                  {message.text}


                  {/* =========================================
                      LISTEN BUTTON
                      ========================================= */}

                  {message.role ===
                    "assistant" && (

                    <button
                      type="button"
                      onClick={() =>
                        speak(
                          message.text
                        )
                      }
                      style={{
                        display: "block",
                        marginTop: "10px",
                        background:
                          "#38577C",
                        border: 0,
                        color: "#fff",
                        padding:
                          "7px 12px",
                        borderRadius: "7px",
                        cursor: "pointer",
                      }}
                    >
                      🔊 Listen
                    </button>

                  )}

                </div>

              </div>

            )
          )}


          {/* ==================================================
              THINKING
              ================================================== */}

          {loading && (

            <div
              style={{
                color: "#94A3B8",
                padding: "15px",
              }}
            >
              🤖 AmiVest Alexa is thinking...
            </div>

          )}


          <div ref={endRef} />

        </div>


        {/* ====================================================
            ERROR
            ==================================================== */}

        {error && (

          <div
            style={{
              background:
                "rgba(239,68,68,.12)",
              border:
                "1px solid rgba(239,68,68,.30)",
              color: "#FCA5A5",
              padding: "12px",
              borderRadius: "8px",
              margin: "10px 0",
              whiteSpace: "pre-wrap",
            }}
          >
            ⚠️ {error}
          </div>

        )}


        {/* ====================================================
            LANGUAGE
            ==================================================== */}

        <div
          style={{
            display: "flex",
            gap: "8px",
            margin:
              "15px 0 10px",
          }}
        >

          <button
            type="button"
            onClick={() =>
              setLanguage("english")
            }
            style={{
              flex: 1,
              padding: "11px",
              borderRadius: "8px",
              border:
                language === "english"
                  ? "1px solid #14B8A6"
                  : "1px solid #315474",
              background:
                language === "english"
                  ? "#0D9488"
                  : "#0B1C2D",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            🇮🇳 English
          </button>


          <button
            type="button"
            onClick={() =>
              setLanguage("hindi")
            }
            style={{
              flex: 1,
              padding: "11px",
              borderRadius: "8px",
              border:
                language === "hindi"
                  ? "1px solid #14B8A6"
                  : "1px solid #315474",
              background:
                language === "hindi"
                  ? "#0D9488"
                  : "#0B1C2D",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            🇮🇳 हिंदी
          </button>

        </div>


        {/* ====================================================
            INPUT AREA
            ==================================================== */}

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "10px",
          }}
        >

          <input
            ref={inputRef}
            value={input}

            onChange={(event) =>
              setInput(
                event.target.value
              )
            }

            onKeyDown={(event) => {

              if (
                event.key === "Enter" &&
                !event.shiftKey
              ) {

                event.preventDefault();

                sendMessage();

              }

            }}

            placeholder="Ask AmiVest Alexa..."

            disabled={loading}

            style={{
              flex: 1,
              padding:
                "14px 16px",
              borderRadius: "10px",
              border:
                "1px solid #315474",
              background: "#0B1C2D",
              color: "#fff",
              outline: "none",
              fontSize: "15px",
            }}
          />


          {/* ==================================================
              MICROPHONE
              ================================================== */}

          <button
            type="button"

            onClick={
              listening
                ? stopListening
                : startListening
            }

            disabled={loading}

            title={
              listening
                ? "Stop listening"
                : "Speak"
            }

            style={{
              width: "58px",
              border: 0,
              borderRadius: "10px",
              background:
                listening
                  ? "#EF4444"
                  : "#2563EB",
              color: "#fff",
              fontSize: "20px",
              cursor:
                loading
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {listening
              ? "⏹"
              : "🎤"}
          </button>


          {/* ==================================================
              SEND
              ================================================== */}

          <button
            type="button"

            onClick={() =>
              sendMessage()
            }

            disabled={
              loading ||
              !input.trim()
            }

            style={{
              padding:
                "0 25px",
              border: 0,
              borderRadius: "10px",
              background:
                loading ||
                !input.trim()
                  ? "#334155"
                  : "#0D9488",
              color: "#fff",
              fontWeight: 800,
              cursor:
                loading ||
                !input.trim()
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {loading
              ? "..."
              : "Send ➤"}
          </button>

        </div>


        {/* ====================================================
            STOP SPEAKING
            ==================================================== */}

        {speaking && (

          <button
            type="button"
            onClick={
              stopSpeaking
            }

            style={{
              marginTop: "12px",
              background:
                "#7C3AED",
              color: "#fff",
              border: 0,
              padding:
                "10px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            🔇 Stop Speaking
          </button>

        )}


        {/* ====================================================
            QUICK QUESTIONS
            ==================================================== */}

        <div
          style={{
            marginTop: "22px",
            color: "#64748B",
            fontSize: "12px",
            lineHeight: 1.7,
          }}
        >

          <b>Try asking:</b>


          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              marginTop: "10px",
            }}
          >

            <button
              type="button"
              onClick={() =>
                quickQuestion(
                  "How much did I spend on food?"
                )
              }
              style={quickButtonStyle}
            >
              💰 Food spending
            </button>


            <button
              type="button"
              onClick={() =>
                quickQuestion(
                  "What is my monthly budget?"
                )
              }
              style={quickButtonStyle}
            >
              📊 Monthly budget
            </button>


            <button
              type="button"
              onClick={() =>
                quickQuestion(
                  "How much money did I save?"
                )
              }
              style={quickButtonStyle}
            >
              💰 Savings
            </button>


            <button
              type="button"
              onClick={() =>
                quickQuestion(
                  "Show me my financial goals"
                )
              }
              style={quickButtonStyle}
            >
              🎯 Goals
            </button>

            <button
              type="button"
              onClick={openCamera}
              style={quickButtonStyle}
            >
              📷 Ask with camera
            </button>

          </div>


          <div
            style={{
              marginTop: "12px",
            }}
          >
            • Add 500 in food
            <br />
            • Food mein 500 add karo
            <br />
            • What is my monthly budget?
          </div>

        </div>

      </div>

    </div>
  );
}


/* ============================================================
   QUICK BUTTON STYLE
   ============================================================ */

const quickButtonStyle = {
  background: "#0B1C2D",
  border: "1px solid #315474",
  color: "#CBD5E1",
  padding: "8px 12px",
  borderRadius: "20px",
  cursor: "pointer",
  fontSize: "12px",
};


/* ============================================================
   EXPORT
   ============================================================ */

export default AITalk;