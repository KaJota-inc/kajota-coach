/**
 * Kajota Mesh — sign-listing screen.
 *
 * Surfaced when the Coach Agent's `proposeListingForPublish` tool fires
 * during a chat turn. Shows the structured intent (productId, wholesaler,
 * coseller, commissionBps, currency, deterministic listingId) and lets
 * the seller commit the on-chain `CosellRegistry.register(...)` tx via
 * a Privy embedded wallet (email-OTP login → Ethereum Sepolia signer).
 *
 * Run-time prerequisites (each empty value just makes the relevant
 * action surface a "configure ___" message rather than crashing):
 *   - `app.json` extra.privyAppId      → privy.io dashboard app id
 *   - `app.json` extra.cosellRegistryAddress → 0x… address from
 *     `pnpm deploy:sepolia` in the kajota-mesh repo
 *
 * Transaction shape (Ethereum Sepolia, chainId 11155111):
 *   to:    cosellRegistryAddress
 *   data:  encodeFunctionData({ abi: REGISTRY_ABI,
 *                                functionName: 'register',
 *                                args: [productId, wholesaler,
 *                                       coseller, commissionBps,
 *                                       currency] })
 *   value: 0n   (no native ETH transfer; gas only)
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  useEmbeddedEthereumWallet,
  useLoginWithEmail,
  usePrivy,
} from '@privy-io/expo';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { encodeFunctionData, toHex } from 'viem';

import { colors, fontSize, radius, spacing } from '@/constants/colors';
import {
  buildRecordRunTx,
  explorerTxUrl,
  MANTLE_CHAIN_ID,
} from '@/services/agentIdentity';
import type { RootStackParamList } from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'MeshSign'>;

// Mesh deployed to Ethereum Sepolia (chainId 11155111). The Google
// Cloud Web3 faucet drips here by default and Chainlink Functions is
// supported, so the full register → escrow → release flow works the
// same as it would on Base Sepolia.
const EXPLORER_BASE = 'https://sepolia.etherscan.io';
const MESH_CHAIN_ID =
  (Constants.expoConfig?.extra as { meshChainId?: number } | undefined)
    ?.meshChainId ?? 11155111;

/** Subset of CosellRegistry's ABI — just the function we call here. */
const REGISTRY_ABI = [
  {
    type: 'function',
    name: 'register',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'productId', type: 'string' },
      { name: 'wholesaler', type: 'address' },
      { name: 'coseller', type: 'address' },
      { name: 'commissionBps', type: 'uint16' },
      { name: 'currency', type: 'string' },
    ],
    outputs: [{ name: 'listingId', type: 'bytes32' }],
  },
] as const;

const extraConfig = Constants.expoConfig?.extra as
  | { privyAppId?: string; cosellRegistryAddress?: string }
  | undefined;
const PRIVY_APP_ID = extraConfig?.privyAppId ?? '';
const REGISTRY_ADDRESS = (extraConfig?.cosellRegistryAddress ?? '') as `0x${string}` | '';

export default function MeshSignScreen({ route, navigation }: Props) {
  const { proposal } = route.params;
  const privyConfigured = PRIVY_APP_ID !== '';

  return privyConfigured ? (
    <PrivyMeshSign
      proposal={route.params.proposal}
      decisions={route.params.decisions}
      navigation={navigation}
    />
  ) : (
    <UnconfiguredFallback proposal={proposal} navigation={navigation} />
  );
}

/* ------------------------------------------------------------------ */
/*  Configured path — Privy wired                                     */
/* ------------------------------------------------------------------ */

