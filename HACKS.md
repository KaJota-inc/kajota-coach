# Hackathon credentials & branches — kajota-coach

One section per active hackathon target on this repo. Each section
pins:

- the dedicated branch
- where local secrets live (gitignored)
- which `.env.<hack>.example` template seeds local config
- the human-side credential-mint steps

Branches use the `hackathon/<id>` convention, matching the existing
`hackathon/coach` / `hackathon/coach-agent-v2` branches across the
sibling KaJota repos and `hackathon/mantle-turing` on kajota-mesh.

---

## Mantle Turing Test (Jun 15, 2026)

| | |
|---|---|
| **Branch** | `hackathon/mantle-turing` |
| **Local env** | `.env.mantle-turing` (gitignored; template `.env.mantle-turing.example`) |
| **Secret store** | `secrets/mantle-turing/` (gitignored; `.gitkeep` keeps the dir) |
| **Render env group** | `kajota-coach-mantle-turing` (mirror `.env.mantle-turing` into the Render service env) |
| **GCP service account** | _(not used on this hack)_ |
| **Status** | Live deployment on Render (per the project memory note) |

### Credentials to mint

1. **Mantle Sepolia signer EOA.** Generate fresh (`cast wallet new`)
   and fund via <https://faucet.sepolia.mantle.xyz>. Set as
   `DEPLOYER_PRIVATE_KEY`.
2. **Mantlescan API key.** Create at
   <https://explorer.sepolia.mantle.xyz/api-keys>. Set as
   `MANTLESCAN_API_KEY`.
3. **LLM provider key** _(separate from prod)_. Provision a
   hackathon-scoped OpenAI / Anthropic key so hack usage tracks
   separately. Set as `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`.
4. **Managed Mantle RPC** _(optional, recommended)_. Alchemy /
   QuickNode endpoint to avoid public-endpoint rate limits. Set as
   `MANTLE_SEPOLIA_RPC`.

### Render env group — `kajota-coach-mantle-turing`

Variables to mirror from `.env.mantle-turing` into the Render service
env (Render dashboard → Environment → Add env group):

- `MANTLE_SEPOLIA_RPC`
- `DEPLOYER_PRIVATE_KEY`
- `MANTLESCAN_API_KEY`
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`
- `COACH_BACKEND_URL` (the Render service's own URL; circular ref
  intentional for self-discovery)
- `TURING_TEST_TODO` (pin once the track prompt publishes)

### TODO before the demo

- [ ] Mantle Turing track prize prompt published → pin
      Turing-specific env vars in `.env.mantle-turing.example`.
- [ ] First successful Mantle Sepolia deploy → record tx hash + addr
      in the "Deployed" subsection.
- [ ] Provision the Render env group + redeploy the coach service
      with the hackathon/mantle-turing branch.

### Deployed

_(none yet — fill once the first deploy lands)_

---

## Google Cloud Rapid Agent (Jun 11, 2026)

See the `hackathon/rapid-agent` branch — that section lives there
because Rapid Agent is the only hack on this repo using a GCP
service account, so the credential-mint flow is materially
different.

---

## Adding a new hackathon

1. Cut the branch off `main`: `git checkout -b hackathon/<id>`.
2. Copy `.env.mantle-turing.example` → `.env.<id>.example` and adjust.
3. `mkdir -p secrets/<id> && touch secrets/<id>/.gitkeep`.
4. Add a new top-level section to this file mirroring the structure
   above.
5. The repo `.gitignore` already covers `.env.<anything>` (with
   `.env.<anything>.example` re-included) and `secrets/<hack>/*`
   (with `.gitkeep` re-included) — no further gitignore changes
   needed.
