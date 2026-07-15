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

## x402 through the hub: FIXED (verified live)
The app now builds the x402 `resource` from X-Forwarded-Proto/Host/Prefix (Caddy
trusts Render via `trusted_proxies private_ranges`), so the challenge/settlement
resource resolves to https://kajota-hub.onrender.com/coach-okx/coach/premium.
The hub `/coach-okx` endpoint settles correctly and is safe to register with OKX.