function PrivyMeshSign({
  proposal,
  decisions,
  navigation,
}: {
  proposal: Props['route']['params']['proposal'];
  decisions?: Props['route']['params']['decisions'];
  navigation: Props['navigation'];
}) {
  const { user, isReady, logout } = usePrivy();
  const { sendCode, loginWithCode, state: emailState } = useLoginWithEmail();
  const wallets = useEmbeddedEthereumWallet();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'idle' | 'email' | 'code'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  // ERC-8004 benchmark write (Mantle) — records this agent run on the
  // ReputationRegistry once the listing is published.
  const [benchmarking, setBenchmarking] = useState(false);
  const [benchmarkHash, setBenchmarkHash] = useState<string | null>(null);

  const wallet = wallets.wallets?.[0];
  const walletAddress = wallet?.address ?? null;

  // Privy's embedded wallet isn't auto-created by the SDK in this
  // build — the dashboard's "create on login" toggle is off (judges
  // would need access to flip it). Trigger creation explicitly once
  // the user is authenticated and we don't yet have a wallet. The
  // ref guards against double-firing inside React 19's strict-mode
  // double-invoke.
  const creatingWalletRef = React.useRef(false);
  useEffect(() => {
    if (!isReady || !user) return;
    if (wallets.wallets && wallets.wallets.length > 0) return;
    if (creatingWalletRef.current) return;
    if (typeof wallets.create !== 'function') return;
    creatingWalletRef.current = true;
    wallets
      .create()
      .catch(e =>
        Alert.alert(
          'Wallet creation failed',
          'Privy could not provision an embedded wallet. ' + errMsg(e),
        ),
      )
      .finally(() => {
        creatingWalletRef.current = false;
      });
  }, [isReady, user, wallets]);

  const calldata = useMemo(() => {
    try {
      return encodeFunctionData({
        abi: REGISTRY_ABI,
        functionName: 'register',
        args: [
          proposal.productId,
          proposal.wholesalerAddress as `0x${string}`,
          proposal.cosellerAddress as `0x${string}`,
          proposal.commissionBps,
          proposal.currency,
        ],
      });
    } catch {
      return null;
    }
  }, [proposal]);

  const sendEmailCode = async () => {
    if (!email) return;
    try {
      await sendCode({ email });
      setStage('code');
    } catch (e) {
      Alert.alert('Could not send code', errMsg(e));
    }
  };

  const verifyCode = async () => {
    if (!code) return;
    try {
      await loginWithCode({ code, email });
      setStage('idle');
    } catch (e) {
      Alert.alert('Code rejected', errMsg(e));
    }
  };

  const handleSign = async () => {
    if (!wallet) {
      Alert.alert(
        'No embedded wallet yet',
        'Privy creates one automatically the first time you sign in. Try logging out and back in if it does not appear.',
      );
      return;
    }
    if (!REGISTRY_ADDRESS) {
      Alert.alert(
        'CosellRegistry not deployed',
        'Set `extra.cosellRegistryAddress` in app.json after running `pnpm deploy:sepolia` in the kajota-mesh repo.',
      );
      return;
    }
    if (!calldata) {
      Alert.alert('Encoding failed', 'Could not encode register() calldata.');
      return;
    }
    setSubmitting(true);
    try {
      // Privy returns a provider that exposes EIP-1193 request(). Sending
      // a tx on Ethereum Sepolia is `eth_sendTransaction` with chainId in hex.
      const provider = await wallet.getProvider();

      // Privy's provider submits a raw signed tx and won't auto-fill
      // gasLimit, so omitting it leaves 0 in the RLP envelope and the
      // node rejects with "intrinsic gas too low".
      //
      // We deliberately skip eth_estimateGas here: Privy's gateway has
      // returned revert-path gas (~26k) from a stale simulation in
      // testing, which then runs out of gas mid-execution. register()
      // empirically lands around 130-160k (two array pushes, a struct
      // write, and an event emit), so we pin a generous static cap
      // that the user pays for only what they actually use.
      const gasLimit = toHex(400_000);

      const hash = (await provider.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: wallet.address,
            to: REGISTRY_ADDRESS,
            data: calldata,
            chainId: toHex(MESH_CHAIN_ID),
            value: '0x0',
            // Privy's EIP-1193 wrapper recognises both `gas` and
            // `gasLimit`; set both so we're resilient to either spelling.
            gas: gasLimit,
            gasLimit,
          },
        ],
      })) as string;
      setTxHash(hash);
    } catch (e) {
      Alert.alert('Transaction failed', errMsg(e));
    } finally {
      setSubmitting(false);
    }
  };

  // Record this agent run on the Mantle ERC-8004 ReputationRegistry —
  // a permanent on-chain benchmark of the agent's performance (pillar 1).
  // Signs with the same embedded wallet, on Mantle Sepolia (chainId 5003).
  const handleBenchmark = async () => {
    if (!wallet) {
      Alert.alert('No embedded wallet yet', 'Sign in first to record this run on-chain.');
      return;
    }
    const tx = buildRecordRunTx({
      productId: proposal.productId,
      tools: ['analyzeProductImage', 'anchorPrice', 'proposeListingForPublish'],
      outcome: `listing published${txHash ? ` (${txHash})` : ''}`,
      score: 100,
      decisions: decisions ?? [],
    });
    if (!tx) {
      Alert.alert(
        'ReputationRegistry not configured',
        'Set `extra.erc8004ReputationRegistry` in app.json.',
      );
      return;
    }
    setBenchmarking(true);
    try {
      const provider = await wallet.getProvider();
      const gasLimit = toHex(500_000);
      const hash = (await provider.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: wallet.address,
            to: tx.to,
            data: tx.data,
            chainId: toHex(MANTLE_CHAIN_ID),
            value: '0x0',
            gas: gasLimit,
            gasLimit,
          },
        ],
      })) as string;
      setBenchmarkHash(hash);
    } catch (e) {
      Alert.alert(
        'Benchmark failed',
        'Could not record on Mantle. The embedded wallet needs a little MNT for gas on Mantle Sepolia. ' +
          errMsg(e),
      );
    } finally {
      setBenchmarking(false);
    }
  };

  // Auto-record the benchmark the moment the listing is published — so EVERY
  // run is recorded on-chain, no manual tap. Privy signs programmatically, so
  // this needs no extra prompt. The ref guards against re-firing.
  const benchmarkFiredRef = React.useRef(false);
  useEffect(() => {
    if (!txHash || benchmarkHash || benchmarking || !wallet) return;
    if (benchmarkFiredRef.current) return;
    benchmarkFiredRef.current = true;
    void handleBenchmark();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txHash, wallet, benchmarkHash, benchmarking]);

  const openExplorer = (path: string) => {
    void Linking.openURL(`${EXPLORER_BASE}/${path}`);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <HeroCard proposal={proposal} />

        {/* ---------- auth gate ---------- */}
        {!isReady ? (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Privy</Text>
            <Text style={styles.fieldValue}>Initialising embedded wallet…</Text>
          </View>
        ) : !user ? (
          <View style={styles.authBlock}>
            <Text style={styles.authTitle}>Connect your Mesh wallet</Text>
            <Text style={styles.authSub}>
              Privy creates an embedded wallet tied to your email. Used only to
              sign on-chain co-sell agreements — no seed phrase to remember.
            </Text>
            {stage !== 'code' ? (
              <>
                <TextInput
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                />
                <TouchableOpacity onPress={sendEmailCode} style={styles.smallCta}>
                  <Text style={styles.smallCtaText}>Send code</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TextInput
                  keyboardType="number-pad"
                  placeholder="6-digit code"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  value={code}
                  onChangeText={setCode}
                />
                <TouchableOpacity onPress={verifyCode} style={styles.smallCta}>
                  <Text style={styles.smallCtaText}>Verify & connect</Text>
                </TouchableOpacity>
                <Text style={styles.authSub}>
                  Status: {emailState.status}
                  {emailState.status === 'error' && emailState.error
                    ? ` — ${errMsg(emailState.error)}`
                    : ''}
                </Text>
              </>
            )}
          </View>
        ) : (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Wallet</Text>
            <Text style={[styles.fieldValue, styles.fieldValueMono]} numberOfLines={1}>
              {walletAddress ?? 'Creating embedded wallet…'}
            </Text>
            <TouchableOpacity
              onPress={() => void logout()}
              style={{ marginTop: spacing.xs }}
            >
              <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>
                Disconnect
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ---------- success state ---------- */}
        {txHash && (
          <View style={styles.successBlock}>
            <Feather color={colors.success} name="check-circle" size={18} />
            <View style={{ flex: 1 }}>
              <Text style={styles.successTitle}>Listing on chain</Text>
              <Text style={styles.successSub} numberOfLines={1}>
                {txHash}
              </Text>
              <TouchableOpacity onPress={() => openExplorer(`tx/${txHash}`)}>
                <Text style={styles.basescanLinkText}>View on Etherscan →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ---------- ERC-8004 benchmark step (pillar 1) ---------- */}
        {txHash &&
          (benchmarkHash ? (
            <View style={styles.successBlock}>
              <Feather color={colors.success} name="award" size={18} />
              <View style={{ flex: 1 }}>
                <Text style={styles.successTitle}>Run benchmarked on Mantle</Text>
                <Text style={styles.successSub} numberOfLines={1}>
                  {benchmarkHash}
                </Text>
                <TouchableOpacity
                  onPress={() => void Linking.openURL(explorerTxUrl(benchmarkHash))}
                >
                  <Text style={styles.basescanLinkText}>View on Mantle explorer →</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={benchmarking}
                style={[styles.secondaryCta, benchmarking && { opacity: 0.5 }]}
                onPress={handleBenchmark}
              >
                <Feather color={colors.brand} name="award" size={16} />
                <Text style={styles.secondaryCtaText}>
                  {benchmarking
                    ? 'Recording on Mantle…'
                    : 'Benchmark this run on Mantle (ERC-8004)'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.benchmarkHint}>
                Recording this run — every tool the agent called — on the ERC-8004
                ReputationRegistry on Mantle Sepolia: a permanent on-chain benchmark
                of the agent's performance. Tap to retry if it doesn't auto-record.
              </Text>
            </>
          ))}

        {/* ---------- sign cta ---------- */}
        {!txHash && (
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={submitting || !user || !wallet}
            style={[
              styles.cta,
              (submitting || !user || !wallet) && { opacity: 0.5 },
            ]}
            onPress={handleSign}
          >
            <LinearGradient
              colors={[colors.brand, colors.brandDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaInner}
            >
              <Feather color="white" name="check-circle" size={18} />
              <Text style={styles.ctaText}>
                {submitting ? 'Signing…' : 'Sign on Ethereum Sepolia'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <Text style={styles.disclaimer}>
          Coach Agent never submits this transaction on its own — you sign with
          your embedded wallet. The listing terms become enforceable by math,
          not by Kajota's bookkeeping.
        </Text>
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Unconfigured fallback — privyAppId missing                        */
/* ------------------------------------------------------------------ */

function UnconfiguredFallback({
  proposal,
  navigation,
}: {
  proposal: Props['route']['params']['proposal'];
  navigation: Props['navigation'];
}) {
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <HeroCard proposal={proposal} />
        <View style={styles.warnBlock}>
          <Feather color={colors.warning} name="info" size={18} />
          <View style={{ flex: 1 }}>
            <Text style={styles.warnTitle}>Privy not configured</Text>
            <Text style={styles.warnSub}>
              Set <Text style={styles.mono}>extra.privyAppId</Text> in
              <Text style={styles.mono}> app.json</Text> (provision a free app at
              <Text style={styles.mono}> privy.io</Text>) to enable the embedded
              wallet sign-step. Until then, the agent flow runs but on-chain
              publishing is disabled.
            </Text>
          </View>
        </View>
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.cta, { opacity: 0.5 }]}
          onPress={() =>
            Alert.alert(
              'Configure Privy first',
              'See the file header of MeshSignScreen.tsx for the 3-step setup.',
            )
          }
        >
          <LinearGradient
            colors={[colors.brand, colors.brandDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaInner}
          >
            <Feather color="white" name="check-circle" size={18} />
            <Text style={styles.ctaText}>Sign on Ethereum Sepolia (disabled)</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared bits                                                       */
/* ------------------------------------------------------------------ */

function HeroCard({ proposal }: { proposal: Props['route']['params']['proposal'] }) {
  const percentString = (proposal.commissionBps / 100).toFixed(
    proposal.commissionBps % 100 === 0 ? 0 : 2,
  );
  return (
    <>
      <LinearGradient
        colors={[`${colors.brand}25`, `${colors.brand}05`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <Feather color="white" name="link" size={18} />
          </View>
          <Text style={styles.brandText}>Mesh · on-chain</Text>
        </View>
        <Text style={styles.heroTitle}>Publish this listing on Ethereum Sepolia</Text>
        <Text style={styles.heroSub}>{proposal.nextStep}</Text>
      </LinearGradient>
      <FieldCard label="Listing ID (Keccak-256)" value={proposal.listingId} mono />
      <FieldCard label="Product ID" value={proposal.productId} mono />
      <FieldCard label="Wholesaler" value={proposal.wholesalerAddress} mono />
      <FieldCard label="Co-seller" value={proposal.cosellerAddress} mono />
      <FieldCard
        label="Commission"
        value={`${percentString}% (${proposal.commissionBps} bps)`}
      />
      <FieldCard label="Currency" value={proposal.currency} />
      <FieldCard label="Chain" value={proposal.chain} />
      <FieldCard label="Contract" value={proposal.contract} />
      <FieldCard label="Method" value={proposal.method} mono />
    </>
  );
}

function FieldCard({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, mono && styles.fieldValueMono]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return JSON.stringify(e ?? {}).slice(0, 120);
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.pageBackground },
  scroll: { padding: spacing.lg, paddingBottom: 80 },

  hero: { borderRadius: radius.lg, padding: spacing.xl, marginBottom: spacing.xl },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brandIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: { color: colors.brand, fontSize: fontSize.md, fontWeight: '800' },
  heroTitle: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '800',
    marginTop: spacing.md,
    lineHeight: 28,
  },
  heroSub: {
    color: colors.textGray,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
    lineHeight: 18,
  },

  field: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.xs,
  },
  fieldValue: { color: colors.text, fontSize: fontSize.md },
  fieldValueMono: { fontFamily: 'Menlo', fontSize: fontSize.sm },

  authBlock: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  authTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: '700' },
  authSub: {
    color: colors.textGray,
    fontSize: fontSize.sm,
    lineHeight: 18,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  smallCta: {
    backgroundColor: colors.brand,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  smallCtaText: { color: 'white', fontSize: fontSize.sm, fontWeight: '700' },

  warnBlock: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: `${colors.warning}40`,
    backgroundColor: `${colors.warning}08`,
    marginBottom: spacing.lg,
  },
  warnTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
  warnSub: {
    color: colors.textGray,
    fontSize: fontSize.sm,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  mono: { fontFamily: 'Menlo', fontSize: fontSize.sm, color: colors.text },

  successBlock: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: `${colors.success}40`,
    backgroundColor: `${colors.success}10`,
    marginBottom: spacing.lg,
  },
  successTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
  successSub: {
    color: colors.textGray,
    fontSize: fontSize.xs,
    fontFamily: 'Menlo',
    marginTop: 2,
  },
  basescanLinkText: {
    color: colors.brand,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: spacing.xs,
  },

  secondaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.brand,
    backgroundColor: `${colors.brand}08`,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  secondaryCtaText: { color: colors.brand, fontSize: fontSize.md, fontWeight: '700' },
  benchmarkHint: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 16,
    marginTop: spacing.sm,
    textAlign: 'center',
  },

  cta: { borderRadius: radius.pill, overflow: 'hidden', marginTop: spacing.md },
  ctaInner: {
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  ctaText: { color: 'white', fontSize: fontSize.lg, fontWeight: '700' },

  disclaimer: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 16,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
});
