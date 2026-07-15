# Deployment moved to the KaJota Hub

The Concierge (agent) and Mesh (skill) services on this branch are now served
from the consolidated **kajota-hub** instance behind a path-routing proxy.

| Service | Current (hub) | Previous (standalone) |
|---|---|---|
| Concierge agent | https://kajota-hub.onrender.com/concierge | https://kajota-concierge-agent.onrender.com |
| Mesh SKILL | https://kajota-hub.onrender.com/mesh-skill | https://kajota-mesh-skill.onrender.com |

Docs, `agentfacts.json`, and the mobile `CONCIERGE_AGENT_BASE_URL` default now
point at the hub. Old standalone URLs are retained here for reference.

Note: any x402 `/coach/premium` flow builds its `resource` from the request URL,
which through the hub loses the `/concierge` prefix and reports http — non-x402
routes (health, chat, proactive) work fine. See kajota-coach-okx HUB_MIGRATION.md.
