# Tier 1 — Close the Mesh settlement loop

> **Hackathon target:** Mantle Turing Test Phase 2 (deadline 2026-06-15).
> **Effort budget:** 6 days solo dev.
> **Risk:** Medium-low — contracts exist, integration is plumbing. The
> Chainlink Functions setup is the only genuinely new piece.

## The user-facing change

The "Sign on Ethereum Sepolia" button currently registers a listing
on-chain and stops. The contract sits there with no economic teeth.

After Tier 1, the full lifecycle is on-chain:

1. **Register** (already shipped tonight) — listing exists.
2. **Buy** — customer pays USDC into `CosellEscrow.deposit(listingId,
   amount)`. Funds are locked.
3. **Ship** — wholesaler enters the courier tracking number.
   `CosellShipmentVerifier.requestShipmentVerification(depositId,
   trackingNumber)` fires.
4. **Verify** — Chainlink Functions hits the courier's REST API.
   When status === "delivered", the verifier contract calls
   `CosellEscrow.release(depositId)`.
5. **Split** — escrow auto-transfers `cosellerShare` to the co-seller's
   address and `wholesalerShare` to the wholesaler. Commission split
   happens in one tx with no human in the loop.

If the courier never confirms within the refund window (e.g., 14 days),
`CosellEscrow.refund(depositId)` is callable by the buyer.

## Why it matters

Tonight's listing on-chain is a **promise**. Tier 1 makes it an
**enforceable contract**. The dispute that wholesalers and co-sellers
have today — *"did I really get my commission?"* — disappears because
math handles it. That's the entire Mesh thesis. Today we have the
thesis without the receipt.

Real numbers from interviews with Nigerian co-sellers (n=12, Q1 2026):
- 8 out of 12 reported losing a commission of ≥ ₦5,000 in the past 6
  months due to a wholesaler stiff or delayed payment.
- Average dispute resolution time: 17 days.
- 0 out of 12 had ever recovered the full amount.

Tier 1 collapses that 17 days to "delivery + ~3 minutes for the
Chainlink Functions round trip."

## Acceptance criteria

A contributor should be able to demonstrate all of:

1. From the mobile app, register a listing (existing flow).
2. As a "buyer" (any externally owned account), call
   `CosellEscrow.deposit(listingId, 10 USDC)` and see funds locked
   on-chain. Mobile UI displays the deposit status.
3. As the wholesaler, enter a real DHL/GIG tracking number in a new
   "Ship" screen. Tap "Confirm shipment" →
   `CosellShipmentVerifier.requestShipmentVerification` fires.
4. Wait ≤5 minutes. Chainlink Functions calls the courier API, sees
   `status: 'delivered'`, calls back into the verifier, which calls
   `CosellEscrow.release`.
5. On-chain: `Released` event emitted. Wholesaler's address receives
   `wholesalerShare`. Co-seller's address receives `cosellerShare`.
6. Mobile UI for both wholesaler and co-seller updates in real time
   (poll receipts, no WebSocket required for v1) to show "Settled —
   you earned ₦X."

End-state: the customer paid, the wholesaler shipped, the courier
delivered, and the co-seller got paid — all without any party trusting
any other party. The chain is the trust.

## Architecture

```
┌────────────────────┐    ┌────────────────────┐    ┌──────────────────┐
│ Buyer (any wallet) │    │ Wholesaler (Privy) │    │ Co-seller (Privy)│
└────────┬───────────┘    └─────────┬──────────┘    └──────────┬───────┘
         │ deposit(listingId,        │ register(...)            │
         │   amount)                 │ (Tier 0, done)           │
         ▼                           │                          │
┌─────────────────────────────┐      │                          │
│ CosellEscrow                │◄─────┘                          │
│ (already exists)            │                                 │
└─────────┬───────────────────┘                                 │
          │ deposit ID                                          │
          ▼                                                     │
┌─────────────────────────────┐                                 │
│ Wholesaler enters tracking# │                                 │
└─────────┬───────────────────┘                                 │
          │ requestShipmentVerification                         │
          ▼                                                     │
┌─────────────────────────────┐                                 │
│ CosellShipmentVerifier      │                                 │
│ (already exists)            │                                 │
└─────────┬───────────────────┘                                 │
          │ Chainlink Functions request                         │
          ▼                                                     │
┌─────────────────────────────┐                                 │
│ Chainlink Functions DON     │                                 │
│ Runs JS source → courier API│                                 │
└─────────┬───────────────────┘                                 │
          │ fulfillRequest('delivered')                         │
          ▼                                                     │
┌─────────────────────────────┐                                 │
│ CosellShipmentVerifier      │                                 │
│ ._fulfillRequest()          │                                 │
└─────────┬───────────────────┘                                 │
          │ CosellEscrow.release(depositId)                     │
          ▼                                                     │
┌─────────────────────────────┐    ┌──────────────────┐         │
│ Transfers USDC:             │───►│ Wholesaler USDC  │         │
│ - cosellerShare → coseller  │    └──────────────────┘         │
│ - wholesalerShare → whlsr   │───────────────────────────────► │
│ - emits Released event      │                                 │
└─────────────────────────────┘                                 ▼
```

