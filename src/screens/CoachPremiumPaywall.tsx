// Coach Premium paywall — sold via RevenueCat. Shown when a user without
// the `coach_premium` entitlement taps a premium-only feature.
//
// UI intentionally lean — the plans row is populated live from RC's
// current offering so prices stay in sync with what's set in the RC
// dashboard / App Store Connect / Play Console.

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const PRIVACY_URL = 'https://kajota.io/privacy';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Purchases, { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

import { colors, radius, spacing } from '@/constants/colors';
import { getCurrentOffering } from '@/lib/revenueCat';
import type { RootStackParamList } from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CoachPremiumPaywall'>;

const BENEFITS = [
  'Unlimited AI coach conversations',
  'Priority model + wider tool budget',
  'Deep listing analysis & pricing intel',
  'Concierge auto-buy on your watchlist',
];

function isAnnual(pkg: PurchasesPackage): boolean {
  const id = pkg.identifier.toLowerCase();
  const productId = pkg.product.identifier.toLowerCase();
  return id.includes('annual') || id === '$rc_annual' || productId.includes('annual');
}

export default function CoachPremiumPaywall({ navigation }: Props) {
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const current = await getCurrentOffering();
      if (mounted) {
        setOffering(current);
        setLoadingPlans(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const purchase = async (pkg: PurchasesPackage) => {
    setError(null);
    setPurchasing(pkg.identifier);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (customerInfo.entitlements.active.coach_premium?.isActive) {
        navigation.goBack();
      }
    } catch (e: any) {
      if (!e?.userCancelled) {
        setError(e?.message ?? 'Purchase failed. Try again.');
      }
    } finally {
      setPurchasing(null);
    }
  };

  const restore = async () => {
    setError(null);
    try {
      const info = await Purchases.restorePurchases();
      if (info.entitlements.active.coach_premium?.isActive) {
        navigation.goBack();
      } else {
        setError('No active Coach Premium found on this account.');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Restore failed.');
    }
  };

  const packages = offering?.availablePackages ?? [];
  const orderedPackages = [...packages].sort((a, b) => (isAnnual(a) ? 1 : 0) - (isAnnual(b) ? 1 : 0));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.close}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>

      <Text style={styles.eyebrow}>Kajota Coach</Text>
      <Text style={styles.title}>Coach Premium</Text>
      <Text style={styles.subtitle}>Ship faster with unrestricted AI coaching, deep analytics, and auto-buy.</Text>

      <View style={styles.benefits}>
        {BENEFITS.map(b => (
          <View key={b} style={styles.benefitRow}>
            <View style={styles.checkPill}>
              <Text style={styles.checkMark}>✓</Text>
            </View>
            <Text style={styles.benefitText}>{b}</Text>
          </View>
        ))}
      </View>

      <View style={styles.plans}>
        {loadingPlans ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.brand} />
            <Text style={styles.loadingText}>Loading plans…</Text>
          </View>
        ) : orderedPackages.length === 0 ? (
          <Text style={styles.noPlans}>
            Plans unavailable. Configure the Coach Premium offering in RevenueCat and rebuild.
          </Text>
        ) : (
          orderedPackages.map(pkg => {
            const annual = isAnnual(pkg);
            const isPurchasing = purchasing === pkg.identifier;
            return (
              <TouchableOpacity
                key={pkg.identifier}
                accessibilityRole="button"
                disabled={!!purchasing}
                onPress={() => purchase(pkg)}
                style={[styles.planCard, annual && styles.planCardAnnual]}
              >
                {annual ? (
                  <View style={styles.planBadge}>
                    <Text style={styles.planBadgeText}>Best value · 17% off</Text>
                  </View>
                ) : null}
                <View style={styles.planRow}>
                  <View>
                    <Text style={styles.planTitle}>{annual ? 'Annual' : 'Monthly'}</Text>
                    <Text style={styles.planPeriod}>{annual ? 'Billed yearly' : 'Billed monthly'}</Text>
                  </View>
                  <Text style={styles.planPrice}>{pkg.product.priceString}</Text>
                </View>
                {isPurchasing ? (
                  <ActivityIndicator color={colors.brand} style={styles.planSpinner} />
                ) : null}
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity accessibilityRole="button" onPress={restore} style={styles.restore}>
        <Text style={styles.restoreText}>Restore purchases</Text>
      </TouchableOpacity>

      <View style={styles.terms}>
        <Text style={styles.termsHeading}>Subscription terms</Text>
        <Text style={styles.termsBody}>
          <Text style={styles.termsBold}>Coach Premium Monthly</Text> — 1 month auto-renewing
          subscription, $9.99 per month ($9.99/month unit price).{'\n'}
          <Text style={styles.termsBold}>Coach Premium Annual</Text> — 1 year auto-renewing
          subscription, $99.99 per year (~$8.33/month unit price).
        </Text>
        <Text style={styles.termsBody}>
          Payment is charged to your Apple ID account at confirmation of purchase. The subscription
          automatically renews at the same price and duration unless auto-renew is turned off at
          least 24 hours before the end of the current period. Manage or cancel your subscription
          from your Apple ID Account Settings after purchase.
        </Text>
        <View style={styles.termsLinks}>
          <TouchableOpacity accessibilityRole="link" onPress={() => Linking.openURL(TERMS_URL)}>
            <Text style={styles.termsLink}>Terms of Use (EULA)</Text>
          </TouchableOpacity>
          <Text style={styles.termsSep}>·</Text>
          <TouchableOpacity accessibilityRole="link" onPress={() => Linking.openURL(PRIVACY_URL)}>
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 48 },
  close: { alignSelf: 'flex-end', padding: 6 },
  closeText: { fontSize: 22, color: colors.textGray },
  eyebrow: {
    color: colors.brand,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontSize: 12,
    marginTop: 4,
  },
  title: { fontSize: 32, fontWeight: '800', color: colors.text, marginTop: 6 },
  subtitle: { fontSize: 16, color: colors.textGray, marginTop: 12, lineHeight: 22 },
  benefits: { marginTop: 24, gap: 12 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFE9E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMark: { color: colors.brand, fontWeight: '800' },
  benefitText: { flex: 1, color: colors.text, fontSize: 15 },
  plans: { marginTop: 28, gap: 12 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  loadingText: { color: colors.textGray },
  noPlans: { color: colors.textGray, textAlign: 'center', lineHeight: 20 },
  planCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  planCardAnnual: { borderColor: colors.brand, borderWidth: 2 },
  planBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brand,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginBottom: 10,
  },
  planBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  planPeriod: { fontSize: 13, color: colors.textGray, marginTop: 2 },
  planPrice: { fontSize: 20, fontWeight: '800', color: colors.text },
  planSpinner: { marginTop: 8 },
  error: { color: colors.warning, marginTop: 16, textAlign: 'center' },
  restore: { alignItems: 'center', marginTop: 24 },
  restoreText: { color: colors.brand, fontWeight: '700' },
  terms: {
    marginTop: 24,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  termsHeading: { color: colors.text, fontSize: 13, fontWeight: '700' },
  termsBody: { color: colors.textGray, fontSize: 12, lineHeight: 17 },
  termsBold: { color: colors.text, fontWeight: '700' },
  termsLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  termsLink: { color: colors.brand, fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  termsSep: { color: colors.textMuted, fontSize: 12 },
});
