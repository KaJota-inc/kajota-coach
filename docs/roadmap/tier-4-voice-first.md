# Tier 4 — Voice-first multilingual Coach Agent

> **Hackathon target:** Google Cloud Rapid Agent (deadline 2026-06-11).
> **Effort budget:** 3 days solo dev.
> **Risk:** Medium-Low — architecture pinned by the 2026-06-08 spike
> (see [`tier-4-spike-report.md`](./tier-4-spike-report.md)).
>
> **Architecture note (2026-06-08 spike outcome):** Pure Gemini Live
> speech-to-speech is **not viable** for Yoruba/Igbo/Hausa/Pidgin —
> Live API's audio-output language list is locked to 24 languages,
> none of which are our targets. The architecture below is the
> **hybrid stack** finalised after that spike: Gemini Live for STT +
> reasoning + tool calls, **YarnGPT** for African-language TTS.

## The user-facing change

A new mic button next to the text input on `CoachAgentChatScreen`. Tap
to hold → speak in Yoruba, Igbo, Hausa, or Pidgin English → Coach Agent
transcribes, runs tool calls, replies in the same language as both text
and TTS audio.

This converts Coach Agent v2 from "type-only" to multi-modal voice
agent. Per Kajota's own hero copy ("especially relevant for non-text-
literate sellers in informal African markets"), this is the feature
that makes the product **honest** about its target user.

## Why it matters

| Statistic | Source |
| --- | --- |
| 35% of Nigerian adults are functionally illiterate | World Bank, 2024 |
| 80%+ of African informal traders prefer voice over text for commerce | GSMA Mobile Economy Sub-Saharan Africa 2024 |
| WhatsApp voice notes account for ~60% of business communication in West Africa | Meta African Markets Report 2024 |

The text-only Coach Agent literally cannot be used by the user it was
designed for. Tier 4 fixes that.

## Acceptance criteria

A new contributor should be able to do all five of the following without
filing a bug:

1. Tap the mic button → see a recording indicator → speak *"Mo fẹ́ ta
   ata pupa lóri ìjókòó. Ẹ jọ̀wọ́ ràn mí lọ́wọ́ àti ṣe àkọsílẹ̀."* (Yoruba
   for "I want to sell red pepper for resale. Please help me draft a
   listing.") → release.
2. Within ≤3 seconds, the agent transcribes and shows the user's
   message in the bubble (in Yoruba) and starts streaming a Yoruba
   response.
3. Mid-response, the agent calls `analyzeProductImage` (if a photo was
   attached) and `anchorPrice` tools.
4. When the agent finishes, it speaks the response aloud in Yoruba with
   natural pronunciation (not robot TTS).
5. User taps mic again, says *"Túmọ̀ sí Èdè Hausa"* (translate to
   Hausa) → agent translates the listing draft using its existing
   `translate` tool.

All four target languages — **Yoruba, Igbo, Hausa, Nigerian Pidgin** —
must round-trip cleanly. Pidgin is the trickiest; we may have to ship
it as fallback English with Pidgin vocabulary if Gemini's pidgin model
quality is poor.

## Architecture (hybrid — post-spike)

```
┌────────────────────────┐
│  CoachAgentChatScreen  │  Mic UI, recording state machine,
│   (kajota-coach)       │  PCM streaming over WebSocket
└──────┬─────────────────┘
       │  16kHz PCM frames, JSON-wrapped over raw WS
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  CoachAgentVoiceController + Service (kajota-mobile-backend)    │
│                                                                 │
│  Holds one VoiceSession per (userId, sessionId). Each session   │
│  multiplexes THREE outbound channels:                           │
│                                                                 │
│  ┌──────────────────┐    ┌──────────────────┐  ┌─────────────┐ │
│  │ Gemini Live WS   │    │ CoachAgentService│  │ YarnGPT TTS │ │
│  │  (STT + reason   │◄──►│   .dispatchTool()│  │  REST API   │ │
│  │   + tool calls)  │    │  (existing,      │  │  (Yoruba /  │ │
│  │                  │    │   unchanged)     │  │   Igbo /    │ │
│  │  Returns:        │    │                  │  │   Hausa /   │ │
│  │   - text reply   │    │  Returns:        │  │   Pidgin)   │ │
│  │   - tool call    │    │   - tool result  │  │             │ │
│  │     requests     │    │     JSON         │  │  Returns:   │ │
│  │   - English-     │    │                  │  │   - PCM     │ │
│  │     only audio   │    │                  │  │     audio   │ │
│  └──────────────────┘    └──────────────────┘  └─────────────┘ │
│                                                                 │
│  Glue:                                                          │
│  - Audio in → Gemini Live (16kHz PCM)                          │
│  - Tool call from Gemini → dispatchTool() → tool result back   │
│    to Gemini → final text response                             │
│  - Final text → YarnGPT (text + voiceId) → PCM audio chunks    │
│  - PCM chunks → mobile WS (mobile playback)                    │
└─────────────────────────────────────────────────────────────────┘
```

