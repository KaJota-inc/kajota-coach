# Tier 2 — Invisible wallet (Account Abstraction + Fiat Onramp)

> **Hackathon target:** AWS Activate Web3 (rolling Q3 2026).
> **Effort budget:** 8 days solo dev.
> **Risk:** High — paymaster deployment is non-trivial, fiat ramp KYC
> integration touches real money.

## The user-facing change

Today's Mesh sign flow requires the user to:

1. Sign in to Privy with email OTP.
2. **Discover that the embedded wallet has 0 ETH.**
3. **Find a Sepolia faucet** or another wallet with Sepolia ETH.
4. **Send testnet ETH** to their embedded wallet address.
5. **Wait ~12 seconds** for the transfer to confirm.
6. Tap Sign on Ethereum Sepolia.

This entire wallet-funding side-quest is what kills 95%+ of would-be
users. It's also what tonight's debug session got stuck on for 45
minutes.

After Tier 2:

1. User signs in with phone number or email.
2. User taps "Pay ₦5,000 to publish this listing."
3. A Flutterwave / Yellow Card / Transak modal opens. User pays in
   NGN with a bank transfer or USSD.
4. Backend mints equivalent USDC into the user's smart account.
5. ERC-4337 paymaster sponsors the gas for the register() tx.
6. The user has now done a fully on-chain transaction having seen
   only NGN amounts.

The chain becomes invisible infrastructure.

## Why it matters

The wallet-funding wall costs Kajota approximately every potential user
who isn't already a crypto native. Realistic estimate of impact:

| Funnel stage | Before Tier 2 | After Tier 2 |
| --- | --- | --- |
| Install → sign in | ~60% | ~75% (phone auth easier than email OTP) |
| Sign in → first listing register | ~5% | ~50% |
| Register → settled commission | ~0% (today nobody completes) | ~25% |

This is the single highest-leverage tier for user growth.

## Acceptance criteria

1. A user with no prior crypto exposure opens the app, signs in with a
   phone number, registers a listing, and sees an Etherscan link — all
   without seeing the word "gas", "wallet", "ETH", "MetaMask", or
   "private key".
2. The user pays the equivalent of $1 in NGN via Flutterwave for the
   listing fee, and the backend records that they've prepaid for one
   `register()` call.
3. The user taps "Publish on Mesh", and within ≤10 sec, an on-chain
   `ListingRegistered` event has emitted from their smart account
   address.
4. The smart account is recoverable via the user's email if they lose
   the device (Privy's social-recovery flow).
5. If the user backs out and signs in on a new device, they get the
   same smart account.

## Architecture

Three independent moving parts:

### Part A — ERC-4337 smart accounts

Replace Privy's EOA embedded wallet with a smart-contract account
(SCA) deployed at a deterministic address per user.

- **Privy** already supports this in beta via `useSmartAccount()` hook
  in the React Native SDK (as of Privy SDK v0.70+, check the changelog
  before committing).
- The account implementation can be **Pimlico's Kernel** (cheap, well-
  audited, mature React Native support) or **Safe{Core}** (more
  features, slightly more gas).

⚠️ **Decision point:** Kernel vs Safe. Recommendation: Kernel for the
hackathon submission (simpler, gas-cheaper, RN-friendly). Migrate to
Safe later if we need its richer access-control features.

### Part B — Paymaster

A sponsoring paymaster contract that pays the gas for register(),
deposit(), and requestShipmentVerification() calls on behalf of the
user, up to a per-user quota.

Two options:

1. **Pimlico's verifying paymaster** — managed service, $$$ per call
   above free tier.
2. **Self-deployed verifying paymaster** — Kajota deploys
   `KajotaPaymaster.sol`, funds it with ETH, and only sponsors users
   whose Kajota JWT is valid.

Recommendation: self-deployed for control (and so we can enforce
per-user gas budgets matching their prepaid balance).

### Part C — Fiat → USDC onramp

User pays in NGN, backend credits their smart account in USDC.

Options:

- **Flutterwave** — Nigerian bank transfer, ~₦200 fee, 5-min settlement.
  Has direct USDC-out via their Flutterwave Wallet for African users
  (limited rollout).
- **Yellow Card** — true on-ramp specifically for African fiat, USDC
  direct to wallet. ~2.5% fee. KYC required above ₦50k/day.
- **Transak** — global, supports NGN via Bitnob backend. ~3% fee.
- **Onramper** — aggregator. Best UX but adds another vendor.

Recommendation: **Yellow Card primary, Transak fallback**. Yellow Card
specializes in African flows and their API is the cleanest.

## Files to touch

### `kajota-mesh` (contracts)

**New:** `packages/contracts/contracts/KajotaPaymaster.sol`

Verifying paymaster pattern. Verifies a signed approval from Kajota's
admin signer, then pays gas. Per-user quota tracked off-chain (via the
backend signer service); on-chain we just check the signature.

