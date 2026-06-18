import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import { colors, fontSize, radius, spacing } from '@/constants/colors';
import type { AuthUser, RootStackParamList } from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'> & {
  user: AuthUser | null;
  onSignOut: () => void;
};

const FEATURE_BULLETS: ReadonlyArray<{
  icon: keyof typeof Feather.glyphMap;
  title: string;
  body: string;
}> = [
  {
    icon: 'image',
    title: '1 — Image input',
    body: 'Google Cloud Vision extracts labels, text, and dominant colors from the photo.',
  },
  {
    icon: 'tag',
    title: '2 — Category match',
    body: 'Fuzzy-match Vision labels against Kajota’s live category catalogue. No extra LLM call.',
  },
  {
    icon: 'bar-chart-2',
    title: '3 — Anchor price',
    body: 'Query products in the matched category + your currency. Median = the price anchor.',
  },
  {
    icon: 'edit-3',
    title: '4–6 — Parallel LLM',
    body: 'Title · description · cosell-markup · WhatsApp + Instagram captions, all in parallel.',
  },
  {
    icon: 'globe',
    title: '7 — Local language',
    body: 'Optional translation to Yoruba, Igbo, or Hausa via Gemini.',
  },
];

export default function HomeScreen({ navigation, user, onSignOut }: Props) {
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <LinearGradient
          colors={[`${colors.brand}25`, `${colors.brand}05`]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.hero}
        >
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Ionicons color="white" name="flash" size={20} />
            </View>
            <Text style={styles.brandText}>Kajota Coach</Text>
          </View>
          <Text style={styles.heroTitle}>
            Snap a photo. Get a complete co-sell listing in 8 seconds.
          </Text>
          <Text style={styles.heroSub}>
            For Kajota co-sellers (micro-distributors) who can grow their store without typing out
            long product descriptions — especially relevant for non-text-literate sellers in
            informal African markets.
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.cta}
            onPress={() => navigation.navigate('CoachCapture')}
          >
            <LinearGradient
              colors={[colors.brand, colors.brandDark]}
              end={{ x: 1, y: 0 }}
              start={{ x: 0, y: 0 }}
              style={styles.ctaInner}
            >
              <Feather color="white" name="camera" size={18} />
              <Text style={styles.ctaText}>Try Kajota Coach</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.ctaSecondary}
            onPress={() => navigation.navigate('CoachAgentChat')}
          >
            <Feather color={colors.brand} name="message-square" size={16} />
            <Text style={styles.ctaSecondaryText}>Chat with Coach Agent (v2 · beta)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.ctaSecondary}
            onPress={() => navigation.navigate('Concierge')}
          >
            <Feather color={colors.brand} name="shopping-bag" size={16} />
            <Text style={styles.ctaSecondaryText}>
              Try KaJota Concierge (Gemini · ADK · MongoDB MCP)
            </Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Pipeline explainer */}
        <Text style={styles.sectionTitle}>The pipeline (composes existing Kajota services)</Text>
        {FEATURE_BULLETS.map(b => (
          <View key={b.title} style={styles.bullet}>
            <View style={styles.bulletIconWrap}>
              <Feather color={colors.brand} name={b.icon} size={16} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bulletTitle}>{b.title}</Text>
              <Text style={styles.bulletBody}>{b.body}</Text>
            </View>
          </View>
        ))}

        {/* Tech credits */}
        <View style={styles.credits}>
          <Text style={styles.creditsTitle}>What's under the hood</Text>
          <Text style={styles.creditsBody}>
            Google Cloud Vision · Gemini 2.5 Flash · MongoDB Atlas Search · Spring Boot · React
            Native (Expo).
          </Text>
          <Text style={[styles.creditsBody, { marginTop: spacing.sm }]}>
            Production parent app:{' '}
            <Text style={{ color: colors.brand, fontWeight: '700' }}>kajota.io</Text> — listed on
            the App Store + Google Play.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Signed in as <Text style={{ color: colors.text }}>{user?.emailAddress ?? '—'}</Text>
          </Text>
          <TouchableOpacity onPress={onSignOut}>
            <Text style={styles.footerLink}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.pageBackground },
  scroll: { padding: spacing.lg, paddingBottom: 80 },

  hero: { borderRadius: radius.lg, padding: spacing.xl, marginBottom: spacing.xl },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: { color: colors.brand, fontSize: fontSize.lg, fontWeight: '800' },
  heroTitle: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '800',
    marginTop: spacing.lg,
    lineHeight: 30,
  },
  heroSub: {
    color: colors.textGray,
    fontSize: fontSize.md,
    lineHeight: 20,
    marginTop: spacing.sm,
  },

  cta: { marginTop: spacing.xl, borderRadius: radius.pill, overflow: 'hidden' },
  ctaInner: {
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  ctaText: { color: 'white', fontSize: fontSize.lg, fontWeight: '700' },

  ctaSecondary: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: `${colors.brand}40`,
    backgroundColor: `${colors.brand}08`,
  },
  ctaSecondaryText: { color: colors.brand, fontSize: fontSize.md, fontWeight: '700' },

  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  bullet: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bulletIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${colors.brand}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
  bulletBody: {
    color: colors.textGray,
    fontSize: fontSize.sm,
    marginTop: 2,
    lineHeight: 18,
  },

  credits: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: `${colors.brand}08`,
  },
  creditsTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
  creditsBody: {
    color: colors.textGray,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    lineHeight: 18,
  },

  footer: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: { color: colors.textMuted, fontSize: fontSize.sm },
  footerLink: { color: colors.brand, fontSize: fontSize.sm, fontWeight: '700' },
});
