/**
 * Decode and play WAV PCM bytes manually to avoid WebKitGTK/GStreamer system decoder issues
 * 
 * @param {ArrayBuffer} arrayBuffer - Raw WAV binary buffer
 * @param {AudioContext} ctx - Web Audio Context instance
 * @param {Function} [onEnded] - Callback fired when audio finishes playing
 */
export const playWavBuffer = (arrayBuffer, ctx, onEnded) => {
  try {
    const dataView = new DataView(arrayBuffer);
    
    // Check if it has a valid RIFF header
    let isWav = false;
    if (arrayBuffer.byteLength > 44) {
      const riff = String.fromCharCode(
        dataView.getUint8(0),
        dataView.getUint8(1),
        dataView.getUint8(2),
        dataView.getUint8(3)
      );
      isWav = (riff === 'RIFF');
    }
    
    let numChannels = 1;
    let sampleRate = 24000;
    let bitsPerSample = 16;
    let dataOffset = 0;
    
    if (isWav) {
      numChannels = dataView.getUint16(22, true);
      sampleRate = dataView.getUint32(24, true);
      bitsPerSample = dataView.getUint16(34, true);
      
      // Locate the 'data' subchunk to find the raw audio samples
      let offset = 12;
      while (offset < arrayBuffer.byteLength - 8) {
        const chunkId = String.fromCharCode(
          dataView.getUint8(offset),
          dataView.getUint8(offset + 1),
          dataView.getUint8(offset + 2),
          dataView.getUint8(offset + 3)
        );
        const chunkSize = dataView.getUint32(offset + 4, true);
        if (chunkId === 'data') {
          dataOffset = offset + 8;
          break;
        }
        offset += 8 + chunkSize;
      }
      if (dataOffset === 0) dataOffset = 44;
    } else {
      // Fallback: assume raw PCM 16-bit mono 24kHz
      dataOffset = 0;
    }
    
    const rawBytesLength = arrayBuffer.byteLength - dataOffset;
    let numSamples = 0;
    
    if (bitsPerSample === 16) {
      numSamples = Math.floor(rawBytesLength / 2);
    } else {
      numSamples = rawBytesLength;
    }
    
    // Always resample to the AudioContext's hardware sample rate to bypass WebKitGTK resampling bugs
    const destRate = ctx.sampleRate || 44100;
    const ratio = destRate / sampleRate;
    const destSamples = Math.round(numSamples * ratio);
    
    // Always create a 2-channel (stereo) buffer to bypass WebKitGTK mono-to-stereo routing bugs
    const audioBuffer = ctx.createBuffer(2, destSamples, destRate);
    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = audioBuffer.getChannelData(1);
    
    // Extract source samples to temporary float32 array
    const srcData = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      const sampleIndex = i * numChannels;
      if (bitsPerSample === 16) {
        const byteOffset = dataOffset + sampleIndex * 2;
        if (byteOffset + 1 < arrayBuffer.byteLength) {
          srcData[i] = dataView.getInt16(byteOffset, true) / 32768.0;
        } else {
          srcData[i] = 0;
        }
      } else {
        const byteOffset = dataOffset + sampleIndex;
        if (byteOffset < arrayBuffer.byteLength) {
          srcData[i] = (dataView.getUint8(byteOffset) - 128.0) / 128.0;
        } else {
          srcData[i] = 0;
        }
      }
    }
    
    // Perform linear interpolation resampling into stereo channels
    for (let i = 0; i < destSamples; i++) {
      const srcIndex = i / ratio;
      const indexPart = Math.floor(srcIndex);
      const interp = srcIndex - indexPart;
      
      let sampleVal = 0;
      if (indexPart < numSamples) {
        const val1 = srcData[indexPart];
        const val2 = (indexPart + 1 < numSamples) ? srcData[indexPart + 1] : val1;
        sampleVal = val1 * (1 - interp) + val2 * interp;
      }
      
      leftChannel[i] = sampleVal;
      rightChannel[i] = sampleVal;
    }
    
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    
    if (onEnded) {
      source.onended = onEnded;
    }
    
    source.start(0);
  } catch (err) {
    console.error("PCM manual decoding failed:", err);
    if (onEnded) onEnded();
  }
};
