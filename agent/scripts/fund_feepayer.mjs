/**
 * Top up the x402 facilitator's sponsored testnet gas account.
 *
 * The CSPR.cloud x402 facilitator settles CEP-18 `transfer_with_authorization`
 * payments with gas paid by a shared sponsored account (from GET /supported).
 * That testnet account (81d557c9…) is drained to 0, so every settlement fails
 * with "insufficient balance". Sending it testnet CSPR re-enables settlement
 * for the live judge demo (and everyone else on the facilitator).
 *
 * Native CSPR transfer from our payer → the sponsored feePayer account hash.
 * Testnet only; no real value.
 *
 *   export CLIENT_PRIVATE_KEY_PATH=./payer.pem CLIENT_KEY_ALGO=secp256k1
 *   node fund_feepayer.mjs              # dry run (build + sign, no submit)
 *   node fund_feepayer.mjs --submit     # actually send
 */
import { readFile } from "node:fs/promises";
import casperSdk from "casper-js-sdk";

const { PrivateKey, KeyAlgorithm, AccountHash, NativeTransferBuilder, RpcClient, HttpHandler } = casperSdk;

const RPC_URL = process.env.CASPER_RPC || "https://node.testnet.casper.network/rpc";
const CHAIN_NAME = process.env.CHAIN_NAME || "casper-test";
const KEY_PATH = process.env.CLIENT_PRIVATE_KEY_PATH || "./payer.pem";
const KEY_ALGO = process.env.CLIENT_KEY_ALGO || "secp256k1";
const FEEPAYER = process.env.X402_FEE_PAYER || "81d557c9dcaadea97c34d79bf7b6af07aa9d760e5dd1aabf78a45fb39e072c3a";
const AMOUNT_CSPR = Number(process.env.FUND_CSPR || 2000);
const GAS = Number(process.env.TRANSFER_GAS || 100000000); // 0.1 CSPR
const SUBMIT = process.argv.includes("--submit");

async function main() {
  const algorithm = KEY_ALGO === "secp256k1" ? KeyAlgorithm.SECP256K1 : KeyAlgorithm.ED25519;
  const privateKey = PrivateKey.fromPem(await readFile(KEY_PATH, "utf-8"), algorithm);
  const publicKey = privateKey.publicKey;
  const amountMotes = BigInt(AMOUNT_CSPR) * 1_000_000_000n;
  const target = AccountHash.fromString(`account-hash-${FEEPAYER}`);

  console.log("── fund sponsored feePayer (Casper Testnet) ──");
  console.log(`  from     00${publicKey.accountHash().toHex()}`);
  console.log(`  to       account-hash-${FEEPAYER}`);
  console.log(`  amount   ${AMOUNT_CSPR} CSPR (${amountMotes} motes)`);
  console.log(`  gas      ${GAS / 1e9} CSPR   rpc ${RPC_URL}\n`);

  const tx = new NativeTransferBuilder()
    .from(publicKey)
    .targetAccountHash(target)
    .amount(amountMotes.toString())
    .id(Date.now() % 1_000_000)
    .chainName(CHAIN_NAME)
    .payment(GAS)
    .build();
  tx.sign(privateKey);

  const hash = tx?.hash?.toHex?.() ?? tx?.getTransactionV1?.()?.hash?.toHex?.() ?? "(on submit)";
  console.log(`  tx hash  ${hash}`);

  if (!SUBMIT) { console.log("\n🟡 DRY RUN — nothing sent. Re-run with --submit."); return; }

  const rpc = new RpcClient(new HttpHandler(RPC_URL));
  console.log("\n▸ submitting transfer…");
  const res = await rpc.putTransaction(tx);
  const submitted = String(res?.transactionHash?.toHex?.() ?? res?.transactionHash ?? hash);
  console.log(`✅ submitted. tx: ${submitted}`);
  console.log(`   explorer: https://testnet.cspr.live/transaction/${submitted}`);
}

main().catch(err => { console.error("❌", err?.message ?? err); process.exit(1); });
