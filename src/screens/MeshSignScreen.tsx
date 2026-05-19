/**
 * Kajota Mesh — sign-listing screen.
 *
 * Surfaced when the Coach Agent's `proposeListingForPublish` tool fires
 * during a chat turn. Shows the structured intent (productId, wholesaler,
 * coseller, commissionBps, currency, deterministic listingId) and lets
 * the seller commit the on-chain `CosellRegistry.register(...)` tx.
 *
 * The signing flow itself is delegated to an embedded wallet (Privy by
 * default — see the README in `kajota-mesh`). Wiring the Privy SDK
 * (PrivyProvider, useEmbeddedWallet) is a small follow-up:
 *
 *   1. `npx expo install @privy-io/expo @privy-io/expo-native-extensions
 *      expo-application expo-crypto`
 *   2. Wrap App.tsx with <PrivyProvider appId={…}>.
 *   3. In handleSign() below, replace the showToast/console.log with:
 *        const wallet = await embeddedWallet.create();
 *        const tx = await wallet.sendTransaction({
 *          to:    proposal.contract === 'CosellRegistry' ? REGISTRY_ADDR : null,
 *          chain: 'base-sepolia',
 *          data:  encodeFunctionData({ abi: …, functionName: 'register', args: [...] }),
 *        });
 *
 * For tonight: the screen renders the intent card + sign button. Tapping
 * the button surfaces the planned tx data — the live tx submission lands
 * once Privy app id is provisioned and the contracts are deployed to
 * Base Sepolia (deployer EOA needs ~0.01 testnet ETH first).
 */
import React, { useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import { colors, fontSize, radius, spacing } from '@/constants/colors';
import type { RootStackParamList } from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'MeshSign'>;

const BASESCAN_BASE = 'https://sepolia.basescan.org';

export default function MeshSignScreen({ route, navigation }: Props) {
  const { proposal } = route.params;
  const [submitting, setSubmitting] = useState(false);

  const percentString = (proposal.commissionBps / 100).toFixed(
    proposal.commissionBps % 100 === 0 ? 0 : 2,
  );

  const handleSign = async () => {
    setSubmitting(true);
    // TODO(privy): swap this Alert for an actual embedded-wallet tx.
    // See file-level docblock for the 3-line wiring.
    Alert.alert(
      'Sign on Base Sepolia',
      `Once Privy is wired and CosellRegistry is deployed, this taps your embedded wallet to call:\n\n${proposal.contract}.${proposal.method}\n\nlistingId:\n${proposal.listingId.slice(0, 18)}…\n\nReturning you to the chat — the agent will follow up when the on-chain confirmation lands.`,
      [
        {
          text: 'Got it',
          onPress: () => {
            setSubmitting(false);
            navigation.goBack();
          },
        },
      ],
    );
  };

  const openBasescan = () => {
    void Linking.openURL(
      `${BASESCAN_BASE}/address/${proposal.wholesalerAddress}`,
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll}>
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
          <Text style={styles.heroTitle}>Publish this listing on Base Sepolia</Text>
          <Text style={styles.heroSub}>{proposal.nextStep}</Text>
        </LinearGradient>

        <FieldCard label="Listing ID (Keccak-256 of productId+wholesaler+coseller)" value={proposal.listingId} mono />
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

        <TouchableOpacity onPress={openBasescan} style={styles.basescanLink}>
          <Feather color={colors.brand} name="external-link" size={14} />
          <Text style={styles.basescanLinkText}>View wholesaler on Basescan</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={submitting}
          style={[styles.cta, submitting && { opacity: 0.6 }]}
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
              {submitting ? 'Signing…' : 'Sign on Base Sepolia'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Coach Agent never submits this transaction on its own. You sign with
          your embedded wallet — the listing terms are then enforceable by math,
          not by Kajota's bookkeeping.
        </Text>
      </ScrollView>
    </View>
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

  basescanLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  basescanLinkText: { color: colors.brand, fontSize: fontSize.sm, fontWeight: '600' },

  cta: { borderRadius: radius.pill, overflow: 'hidden' },
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
