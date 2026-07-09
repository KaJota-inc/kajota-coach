# Security Policy

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Report privately via one of:

1. **GitHub Security Advisories** (preferred) —
   [open a private report](https://github.com/KaJota-inc/kajota-coach/security/advisories/new).
2. Email **security@kajota.io**.

Please include a description, reproduction steps, affected component/branch, and impact.
We aim to acknowledge within 72 hours and to provide a remediation timeline after triage.

## Scope

This repository contains the KaJota Coach agent (Python/FastAPI), its Casper x402
integration (`hackathon/casper`), and the React Native mobile client. The x402 payment
layer settles CEP-18 micropayments on **Casper Testnet only** — no mainnet funds are at
risk in this submission.

## Secrets

- No secrets are committed. `agent/.env.casper` is gitignored; only
  `agent/.env.casper.example` (public values, blank API key) is tracked.
- All keys (CSPR.cloud facilitator key, signer PEM path) are read from the environment.
- If you believe a key was exposed, report it privately as above so it can be rotated.

## Supported Versions

The `hackathon/casper` branch is the actively maintained Buildathon submission.