**Why hybrid:**

Gemini Live's input/STT covers 97 languages including Yoruba and Hausa,
plus its function-calling protocol matches the shape of Coach Agent's
existing tool catalogue. We get all that for free.

But Gemini Live's **audio output** is locked to 24 languages, none of
which include our target Nigerian languages. So we split the pipeline:
Gemini Live for everything *except* the final audio synthesis, and
YarnGPT for the audio out.

**Latency budget for one user turn:**

| Stage | Latency | Notes |
| --- | --- | --- |
| Mobile mic → backend WS | ~50ms | LAN/Wi-Fi |
| Backend → Gemini Live (STT + reasoning) | 500-800ms | Per spike-doc benchmark, with HIGH end-of-speech sensitivity + 1000ms silence + 16kHz audio |
| Tool calls (if any) | ~500ms × N tools | Reuses existing `CoachAgentService.dispatchTool()` |
| Text response → YarnGPT TTS | ~1-2s | Estimated; validate Day 1 |
| Audio back to mobile | ~50ms | LAN/Wi-Fi |
| **Total (no tools)** | **~2-3s end-to-end** | Well under the 4s "useful conversation" threshold |

## Files to touch

### `kajota-mobile-backend`

**New:** `controller/CoachAgentVoiceController.java`

```java
@RestController
@RequiredArgsConstructor
@Slf4j
public class CoachAgentVoiceController {

    private final CoachAgentVoiceService voiceService;

    @MessageMapping("/coach/agent/voice")
    public void handleVoiceFrame(VoiceFrameDto frame, Principal principal) {
        voiceService.routeFrame(principal.getName(), frame);
    }
}
```

WebSocket endpoint at `/ws/ai/coach/agent/voice` (STOMP over SockJS for
React Native compatibility — see `react-native-stomp-relay` package).

**New:** `service/ai/CoachAgentVoiceService.java`

Holds per-user `GeminiLiveSession` objects keyed by Privy userId. Bridges
mobile audio frames ↔ Gemini Live bidi stream. Reuses existing
`dispatchTool()` from `CoachAgentService` so the voice flow shares
**every** tool the text flow has (no duplication).

Sketch:

```java
public class CoachAgentVoiceService {
    private final CoachAgentService textAgent;  // delegates tool calls
    private final GeminiLiveClient liveClient;  // wraps the gRPC SDK
    private final Map<String, LiveSession> sessions = new ConcurrentHashMap<>();

    public void routeFrame(String userId, VoiceFrameDto frame) {
        LiveSession session = sessions.computeIfAbsent(userId, this::open);
        session.sendAudio(frame.getAudio());
    }

    private LiveSession open(String userId) {
        return liveClient.connect(LiveConfig.builder()
            .model("gemini-2.5-flash-live-preview")
            .systemInstruction(buildSystemInstruction(userId))
            .tools(textAgent.buildToolDeclarations())
            .toolHandler(call -> textAgent.dispatchTool(
                call.name(), call.args(), buildRequestContext(userId), loadMemory(userId)))
            .audioConfig(AudioConfig.builder()
                .inputSampleRate(16000)
                .outputSampleRate(24000)
                .languageCode("yo-NG")  // or detect from first frame
                .build())
            .build());
    }
}
```

**New:** `model/dto/request/VoiceFrameDto.java`

```java
@Data
public class VoiceFrameDto {
    private String audio;        // base64 16kHz PCM
    private String language;     // 'yo-NG' | 'ig-NG' | 'ha-NG' | 'pcm-NG' | 'en-NG'
    private boolean isFinal;     // true on user stop-tap
    private String sessionId;    // reuses text-mode sessionId
}
```

