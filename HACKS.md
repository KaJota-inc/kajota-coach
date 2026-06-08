# Hackathon credentials & branches — kajota-coach

One section per active hackathon target on this repo. Each section
pins:

- the dedicated branch
- where local secrets live (gitignored)
- which `.env.<hack>.example` template seeds local config
- the human-side credential-mint steps

Branches use the `hackathon/<id>` convention, matching the existing
`hackathon/coach` / `hackathon/coach-agent-v2` branches across the
sibling KaJota repos.

---

## Google Cloud Rapid Agent Hackathon (Jun 11, 2026, 2:00 PM PT)

**Track URL:** https://rapid-agent.devpost.com/rules
**Prompt confirmed Jun 8, 2026 via web search.**

| | |
|---|---|
| **Branch** | `hackathon/rapid-agent` |
| **Local env** | `.env.rapid-agent` (gitignored; template `.env.rapid-agent.example`) |
| **Secret store** | `secrets/rapid-agent/` (gitignored; `.gitkeep` keeps the dir) |
| **Render env group** | `kajota-coach-rapid-agent` (Render service env with the values below) |
| **GCP service account** | `kajota-rapid-agent@<project>.iam.gserviceaccount.com` — JSON key lives at `secrets/rapid-agent/gcp-service-account.json` (gitignored) |
| **Status** | Build authorized Jun 8, 2026 — stack pivot from OpenAI/Anthropic to Gemini 3 + ADK + MCP |

### Required stack (per the published prompt)

The Rapid Agent track REQUIRES:

1. **Gemini 3** for reasoning (NOT Gemini 2.5 — the prompt specifies Gemini 3 Pro by name)
2. **Google Cloud Agent Development Kit (ADK)** for the agent runtime
3. **Model Context Protocol (MCP)** to connect the agent to external data/tools
4. **At least one partner integration via MCP**, from:
   - **Arize AI** (LLM observability)
   - **Elastic** (search + analytics)
   - **Fivetran** (data movement)
   - **GitLab** (devops integration)
   - **MongoDB** (data layer)

### Submission deliverables

- Functional agent (running, demonstrable)
- Public open-source repo
- Demo video (Devpost-standard, ≤3 min recommended)
- Devpost submission form completed
- **Deadline:** Jun 11, 2026 2:00 PM PT (judging period Jun 22 – Jul 6)

### Stack mismatch + decision

The coach's `main` branch uses OpenAI/Anthropic. The Rapid Agent prompt
requires Gemini 3 + ADK + MCP. Decision (Jun 8, 2026): keep the
hackathon/rapid-agent branch on a **Gemini ADK + MCP runtime**, separate
from main's OpenAI/Anthropic codepath. Branch divergence is acceptable
for the hack.

### Credentials to mint

#### 1. GCP project + service account

```sh
# <PROJECT_ID> must be globally unique.
gcloud projects create <PROJECT_ID> \
  --name "KaJota Rapid Agent" \
  --set-as-default
gcloud config set project <PROJECT_ID>

# Enable the APIs the agent runtime calls. Vertex AI + Gemini API for
# inference; the new Gemini Enterprise Agent Platform APIs for ADK.
gcloud services enable \
  aiplatform.googleapis.com \
  generativelanguage.googleapis.com

# Create the service account.
gcloud iam service-accounts create kajota-rapid-agent \
  --display-name "KaJota Rapid Agent hackathon"

# Grant Vertex AI access. Add roles as the prompt requires; aiplatform.user
# covers the standard inference path.
gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:kajota-rapid-agent@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Drop the JSON key directly into the gitignored slot.
gcloud iam service-accounts keys create \
  secrets/rapid-agent/gcp-service-account.json \
  --iam-account="kajota-rapid-agent@<PROJECT_ID>.iam.gserviceaccount.com"
```

Verify:
```sh
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/secrets/rapid-agent/gcp-service-account.json"
gcloud auth application-default print-access-token
# should print a token, not an error
```

#### 2. Pick the partner + provision

Pick ONE partner per the prompt requirement. Recommended for KaJota
context:

- **MongoDB** — coach already stores chat session state; a MongoDB
  Atlas MCP server lets the agent query session history. Easiest fit.
- **Elastic** — if the agent needs RAG over product catalogue / docs.
- **GitLab** — if the agent does devops actions.
- **Arize AI** — adds LLM observability; nice judging signal but no
  product features.
- **Fivetran** — data pipeline; least obvious fit for the coach use case.

Provision the partner's MCP server (each has its own docs and
free-tier signup) and set the connection details in
`.env.rapid-agent`.

#### 3. Render env group — `kajota-coach-rapid-agent`

Render won't accept a JSON file directly — use **Secret Files**
(Dashboard → Service → Environment → Secret Files):

| Filename | Contents |
|---|---|
| `gcp-service-account.json` | Paste the full JSON from the local secrets dir |

Then set the env vars (mirror `.env.rapid-agent`):

```
GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/gcp-service-account.json
GCP_PROJECT_ID=<PROJECT_ID>
GCP_REGION=us-central1
GEMINI_MODEL=gemini-3-pro
COACH_BACKEND_URL=https://<this-service>.onrender.com
PARTNER=<arize|elastic|fivetran|gitlab|mongodb>
# … partner-specific MCP server URL + credentials
```

### TODO before the demo

- [x] Rapid Agent track prize prompt published — confirmed Jun 8, 2026
- [x] Confirmed model: **gemini-3-pro** (NOT 2.5 Pro / Flash)
- [ ] Pick + provision a partner MCP server (MongoDB recommended)
- [ ] Stand up the ADK agent runtime — use the codelab as starting point
- [ ] First successful Gemini 3 call from the coach runtime → record below
- [ ] First successful MCP tool call from the agent → record below
- [ ] Provision the Render env group + redeploy the coach service

### Reference docs

- **ADK docs:** https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/adk
- **MCP docs:** https://google.github.io/adk-docs/mcp/
- **Gemini Enterprise Agent Platform:** https://cloud.google.com/blog/products/ai-machine-learning/introducing-gemini-enterprise-agent-platform
- **Official MCP support announcement:** https://cloud.google.com/blog/products/ai-machine-learning/announcing-official-mcp-support-for-google-services

### Verified

_(none yet — fill once the agent successfully calls Gemini 3 via ADK + a partner MCP server)_

---

## Mantle Turing Test (Jun 15, 2026)

See the `hackathon/mantle-turing` branch — that section lives there
because the two hacks have separate credential surfaces and shipping
both on every branch's HACKS.md would create drift.

---

## Adding a new hackathon

1. Cut the branch off `main`: `git checkout -b hackathon/<id>`.
2. Copy `.env.rapid-agent.example` (or the closest existing template)
   → `.env.<id>.example` and adjust.
3. `mkdir -p secrets/<id> && touch secrets/<id>/.gitkeep`.
4. Add a new top-level section to this file mirroring the structure
   above.
5. The repo `.gitignore` already covers `.env.<anything>` (with
   `.env.<anything>.example` re-included) and `secrets/<hack>/*`
   (with `.gitkeep` re-included).
