/**
 * WAV container helpers for the Coach Agent voice loop (Tier 4).
 *
 * `expo-av` records to / plays from files, not raw PCM streams. The
 * voice protocol carries raw 16-bit PCM (16kHz up, 24kHz down). These
 * helpers bridge the two:
 *
 *  - {@link pcmToWavBase64} wraps raw PCM in a 44-byte WAV header so
 *    `Audio.Sound` can play the agent's synthesised reply.
 *  - {@link extractPcmFromWavBase64} strips the header off a recorded
 *    WAV file so we can send raw PCM up to the backend.
 *
 * Everything is base64 in/out to stay friendly with `expo-file-system`
 * (which reads/writes base64) and the WS envelope (which carries
 * base64 audio).
 *
 * Pure TS, no native deps — safe to import anywhere.
 */

/** Decode a base64 string to a Uint8Array (Hermes-safe, no Buffer). */
function base64ToBytes(b64: string): Uint8Array {
  const binary = globalThis.atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Encode a Uint8Array to base64 (Hermes-safe). */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000; // avoid call-stack limits on String.fromCharCode
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return globalThis.btoa(binary);
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

/**
 * Wrap raw 16-bit mono PCM (base64) in a WAV container (base64), ready
 * to write to a temp file and play.
 *
 * @param pcmBase64   raw PCM samples, base64-encoded.
 * @param sampleRate  e.g. 24000 for the agent's YarnGPT output.
 */
export function pcmToWavBase64(pcmBase64: string, sampleRate: number): string {
  const pcm = base64ToBytes(pcmBase64);
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcm.length;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');

  // fmt subchunk
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM fmt chunk size
  view.setUint16(20, 1, true); // audio format = PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data subchunk
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // PCM payload
  const out = new Uint8Array(buffer);
  out.set(pcm, 44);

  return bytesToBase64(out);
}

/**
 * Strip the WAV header off a recorded file (base64) and return the raw
 * PCM payload (base64). Assumes a standard 44-byte canonical header;
 * if the recorder emits extra chunks (e.g. a LIST/INFO chunk), this
 * walks the chunks to find `data`.
 */
export function extractPcmFromWavBase64(wavBase64: string): string {
  const bytes = base64ToBytes(wavBase64);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // Validate RIFF/WAVE.
  if (bytes.length < 44) return '';
  const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (riff !== 'RIFF') {
    // Not a WAV — assume it's already raw PCM.
    return wavBase64;
  }

  // Walk chunks from offset 12 to find "data".
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const id = String.fromCharCode(
      bytes[offset],
      bytes[offset + 1],
      bytes[offset + 2],
      bytes[offset + 3],
    );
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === 'data') {
      const pcm = bytes.subarray(body, body + size);
      return bytesToBase64(pcm);
    }
    // Chunks are word-aligned: pad odd sizes by 1.
    offset = body + size + (size % 2);
  }
  return '';
}
