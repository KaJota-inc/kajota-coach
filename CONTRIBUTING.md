# Contributing to KaJota Coach

Thanks for your interest in contributing. This repo hosts the KaJota Coach agent and
its Casper Agentic Buildathon integration (branch `hackathon/casper`).

## Getting started

- **Agent (Python):** `pip install -e ./agent` then `pytest agent/tests` (the x402 suite
  runs with no network or keys — 14 tests).
- **Mobile app (React Native / Expo):** `npm install` then `npm run ios`.
- **Casper x402:** see [TESTING.md](TESTING.md) and [agent/CASPER.md](agent/CASPER.md).

## Ground rules

1. **Keep `main` and `hackathon/casper` functional at all times.** Open a feature
   branch and a PR; do not push broken states to a submission branch.
2. **Add tests** for new behavior. The x402 module (`agent/kajota_concierge/x402_casper.py`)
   is fully unit-tested — keep it that way.
3. **Never commit secrets.** `.env.casper` is gitignored; only `.env.casper.example`
   (public values, blank key) is tracked. Keys read from the environment.
4. **Match the surrounding style** — comment density, naming, and idioms of the file
   you are editing.

## Pull requests

- Describe what changed and why. Link any related issue.
- Ensure CI (CodeQL) passes and there are no new High+ security alerts.
- One logical change per PR.

## Reporting bugs / security issues

- Bugs: open a [GitHub issue](https://github.com/KaJota-inc/kajota-coach/issues).
- Vulnerabilities: **do not** open a public issue — see [SECURITY.md](SECURITY.md).
