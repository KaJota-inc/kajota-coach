/**
 * Casper Premium — pay-per-call agent insight, settled on Casper via x402.
 *
 * The screen walks the HTTP-402 flow on real backend calls:
 *   1. Tap "Unlock" → POST /coach/premium (no payment) → render the live
 *      Casper price tag the server returns (asset, amount, network, payTo).
 *   2. Sign → either a configured signer bridge (extra.casperSignerUrl) or a
 *      payload pasted from `scripts/x402_client.mjs` / CSPR.click.
 *   3. Settle → POST with X-PAYMENT → show the on-chain deploy hash (tappable
 *      to cspr.live) plus the agent's premium insight and cards.
 *
 * Backend: agent/kajota_concierge/server.py (POST /coach/premium)
 */
import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors, fontSize, radius, spacing } from '@/constants/colors';
import {
  deployExplorerUrl,
  formatAssetAmount,
  hasSignerBridge,
  payPremium,
  requestPremiumPaywall,
  SettlementDegradedError,
  signViaBridge,
} from '@/services/casperPremium';
import {
  eventsToToolTrace,
  extractCards,
  warmupConciergeAgent,
} from '@/services/conciergeAgent';
import type {
  CasperPaymentRequirements,
  ConciergeProductCard,
  ConciergeToolInvocation,
  PremiumResponse,
} from '@/types';

type Phase = 'idle' | 'loadingPaywall' | 'paywall' | 'paying' | 'settled';

