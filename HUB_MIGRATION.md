# Deployment moved to the KaJota Hub

The Coach (agent) and Mesh (skill) services on this branch are now served from
the consolidated **kajota-hub** instance behind a path-routing reverse proxy.

| Service | Current (hub) | Previous (standalone) |
|---|---|---|
| Coach ASP | https://kajota-hub.onrender.com/coach-okx | https://kajota-coach-okx.onrender.com |
| Mesh SKILL | https://kajota-hub.onrender.com/mesh-okx | https://kajota-mesh-okx.onrender.com |

Docs, demo scripts, `asp-manifest.json` (endpoint), and the mobile
`CONCIERGE_AGENT_BASE_URL` default now point at the hub. The old standalone
URLs remain listed here (and as `endpoint_previous` in asp-manifest.json).

## ⚠️ x402 caveat for the OKX ASP flow
The hub strips the `/coach-okx` path prefix before the app sees the request, and
proxies over http internally. The coach x402 challenge builds its `resource`
field from the request URL, so through the hub it currently returns:

    "resource": "http://kajota-hub.onrender.com/coach/premium"

which is missing the `/coach-okx` prefix and uses http. A payer following that
resource hits a 404. **Until the app is patched to honor `X-Forwarded-Proto`
and `X-Forwarded-Prefix` (both are already sent by the hub's Caddy), keep the
OKX ASP registration pointed at the standalone `endpoint_previous`.** Health,
discovery, and non-x402 routes work fine through the hub today.
