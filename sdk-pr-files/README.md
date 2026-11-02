# `sdk-pr-files/` — drop-in files for the one-click-sdk-typescript PR

Target repo: [`defuse-protocol/one-click-sdk-typescript`](https://github.com/defuse-protocol/one-click-sdk-typescript). Target scope documented in [UPSTREAM_PR.md](../UPSTREAM_PR.md) § Stretch.

Three files, all drop-in with no edits beyond what the maintainer may ask for after the first review pass. The PR body itself is in [UPSTREAM_PR.md](../UPSTREAM_PR.md) § "Stretch: `defuse-protocol/one-click-sdk-typescript` PR".

## Files

| Path in this folder | Path in the SDK fork | Role |
|---|---|---|
| `src/verify-destination.ts` | `src/verify-destination.ts` | The helper. Pure, opt-in, no existing code paths touched. |
| `src/__tests__/verify-destination.test.ts` | `src/__tests__/verify-destination.test.ts` | Vitest unit test, 5 cases, mock-based. The near/intents#384 misroute is case 1. |
| `examples/verify-destination.ts` | `examples/verify-destination.ts` | Mainnet integration example. Runs the two #384 tx hashes end-to-end. |

The folder structure matches the SDK's existing one (verified 2026-11-02 against `defuse-protocol/one-click-sdk-typescript@main`): helpers at `src/<name>.ts`, tests at `src/__tests__/<name>.test.ts`. Vitest is the test runner (see `package.json` → `"test": "vitest run"`).

## Drop-in procedure (user drives)

```bash
# From the SDK fork root:
cp <this-worktree>/sdk-pr-files/src/verify-destination.ts src/
cp <this-worktree>/sdk-pr-files/src/__tests__/verify-destination.test.ts src/__tests__/
mkdir -p examples
cp <this-worktree>/sdk-pr-files/examples/verify-destination.ts examples/

# Then re-export the helper from the public surface so SDK consumers can import it.
# Add this line to src/main.ts (NOT src/index.ts — index.ts is openapi-generated;
# main.ts is where quote-signature.ts is re-exported):
#   export * from './verify-destination';
#
# Then:
pnpm install           # if not already
pnpm test              # verify-destination.test.ts should pass
pnpm run build         # dist/ builds cleanly
npx tsx examples/verify-destination.ts   # live mainnet smoke test
```

Expected example output on first run against mainnet (as of 2026-11-02):

```
MISMATCH detected — this is near/intents#384.
  Quoted recipient: b45e38628bce420c8ebbaf0d2c2c12ec9863c7a0a9a04386d704760c085605c6
  Tx 3djtQ3pUHv8SGtNKS3CMGice7E7S9oeS4DJzNYyjCUVD: actual receiver_id = 51e8f94d77b5e90dc9852ca6113771e11e8382ce69473a75e313e41665de7cbe
  Tx jNeJZQ4pa4p69LBiEvTDbTj2WmhCgiKRY2a2scA193j: actual receiver_id = 51e8f94d77b5e90dc9852ca6113771e11e8382ce69473a75e313e41665de7cbe
  Reason: DESTINATION_MISMATCH
```

If the example instead prints `OK — verified 2 tx hash(es), all destinations matched the quote.`, that means `near/intents#384` has been fixed on the solver side and the sink account's post-sign receiver has been corrected. Record that and update the PR body to say the fix is now historical rather than live.

## What to verify before opening the PR

- [ ] `pnpm test` passes (5 cases).
- [ ] `pnpm run build` succeeds; `dist/` includes `verify-destination.{js,mjs,d.ts}`.
- [ ] `npx tsx examples/verify-destination.ts` prints the mismatch block above against live mainnet.
- [ ] `src/main.ts` re-exports the helper so consumers get it via `import { verifyIntentDestination } from '@defuse-protocol/one-click-sdk-typescript'`.
- [ ] A short entry added to `README.md` (SDK repo's root README, not this one) under a "Destination verification" section, pointing at the example.
- [ ] No private keys or test env vars introduced — the helper reads mainnet RPC only, no auth required.
- [ ] License headers match the SDK's style (none required at the top of helpers; the SDK's `quote-signature.ts` has no header).

## What's deliberately NOT in this PR

- **A fix for the underlying solver bug.** That's `near/intents#384`'s own fix, owned by the NEAR Intents team. The helper documents the gap and gives SDK consumers a check, not a cure.
- **Signature verification of the signed payload.** The SDK already has `quote-signature.ts` for pre-signature verification; this helper runs after that step and reads post-sign state. If a reviewer asks us to combine the two, it's a reasonable follow-up PR.
- **Confidential-swap payload decryption.** The helper reads the `execute_intents` args of a public NEAR tx; it does not try to decrypt the confidential payload beyond parsing the signed JSON that lands on-chain. For `recipientType: CONFIDENTIAL_INTENTS` quotes, the SDK caller still gets a readable `receiver_id` from the executed intent (that's the whole #384 defect — the misroute is visible on-chain) so this is enough to catch the live bug.

## Open questions for the reviewer

Named in the PR body itself so they land in the thread, not here:

1. Should the helper also handle `MtWithdraw` and `FtWithdraw` intent types (NEP-245 / NEP-141 withdrawals), or is `Transfer` enough for the SDK's primary swap flows?
2. Should mismatches throw instead of returning a tagged union? Current design returns a union so callers can decide whether to halt or log.
3. If the SDK ever ships its own typed NEAR RPC client, this helper's `readIntentReceiverId` function should move to use it. Happy to split that follow-up into a separate PR.

## Fallback (per UPSTREAM_PR.md)

If this PR stalls past Nov 7 or is explicitly refused, publish the same three files as a standalone npm package `@kajota/near-intents-destination-check` and reference it in the NEAR HACKATHON submission. The code is drop-in in either form.
