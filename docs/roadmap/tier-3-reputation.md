# Tier 3 — On-chain reputation

> **Hackathon target:** AWS Activate Web3 (with Tier 2).
> **Effort budget:** 5 days solo dev.
> **Risk:** Low — well-trodden patterns from Lens / Farcaster / EAS.

## The user-facing change

Every successful (register → ship → deliver → settle) cycle increments
a soulbound score on both participants' accounts. When Coach Agent
surfaces a wholesaler in `searchSimilarProducts`, it adds a reputation
badge: *"47 completed listings · 96% on-time delivery · 0 unresolved
disputes."*

When a co-seller is browsing potential wholesalers, the agent can say:
*"I found 3 sellers offering this product. Here they are ranked by
reputation."*

Reputation is **portable** — it's the user's, not Kajota's. They can
prove it on any platform that reads the chain.

## Why it matters

Trust is the **single biggest barrier** to cross-network commerce in
African informal markets. Today users repeat the same trust-building
ritual on every new platform:

- Show me your last 5 transactions.
- Vouchers from friends-of-friends.
- WhatsApp screenshots of "thank you" messages.

Tier 3 makes the trust-building cumulative and portable. A wholesaler
who has done 200 successful deals on Kajota carries that history
on-chain forever. New platforms can read it; the wholesaler can attest
to it; the buyer can verify it.

This is the **closest thing Kajota will have to a network moat** —
once a user has accumulated reputation, switching costs to a
competitor are real (they'd start from zero).

## Acceptance criteria

1. After every `Released` event on `CosellEscrow`, both the wholesaler
   and the co-seller see their on-chain `KajotaReputation` NFT score
   tick up by 1 successful cycle.
2. Disputes (filed via a new `CosellEscrow.dispute()` call) tick the
   relevant party's "unresolved" counter; resolution (in their favor or
   against) ticks the appropriate counter.
3. Coach Agent's `searchSimilarProducts` tool returns wholesaler ranks
   sorted by reputation score, with confidence intervals if sample size
   is small.
4. Reputation NFT is **soulbound** — cannot be transferred. Address
   ↔ identity is permanent.
5. Reputation supports **decay** — if a wholesaler hasn't transacted in
   12 months, score decays by 50%. Prevents stale reputation from
   carrying forever.

## Architecture

```
┌─────────────────────────┐
│ CosellEscrow.release()  │
│   emits Released event  │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ KajotaReputation        │  ERC-721 soulbound, one NFT per address.
│  ._handleReleased(event)│  Subscribes to escrow via on-chain event
│  ._handleDispute(event) │  hook (Hardhat-deployed adapter listens
│                         │  for Released, calls Reputation contract).
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ getScore(address)       │  Read function: composite score from
│   returns ScoreView     │  successful + dispute + recency.
└─────────────────────────┘
```

## Files to touch

### `kajota-mesh` (contracts)

**New:** `packages/contracts/contracts/KajotaReputation.sol`

```solidity
contract KajotaReputation is ERC721 {
    struct Score {
        uint64 completedCycles;
        uint64 disputesAgainst;
        uint64 disputesInFavor;
        uint64 lastActivityAt;
        uint64 firstActivityAt;
    }

    mapping(address => Score) private _scores;
    address public immutable escrow;
    address public immutable registry;

    error SoulboundCannotTransfer();
    error OnlyMeshContracts();

    modifier onlyMesh() {
        if (msg.sender != escrow && msg.sender != registry) revert OnlyMeshContracts();
        _;
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        // Mint allowed (auth == address(0)) — transfer not.
        if (auth != address(0)) revert SoulboundCannotTransfer();
        return super._update(to, tokenId, auth);
    }

    function recordSuccessfulRelease(address wholesaler, address coseller) external onlyMesh {
        _bumpSuccess(wholesaler);
        _bumpSuccess(coseller);
    }

    function recordDispute(address party, bool inFavor) external onlyMesh {
        Score storage s = _scores[party];
        if (inFavor) {
            s.disputesInFavor++;
        } else {
            s.disputesAgainst++;
        }
        s.lastActivityAt = uint64(block.timestamp);
    }

    function getScore(address user) external view returns (ScoreView memory) {
        Score memory s = _scores[user];
        uint64 monthsSinceActive = (uint64(block.timestamp) - s.lastActivityAt) / 30 days;
        uint256 decayBps = monthsSinceActive >= 12 ? 5000 : monthsSinceActive * 416;
        uint256 base = s.completedCycles * 100 - s.disputesAgainst * 200;
        uint256 decayed = base * (10_000 - decayBps) / 10_000;
        return ScoreView({
            address_: user,
            score: decayed,
            completedCycles: s.completedCycles,
            disputesAgainst: s.disputesAgainst,
            disputesInFavor: s.disputesInFavor,
            lastActivityAt: s.lastActivityAt,
            firstActivityAt: s.firstActivityAt
        });
    }
}
```

