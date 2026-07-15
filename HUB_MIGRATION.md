# Deployment moved to the KaJota Hub

The Concierge-for-Slack service on this branch is now served from the
consolidated **kajota-hub** instance behind a path-routing proxy.

| Surface | Current (hub) | Previous (standalone) |
|---|---|---|
| Agent / Slack / MCP | https://kajota-hub.onrender.com/slack | https://kajota-concierge-slack.onrender.com |
| Concierge base (mobile) | https://kajota-hub.onrender.com/concierge | https://kajota-concierge-agent.onrender.com |

The hub strips the `/slack` route prefix, so the app's own paths append after it,
e.g. Slack events = `https://kajota-hub.onrender.com/slack/slack/events`,
slash command = `.../slack/slack/commands/kajota`, MCP = `.../slack/mcp`.

## ⚠️ Reconfigure the Slack app
`docs/slack-hackathon/slack-app-manifest.yaml` now uses the hub URLs, but Slack
only calls whatever is registered in the **Slack app config**. To actually move
traffic, update the Event Subscriptions / Slash Command / Interactivity request
URLs in the Slack app dashboard to the hub URLs above. Until then Slack keeps
hitting the standalone URL. Old URLs are retained here for reference.