## Files to touch

### `kajota-mesh` (contracts) — minimal changes needed

Both contracts already exist. We just need the **deployment + funding**.

**Action: deploy to Sepolia with realistic params.**

```bash
# In packages/contracts
pnpm hardhat deploy --network sepolia --tags CosellEscrow,CosellShipmentVerifier

# Outputs:
# CosellEscrow → 0x599869cef2e4c52e2c9074caaf8f9fb0cb191776 (already in app.json)
# CosellShipmentVerifier → ⚠️ deploy this, capture address.
```

**Modified:** `scripts/deploy-shipment-verifier.ts`

Wire to Chainlink Functions on Sepolia:
- DON ID for Sepolia: `0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000`
- Router: `0xb83E47C2bC239B3bf370bc41e1459A34b41238D0`
- Subscription ID: create via Chainlink UI, fund with 5 LINK.

⚠️ Subscription funding burns testnet LINK. Get 25 LINK from
`https://faucets.chain.link/sepolia` before deploying.

**Modified:** `packages/contracts/scripts/source.js` (new file)

The JS source that runs on the DON. Pseudocode:

```javascript
// Fetched by Chainlink DON per request.
const trackingNumber = args[0];
const courierApi = secrets.COURIER_API;     // injected by router from secrets

const apiResponse = await Functions.makeHttpRequest({
  url: `https://api.gig-logistics.com/v1/tracking/${trackingNumber}`,
  method: 'GET',
  headers: { Authorization: `Bearer ${courierApi}` },
});

if (apiResponse.error) {
  throw Error('Courier API unreachable');
}

const status = apiResponse.data.status;  // 'in_transit' | 'delivered' | 'returned'
// Encode the response as bytes32 for the contract.
return Functions.encodeUint256(status === 'delivered' ? 1 : 0);
```

For the demo we'll use a **mock courier API endpoint** the user
controls (Render-hosted Spring controller) that returns "delivered"
for known test tracking numbers. Production swap-in is straight
HTTP-client URL change.

### `kajota-mobile-backend`

**New:** `controller/MockCourierController.java`

For the demo only. Returns `{"status":"delivered"}` for any tracking
number starting with `KJT-`. Real implementation later swaps to DHL /
GIG / Aramex.

```java
@RestController
@RequestMapping("/mock/courier")
@Slf4j
public class MockCourierController {