```solidity
contract KajotaPaymaster is BasePaymaster {
    address public immutable signer;  // Kajota's admin EOA

    function _validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256
    ) internal view override returns (bytes memory context, uint256 validationData) {
        // PaymasterAndData layout: [paymaster_addr(20)][validUntil(6)][validAfter(6)][sig(65)]
        (uint48 validUntil, uint48 validAfter, bytes memory sig) = parsePaymasterAndData(userOp.paymasterAndData);
        bytes32 hash = MessageHashUtils.toEthSignedMessageHash(getHash(userOp, validUntil, validAfter));
        if (ECDSA.recover(hash, sig) != signer) {
            return ("", _packValidationData(true, validUntil, validAfter));
        }
        return ("", _packValidationData(false, validUntil, validAfter));
    }
    // ... withdrawTo, deposit, etc.
}
```

**New:** `packages/contracts/scripts/deploy-paymaster.ts`

Funds with 0.5 ETH for testnet, set `signer` to a dedicated admin key
held by Kajota backend.

### `kajota-mobile-backend`

**New:** `controller/PaymasterController.java`

Endpoint: `POST /ai/mesh/paymaster/sponsor` — accepts a UserOperation,
checks if the requesting user has prepaid balance, signs as the
admin EOA, returns the paymasterAndData blob.

```java
@PostMapping("/sponsor")
public ResponseEntity<SponsorshipDto> sponsor(@RequestBody UserOperationDto userOp, Principal principal) {
    UserPaymasterCredit credit = creditRepo.findByUserId(principal.getName());
    long estimatedGas = userOp.getCallGasLimit() + userOp.getVerificationGasLimit() + userOp.getPreVerificationGas();
    if (credit.balanceWei() < estimatedGas * userOp.getMaxFeePerGas()) {
        throw new InsufficientCreditException();
    }
    String sig = paymasterSigner.sign(userOp, validUntil, validAfter);
    creditRepo.debit(principal.getName(), estimatedGas * userOp.getMaxFeePerGas());
    return ResponseEntity.ok(SponsorshipDto.of(PAYMASTER_ADDRESS, validUntil, validAfter, sig));
}
```

**New:** `controller/OnrampController.java`

Endpoint: `POST /ai/mesh/onramp/yellowcard` — initiates a Yellow Card
charge, returns a payment URL. Webhook from Yellow Card on settlement
credits the user's `UserPaymasterCredit`.

**New:** `model/entity/UserPaymasterCredit.java`

```java
@Document("user_paymaster_credit")
public class UserPaymasterCredit {
    @Id String userId;
    long balanceWei;  // signed; positive == credit available
    Instant lastTopup;
}
```

**New:** `service/PaymasterSigner.java`

Wraps the admin EOA key. **Key handling note:** the admin key should be
loaded from a Render Secret File (NOT an env var) per the project's
credential-rotation policy.

### `kajota-coach` (mobile)

**Modified:** `App.tsx`

Replace `PrivyProvider` config to opt into smart accounts:

```tsx
<PrivyProvider
  appId={PRIVY_APP_ID}
  clientId={PRIVY_CLIENT_ID}
  config={{
    embedded: { ethereum: { createOnLogin: 'users-without-wallets' } },
    smartAccount: {
      enabled: true,
      defaultChain: { id: MESH_CHAIN_ID },
      bundlerUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=...',
      paymasterUrl: `${API_BASE_URL}/ai/mesh/paymaster/sponsor`,  // our endpoint
    },
  }}
>
```

**Modified:** `src/screens/MeshSignScreen.tsx`

Replace `useEmbeddedEthereumWallet()` with `useSmartAccount()`. The
transaction submission code becomes:

```tsx
const { client: smartAccountClient } = useSmartAccount();
// ...
const hash = await smartAccountClient.sendTransaction({
  to: REGISTRY_ADDRESS,
  data: calldata,
  // Gas is handled by paymaster — no need to specify.
});
```

The whole gas-funding side-quest disappears.

**New:** `src/screens/TopUpScreen.tsx`

User-facing fiat top-up flow:

1. User selects amount in NGN (₦100, ₦500, ₦1000, custom).
2. Backend returns Yellow Card hosted-checkout URL.
3. Open in in-app browser. User completes payment.
4. Webhook lands on backend, credit is added, mobile polls until
   `UserPaymasterCredit.balanceWei > 0` and proceeds.

**Modified:** `src/services/api.ts`

Add `Top up wallet` prompt when paymaster sponsorship returns 402
(payment required).

### Privy dashboard configuration

⚠️ Not code, but must be done:

1. Embedded Wallets → "Create on login: users-without-wallets" → ON.
2. Smart Wallets → ENABLE → select Kernel.
3. Smart Wallets → "Sponsored gas" → configure URL pointing to
   Kajota backend's paymaster endpoint.

## Onramp flow detail (Yellow Card)