**Modified:** `service/ai/CoachAgentService.java`

Make `buildToolDeclarations()` and `dispatchTool()` package-visible (not
private) so the voice service can call them.

⚠️ **Gemini Live API availability check.** As of writing, Gemini Live
is in preview and the SDK is JavaScript/Python. We may need to call the
WebSocket endpoint directly with `WebSocketClient` + protobuf
deserialization. See spike below.

### `kajota-coach` (mobile)

**Modified:** `src/screens/CoachAgentChatScreen.tsx`

Add mic button to `Composer` component. Use `expo-av` for recording.
Stream PCM frames every 100ms while user is holding.

```tsx
const recording = useRef<Audio.Recording | null>(null);

const startRecording = async () => {
  const { status } = await Audio.requestPermissionsAsync();
  if (status !== 'granted') return;
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });
  recording.current = new Audio.Recording();
  await recording.current.prepareToRecordAsync({
    // 16kHz mono PCM, what Gemini Live expects
    android: {
      extension: '.wav',
      outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_DEFAULT,
      audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_PCM_16BIT,
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 256000,
    },
    ios: { /* mirror */ },
  });
  // Use onRecordingStatusUpdate to stream frames over WS as they arrive.
  await recording.current.startAsync();
};
```

**New:** `src/services/voiceAgent.ts`

Wraps STOMP client. Keeps the same `sessionId` as text mode so
conversation state is unified.

