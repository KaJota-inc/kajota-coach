/**
 * XLayer Premium — pay-per-call agent insight, EIP-3009-settled on XLayer.
 *
 * EVM sibling of CasperPremiumScreen. Walks the OKX.AI Genesis A2MCP
 * paywall end to end on real backend calls:
 *
 *   1. Tap "Unlock" → POST /coach/premium (no payment) → render the live
 *      XLayer price tag the hub returns (network=eip155:196, ERC-20 asset,
 *      payTo, amount).
 *   2. Tap "Sign with wallet" → the Privy embedded wallet signs an
 *      EIP-712 `TransferWithAuthorization` over the price tag. The screen
 *      shows the resulting message + signature.
 *   3. Tap "Try settlement" → POST with X-PAYMENT. If Coach's env has an
 *      EVM facilitator wired, the settlement returns the insight + tx.
 *      Currently defaults to "not fully configured" — the screen falls
 *      back to displaying the signed authorization as the demo artifact
 *      (matches Beat 3 of the submission video).
 *
 * Backend: agent/kajota_concierge/server.py POST /coach/premium via hub
 * route /coach-okx.
 */
import Feather from '@expo/vector-icons/Feather';
import { usePrivy, useEmbeddedEthereumWallet } from '@privy-io/expo';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors, fontSize, radius, spacing } from '@/constants/colors';
import {
  formatAssetAmount,
  payXLayerPremium,
  requestXLayerPaywall,
  shortHex,
  signXLayerAuthorization,
  txExplorerUrl,
  XLAYER_CHAIN_ID,
  type SignedAuthorization,
} from '@/services/xlayerPremium';
import type { Casper402, PremiumResponse } from '@/types';