export default function CasperPremiumScreen(): React.ReactElement {
  const [phase, setPhase] = useState<Phase>('idle');
  const [requirements, setRequirements] = useState<CasperPaymentRequirements | null>(null);
  const [unconfigured, setUnconfigured] = useState(false);
  const [xPayment, setXPayment] = useState('');
  const [result, setResult] = useState<PremiumResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Set when the shared Casper rail is degraded (signed + verified fine, but the
  // on-chain submit failed). We show an honest explanation plus a real,
  // confirmed settlement to verify — never a raw facilitator error code.
  const [degraded, setDegraded] = useState<{ reason: string; txUrl: string } | null>(null);

  const warmup = useCallback(() => warmupConciergeAgent(), []);

  const onUnlock = useCallback(async () => {
    setError(null);
    setPhase('loadingPaywall');
    try {
      const { requirements: reqs, unconfigured: unconf } = await requestPremiumPaywall();
      setRequirements(reqs);
      setUnconfigured(unconf);
      setPhase('paywall');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('idle');
    }
  }, []);

  const settle = useCallback(
    async (payload: string) => {
      setError(null);
      setDegraded(null);
      setPhase('paying');
      try {
        const res = await payPremium(payload);
        setResult(res);
        setPhase('settled');
      } catch (e) {
        if (e instanceof SettlementDegradedError) {
          setDegraded({ reason: e.facilitatorReason, txUrl: e.confirmedTxUrl });
        } else {
          setError(e instanceof Error ? e.message : String(e));
        }
        setPhase('paywall');
      }
    },
    [],
  );

  const onPay = useCallback(async () => {
    if (!requirements) return;
    if (hasSignerBridge) {
      setError(null);
      setPhase('paying');
      try {
        const payload = await signViaBridge(requirements);
        await settle(payload);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setPhase('paywall');
      }
    } else if (xPayment.trim()) {
      await settle(xPayment.trim());
    } else {
      setError('Paste a signed X-PAYMENT, or configure a signer bridge.');
    }
  }, [requirements, xPayment, settle]);

  const reset = useCallback(() => {
    setPhase('idle');
    setRequirements(null);
    setResult(null);
    setXPayment('');
    setError(null);
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      onLayout={warmup}
    >
      {/* Hero */}
      <LinearGradient
        colors={[colors.brand, colors.brandDark]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.hero}
      >
        <View style={styles.heroBadge}>
          <Feather color="white" name="zap" size={13} />
          <Text style={styles.heroBadgeText}>x402 · Casper</Text>
        </View>
        <Text style={styles.heroTitle}>Premium Insight</Text>
        <Text style={styles.heroSub}>
          A deep purchase analysis the agent charges for — settled on Casper
          with an HTTP-native micropayment. No account, no card, no human.
        </Text>
      </LinearGradient>

      {error ? (
        <View style={styles.errorBox}>
          <Feather color={colors.warning} name="alert-triangle" size={14} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {degraded ? (
        <View style={styles.degradedBox}>
          <View style={styles.degradedHead}>
            <Feather color={colors.warning} name="alert-triangle" size={14} />
            <Text style={styles.degradedTitle}>
              Casper settlement temporarily unavailable
            </Text>
          </View>
          <Text style={styles.degradedBody}>
            Our payment signed and passed the facilitator&apos;s verify step — it is the
            on-chain execution that is failing right now, across several teams&apos;
            deployed CEP-18 contracts on Casper testnet. Gas is funded and our token
            balance is full, so this is a shared-rail issue, not a fault in this payment.
          </Text>
          <Text style={styles.degradedReason}>{degraded.reason}</Text>
          <TouchableOpacity onPress={() => Linking.openURL(degraded.txUrl)}>
            <Text style={styles.degradedLink}>
              View a real settlement from this demo on cspr.live ↗
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Step 1 — unlock */}
      {(phase === 'idle' || phase === 'loadingPaywall') && (
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={phase === 'loadingPaywall'}
          onPress={onUnlock}
          style={styles.cta}
        >
          {phase === 'loadingPaywall' ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Feather color="white" name="lock" size={16} />
              <Text style={styles.ctaText}>Unlock Premium Insight</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Step 2 — the live Casper price tag */}
      {requirements && phase !== 'settled' && (
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Feather color={colors.brand} name="tag" size={15} />
            <Text style={styles.cardTitle}>402 · Payment Required</Text>
            <View style={styles.netPill}>
              <Text style={styles.netPillText}>{requirements.network}</Text>
            </View>
          </View>

          <Row
            label="Price"
            value={formatAssetAmount(
              requirements.amount,
              requirements.extra?.decimals,
              requirements.extra?.name || 'WCSPR',
            )}
            strong
          />
          <Row label="Asset" value={short(requirements.asset)} mono />
          <Row label="Pay to" value={short(requirements.payTo)} mono />
          {requirements.extra?.feePayer ? (
            <Row label="Gas sponsor" value={short(requirements.extra.feePayer)} mono />
          ) : null}

          {unconfigured ? (
            <View style={styles.note}>
              <Feather color={colors.textMuted} name="info" size={13} />
              <Text style={styles.noteText}>
                The server returned a price tag but isn&apos;t configured to
                charge yet (needs the sponsored CSPR.cloud key + asset). The
                flow below is wired and ready once it is.
              </Text>
            </View>
          ) : null}

          {/* Signing handoff */}
          {!hasSignerBridge && (
            <View style={styles.signBox}>
              <Text style={styles.signLabel}>
                Signed X-PAYMENT (from Casper Wallet / scripts/x402_client.mjs)
              </Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                multiline
                onChangeText={setXPayment}
                placeholder="base64 payment payload…"
                placeholderTextColor={colors.textMuted}
                style={styles.signInput}
                value={xPayment}
              />
            </View>
          )}

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={phase === 'paying'}
            onPress={onPay}
            style={styles.cta}
          >
            {phase === 'paying' ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Feather color="white" name="zap" size={16} />
                <Text style={styles.ctaText}>
                  {hasSignerBridge ? 'Pay & settle on Casper' : 'Complete settlement'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Step 3 — settled */}
      {phase === 'settled' && result && (
        <SettledView result={result} onReset={reset} />
      )}
    </ScrollView>
  );
}

function SettledView({
  result,
  onReset,
}: {
  result: PremiumResponse;
  onReset: () => void;
}): React.ReactElement {
  const { text, cards } = extractCards(result.response ?? '');
  const tools = eventsToToolTrace(result.events ?? []);
  const s = result.settlement;
  const url = s?.transaction ? deployExplorerUrl(s.network, s.transaction) : null;

  return (
    <View>
      {/* Settlement receipt */}
      <View style={[styles.card, styles.settleCard]}>
        <View style={styles.cardHead}>
          <Feather color={colors.success} name="check-circle" size={16} />
          <Text style={[styles.cardTitle, { color: colors.success }]}>
            Settled on Casper
          </Text>
        </View>
        <Row label="Network" value={s?.network ?? '—'} mono />
        <Row label="Payer" value={short(s?.payer ?? '')} mono />
        <Text style={styles.deployLabel}>Deploy hash</Text>
        {url ? (
          <TouchableOpacity onPress={() => Linking.openURL(url)}>
            <Text style={styles.deployHash}>{s.transaction}</Text>
            <Text style={styles.deployLink}>View on cspr.live ↗</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.deployHash}>{s?.transaction || '—'}</Text>
        )}
      </View>

      {/* The premium insight */}
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Feather color={colors.brand} name="trending-up" size={15} />
          <Text style={styles.cardTitle}>Premium insight</Text>
        </View>
        <Text style={styles.insight}>{text}</Text>
        {cards.map((c: ConciergeProductCard, i) => (
          <View key={`${c.title}-${i}`} style={styles.product}>
            <Text style={styles.productTitle}>{c.title}</Text>
            {c.subtitle ? <Text style={styles.productSub}>{c.subtitle}</Text> : null}
            <View style={styles.productRow}>
              {c.price ? <Text style={styles.productPrice}>{c.price}</Text> : null}
              {c.footer ? <Text style={styles.productFooter}>{c.footer}</Text> : null}
            </View>
          </View>
        ))}
      </View>

      {tools.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Used {tools.length} tools</Text>
          {tools.map((t: ConciergeToolInvocation, i) => (
            <Text key={`${t.name}-${i}`} style={styles.toolLine}>
              · {t.name}
              {t.args ? <Text style={styles.toolArgs}> {t.args}</Text> : null}
            </Text>
          ))}
        </View>
      )}

      <TouchableOpacity activeOpacity={0.85} onPress={onReset} style={styles.ctaSecondary}>
        <Feather color={colors.brand} name="rotate-ccw" size={15} />
        <Text style={styles.ctaSecondaryText}>Run another</Text>
      </TouchableOpacity>
    </View>
  );
}

function Row({
  label,
  value,
  mono,
  strong,
}: {
  label: string;
  value: string;
  mono?: boolean;
  strong?: boolean;
}): React.ReactElement {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          mono && styles.rowMono,
          strong && styles.rowStrong,
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

/** Middle-ellipsize a long hash for display. */
function short(s: string): string {
  if (!s) return '—';
  return s.length > 18 ? `${s.slice(0, 8)}…${s.slice(-6)}` : s;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.pageBackground },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },

  hero: {
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginBottom: spacing.md,
  },
  heroBadgeText: { color: 'white', fontSize: fontSize.xs, fontWeight: '700' },
  heroTitle: { color: 'white', fontSize: fontSize.hero, fontWeight: '800' },
  heroSub: { color: 'rgba(255,255,255,0.92)', fontSize: fontSize.md, marginTop: spacing.sm, lineHeight: 20 },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brand,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.pill,
    marginTop: spacing.md,
  },
  ctaText: { color: 'white', fontSize: fontSize.lg, fontWeight: '700' },

  ctaSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.lg,
  },
  ctaSecondaryText: { color: colors.brand, fontSize: fontSize.md, fontWeight: '700' },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  settleCard: { borderColor: colors.success },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  cardTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, flex: 1 },

  netPill: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  netPillText: { fontSize: fontSize.xs, color: colors.textGray, fontWeight: '600' },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
  },
  rowLabel: { fontSize: fontSize.md, color: colors.textGray },
  rowValue: { fontSize: fontSize.md, color: colors.text, maxWidth: '62%' },
  rowMono: { fontFamily: 'Courier', fontSize: fontSize.sm },
  rowStrong: { fontWeight: '800', color: colors.brand },

  note: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  noteText: { flex: 1, fontSize: fontSize.sm, color: colors.textGray, lineHeight: 18 },

  signBox: { marginTop: spacing.md },
  signLabel: { fontSize: fontSize.sm, color: colors.textGray, marginBottom: spacing.xs },
  signInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 64,
    fontFamily: 'Courier',
    fontSize: fontSize.sm,
    color: colors.text,
    textAlignVertical: 'top',
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FDECEA',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },

  // Degraded shared-rail state: amber (a heads-up), never red (a failure).
  degradedBox: {
    backgroundColor: '#FFF7E6',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#F0C36D',
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  degradedHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  degradedTitle: { flex: 1, color: '#8A5A00', fontSize: fontSize.sm, fontWeight: '700' },
  degradedBody: { color: '#7A5A2E', fontSize: fontSize.sm, lineHeight: 19 },
  degradedReason: {
    color: '#8A5A00',
    fontSize: fontSize.xs,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  degradedLink: { color: colors.brand, fontSize: fontSize.sm, fontWeight: '600' },
  errorText: { flex: 1, color: colors.warning, fontSize: fontSize.sm },

  deployLabel: { fontSize: fontSize.sm, color: colors.textGray, marginTop: spacing.sm },
  deployHash: { fontFamily: 'Courier', fontSize: fontSize.sm, color: colors.text, marginTop: 2 },
  deployLink: { color: colors.brand, fontSize: fontSize.sm, fontWeight: '700', marginTop: spacing.xs },

  insight: { fontSize: fontSize.md, color: colors.text, lineHeight: 21 },
  product: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  productTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  productSub: { fontSize: fontSize.sm, color: colors.textGray, marginTop: 2 },
  productRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  productPrice: { fontSize: fontSize.md, fontWeight: '700', color: colors.brand },
  productFooter: { fontSize: fontSize.sm, color: colors.textGray },

  toolLine: { fontSize: fontSize.sm, color: colors.textGray, marginTop: spacing.xs },
  toolArgs: { fontFamily: 'Courier', fontSize: fontSize.xs, color: colors.textMuted },
});