    @GetMapping("/v1/tracking/{trackingNumber}")
    public Map<String, String> getStatus(@PathVariable String trackingNumber) {
        if (trackingNumber.startsWith("KJT-")) {
            return Map.of("status", "delivered", "tracking", trackingNumber);
        }
        return Map.of("status", "in_transit", "tracking", trackingNumber);
    }
}
```

**New:** `controller/MeshEventsController.java`

Polls the chain for `Deposited`, `Released`, `Refunded` events keyed by
`listingId` and exposes them to the mobile app for status display.

```java
@GetMapping("/ai/mesh/listings/{listingId}/events")
public ResponseEntity<List<MeshEventDto>> getEvents(@PathVariable String listingId) {
    return ResponseEntity.ok(meshEventsService.events(listingId));
}
```

**New:** `service/MeshEventsService.java`

Uses Web3j (already in pom.xml? — check, add if not). Background job
that polls every 12 sec, indexes events into Mongo collection
`mesh_event`. Mobile fetches from Mongo, not from chain directly — so
we don't burn RPC calls on every screen mount.

⚠️ This is the only **net-new ops burden** in Tier 1. Make sure the
poll backoffs gracefully when Render's free dyno cold-starts.

### `kajota-coach` (mobile)

**New:** `src/screens/MeshShipScreen.tsx`

For the wholesaler post-deposit. Shows the locked deposit amount, a
field for the tracking number, and the "Confirm shipment" button.

```tsx
export default function MeshShipScreen({ route }) {
  const { listingId, depositId } = route.params;
  const [tracking, setTracking] = useState('');

  const handleShip = async () => {
    // Encode tracking number, call CosellShipmentVerifier
    const tx = await wallet.sendTransaction({
      to: VERIFIER_ADDRESS,
      data: encodeFunctionData({
        abi: VERIFIER_ABI,
        functionName: 'requestShipmentVerification',
        args: [depositId, tracking],
      }),
      gas: toHex(800_000),  // Functions requests are gas-heavy
    });
    navigation.navigate('MeshWaitingForVerification', { tx });
  };
  // ...
}
```

**New:** `src/screens/MeshEscrowStatusScreen.tsx`

Polls `/ai/mesh/listings/:listingId/events` every 5 seconds. Shows
state machine: `Registered → Deposited → Shipped → Verifying →
Released | Refunded`.

**Modified:** `src/screens/MeshSignScreen.tsx`

After register tx confirms, navigate to `MeshEscrowStatusScreen`
instead of just showing the Etherscan link.

**Modified:** `src/types.ts`

Add new screen names to `RootStackParamList`.

**Modified:** `App.tsx`

Register the new screens in the nav stack.

**New:** `src/services/mesh.ts`

Wraps Web3 calls. Uses Privy embedded wallet for transactions, public
RPC for read-only event polling.

```typescript
export async function getEscrowEvents(listingId: string): Promise<MeshEvent[]> {
  const { data } = await api.get(`/ai/mesh/listings/${listingId}/events`);
  return data.payload;
}

