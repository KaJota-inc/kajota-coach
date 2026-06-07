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

## Google Cloud Rapid Agent (Jun 11, 2026)

| | |
|---|---|
| **Branch** | `hackathon/rapid-agent` |
| **Local env** | `.env.rapid-agent` (gitignored; template `.env.rapid-agent.example`) |
| **Secret store** | `secrets/rapid-agent/` (gitignored; `.gitkeep` keeps the dir) |
| **Render env group** | `kajota-coach-rapid-agent` (Render service env with the values below) |
| **GCP service account** | `kajota-rapid-agent@<project>.iam.gserviceaccount.com` — JSON key lives at `secrets/rapid-agent/gcp-service-account.json` (gitignored) |
| **Status** | Hack target — provision per the steps below |

### Credentials to mint

#### 1. GCP project + service account

Pick (or create) a GCP project dedicated to the hack so usage
attribution is clean:

```sh
# Replace <PROJECT_ID> with the project you want — must be unique
# across all of GCP.
gcloud projects create <PROJECT_ID> \
  --name "KaJota Rapid Agent" \
  --set-as-default

gcloud config set project <PROJECT_ID>

# Enable the APIs the agent runtime calls.
gcloud services enable aiplatform.googleapis.com
```

Create the service account + key:

```sh
gcloud iam service-accounts create kajota-rapid-agent \
  --display-name "KaJota Rapid Agent hackathon"

# Grant Vertex AI access (adjust the role list to whatever the
# Rapid Agent track prompt actually requires).
gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:kajota-rapid-agent@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Drop the JSON key directly into the gitignored slot.
gcloud iam service-accounts keys create \
  secrets/rapid-agent/gcp-service-account.json \
  --iam-account="kajota-rapid-agent@<PROJECT_ID>.iam.gserviceaccount.com"
```

Then populate `.env.rapid-agent`:

```
GCP_PROJECT_ID=<PROJECT_ID>
GCP_REGION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=./secrets/rapid-agent/gcp-service-account.json
VERTEX_MODEL=gemini-2.5-pro
```

Verify the key works:

```sh
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/secrets/rapid-agent/gcp-service-account.json"
gcloud auth application-default print-access-token
# should print a token, not an error
```

#### 2. Render env group — `kajota-coach-rapid-agent`

Render won't accept a JSON file directly — paste the contents of
`secrets/rapid-agent/gcp-service-account.json` as a secret file
mount, or base64-encode and inject as a single env var.

Recommended: use Render's **Secret Files** feature (Dashboard →
Service → Environment → Secret Files):

| Filename | Contents |
|---|---|
| `gcp-service-account.json` | Paste the full JSON from the local secrets dir |

Then set:

```
GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/gcp-service-account.json
GCP_PROJECT_ID=<PROJECT_ID>
GCP_REGION=us-central1
VERTEX_MODEL=gemini-2.5-pro
COACH_BACKEND_URL=https://<this-service>.onrender.com
```

### TODO before the demo

- [ ] Rapid Agent track prize prompt published → pin
      `RAPID_AGENT_TODO` placeholders in
      `.env.rapid-agent.example`.
- [ ] Confirm the exact Gemini model id the track expects
      (`gemini-2.5-pro` vs flash vs an experimental tag).
- [ ] First successful Vertex AI call from the coach runtime →
      record in this doc under "Verified".
- [ ] Provision the Render env group + redeploy the coach service
      with the `hackathon/rapid-agent` branch.

### Verified

_(none yet — fill once the agent successfully calls Vertex AI)_

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
