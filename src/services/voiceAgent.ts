/**
 * Coach Agent v2 voice client (Tier 4).
 *
 * Opens a raw WebSocket to the backend's `/ws/ai/coach/agent/voice`
 * endpoint and streams microphone audio up / receives transcripts +
 * agent text + synthesised audio down.
 *
 * Backend: kajota-mobile-backend / `CoachAgentVoiceController.java` +
 * `CoachAgentVoiceService.java`. The hybrid stack (Gemini Live for STT
 * + reasoning, YarnGPT for African-language TTS) is invisible to the
 * client — it just sees `VoiceFrame` envelopes.
 *
 * Why raw WebSocket, not STOMP: the backend uses a raw WS handler to
 * keep latency minimal, and Expo's bundled `WebSocket` global speaks
 * it natively with no extra dependency.
 */
import { API_BASE_URL } from './api';
import type { VoiceFrame, VoiceLanguage } from '@/types';

/**
 * Derive the WS URL from the REST base URL. `https://host/path` →
 * `wss://host/ws/ai/coach/agent/voice`. We deliberately drop the REST
 * path segment and mount the WS at the host root, matching the
 * backend's `registry.addHandler(..., "/ws/ai/coach/agent/voice")`.
 */
function deriveVoiceWsUrl(): string {
  try {
    const u = new URL(API_BASE_URL);
    const scheme = u.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${scheme}//${u.host}/ws/ai/coach/agent/voice`;
  } catch {
    // Fallback: naive string swap.
    return API_BASE_URL.replace(/^http/, 'ws').replace(/\/kajota-mobile-backend$/, '')
      + '/ws/ai/coach/agent/voice';
  }
}

export interface VoiceSessionHandlers {
  /** User's speech, transcribed (render in the chat bubble). */
  onUserTranscript?: (text: string, language?: VoiceLanguage) => void;
  /** A streamed chunk of the agent's text reply. */
  onAgentTextDelta?: (text: string, finalChunk: boolean) => void;
  /** A tool just started executing (show the "Used N tools" badge). */
  onToolInvocation?: (toolName: string) => void;
  /** A chunk of synthesised audio to play (base64 24kHz PCM). */
  onAudioChunk?: (base64Pcm: string, finalChunk: boolean) => void;
  /** The agent finished this turn — flip UI back to idle. */
  onTurnDone?: () => void;
  /** Terminal error. */
  onError?: (message: string) => void;
  /** Socket lifecycle. */
  onOpen?: () => void;
  onClose?: () => void;
}

/**
 * One live voice session. Construct, call {@link connect}, then push
 * audio frames with {@link sendAudioFrame} / {@link endUtterance}.
 */
export class VoiceAgentSession {
  private ws: WebSocket | null = null;
  private seq = 0;
  private readonly handlers: VoiceSessionHandlers;
  private readonly bearerToken: string;
  private readonly sessionId: string | null;
  private closedByClient = false;

  constructor(
    bearerToken: string,
    sessionId: string | null,
    handlers: VoiceSessionHandlers,
  ) {
    this.bearerToken = bearerToken;
    this.sessionId = sessionId;
    this.handlers = handlers;
  }

  connect(): void {
    const url = deriveVoiceWsUrl();
    // React Native's WebSocket supports a third `options` arg with
    // headers on Android — that's how the bearer reaches the handshake
    // interceptor WITHOUT leaking through the URL query string. (iOS
    // header support is unreliable; the backend documents a future
    // ticket-based fallback for that platform.)
    //
    // The DOM lib types WebSocket with only (url, protocols), so we
    // cast the constructor to reach RN's 3-arg form.
    const RnWebSocket = WebSocket as unknown as new (
      url: string,
      protocols: string | string[] | undefined,
      options: { headers: Record<string, string> },
    ) => WebSocket;
    this.ws = new RnWebSocket(url, undefined, {
      headers: { Authorization: `Bearer ${this.bearerToken}` },
    });

    this.ws.onopen = () => this.handlers.onOpen?.();
    this.ws.onmessage = e => this.handleMessage(e.data as string);
    this.ws.onerror = () =>
      this.handlers.onError?.('Voice connection error. Check your network.');
    this.ws.onclose = () => {
      if (!this.closedByClient) this.handlers.onClose?.();
    };
  }

  /** Push one base64-encoded 16kHz PCM frame from the mic. */
  sendAudioFrame(base64Pcm16k: string): void {
    this.send({
      type: 'AUDIO_FRAME',
      audio: base64Pcm16k,
      seq: this.seq++,
      sessionId: this.sessionId ?? undefined,
      timestamp: Date.now(),
    });
  }

  /** Tell the backend which language to synthesise replies in. */
  setLanguage(language: VoiceLanguage): void {
    this.send({
      type: 'LANGUAGE_HINT',
      language,
      sessionId: this.sessionId ?? undefined,
      timestamp: Date.now(),
    });
  }

  /** Signal the user released the mic (end of utterance). */
  endUtterance(): void {
    this.send({
      type: 'END_OF_UTTERANCE',
      sessionId: this.sessionId ?? undefined,
      timestamp: Date.now(),
    });
  }

  close(): void {
    this.closedByClient = true;
    this.ws?.close();
    this.ws = null;
  }

  private send(frame: VoiceFrame): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(frame));
    }
  }

  private handleMessage(raw: string): void {
    let frame: VoiceFrame;
    try {
      frame = JSON.parse(raw) as VoiceFrame;
    } catch {
      return;
    }
    switch (frame.type) {
      case 'USER_TRANSCRIPT':
        this.handlers.onUserTranscript?.(frame.text ?? '', frame.language);
        break;
      case 'AGENT_TEXT_DELTA':
        this.handlers.onAgentTextDelta?.(frame.text ?? '', frame.finalChunk ?? false);
        break;
      case 'TOOL_INVOCATION':
        this.handlers.onToolInvocation?.(frame.toolName ?? '');
        break;
      case 'AUDIO_CHUNK':
        this.handlers.onAudioChunk?.(frame.audio ?? '', frame.finalChunk ?? false);
        break;
      case 'AGENT_TURN_DONE':
        this.handlers.onTurnDone?.();
        break;
      case 'ERROR':
        this.handlers.onError?.(frame.text ?? 'Voice agent error.');
        break;
      default:
        // Unknown frame type — ignore forward-compatibly.
        break;
    }
  }
}
