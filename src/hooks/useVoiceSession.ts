/**
 * useVoiceSession — drives the Coach Agent voice loop (Tier 4).
 *
 * Ties together three moving parts:
 *   1. expo-av recording  (mic → WAV file → raw PCM)
 *   2. VoiceAgentSession  (PCM up over WS, transcript + agent text +
 *      synthesised audio down)
 *   3. expo-av playback    (agent's 24kHz PCM → WAV temp file → speaker)
 *
 * ⚠️ Recording approach: expo-av records to a FILE, not a live PCM
 * stream. So this hook does single-shot capture — record while the
 * user holds the mic, then on release read the whole WAV, strip the
 * header, and send it as one AUDIO_FRAME + END_OF_UTTERANCE. True
 * frame-by-frame streaming (partial transcription while speaking)
 * needs `@siteed/expo-audio-stream` + a dev-client rebuild — tracked
 * as a Tier 4 follow-up. Single-shot is reliable and fine for the
 * demo; the user just doesn't see live transcription mid-utterance.
 *
 * Consumers get a tiny state machine + two actions (start / stop) and
 * a stream of callbacks for transcripts / agent text / errors.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import * as FileSystem from 'expo-file-system';

import { VoiceAgentSession } from '@/services/voiceAgent';
import { extractPcmFromWavBase64, pcmToWavBase64 } from '@/utils/wav';
import type { VoiceLanguage } from '@/types';

/** Sample rate the backend expects on the way up (matches Gemini Live). */
const INPUT_SAMPLE_RATE = 16000;
/** Sample rate the agent's audio comes back at (matches YarnGPT config). */
const OUTPUT_SAMPLE_RATE = 24000;

export type VoiceState =
  | 'idle'
  | 'connecting'
  | 'listening'   // mic open, user speaking
  | 'thinking'    // utterance sent, awaiting agent
  | 'speaking'    // playing agent audio
  | 'error';

export interface UseVoiceSessionArgs {
  bearerToken: string;
  sessionId: string | null;
  language: VoiceLanguage;
  onUserTranscript?: (text: string) => void;
  onAgentTextDelta?: (text: string, finalChunk: boolean) => void;
  onToolInvocation?: (toolName: string) => void;
  onError?: (message: string) => void;
}

export interface UseVoiceSession {
  state: VoiceState;
  /** Begin a session (opens WS) — call once before first recording. */
  begin: () => Promise<void>;
  /** Start capturing the mic (hold-to-talk press). */
  startListening: () => Promise<void>;
  /** Stop capturing + send the utterance (hold-to-talk release). */
  stopListening: () => Promise<void>;
  /** Tear the session down (screen unmount). */
  end: () => void;
}

export function useVoiceSession(args: UseVoiceSessionArgs): UseVoiceSession {
  const [state, setState] = useState<VoiceState>('idle');

  const sessionRef = useRef<VoiceAgentSession | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  // Keep latest callbacks without re-opening the WS on every render.
  const argsRef = useRef(args);
  argsRef.current = args;

  /* ---- session lifecycle ------------------------------------------ */

  const begin = useCallback(async () => {
    if (sessionRef.current) return;
    setState('connecting');

    const session = new VoiceAgentSession(
      argsRef.current.bearerToken,
      argsRef.current.sessionId,
      {
        onOpen: () => {
          session.setLanguage(argsRef.current.language);
          setState('idle');
        },
        onUserTranscript: text => argsRef.current.onUserTranscript?.(text),
        onAgentTextDelta: (text, finalChunk) =>
          argsRef.current.onAgentTextDelta?.(text, finalChunk),
        onToolInvocation: name => argsRef.current.onToolInvocation?.(name),
        onAudioChunk: (base64Pcm, finalChunk) => {
          void playAgentAudio(base64Pcm);
          if (finalChunk) {
            // playback state handled in playAgentAudio's onComplete
          }
        },
        onTurnDone: () => {
          // If no audio came back (TTS unavailable), return to idle.
          setState(prev => (prev === 'speaking' ? prev : 'idle'));
        },
        onError: msg => {
          setState('error');
          argsRef.current.onError?.(msg);
        },
        onClose: () => setState('idle'),
      },
    );
    sessionRef.current = session;
    session.connect();
  }, []);

  const end = useCallback(() => {
    void recordingRef.current?.stopAndUnloadAsync().catch(() => undefined);
    recordingRef.current = null;
    void soundRef.current?.unloadAsync().catch(() => undefined);
    soundRef.current = null;
    sessionRef.current?.close();
    sessionRef.current = null;
    setState('idle');
  }, []);

  // Auto-teardown on unmount.
  useEffect(() => end, [end]);

  /* ---- recording (mic → PCM up) ----------------------------------- */

  const startListening = useCallback(async () => {
    if (!sessionRef.current) await begin();

    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) {
      argsRef.current.onError?.('Microphone permission denied.');
      setState('error');
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: true,
    });

    const recording = new Audio.Recording();
    // 16kHz mono 16-bit PCM WAV — what Gemini Live wants on the way in.
    await recording.prepareToRecordAsync({
      android: {
        extension: '.wav',
        outputFormat: Audio.AndroidOutputFormat.DEFAULT,
        audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
        sampleRate: INPUT_SAMPLE_RATE,
        numberOfChannels: 1,
        bitRate: INPUT_SAMPLE_RATE * 16,
      },
      ios: {
        extension: '.wav',
        outputFormat: Audio.IOSOutputFormat.LINEARPCM,
        audioQuality: Audio.IOSAudioQuality.HIGH,
        sampleRate: INPUT_SAMPLE_RATE,
        numberOfChannels: 1,
        bitRate: INPUT_SAMPLE_RATE * 16,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {
        mimeType: 'audio/wav',
        bitsPerSecond: INPUT_SAMPLE_RATE * 16,
      },
    });
    recordingRef.current = recording;
    await recording.startAsync();
    setState('listening');
  }, [begin]);

  const stopListening = useCallback(async () => {
    const recording = recordingRef.current;
    recordingRef.current = null;
    if (!recording) return;

    setState('thinking');
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    if (!uri || !sessionRef.current) {
      setState('idle');
      return;
    }

    // Read the recorded WAV as base64, strip the header → raw PCM up.
    const wavBase64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const pcmBase64 = extractPcmFromWavBase64(wavBase64);

    sessionRef.current.sendAudioFrame(pcmBase64);
    sessionRef.current.endUtterance();

    // Best-effort cleanup of the temp recording file.
    void FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
  }, []);

  /* ---- playback (agent PCM → speaker) ----------------------------- */

  const playAgentAudio = useCallback(async (base64Pcm: string) => {
    if (!base64Pcm) return;
    try {
      setState('speaking');
      // Wrap raw PCM in a WAV header, write to a temp file, play it.
      const wavBase64 = pcmToWavBase64(base64Pcm, OUTPUT_SAMPLE_RATE);
      const path = `${FileSystem.cacheDirectory}coach-reply-${Date.now()}.wav`;
      await FileSystem.writeAsStringAsync(path, wavBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Unload any prior sound first.
      await soundRef.current?.unloadAsync().catch(() => undefined);

      const { sound } = await Audio.Sound.createAsync({ uri: path });
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && status.didJustFinish) {
          void sound.unloadAsync().catch(() => undefined);
          void FileSystem.deleteAsync(path, { idempotent: true }).catch(() => undefined);
          setState('idle');
        }
      });
      await sound.playAsync();
    } catch {
      // Playback failure shouldn't kill the session — drop to idle.
      setState('idle');
    }
  }, []);

  return { state, begin, startListening, stopListening, end };
}
