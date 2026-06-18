# Tier 7 — Multi-chain + cross-border

> **Hackathon target:** ETHGlobal NY 2026 finale.
> **Effort budget:** 6 days solo dev (after Tiers 1, 2, 5 land).
> **Risk:** Medium — well-trodden multi-chain patterns but each new
> chain has its own debugging tail.

## The user-facing change

Today: a Nigerian wholesaler and Kenyan co-seller cannot transact
through Kajota because:

- Mesh contracts only exist on Ethereum Sepolia (testnet).
- USDC liquidity is on different chains in different regions (Polygon
  for Kenya, Base for crypto-native users, Mantle for Africa-focused
  rollouts).
- FX between NGN ↔ KES is friction-heavy in both directions.

After Tier 7:

1. The Nigerian wholesaler registers a listing on **Mantle** (where
   Kajota's main contracts live for production).
2. The Kenyan co-seller can pay deposit in USDC on **Polygon** (where
   Kenyan users already have liquidity).
3. **LI.FI** abstracts the cross-chain routing — funds appear in
   wholesaler's Mantle wallet within seconds.
4. Wholesaler can withdraw to NGN bank via Yellow Card; co-seller's
   commission appears in their Polygon USDC, withdrawable to KES via
   Kotani Pay.

The chain becomes routing infrastructure rather than friction.

## Why it matters

Africa-to-Africa trade is **$300 billion annually**, of which only a
small fraction is recorded in formal banking. Cross-border friction
(FX, correspondent banking, time delays, distrust) is the main
bottleneck.

Stablecoins solve the FX problem. Bridges solve the chain problem.
Kajota's job is to surface this as a single UX: *"this Nigerian
wholesaler will sell to you, here's the deal, pay in your USDC, done."*

## Acceptance criteria

1. Mesh contracts redeployed to:
   - **Mantle mainnet** (primary)
   - **Base** (secondary, for Western co-sellers)
   - **Polygon** (East African users)
   - Sepolia stays as canary / hackathon demo network.
2. Listing on Mantle. Co-seller on Polygon. Deposit on Polygon →
   LI.FI bridge → Mantle CosellEscrow receives funds. End-to-end in
   ≤30 seconds.
3. Settlement to wholesaler on Mantle, co-seller's commission share
   bridged back to Polygon (or wherever they want).
4. Coach Agent's `proposeListingForPublish` tool surfaces *"this
   listing will be on Mantle. Buyer can pay from any of: Mantle, Base,
   Polygon, Arbitrum"* — uses chain detection.
5. All bridge actions show clear progress UI (estimated time,
   intermediate states).
6. If bridging fails midway, funds are refundable.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        BUYER ON POLYGON                                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ User taps "Deposit ₦50,000 to escrow"                           │   │
│  │ Privy smart account on Polygon holds USDC                       │   │
│  └────────────┬────────────────────────────────────────────────────┘   │
└───────────────┼────────────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────┐
│  LI.FI SDK call                           │
│  fromChain: 137 (Polygon)                 │
│  fromToken: USDC.e                        │
│  toChain: 5000 (Mantle)                   │
│  toToken: USDC                            │
│  toAddress: CosellEscrow on Mantle        │
└───────────────┬───────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────┐
│  LI.FI route execution                    │
│  - Approves USDC on Polygon               │
│  - Calls Across / Stargate bridge         │
│  - Bridge attestation                     │
│  - Funds arrive in Mantle USDC            │
└───────────────┬───────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────┐
│  CosellEscrow.deposit() on Mantle         │
│  (Tier 1 contract, redeployed)            │
│  emits Deposited event                    │
└───────────────────────────────────────────┘
```

## Files to touch

### `kajota-mesh` (contracts)

Multi-chain deploys with the same source.

**New:** `packages/contracts/deploy/multichain.config.ts`

```ts
export const DEPLOY_TARGETS = {
  sepolia: { chainId: 11155111, rpc: process.env.SEPOLIA_RPC, isTestnet: true },
  mantleSepolia: { chainId: 5003, rpc: process.env.MANTLE_SEPOLIA_RPC, isTestnet: true },
  mantle: { chainId: 5000, rpc: process.env.MANTLE_RPC, isTestnet: false },
  base: { chainId: 8453, rpc: process.env.BASE_RPC, isTestnet: false },
  polygon: { chainId: 137, rpc: process.env.POLYGON_RPC, isTestnet: false },
};
```

**New:** `packages/contracts/scripts/deploy-all-chains.ts`

Iterates targets, deploys CosellRegistry + CosellEscrow + Verifier,
saves addresses per chain to a deployment manifest.

⚠️ **Chainlink Functions availability per chain:** Mantle and Base both
have Functions; Polygon Mumbai has it but Mainnet rollout was Q2 2026.
Verify before committing to deploy.

### `kajota-mobile-backend`

**Modified:** `application-docker.yml`

```yaml
mesh:
  chains:
    sepolia:
      chain-id: 11155111
      registry-address: ${MESH_SEPOLIA_REGISTRY}
      escrow-address: ${MESH_SEPOLIA_ESCROW}
      verifier-address: ${MESH_SEPOLIA_VERIFIER}
      rpc-url: ${MESH_SEPOLIA_RPC}
    mantle:
      chain-id: 5000
      registry-address: ${MESH_MANTLE_REGISTRY}
      escrow-address: ${MESH_MANTLE_ESCROW}
      verifier-address: ${MESH_MANTLE_VERIFIER}
      rpc-url: ${MESH_MANTLE_RPC}
    base:
      # ...
    polygon:
      # ...
```

**New:** `service/MeshChainRegistry.java`

Service that exposes per-chain contract addresses and clients. Used by
every Mesh-related controller and tool.

```java
@Service
public class MeshChainRegistry {
    public Web3j getClient(String chainName);
    public String getRegistryAddress(String chainName);
    public String getEscrowAddress(String chainName);
    public String getVerifierAddress(String chainName);
    public boolean isMainnet(String chainName);
}
```

**Modified:** Every controller that hardcodes a chain ID/address.

**New:** `service/MeshLifiService.java`

Wraps LI.FI's API for cross-chain quotes / executions. Used when a
buyer initiates a deposit on a chain different from where the listing
lives.

```java
public RouteQuote getQuote(String fromChain, String fromToken,
                            String toChain, String toToken,
                            String fromAddress, String toAddress,
                            BigInteger amount) {
    // Call https://li.quest/v1/quote with the params.
}
```

**Modified:** `service/ai/CoachAgentService.java`

`proposeListingForPublish` accepts an optional `chainName` parameter.
Defaults to the user's preferred chain (read from user profile). New
tool: `getSupportedChains` so the agent can recommend the best one
for the user's currency / region.

### `kajota-coach` (mobile)

**Modified:** `App.tsx`

```tsx
<PrivyProvider config={{
  smartAccount: {
    chains: [
      { id: 11155111, name: 'sepolia' },
      { id: 5000, name: 'mantle' },
      { id: 8453, name: 'base' },
      { id: 137, name: 'polygon' },
    ],
    defaultChain: { id: 5000 },
  }
}}>
```

**Modified:** `src/services/mesh.ts`

Every Mesh interaction now requires a `chainName` parameter. Routing
logic per environment.

**New:** `src/screens/MeshChainSelectionScreen.tsx`

Modal between "Sign on Mesh" tap and the actual signing. Asks: *"Pay
from which chain?"* Recommends the cheapest route via LI.FI quote.

**New:** `src/services/lifi.ts`

```typescript
export async function getBridgeRoute(params: BridgeParams): Promise<Route> {
  const response = await fetch('https://li.quest/v1/quote?...');
  return response.json();
}
```

**New:** `src/screens/MeshBridgeProgressScreen.tsx`

Visual state machine: *"Approving USDC on Polygon → Bridging via
Across → Confirmation on Mantle → Funds in escrow"*. Updates every
3 seconds. Total time ~30 seconds in steady state.

## Chain choice rationale

Why Mantle for primary deployment?

- **Native USDe support.** Mantle's mETH and broader DeFi presence
  makes it the natural home for Africa-focused stablecoin commerce.
- **Cheap gas.** Mantle Sepolia testnet has < $0.001/tx in real terms.
- **Active grants program.** Mantle Turing Test + Builder Grants align
  with Kajota's narrative.
- **EVM-compatible.** Same Solidity, same tools.

Why Polygon for East African users?

- **Massive USDC liquidity.** ~$300m USDC on Polygon Mainnet, the
  biggest pool outside Ethereum L1.
- **MoonPay / Onramper integration.** Many Kenyan users already have
  USDC on Polygon via M-Pesa onramps.
- **Cheap gas.** ~$0.001/tx.

Why Base?

- **For Western co-sellers** who source from African wholesalers.
- Strong Privy support, mature smart-account ecosystem.

Why keep Sepolia?

- **Hackathon demo network.** Faucets, free, no real money at stake.
- **Testing breaking changes** before mainnet deploy.

## Demo script (ETHGlobal NY 2026 grand finale)

The narrative is **"the chain disappears, commerce remains."**

1. **0:00-0:15** — Lagos wholesaler ("Adura") opens Coach Agent. *"I
   have 200kg of rice for resale. Help me list it."* Agent drafts.
2. **0:15-0:25** — *"Publish on Mesh"* → Adura defaults to **Mantle**.
   Coach explains: *"Best route for African co-sellers. ~₦10 in gas."*
3. **0:25-0:40** — Cut to Nairobi co-seller ("Wanjiku") receiving a
   WhatsApp ping (Tier 5): *"Adura has rice 200kg in stock for resale.
   ₦120,000."* Wanjiku says *"OK, I want 50kg."*
4. **0:40-1:00** — Wanjiku taps the payment link. She has USDC on
   **Polygon**. Coach (on her side, automatically) gets a LI.FI quote:
   *"₦60,000 = $36 USDC. Best route: Polygon → Mantle via Across. Total
   time ~25 sec."* Wanjiku approves with face-ID.
5. **1:00-1:25** — Progress screen counts down: Approving → Bridging
   (Polygon side) → Bridging (Mantle side) → CosellEscrow.deposit.
   Final state: *"Deposited."*
6. **1:25-1:45** — On Adura's side: notification *"Wanjiku deposited.
   Ship when ready."*. Adura ships, courier API confirms (Tier 1).
   Funds split: Adura receives ₦51,000 in Mantle USDC, Wanjiku's
   wallet shows the goods.
7. **1:45-2:00** — Final overlay: *"From Lagos to Nairobi. Five
   chains involved. Zero MetaMask popups. Zero seed phrases. Two
   people did business."*

## Spikes to run BEFORE committing to scope

🚧 **Spike 1: LI.FI cross-chain reliability.** 4 hours.

Run 10 cross-chain quotes on testnets. Measure success rate, latency.
LI.FI rejects ~5-10% of routes for liquidity reasons — make sure our
fallback paths cover gracefully.

🚧 **Spike 2: Mantle mainnet vs Mantle Sepolia parity.** 2 hours.

Some contracts behave differently on L2 vs L1-style mainnets. Deploy
the same Solidity to both, run integration tests.

🚧 **Spike 3: Polygon ↔ Mantle bridge fees.** 1 hour.

Calculate fee bands at different deposit sizes ($10, $50, $500). The
fixed overhead of bridging may make micro-deposits uneconomical;
document a minimum.

## Timeline (6 days)

| Day | Hours | Deliverable |
| --- | --- | --- |
| Day 1 | 8h | Spikes 1-3. Multi-chain deploy config. |
| Day 2 | 8h | Deploy all three contracts to Mantle Sepolia, Base Sepolia, Polygon Amoy. |
| Day 3 | 8h | Backend MeshChainRegistry + MeshLifiService. |
| Day 4 | 8h | Mobile: chain selection modal, bridge progress UI. |
| Day 5 | 8h | End-to-end cross-chain demo on testnets. |
| Day 6 | 8h | Mainnet deploys (Mantle, Polygon, Base). Demo recording. |

## Dependencies

- **Upstream:** Tier 1 (Mesh loop) is required since the same loop
  needs to work on each new chain. Tier 2 (smart accounts) is required
  for the multi-chain wallet UX to feel native.
- **Downstream:** Tier 6 (intelligence) — multi-region pricing data
  becomes essential when sellers are bridging value across countries.

## Open questions

1. **Liquidity bootstrapping on Mantle.** USDC on Mantle has thin
   liquidity vs Polygon. Need to either partner with Stargate /
   Hyperlane for guaranteed bridge depth, or pre-fund.
2. **Compliance.** Cross-border money movement triggers AML in some
   jurisdictions. Need legal review before mainnet launch outside
   Nigeria.
3. **MEV.** Cross-chain bridging is MEV-prone. LI.FI handles it but
   we should monitor slippage on real flows.
4. **Settlement timing UX.** 30 seconds is the steady state; outliers
   can be ~3 minutes. Coach Agent should set expectations clearly and
   give buyers a way to cancel if stuck.

## Why this is THE ETHGlobal demo

ETHGlobal hackathons reward integration depth and real-world stories.
Tier 7 combined with prior tiers tells a story that has both:

- **Integration:** Chainlink Functions + LI.FI + Privy smart accounts +
  4 chains + Yellow Card fiat + WhatsApp Business API + Gemini Live.
- **Story:** Two African informal traders do business across borders
  in 90 seconds. Zero seed phrases. Zero crypto literacy needed.

Most ETHGlobal demos pick one. Kajota's full stack picks both, and
each integration is justified by a real user problem rather than
"because crypto." That's the rare submission that wins.

## Endgame: Kajota as continental commerce infrastructure

The seven tiers, taken together, produce something larger than a
mobile app. They produce **the substrate** that any African informal-
commerce platform can build on:

- Mesh = the trust layer (Tier 1, 7).
- Coach Agent = the AI sales floor (Tier 4, 5).
- Reputation = the network moat (Tier 3).
- Onramp = the on/off-ramp to fiat (Tier 2).
- Intelligence = the pricing signal (Tier 6).

This is the infrastructure thesis: Kajota isn't trying to win African
informal commerce by hoarding users. It's trying to win by becoming
the layer that everyone else builds on top of. The hackathon
submissions are not just demos — they're proof points that the layer
works.
