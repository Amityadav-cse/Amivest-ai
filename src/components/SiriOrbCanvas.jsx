import React, { useEffect, useRef } from "react";

export default function SiriOrbCanvas({ state, audioLevel = 0, frequencyData = [] }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    let step = 0;

    const render = () => {
      step += 0.055;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      const isListening = state === "listening";
      const isSpeaking = state === "speaking";
      const isProcessing = state === "processing";

      const boost = isListening || isSpeaking ? audioLevel * 25 : 0;
      const baseRadius = 22 + boost;
      const ringCount = 3;

      const colors = isListening
        ? ["rgba(239, 68, 68, 0.85)", "rgba(236, 72, 153, 0.6)", "rgba(139, 92, 246, 0.4)"]
        : isSpeaking
        ? ["rgba(16, 185, 129, 0.85)", "rgba(6, 182, 212, 0.6)", "rgba(59, 130, 246, 0.4)"]
        : isProcessing
        ? ["rgba(245, 158, 11, 0.85)", "rgba(217, 119, 6, 0.6)", "rgba(251, 191, 36, 0.4)"]
        : ["rgba(13, 148, 136, 0.6)", "rgba(30, 58, 95, 0.4)", "rgba(16, 185, 129, 0.2)"];

      for (let r = 0; r < ringCount; r++) {
        ctx.beginPath();
        const points = 20;
        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const freqMod = frequencyData && frequencyData.length > i ? (frequencyData[i] / 255) * (isListening || isSpeaking ? 12 : 1) : 0;
          const wave = Math.sin(angle * 3 + step * (r + 1.8)) * (isListening || isSpeaking ? 5 + boost * 0.3 : 1.2) + freqMod;
          const rad = baseRadius + r * 3.5 + wave;
          const x = cx + Math.cos(angle) * rad;
          const y = cy + Math.sin(angle) * rad;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = colors[r % colors.length];
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(cx, cy, 11, 0, Math.PI * 2);
      ctx.fillStyle = isListening ? "#EF4444" : isSpeaking ? "#10B981" : isProcessing ? "#F59E0B" : "#0D9488";
      ctx.fill();

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [state, audioLevel, frequencyData]);

  return <canvas ref={canvasRef} width={64} height={64} style={{ width: "44px", height: "44px" }} />;
}