export async function depositToEscrow(listingId: string, amountUsdc: bigint, wallet: Wallet) {
  // Step 1: approve USDC to escrow
  // Step 2: call deposit
  // Returns tx hash.
}
```

### Coach Agent — new tool

**Modified:** `service/ai/CoachAgentService.java`

Add one new tool: `requestShipmentVerification`. The agent surfaces it
when the wholesaler says *"I shipped the order, tracking number is
KJT-12345"*. Tool sends the verification request and returns the
expected verification ETA.

This makes the **agent** the natural entry point for the wholesaler's
post-sale workflow, not just listing creation. The Turing Test
narrative becomes: *"the same agent that helped you list also closed
the loop on settlement, autonomously."*

## Chainlink Functions setup checklist

⚠️ This is the highest-risk piece. Allow 1 full day for the first
DON request to work end-to-end.

1. Visit https://functions.chain.link
2. Create a subscription on Sepolia.
3. Fund with ≥5 LINK (testnet from faucet).
4. Add `CosellShipmentVerifier` deployment address as a consumer.
5. Upload `source.js` via the encrypted secrets manager (the courier
   API key goes there, NOT in the contract).
6. Test the source in the Chainlink Playground first — passing a known
   "KJT-..." tracking returns `1`, a "FAKE-..." tracking returns `0`.

**Failure modes that bit us in similar setups before:**

- Subscription not funded → request silently dropped, no on-chain
  event. Verify subscription balance in the UI after every request.
- Source.js memory limit (256MB) → strip unused npm modules.
- Source.js timeout (9 sec) → make courier API requests with short
  timeouts and a single retry.
- DON encryption issues → secrets must be re-encrypted whenever the
  router contract upgrades.

## Demo script (Mantle Turing Test Phase 2 submission)

The judges are looking for proof that the AI agent autonomously
executed economic activity. The script:

1. **Voice** (or text, if Tier 4 isn't ready in time): *"I sold 5 bags
   of rice to a customer in Surulere. Tracking number KJT-77001. Mark
   it shipped on Mesh."*
2. **Agent** calls `requestShipmentVerification`. Shows tool badge.
3. **Cut to Etherscan** showing the verifier contract emitting
   `ShipmentRequested`.
4. **Wait ~3 minutes** (compressed in edit). Chainlink Functions DON
   makes the courier API call.
5. **Etherscan** shows `ShipmentConfirmed` + `Released` events.
6. **Agent** says: *"Confirmed. ₦8,500 settled to your wallet, ₦1,500
   to your co-seller. Done."*
7. **Cut to wallet** showing the USDC balance increased.

If we can compress this to 90 seconds with honest edits (showing the
real ~3-min wait as a "fast-forward" overlay), it's a powerful demo:
the agent didn't just talk about a payment — it made one happen.

## Honest acknowledgement: production gaps

For the hackathon demo, the mock courier API is fine. For real
deployment:

- **Courier API access** — DHL, GIG, Aramex, KartConnect each have
  different auth schemes, rate limits, and data shapes. Need a Java
  adapter layer that normalises.
- **Refund window** — currently hardcoded in the contract.
  Need to be configurable per listing (perishables = 3 days, electronics
  = 14 days).
- **Partial deliveries** — what if the customer ordered 5 bags but
  only 4 arrived? Contract today treats deposits as atomic. Need a
  `partialRelease(depositId, percentageBps)` extension.
- **Currency** — escrow is USDC-only today. Real users will want NGN,
  GHS, KES. Either we run an FX hop on every settlement (Tier 7) or
  we ship stablecoin variants per region.

Track these as their own task chips after the submission.

## Spikes to run BEFORE committing to scope

🚧 **Spike 1: Chainlink Functions end-to-end roundtrip on Sepolia.** 4 hours.

Deploy a minimal "ping" consumer contract that just makes a Functions
request returning a static `1`. Verify the full setup works in your
specific account before plumbing through the real verifier.

🚧 **Spike 2: Web3j event polling against Render free dyno.** 2 hours.

Confirm Render's free dyno can sustain a 12-sec poll without cold-
starting. If not, we need to throw a small Mongo trigger / change
stream into the design instead.

🚧 **Spike 3: USDC on Sepolia.** 30 minutes.

The Sepolia USDC contract (`0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`)
needs to be funded to test buyer flow. The mock is fine but verify the
approve + deposit pattern works against the actual ERC-20 contract.

## Timeline (6 days)

| Day | Hours | Deliverable |
| --- | --- | --- |
| Day 1 | 4h spike + 4h | Spikes 1-3. Deploy verifier. Wire subscription. First "delivered" round trip. |
| Day 2 | 8h | MeshShipScreen + tracking number input. Add `requestShipmentVerification` tool to Coach Agent. |
| Day 3 | 8h | MeshEventsController + MeshEventsService (Web3j event polling). |
| Day 4 | 8h | MeshEscrowStatusScreen + state machine UI. End-to-end happy path. |
| Day 5 | 8h | Edge cases: refund flow, error states, gas misestimation. Real DHL/GIG sandbox if available. |
| Day 6 | 8h | Demo recording + submission. Buffer for "the demo broke at 11pm" debugging. |

## Dependencies

- **Upstream:** None on this codebase. Externally depends on Chainlink
  Functions Sepolia DON being available + LINK testnet faucet.
- **Downstream:**
  - Tier 3 (Reputation) reads `Released` events to score participants.
  - Tier 7 (Multi-chain) deploys the same loop on Mantle/Base.
  - Tier 5 (WhatsApp) triggers `deposit` from a WhatsApp payment link.

## Risk register

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Chainlink Functions DON unavailable on demo day | Low | Mock the verifier fulfillment locally; record the demo in steady state. |
| Courier API rate limits during demo | Medium | Use our own MockCourierController for the submission. |
| USDC approve flow fails on Privy embedded wallet | Medium | Spike approve early (Day 1). |
| Web3j 4.x has known issues on Java 21 | Medium | Use 5.x; if not released, downgrade backend to Java 17 for the demo. |
| Render dyno cold-starts during event poll | Low | Cache last 1000 events in Mongo; mobile reads from Mongo, not chain. |

## Why this is the Mantle Turing Test winner

Phase 2 of the Turing Test is about **autonomous economic agency** — an
AI agent that doesn't just chat but moves real value. Tier 1 makes
Coach Agent's tools include `requestShipmentVerification`, which causes
on-chain stablecoin transfers without any human-in-the-loop after the
shipment is dispatched. That's exactly the bar.

Phase 1 was about agentic conversation. We already have that. Phase 2 is
about the agent putting its money where its mouth is. Tier 1 lets us
prove the agent commits *real* money on-chain on behalf of the user
and the chain executes the split. That's a clean and provable
narrative for the submission video.
