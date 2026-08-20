import React, { useEffect, useRef } from "react";

/**
 * HTML5 Canvas dynamic oscilloscope & frequency bar graph visualizer.
 * Animates simulated baseline noise when idle and transitions to real-time Web Audio API
 * AnalyserNode data when speech audio outputs.
 * 
 * @param {Object} props - Component properties
 * @param {AnalyserNode} [props.analyser] - Web Audio API Analyzer Node
 * @param {boolean} props.isAudioActive - Playback status flag
 * @param {boolean} props.isProcessing - Input thinking status flag
 * @param {string} [props.type] - Visualizer role ('input' | 'output')
 */
/**
 * HTML5 Canvas dynamic oscilloscope & frequency bar graph visualizer.
 * Animates simulated baseline noise when idle and transitions to real-time Web Audio API
 * AnalyserNode data when speech audio outputs.
 * 
 * @param {Object} props - Component properties
 * @param {AnalyserNode} [props.analyser] - Web Audio API Analyzer Node
 * @param {boolean} props.isAudioActive - Playback status flag
 * @param {boolean} props.isProcessing - Input thinking status flag
 * @param {string} [props.type] - Visualizer role ('input' | 'output')
 */
function AudioVisualizer({ analyser, isAudioActive, isProcessing, type = "output" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationId;

    const isInput = type === "input";

    // Set canvas dimensions - input is twice as tall for high visibility
    canvas.width = 320;
    canvas.height = isInput ? 140 : 80;

    const bufferLength = analyser ? analyser.frequencyBinCount : 32;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationId = requestAnimationFrame(draw);

      const W = canvas.width;
      const H = canvas.height;

      // Draw dark overlay with low opacity to preserve canvas trail frames for glowing effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
      ctx.fillRect(0, 0, W, H);

      // Draw subtle centered zero-line grid representation
      ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, H / 2);
      ctx.lineTo(W, H / 2);
      ctx.stroke();

      const hasActiveSignal = isInput ? !!analyser : (analyser && isAudioActive);

      if (hasActiveSignal) {
        if (isInput) {
          // Fetch raw time-domain (oscilloscope waveform) values
          analyser.getByteTimeDomainData(dataArray);

          const glowColor = "#39ff14"; // Neon green
          ctx.strokeStyle = glowColor;
          ctx.lineWidth = 3;            // Thicker line for visibility
          ctx.shadowBlur = 15;
          ctx.shadowColor = glowColor;

          ctx.beginPath();
          const sliceWidth = W / bufferLength;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0; // Normalized around 1.0 (0.0 to 2.0)
            const y = v * (H / 2);

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }

            x += sliceWidth;
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else {
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
            // Render symmetric vertical bars extending outward from central line
            const barHeight = Math.max(2, percent * (H * 0.7));
            
            ctx.moveTo(x, H / 2 - barHeight / 2);
            ctx.lineTo(x, H / 2 + barHeight / 2);

            x += sliceWidth;
          }
          ctx.stroke();
          ctx.shadowBlur = 0; // Reset canvas shadows
        }
      } else {
        // Render flowing ambient wave representation when idle
        const glowColor = isInput ? "rgba(57, 255, 20, 0.25)" : (isProcessing ? "rgba(255, 140, 0, 0.35)" : "rgba(0, 240, 255, 0.2)");
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 0;

        ctx.beginPath();
        const sliceWidth = W / 80;
        let x = 0;

        ctx.moveTo(0, H / 2);
        for (let i = 0; i <= 80; i++) {
          const time = Date.now() * 0.003;
          // Pulse the waveform amplitude higher if text generation processing is active
          const amplitude = isProcessing ? 14 : (isInput ? 6 : 3);
          const y = H / 2 + Math.sin(i * 0.12 + time) * amplitude * Math.sin(i * Math.PI / 80);
          ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [analyser, isAudioActive, isProcessing, type]);

  return (
    <div className={`audio-visualizer-wrapper ${type}`}>
      <div className="visualizer-label">
        {type === "input" ? "INPUT: MICROPHONE" : "OUTPUT: AI VOICE"}
      </div>
      <canvas ref={canvasRef} className="audio-visualizer-canvas" />
    </div>
  );
}

export default AudioVisualizer;