```typescript
export class VoiceAgentSession {
  private client: Client;
  constructor(sessionId: string | null, onMessage: (m: AgentMessage) => void) {
    this.client = new Client({
      brokerURL: `wss://${API_HOST}/ws/ai/coach/agent/voice`,
      connectHeaders: { Authorization: `Bearer ${bearerToken}` },
      onConnect: () => {
        this.client.subscribe(`/user/queue/voice`, msg => onMessage(JSON.parse(msg.body)));
      },
    });
    this.client.activate();
  }

  sendFrame(audio: string, language: Language, isFinal = false) {
    this.client.publish({
      destination: '/app/coach/agent/voice',
      body: JSON.stringify({ audio, language, isFinal, sessionId: this.sessionId }),
    });
  }
}
```

**New:** `src/screens/CoachAgentVoiceUI.tsx` (extracted from Chat
screen for testability)

The hold-to-talk button. Wave-form indicator during recording.
Transcribed user text streams into the existing chat bubbles.

### `kajota-coach/package.json`

Add:

- `expo-av` (already in Expo SDK, may need to install explicitly)
- `@stomp/stompjs` and `sockjs-client` for the WS layer

## Language detection

First user voice frame includes a hint (defaults to last-known
language from memory, defaults to Pidgin). Backend forwards to Gemini
Live with the language code set. If detection is wrong, user can tap a
language pill in the UI (Yo · Ig · Ha · Pcm · En) to override mid-
conversation — that updates `CoachAgentMemory.preferredLocale`.

## TTS quality risk

⚠️ Gemini Live's TTS for Yoruba/Igbo/Hausa is **not yet validated in
production**. If quality is poor, fall back to:

1. **ElevenLabs Multilingual v2** — known good for Yoruba (tested 2025).
   Adds a separate HTTP call per agent turn (~500ms latency hit) but
   audio quality is broadcast-grade. Free tier 10k chars/month.
2. **Bytedance Volcano TTS** — supports Hausa, very low latency, free
   tier for first 1M chars.
3. **Coqui XTTS v2 self-hosted** — ultimate fallback. Run on a small
   GPU instance. Adds ops burden but zero per-call cost.

Make the TTS layer pluggable behind a `TextToSpeechProvider` interface
so we can swap providers per language if Gemini Live quality is uneven.

## Demo script (90-sec video for Rapid Agent submission)

1. **0:00-0:08** — Lagos market scene, voiceover: *"Meet Adura. She
   resells products on WhatsApp but she can't read or write English
   well."*
2. **0:08-0:25** — Adura opens Kajota Coach, taps mic, says in Yoruba:
   *"I want to sell red pepper for resale, can you help me?"*
3. **0:25-0:45** — Agent transcribes in Yoruba bubble. Streams response
   in Yoruba audio: *"Of course. Take a photo of the pepper, I'll do
   the rest."* Adura snaps photo.
4. **0:45-1:10** — Agent calls `analyzeProductImage`, `matchCategory`,
   `anchorPrice` (tool badges flash as they run). Replies in Yoruba:
   *"Red pepper, ₦450/kg in Lagos this week. Want a WhatsApp caption
   for it?"* Adura: *"Yes, in Hausa too."* Agent calls `translate`,
   delivers both.
5. **1:10-1:25** — Adura says *"Ready to publish on Mesh"*. Agent calls
   `proposeListingForPublish`. Sign on Mesh CTA appears. Tap → Privy
   OTP → embedded wallet signs.
6. **1:25-1:30** — Etherscan tx confirmation.

Recording requirements:

- Single take, real audio (no post-dubbing). Subtitles burned in for
  judges who don't speak Yoruba.
- Show the network requests in a dev panel for the last 5 seconds so
  judges see this is real (not staged).

## Spikes to run BEFORE committing to scope (do these in the first 8 hours)

🚧 **Spike 1: Gemini Live API access + Yoruba quality.** 2 hours.

```bash
# In a throwaway dir:
git clone https://github.com/google-gemini/cookbook
cd cookbook/quickstarts/Get_started_LiveAPI.py
# Modify to send a Yoruba audio sample.
# Measure: latency from user-finished-speaking → first audio response byte.
# Measure: subjective quality of Yoruba pronunciation.
```

**Kill criterion:** if latency > 4s OR pronunciation is unintelligible
to a native speaker, skip Gemini Live and use Bytedance Volcano + a
separate streaming-STT pipeline.

🚧 **Spike 2: React Native + STOMP over WS reliability.** 1 hour.

`@stomp/stompjs` has known issues with React Native's WebSocket
polyfill. If we hit them, fall back to raw `WebSocket` with custom
framing.

🚧 **Spike 3: Background audio frame streaming on Android.** 1 hour.

Some Android OEMs (Tecno being one of them — that's the user's daily
driver) aggressively pause apps mid-recording. Test that the recording
survives a 30-second hold while Metro is bundling.

## Timeline (3 days)

| Day | Hours | Deliverable |
| --- | --- | --- |
| Day 1 morning | 4h | Three spikes above. Make/break decision on Gemini Live. |
| Day 1 afternoon | 4h | Backend WS controller + service skeleton, mocked tool responses. |
| Day 2 morning | 4h | Mobile mic button + recording state machine + STOMP client. |
| Day 2 afternoon | 4h | Wire end-to-end. Yoruba round trip working in dev. |
| Day 3 morning | 4h | Igbo + Hausa + Pidgin testing. Language pill UI. TTS quality tuning. |
| Day 3 afternoon | 4h | Demo recording, edit, submission. |

**Buffer day:** none. If a spike fails, cut Igbo or Hausa from the
submission scope (record only Yoruba + Pidgin) rather than slipping the
deadline.

## Dependencies

- **Upstream:** None. Tier 4 ships standalone.
- **Downstream:** Tier 5 (WhatsApp) wants the voice pipeline ready so
  WhatsApp voice notes can be transcribed in the same flow. But Tier 5
  doesn't *require* Tier 4 to ship first.

## Open questions

1. Should the mic button replace the text input or sit alongside?
   *Recommendation: alongside. Some users will want both.*
2. Do we transcribe the user's voice into the bubble (privacy concern
   if someone else picks up the phone) or just show "🎤 voice
   message"? *Recommendation: transcribe — visual feedback is the
   whole point for users with literacy gaps to learn.*
3. Should the agent's response be audio-only, text-only, or both?
   *Recommendation: both, with an autoplay toggle in settings.*
4. What's the failure-mode UX if Gemini Live drops mid-utterance?
   *Recommendation: visible reconnect indicator + last-known partial
   transcription stays in the bubble.*

## Why not Whisper + Eleven Labs + Gemini text instead?

Because of latency. Voice → text (Whisper) → text agent (Gemini) →
text response → TTS (ElevenLabs) is **3-4 sequential roundtrips, ~6s
total**. Gemini Live folds STT + reasoning + TTS into one streaming
session, **~1.5s total**. The latency difference is the difference
between "useful conversation" and "annoying chat with a confused robot."

That said — if Gemini Live's quality bar isn't there for African
languages, we ship the fallback Whisper → Gemini text → ElevenLabs
chain and label the v1 as "voice in 6 seconds, working on faster."
Quality > latency for the initial demo.
