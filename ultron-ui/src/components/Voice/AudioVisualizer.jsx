import React, { useEffect, useRef } from "react";
import { vadConfig } from "../../constants/chatConfig";

/**
 * Dynamic canvas graph visualizer.
 * - type="input": Renders a real-time Silero VAD speech probability line chart plotting against thresholds.
 * - type="output": Renders real-time Web Audio API AnalyserNode frequency spectrum bars.
 * 
 * @param {Object} props - Component properties
 * @param {AnalyserNode} [props.analyser] - Web Audio API AnalyserNode for output speech
 * @param {React.MutableRefObject<number>} [props.probabilityRef] - Real-time Silero VAD speech probability ref
 * @param {boolean} props.isAudioActive - Playback status flag
 * @param {boolean} props.isProcessing - Input thinking status flag
 * @param {string} [props.type] - Visualizer role ('input' | 'output')
 */
function AudioVisualizer({ analyser, probabilityRef, isAudioActive, isProcessing, type = "output" }) {
  const canvasRef = useRef(null);
  const historyRef = useRef(new Array(100).fill(0));

  // Graph bottom-up Y mapping with margin padding
  const mapValueToY = (val, H) => {
    const padding = 16;
    return H - padding - val * (H - 2 * padding);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationId;

    const isInput = type === "input";

    // Set canvas dimensions - input VAD graph is taller for high detail visibility
    canvas.width = 320;
    canvas.height = isInput ? 140 : 80;

    const bufferLength = analyser ? analyser.frequencyBinCount : 32;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationId = requestAnimationFrame(draw);

      const W = canvas.width;
      const H = canvas.height;

      // Draw dark translucent overlay to allow glowing line trails
      ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
      ctx.fillRect(0, 0, W, H);

      if (isInput) {
        // --- 1. Silero VAD Speech Threshold Graph (Input) ---
        const currentProb = probabilityRef?.current ?? 0;
        
        // Push current probability to history queue
        historyRef.current.push(currentProb);
        historyRef.current.shift();

        // Draw elegant pure black/dark background overlay
        ctx.fillStyle = "rgba(8, 10, 15, 0.15)";
        ctx.fillRect(0, 0, W, H);

        // Draw horizontal grid lines (0%, 25%, 50%, 75%, 100%) in thin dark blue
        ctx.strokeStyle = "rgba(0, 150, 255, 0.05)";
        ctx.lineWidth = 0.7;
        [0, 0.25, 0.5, 0.75, 1.0].forEach(gridVal => {
          const y = mapValueToY(gridVal, H);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(W, y);
          ctx.stroke();
        });

        // Draw POSITIVE VAD Threshold line (thin glowing red-orange dashed line)
        const yPos = mapValueToY(vadConfig.positiveSpeechThreshold, H);
        ctx.strokeStyle = "rgba(255, 51, 80, 0.35)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.setLineDash([4, 4]); // Sleek dotted layout
        ctx.moveTo(0, yPos);
        ctx.lineTo(W, yPos);
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash

        ctx.fillStyle = "rgba(255, 51, 80, 0.65)";
        ctx.font = "600 8px 'Outfit', sans-serif";
        ctx.fillText(`START THR: ${vadConfig.positiveSpeechThreshold}`, 12, yPos - 4);

        // Draw NEGATIVE VAD Threshold line (thin glowing blue-cyan dashed line)
        const yNeg = mapValueToY(vadConfig.negativeSpeechThreshold, H);
        ctx.strokeStyle = "rgba(0, 240, 255, 0.25)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(0, yNeg);
        ctx.lineTo(W, yNeg);
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash

        ctx.fillStyle = "rgba(0, 240, 255, 0.55)";
        ctx.fillText(`STOP THR: ${vadConfig.negativeSpeechThreshold}`, 12, yNeg - 4);

        // Draw real-time scrolling speech probability wave (elegant thin neon blue)
        const glowColor = "#00f0ff";
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 1.2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = glowColor;

        ctx.beginPath();
        const stepWidth = W / 99;
        for (let i = 0; i < 100; i++) {
          const val = historyRef.current[i];
          const x = i * stepWidth;
          const y = mapValueToY(val, H);
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset shadows

        // Draw real-time probability text inside canvas
        ctx.fillStyle = currentProb >= vadConfig.positiveSpeechThreshold ? "#00f0ff" : "rgba(255, 255, 255, 0.35)";
        ctx.font = "bold 9px 'Outfit', sans-serif";
        ctx.fillText(`VAD PROB: ${Math.round(currentProb * 100)}%`, W - 85, 18);
      } else {
        // --- 2. Frequency Spectrum Bars (Output) ---
        // Draw centered baseline grid representation
        ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, H / 2);
        ctx.lineTo(W, H / 2);
        ctx.stroke();

        if (analyser && isAudioActive) {
          // Fetch raw frequency amplitudes from current playing voice buffer
          analyser.getByteFrequencyData(dataArray);

          // Orange/Cyan for output
          const glowColor = isProcessing ? "#ff8c00" : "#00f0ff";
          ctx.strokeStyle = glowColor;
          ctx.lineWidth = 2.5;
          ctx.shadowBlur = 12;
          ctx.shadowColor = glowColor;

          ctx.beginPath();
          const sliceWidth = W / bufferLength;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            const percent = dataArray[i] / 255.0;
            const barHeight = Math.max(2, percent * (H * 0.7));
            
            ctx.moveTo(x, H / 2 - barHeight / 2);
            ctx.lineTo(x, H / 2 + barHeight / 2);

            x += sliceWidth;
          }
          ctx.stroke();
          ctx.shadowBlur = 0; // Reset shadows
        } else {
          // Render flowing ambient wave representation when idle
          const glowColor = isProcessing ? "rgba(255, 140, 0, 0.35)" : "rgba(0, 240, 255, 0.2)";
          ctx.strokeStyle = glowColor;
          ctx.lineWidth = 1.5;

          ctx.beginPath();
          const sliceWidth = W / 80;
          let x = 0;

          ctx.moveTo(0, H / 2);
          for (let i = 0; i <= 80; i++) {
            const time = Date.now() * 0.003;
            const amplitude = isProcessing ? 14 : 3;
            const y = H / 2 + Math.sin(i * 0.12 + time) * amplitude * Math.sin(i * Math.PI / 80);
            ctx.lineTo(x, y);
            x += sliceWidth;
          }
          ctx.stroke();
        }
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [analyser, probabilityRef, isAudioActive, isProcessing, type]);

  return (
    <div className={`audio-visualizer-wrapper ${type}`}>
      <div className="visualizer-label">
        {type === "input" ? "SILERO VAD: SPEECH PROBABILITY" : "OUTPUT: AI VOICE"}
      </div>
      <canvas ref={canvasRef} className="audio-visualizer-canvas" />
    </div>
  );
}

export default AudioVisualizer;