type Phase =
  | 'idle'
  | 'loadingPaywall'
  | 'paywall'
  | 'signing'
  | 'signed'
  | 'settling'
  | 'settled';

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export default function XLayerPremiumScreen(): React.ReactElement {
  const { user } = usePrivy();
  const { wallets, create: createWallet } = useEmbeddedEthereumWallet();
  const [phase, setPhase] = useState<Phase>('idle');
  const [requirements, setRequirements] = useState<
    Casper402['accepts'][number] | null
  >(null);
  const [unconfigured, setUnconfigured] = useState(false);
  const [signed, setSigned] = useState<SignedAuthorization | null>(null);
  const [result, setResult] = useState<PremiumResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [demoOverride, setDemoOverride] = useState(false);

  const wallet = wallets?.[0];
  const walletAddress = wallet?.address;
  const priceDisplay = useMemo(() => {
    if (!requirements) return '';
    return formatAssetAmount(
      requirements.maxAmountRequired ?? (requirements as any).amount ?? '0',
      requirements.extra?.decimals,
      requirements.extra?.name ?? 'USDT',
    );
  }, [requirements]);

  const onUnlock = useCallback(async () => {
    setError(null);
    setPhase('loadingPaywall');
    try {
      const { requirements: reqs, unconfigured: unconf } =
        await requestXLayerPaywall();
      setRequirements(reqs);
      setUnconfigured(unconf);
      setPhase('paywall');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('idle');
    }
  }, []);

  const onSign = useCallback(async () => {
    if (!requirements || !wallet || !walletAddress) {
      setError('Wallet not ready. Sign in and try again.');
      return;
    }
    setError(null);
    setPhase('signing');
    try {
      const provider = await wallet.getProvider();
      const signTypedData = async (params: [string, string]) => {
        return (await provider.request({
          method: 'eth_signTypedData_v4',
          params,
        })) as string;
      };
      const out = await signXLayerAuthorization(
        requirements,
        walletAddress,
        signTypedData,
      );
      setSigned(out);
      setPhase('signed');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('paywall');
    }
  }, [requirements, wallet, walletAddress]);

  const onSettle = useCallback(async () => {
    if (!signed) return;
    setError(null);
    setPhase('settling');
    try {
      const res = await payXLayerPremium(signed.xPayment);
      setResult(res);
      setPhase('settled');
    } catch (e) {
      // Expected while facilitator URL is blank — the signed authorization
      // remains as the demo artifact.
      setError(e instanceof Error ? e.message : String(e));
      setPhase('signed');
    }
  }, [signed]);

  const onCreateWallet = useCallback(async () => {
    try {
      await createWallet();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [createWallet]);

  const onPlayDemo = useCallback(async () => {
    setDemoOverride(true);
    setError(null);
    setPhase('loadingPaywall');
    const { requirements: reqs, unconfigured: unconf } =
      await requestXLayerPaywall();
    setRequirements(reqs);
    setUnconfigured(unconf);
    setPhase('paywall');
    await sleep(2200);

    setPhase('signing');
    await sleep(1600);
    const demoFrom = '0x7876c479f68b7f218ca59a4b8c860a4a06350007';
    const validAfter = '0';
    const validBefore = String(Math.floor(Date.now() / 1000) + 3600);
    setSigned({
      xPayment:
        'eyJzY2hlbWUiOiJleGFjdCIsIm5ldHdvcmsiOiJlaXAxNTU6MTk2IiwiYXNzZXQiOiIweDFlNGE1OTYzYWJmZDk3NWQ4YzkwMjFjZTQ4MGI0MjE4ODg0OWQ0MWQiLCJhdXRob3JpemF0aW9uIjp7ImZyb20iOiIweDc4NzZjNDc5ZjY4YjdmMjE4Y2E1OWE0YjhjODYwYTRhMDYzNTAwMDciLCJ0byI6IjB4Nzg3NmM0NzlmNjhiN2YyMThjYTU5YTRiOGM4NjBhNGEwNjM1MDAwNyIsInZhbHVlIjoiMTAwMDAiLCJ2YWxpZEFmdGVyIjoiMCIsInZhbGlkQmVmb3JlIjoiMTc1MjcwMDAwMCIsIm5vbmNlIjoiMHg0YTNiMmMxZDllZjc4YTFmNWJkNGM3MjkxYTBmNjM4NGM1YjJkOWU3YWY0YzEwMzk1ODFmNzg2MzJhNGM1YjJkIn0sInNpZ25hdHVyZSI6IjB4MmM3ZjEuLi4ifQ==',
      message: {
        from: demoFrom,
        to: reqs.payTo,
        value: reqs.maxAmountRequired ?? (reqs as any).amount ?? '10000',
        validAfter,
        validBefore,
        nonce:
          '0x4a3b2c1d9ef78a1f5bd4c7291a0f6384c5b2d9e7af4c1039581f78632a4c5b2d',
      },
      signature:
        '0x2c7f1a8e93b4c26df58170a3e5c9b2af6e4d1057832b9c48f0e73a15d6b982c14e7c3a86091b45f2d8a739e6c1085b234f792d3ce0a6485b9f210c73e5a4d1c8f1b',
    });
    setPhase('signed');
    await sleep(2600);

    setPhase('settling');
    await sleep(1600);
    setResult({
      sessionId: 'demo-xlayer',
      response:
        'Insight: this SKU trends +42% among Lagos co-sellers in Q3. Bundle with charger for the top-decile margin lift; the cross-sell velocity peaks Fri–Sun. Marketplace price band 18,900–24,000 NGN; Coach-recommended list 21,500 NGN.',
      events: [],
      settlement: {
        network: 'eip155:196',
        transaction:
          '0xa1b2c3d47e9f80c2be5f1a83d76c94ef2b108a7d6c3e9f10a2b5c8d4e7f9a1b3',
        payer: demoFrom,
        settled: true,
      },
    });
    setPhase('settled');
  }, []);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.rootContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>Kajota Coach — Premium on XLayer</Text>
        <Text style={styles.subtitle}>
          ASP 5855 on OKX.AI. Pay 0.01 USDT on XLayer, get a deep-dive
          purchase insight. No pop-up. No human sign-off.
        </Text>
      </View>

      {!user && !demoOverride && (
        <Panel tone="warn">
          <Text style={styles.panelBody}>
            Sign in first — the premium flow signs with your embedded Privy
            wallet. Head back to Home → Sign In.
          </Text>
          {__DEV__ && (
            <PrimaryButton
              label="▶ Play demo (mock wallet)"
              onPress={onPlayDemo}
              icon="play"
            />
          )}
        </Panel>
      )}

      {user && !wallet && !demoOverride && (
        <Panel tone="warn">
          <Text style={styles.panelBody}>
            No embedded wallet yet. Tap below to provision one on XLayer
            (chain {XLAYER_CHAIN_ID}).
          </Text>
          <PrimaryButton label="Create wallet" onPress={onCreateWallet} />
        </Panel>
      )}

      {phase === 'idle' && (wallet || demoOverride) && (
        <PrimaryButton
          label={demoOverride ? '▶ Play demo again' : 'Unlock — fetch the live 402'}
          onPress={demoOverride ? onPlayDemo : onUnlock}
          icon="unlock"
        />
      )}

      {phase === 'loadingPaywall' && <Loader label="Fetching 402 from the hub…" />}

      {requirements && (
        <Panel title="Price tag" tone="info">
          <Row label="Network" value={requirements.network} />
          <Row
            label="Asset"
            value={shortHex(requirements.asset)}
            copy={requirements.asset}
          />
          <Row
            label="Pay to"
            value={shortHex(requirements.payTo)}
            copy={requirements.payTo}
          />
          <Row label="Amount" value={priceDisplay} />
          {unconfigured && (
            <Text style={styles.warnHint}>
              Server flagged the paywall as unconfigured (no facilitator URL
              wired). Signing will still produce a real EIP-3009
              authorization — the settle-step response will be a 402.
            </Text>
          )}
          {phase === 'paywall' && walletAddress && (
            <PrimaryButton
              label="Sign with wallet"
              onPress={onSign}
              icon="edit-3"
            />
          )}
        </Panel>
      )}

      {phase === 'signing' && <Loader label="Signing EIP-3009 in wallet…" />}

      {signed && (
        <Panel title="Signed authorization" tone="ok">
          <Row label="From" value={shortHex(signed.message.from)} copy={signed.message.from} />
          <Row label="To" value={shortHex(signed.message.to)} copy={signed.message.to} />
          <Row label="Value (base units)" value={signed.message.value} />
          <Row label="Nonce" value={shortHex(signed.message.nonce, 6, 6)} copy={signed.message.nonce} />
          <Row label="Signature" value={shortHex(signed.signature, 8, 6)} copy={signed.signature} />
          <Text style={styles.hint}>
            This blob is broadcastable — a facilitator would submit it on
            XLayer mainnet and the fee would move.
          </Text>
          {phase === 'signed' && (
            <PrimaryButton
              label="Try settlement"
              onPress={onSettle}
              icon="send"
            />
          )}
        </Panel>
      )}

      {phase === 'settling' && <Loader label="Sending X-PAYMENT to the hub…" />}

      {result && (
        <Panel title="Insight (settled)" tone="ok">
          <Text style={styles.insight}>{result.response}</Text>
          {result.settlement?.transaction && (
            <TouchableOpacity
              onPress={() =>
                Linking.openURL(txExplorerUrl(result.settlement.transaction))
              }
            >
              <Text style={styles.txLink}>
                On-chain tx: {shortHex(result.settlement.transaction, 10, 6)} ↗
              </Text>
            </TouchableOpacity>
          )}
        </Panel>
      )}

      {error && (
        <Panel tone="err">
          <Text style={styles.errBody}>{error}</Text>
        </Panel>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Endpoint: kajota-hub.onrender.com/coach-okx/coach/premium · ASP 5855
        </Text>
      </View>
    </ScrollView>
  );
}

// ---- small UI helpers (kept in this file to keep the screen self-contained) --

function Panel(props: {
  title?: string;
  tone?: 'info' | 'ok' | 'warn' | 'err';
  children: React.ReactNode;
}) {
  const tone = props.tone ?? 'info';
  const toneStyle = {
    info: styles.panel_info,
    ok: styles.panel_ok,
    warn: styles.panel_warn,
    err: styles.panel_err,
  }[tone];
  return (
    <View style={[styles.panel, toneStyle]}>
      {props.title && <Text style={styles.panelTitle}>{props.title}</Text>}
      {props.children}
    </View>
  );
}

function Row(props: { label: string; value: string; copy?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{props.label}</Text>
      <TouchableOpacity
        onPress={() => {
          if (!props.copy) return;
          // Best-effort clipboard — expo-clipboard is optional; require() so
          // TS doesn't demand ES2020-module flags for a dynamic import.
          try {
            const clip = require('expo-clipboard');
            clip.setStringAsync?.(props.copy);
          } catch {
            // module not installed — copy is a nice-to-have.
          }
        }}
      >
        <Text style={styles.rowValue}>{props.value}</Text>
      </TouchableOpacity>
    </View>
  );
}

function PrimaryButton(props: { label: string; onPress: () => void; icon?: string }) {
  return (
    <TouchableOpacity style={styles.btn} onPress={props.onPress}>
      {props.icon && (
        <Feather name={props.icon as any} size={16} color={colors.background} />
      )}
      <Text style={styles.btnLabel}>{props.label}</Text>
    </TouchableOpacity>
  );
}

function Loader(props: { label: string }) {
  return (
    <View style={styles.loader}>
      <ActivityIndicator color={colors.brand} />
      <Text style={styles.loaderLabel}>{props.label}</Text>
    </View>
  );
}

// ---- styles -----------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  rootContent: { padding: spacing.lg, gap: spacing.md },
  header: { gap: spacing.xs },
  title: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700' },
  subtitle: { color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 },

  panel: {
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
    borderWidth: 1,
  },
  panel_info: { backgroundColor: colors.surface, borderColor: colors.border },
  panel_ok: { backgroundColor: colors.surface, borderColor: colors.success },
  panel_warn: { backgroundColor: colors.surface, borderColor: colors.warning },
  panel_err: { backgroundColor: colors.surface, borderColor: colors.warning },
  panelTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  panelBody: { color: colors.text, fontSize: fontSize.sm, lineHeight: 20 },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  rowLabel: { color: colors.textMuted, fontSize: fontSize.sm },
  rowValue: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontFamily: 'Menlo',
  },

  hint: { color: colors.textMuted, fontSize: fontSize.xs, lineHeight: 18, fontStyle: 'italic' },
  warnHint: { color: colors.warning, fontSize: fontSize.xs, lineHeight: 18 },
  errBody: { color: colors.warning, fontSize: fontSize.sm, lineHeight: 20 },
  insight: { color: colors.text, fontSize: fontSize.sm, lineHeight: 22 },

  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.brand,
    borderRadius: radius.md,
  },
  btnLabel: { color: colors.background, fontWeight: '600', fontSize: fontSize.md },

  loader: { alignItems: 'center', gap: spacing.xs, padding: spacing.md },
  loaderLabel: { color: colors.textMuted, fontSize: fontSize.sm },

  txLink: {
    color: colors.brand,
    fontSize: fontSize.sm,
    fontFamily: 'Menlo',
    marginTop: spacing.sm,
  },

  footer: { marginTop: spacing.lg, alignItems: 'center' },
  footerText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: 'Menlo',
  },
});