```
Mobile                  Backend              Yellow Card        Smart Account
  │                        │                      │                   │
  │ POST /onramp/yc        │                      │                   │
  │ {amount_ngn: 5000}     │                      │                   │
  │───────────────────────►│                      │                   │
  │                        │ POST /v1/payments    │                   │
  │                        │ {amount, customer,   │                   │
  │                        │   wallet_address}    │                   │
  │                        │─────────────────────►│                   │
  │                        │     {payment_url}    │                   │
  │                        │◄─────────────────────│                   │
  │   {payment_url}        │                      │                   │
  │◄───────────────────────│                      │                   │
  │                                                                   │
  │ User completes payment in browser                                 │
  │                                                                   │
  │                        │ webhook              │                   │
  │                        │ /onramp/yc/webhook   │                   │
  │                        │ {payment_id, status} │                   │
  │                        │◄─────────────────────│                   │
  │                        │                                          │
  │                        │      USDC transfer (off Yellow Card)    │
  │                        │                      │──────────────────►│
  │                        │                                          │
  │                        │  credit += amount                        │
  │                        │  (UserPaymasterCredit)                   │
  │  poll /credit/balance  │                                          │
  │───────────────────────►│                                          │
  │     {balance: 5000}    │                                          │
  │◄───────────────────────│                                          │
```

Customer KYC: Yellow Card handles for amounts ≥ ₦50k/day. Below that
limit, we can transact with phone number + selfie only.

## Demo script (AWS Activate Web3 submission)

The narrative is "abstract the chain away":

1. **0:00-0:10** — A market trader opens Kajota Coach for the first
   time. Enters phone number. SMS OTP. Inside the app, no wallet
   visible.
2. **0:10-0:25** — Snaps a photo of bell peppers. Coach drafts listing.
3. **0:25-0:35** — "Publish on Mesh — costs ₦100" button. Tap.
4. **0:35-0:50** — Yellow Card modal. User pays ₦100 via bank transfer
   on her phone (USSD). 5 seconds.
5. **0:50-1:05** — Modal closes. Toast: "Publishing…" then "Published!
   View on Etherscan →". User taps. Block explorer opens showing tx.
6. **1:05-1:15** — Show the transaction on Etherscan: smart account
   address as `from`, USDC `value` of 0 (registration is free in
   USDC), paymaster sponsored gas.
7. **1:15-1:30** — Voiceover: *"She did not sign with a private key.
   She did not buy ETH. She paid ₦100 from her bank app. Yet she has a
   verifiable, enforceable on-chain commercial agreement."*

## Spikes to run BEFORE committing to scope

🚧 **Spike 1: Privy smart-account support in React Native.** 4 hours.

Privy's smart-account SDK is **JavaScript-first** and React Native
support has historically lagged. Verify with a minimal repo before
committing.

🚧 **Spike 2: Verifying paymaster works on Sepolia + Kernel.** 4 hours.

Pimlico has tutorials. Get the full flow working in Node.js before
porting to React Native + Java signing.

🚧 **Spike 3: Yellow Card sandbox.** 2 hours.

Request sandbox API access (takes 1-3 days for them to approve — start
this on Day 1). Verify the webhook reaches Render properly.

## Timeline (8 days)

| Day | Hours | Deliverable |
| --- | --- | --- |
| Day 1 | Request Yellow Card sandbox + 6h spike | Spikes 1-2. |
| Day 2 | 8h | Deploy KajotaPaymaster on Sepolia, fund. PaymasterController endpoint. |
| Day 3 | 8h | Mobile: switch to useSmartAccount(). End-to-end register flow with sponsored gas. |
| Day 4 | 8h | Yellow Card integration end-to-end. Top up + webhook + credit system. |
| Day 5 | 8h | UI polish on TopUpScreen. Phone-number-only auth (Privy SMS). |
| Day 6 | 8h | Error states: insufficient credit, paymaster temporarily out of gas, etc. |
| Day 7 | 8h | KYC integration test with Yellow Card sandbox. |
| Day 8 | 8h | Demo recording. Submission. |

## Dependencies

- **Upstream:** None on this codebase. Externally depends on Privy
  smart-account SDK being stable on RN, Yellow Card sandbox access,
  Sepolia ETH for paymaster funding.
- **Downstream:** Tier 5 (WhatsApp) needs the smart account so
  WhatsApp-initiated payments hit the same address. Tier 3
  (reputation) reads smart account addresses, so the data model is
  shared.

## Honest acknowledgement: scope risks

- **Privy smart-account SDK maturity** is the single biggest risk. If
  the SDK isn't production-ready by AWS Activate Web3 submission, we
  have to fall back to ZeroDev or Biconomy SDK direct integration —
  doable but adds ~3 days.
- **Yellow Card KYC** for production needs a business agreement,
  potentially Kajota Inc. registration in Nigeria, certain treasury
  setup. For the hackathon submission, sandbox is enough.
- **Per-user gas cap** — if a malicious user spams register() calls,
  they drain the paymaster ETH. Mitigate with `UserPaymasterCredit`
  hard cap + admin-pausable paymaster.
- **Gas estimation across smart accounts** — Kernel's
  `estimateUserOperationGas` is much better than Privy's old EOA
  gateway. Should remove the manual 400k hack from MeshSignScreen
  once this lands.