⚠️ **Score formula intentionally simple.** The hard problem is
**preventing gaming** (wholesaler creates 100 burner addresses, fakes
100 escrows). Mitigate via:

1. Per-cycle USDC threshold (e.g., score doesn't count if escrow ≤ $5).
2. Coseller-side identity proof (Polygon ID or Sumsub KYC at registry
   time — burner addresses fail KYC).
3. Off-chain anomaly detection on the backend that monitors for
   round-trip patterns (A → B → A repeatedly).

These mitigations are **out of scope** for the first ship but tracked
explicitly as Tier 3.1.

**Modified:** `CosellEscrow.sol`

Add a call to `KajotaReputation.recordSuccessfulRelease()` inside
`release()`. Requires a constructor parameter for the reputation
address.

**Modified:** `CosellRegistry.sol`

On first `register()` per wholesaler, mint their reputation NFT.

### `kajota-mobile-backend`

**New:** `controller/MeshReputationController.java`

Endpoint: `GET /ai/mesh/reputation/:address` — reads on-chain score,
caches in Mongo for 1 minute, returns enriched DTO.

**New:** `service/ai/tools/ReputationLookupTool.java`

A new Coach Agent tool: `lookupReputation(address)` → returns the score
DTO. Agent uses this in `searchSimilarProducts` response composition.

**Modified:** `service/ai/CoachAgentService.java`

`searchSimilarProducts` should now sort results by reputation desc,
and `proposeListingForPublish` should warn if the listing introduces a
co-seller pair with a flagged history.

### `kajota-coach` (mobile)

**New:** `src/components/ReputationBadge.tsx`

```tsx
export function ReputationBadge({ score }: { score: number }) {
  const tier = score >= 1000 ? 'platinum'
             : score >= 500  ? 'gold'
             : score >= 100  ? 'silver'
             : 'rookie';
  return (
    <View style={styles[tier]}>
      <Feather name="shield" />
      <Text>{score}</Text>
    </View>
  );
}
```

**Modified:** `src/screens/CoachAgentChatScreen.tsx`

When the agent surfaces a wholesaler in its response, render the
ReputationBadge inline with the wholesaler address.

**New:** `src/screens/ReputationProfileScreen.tsx`

User's own reputation profile. Shows completed cycles, disputes,
recent activity timeline, profile NFT image.

### Indexer service (NEW microservice or backend module)

**New:** `service/MeshIndexerService.java`

Background job that:
1. Polls `KajotaReputation` events.
2. Indexes per-address scores into Mongo.
3. Sends push notifications when score crosses tier thresholds
   ("🎉 You hit Gold tier!").

## Sybil resistance and gaming

The single biggest implementation risk for Tier 3 is **sybil attacks**.
Without mitigations, a wholesaler can:

1. Spin up 50 burner co-sellers.
2. Cycle small amounts of USDC through register → deposit → ship →
   release.
3. Boost their reputation to 50 completed cycles fraudulently.

Mitigations (in priority order):

1. **Per-cycle USDC floor** (₦500 equiv. minimum). Below this, no score.
   Cheap to bypass but cuts noise.
2. **Identity proof at registry time** — require a Polygon ID
   credential or Sumsub KYC for both wholesaler and co-seller before
   their first register(). Real cost to acquire identity → real cost
   to sybil.
3. **Network analysis** — off-chain backend monitors for round-trip
   patterns. Flag addresses with score growth that's not matched by
   wallet balance growth (real revenue should produce real holdings).
4. **Slashing** — if a sybil ring is detected, on-chain
   `KajotaReputation.slash(address, amount)` zeroes them out. Admin-
   gated for v1; community-governed via DAO in v3.

For the hackathon submission, **mitigation #1 is sufficient**.
Document the others as v2/v3 work.

## Demo script

The narrative is **trust as a quantified asset**:

1. **0:00-0:15** — Co-seller is shown a list of 5 wholesalers selling
   "rice 50kg bag". Three have reputation badges (gold tier, 47
   completed deals); two are unrated.
2. **0:15-0:25** — Co-seller picks the highest-rated wholesaler.
3. **0:25-0:45** — Standard register → escrow → ship → settle flow,
   compressed.
4. **0:45-1:00** — After settle, profile screen pops up. Animated:
   *"Your reputation score: 487 → 488. Three more deals to Platinum."*
5. **1:00-1:15** — Quick cut to Etherscan showing the NFT on Sepolia.
6. **1:15-1:30** — Voiceover: *"This rating is hers. Not Kajota's. If
   she moves to a competitor tomorrow, this score moves with her."*

## Spikes to run BEFORE committing to scope

🚧 **Spike 1: Soulbound NFT pattern.** 2 hours.

Verify the soulbound override doesn't break Privy's wallet UI
(some wallet apps show "Cannot transfer" errors when trying to display
soulbound tokens).

🚧 **Spike 2: Score formula calibration.** 3 hours.

Simulate ~1000 hypothetical wholesalers with varying transaction
patterns. Check that the score formula produces intuitive rankings
(high-volume + zero-dispute wins, etc.). Adjust weights as needed.

## Timeline (5 days)

| Day | Hours | Deliverable |
| --- | --- | --- |
| Day 1 | 6h | KajotaReputation.sol + tests + deploy to Sepolia. |
| Day 2 | 8h | Wire from CosellEscrow.release → recordSuccessfulRelease. End-to-end on-chain. |
| Day 3 | 8h | MeshReputationController + MeshIndexerService backend. |
| Day 4 | 8h | Mobile: ReputationBadge component, ReputationProfileScreen. Integrate into Coach Agent responses. |
| Day 5 | 8h | Sybil floor mitigation + per-cycle USDC threshold. Demo recording. |

## Dependencies

- **Upstream:**
  - Tier 1 (Mesh loop) — must be live so Released events emit
    naturally.
  - Tier 2 (smart accounts) — reputation is keyed on smart account
    address, not EOA.
- **Downstream:**
  - Tier 5 (WhatsApp) — show reputation badges in WhatsApp catalog
    listings.
  - Tier 6 (Intelligence) — reputation is a feature in the pricing
    oracle (high-rep wholesalers can charge premium).

## Edge cases & open questions

1. **Cross-app reputation read.** Anyone can read on-chain — but
   should we publish a TypeScript SDK so other platforms can integrate
   our score? *Recommendation: yes, but after we have ≥1000 NFTs
   minted (proof of life).*
2. **Privacy.** On-chain history is public. Real names aren't on-chain,
   but transaction patterns may be deanonymizable. Document this in
   the user agreement.
3. **Score recovery after dispute.** If a wholesaler was wrongly
   flagged, can they recover the score? *Recommendation: yes, via
   admin override in v1, community arbitration in v2.*
4. **Multi-address users.** If a user has 3 different addresses, do we
   merge scores? *Recommendation: no, in v1. Encourage one-address-per-
   identity. Address aggregation via World ID in v3.*

## Why this is a moat

Most Web2 marketplaces (Jumia, Konga) lock reputation in their walled
garden. Sellers who leave start over. Tier 3 makes Kajota's reputation
**user-owned** but **Kajota-bootstrapped** — we mint the NFTs and run
the scoring, but the user owns the address. If a Web3-native
competitor wants to use Kajota's reputation data, they can. If a Web2
competitor wants to discount it, they can't because users will demand
it ("I have 500 cycles on-chain, how come you don't show that?").

That's the rare position where being open and being defensible are
the same play.
