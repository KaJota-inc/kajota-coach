# Read script — Mesh re-cut VO

**One continuous take.** Silences separate the beats; the pipeline detects them. Do not splice.

**Pace target:** ~170 words per minute — natural narration, a little slower than conversational. Total ≈ 75 seconds of speech + 5 silences + head/tail ≈ 82 seconds of audio.

**Speed:** 1.0×. Never atempo/sped-up afterwards.

**Deliver to:** `/Users/oluwaboriola/Documents/kajota-coach/.claude/worktrees/near-agents-scout-1b6982/vo_near_recut.wav` (48 kHz mono WAV, same mic/room as the Mesh Singapore take).

---

## Pre-record checklist (60 seconds)

- [ ] Quiet room, HVAC off, phone on silent, laptop fans idle
- [ ] Same mic + room as the Mesh Singapore take
- [ ] Recording at 48 kHz mono, -23 LUFS target (pipeline normalizes to -16 LUFS later)
- [ ] One glass of water within reach
- [ ] Phone/second monitor open to this file at large text size
- [ ] If possible: play through `demo-dryrun/mesh-near-recut.FINAL.mp4` once (Samantha's synth) to internalize the rhythm before your own take

---

## Record this (verbatim)

### Head silence — 1 second

*(Take a breath, then begin.)*

---

### Beat 1 — 10–12 seconds

> **"On NEAR Intents, a confidential swap can return `status SUCCESS` while the money lands in the wrong account.**
> **Issue three-eighty-four, open as of today, has the receipts: zero point zero three nine ETH stuck in a solver sink account that keeps growing."**

**Pronunciations:**
- `NEAR` → say it like the word *near*, not N-E-A-R
- `status SUCCESS` → keep *status* and *SUCCESS* as separate stressed words (don't let the sentence run together)
- `three-eighty-four` → not *three hundred eighty-four*
- `ETH` → say as E-T-H, three letters
- `sink account` → press on *sink* — this is the defect word

*(0.9 s silence · exhale, take half a breath)*

---

### Beat 2 — 10–12 seconds

> **"We're Shield · Mesh · Coach — a post-signature destination verifier that reads the on-chain receiver_id back from each NEAR transaction, and halts the agent when it doesn't match the quote.**
> **Not a replacement for OutLayer's pre-sign policy — the layer that fires after."**

**Pronunciations:**
- `Shield · Mesh · Coach` → brief pauses between the three (treat the middle-dots as beats)
- `post-signature` → one word stressed as *post-sig·na·ture*
- `receiver_id` → *receiver ID* (ignore the underscore)
- `OutLayer` → *out-LAYer* (stress on layer), one word
- `pre-sign policy` → *pre-sign PA-licy*

*(0.9 s silence)*

---

### Beat 3 — 8–10 seconds

> **"Here, Coach is orchestrating an eight-way revenue split across two chains.**
> **Each leg goes through Mesh's atomic escrow and gets its destination verified before signing."**

**Pronunciations:**
- `eight-way` → *8-way*, hyphenated, one stress
- `atomic escrow` → *a-TOM-ic ES-crow*
- `verified before signing` → press on *verified*

*(0.9 s silence)*

---

### Beat 4 — 12–14 seconds

> **"The replay against the two transaction hashes from issue three-eighty-four:**
> **Shield pulls the receiver_id, compares to the quoted recipient, flags mismatch, halts.**
> **Thirty-eight thousandths of an ETH that would have been lost — caught before the second signature."**

**Pronunciations:**
- Four verbs in sequence: `pulls · compares · flags · halts` — small pause between each, each gets its own stress
- `Thirty-eight thousandths` → *thirty-eight THOW-sandths*
- `caught before the second signature` → the closing clause lands hardest; slow down slightly on *second signature*

*(0.9 s silence)*

---

### Beat 5 — 8–10 seconds

> **"`kajota-mesh.vercel.app` — the counter ticks every real settlement.**
> **Eight cycles live, thirty-six transactions across Arbitrum Sepolia and Robinhood Chain.**
> **Clone the repo, run the replay script, see Shield halt on your own machine."**

**Pronunciations:**
- `kajota-mesh.vercel.app` → *ka-JOH-ta mesh dot ver-SELL dot app* (NOT *ver-SEL*)
- `Arbitrum Sepolia` → *AR-bi-trum se-POH-lee-ah*
- `Robinhood Chain` → two words, same as the stock app
- `on your own machine` → final clause, slow and deliberate — this is the call-to-action

*(0.9 s silence)*

---

### Beat 6 — 6–8 seconds

> **"Built at NEAR HACKATHON.**
> **Shield, Mesh, Coach.**
> **The thing that catches what pre-sign policy misses."**

**Pronunciations:**
- `NEAR HACKATHON` → both words stressed, slight pause between them
- `Shield, Mesh, Coach` → three beats, same rhythm as beat 2's opening
- `The thing that catches what pre-sign policy misses` → close on *misses* with a downward tone — do not let the voice tail up

*(1.0 s tail silence · hold, then stop recording)*

---

## Known hard words (practice once before the take)

- **nep141:hood.omft.near** — if you have to say it, pronounce as *N-E-P one-forty-one, hood dot O-M-F-T dot near*. But this phrase does NOT appear in any of the 6 beats; it's only in the scene visuals.
- **3djtQ3pU...** — do NOT read the hash aloud. The visual shows it; you refer to it as *"the transaction hash"* only.
- **b45e...605c6** — same. Not spoken; only shown.
- **51e8f94d...de7cbe** — same.

## If you flub a beat mid-take

The pipeline detects silences to find beat boundaries. If you flub inside a beat, pause for ~2 seconds (longer than the 0.9 s between-beat silence), then restart the beat from its opening word. The whisper + ASR term-fixes pass later picks the cleanest take of each beat. If a second flub happens on the same beat, stop the take and start over from Beat 1 — editing out multiple inserts is more expensive than a fresh take.

## After recording

Drop the file here, exactly named:

```
/Users/oluwaboriola/Documents/kajota-coach/.claude/worktrees/near-agents-scout-1b6982/vo_near_recut.wav
```

Then from the worktree root, run:

```bash
./demo-dryrun/build/mux_vo.sh vo_near_recut.wav
```

This writes `demo-dryrun/mesh-near-recut.FINAL.mp4` with real-voice audio, replacing the Samantha-synth version that's there now.

---

## Reference: the full text as one continuous read

Copy this block to your phone/tablet if you prefer a single scroll without the annotations:

```
On NEAR Intents, a confidential swap can return status SUCCESS while the money lands in the wrong account. Issue three-eighty-four, open as of today, has the receipts: zero point zero three nine ETH stuck in a solver sink account that keeps growing.

[pause]

We're Shield, Mesh, Coach — a post-signature destination verifier that reads the on-chain receiver ID back from each NEAR transaction, and halts the agent when it doesn't match the quote. Not a replacement for OutLayer's pre-sign policy — the layer that fires after.

[pause]

Here, Coach is orchestrating an eight-way revenue split across two chains. Each leg goes through Mesh's atomic escrow and gets its destination verified before signing.

[pause]

The replay against the two transaction hashes from issue three-eighty-four: Shield pulls the receiver ID, compares to the quoted recipient, flags mismatch, halts. Thirty-eight thousandths of an ETH that would have been lost — caught before the second signature.

[pause]

Kajota-mesh dot vercel dot app — the counter ticks every real settlement. Eight cycles live, thirty-six transactions across Arbitrum Sepolia and Robinhood Chain. Clone the repo, run the replay script, see Shield halt on your own machine.

[pause]

Built at NEAR HACKATHON. Shield, Mesh, Coach. The thing that catches what pre-sign policy misses.
```

Word count: 211. At 170 wpm that's ~75 s of speech. Plus silences and head/tail: ~82 s total audio. Stays well inside X's 2:20 cap and the playbook's <3:00 hard limit.
