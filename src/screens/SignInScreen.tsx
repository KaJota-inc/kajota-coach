import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import { colors, fontSize, radius, spacing } from '@/constants/colors';
import { setAuthToken } from '@/services/api';
import { signIn } from '@/services/auth';
import type { AuthUser, RootStackParamList } from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'> & {
  onSignedIn: (u: AuthUser) => void;
};

export default function SignInScreen({ navigation, onSignedIn }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email || !password) return;
    setBusy(true);
    setError(null);
    try {
      const user = await signIn(email.trim(), password);
      setAuthToken(user.token);
      onSignedIn(user);
      navigation.replace('Home');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <StatusBar style="light" />
      <LinearGradient colors={[colors.brand, colors.brandDark]} style={styles.hero}>
        <Ionicons color="white" name="flash" size={36} />
        <Text style={styles.heroTitle}>Kajota Coach</Text>
        <Text style={styles.heroSub}>
          The AI co-pilot that drafts a complete co-sell listing from a single product photo.
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.fieldLabel}>Email</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.fieldLabel}>Password</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="••••••••"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />

        {error && (
          <View style={styles.errorBox}>
            <Ionicons color={colors.warning} name="warning" size={16} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={busy || !email || !password}
          style={[styles.cta, (busy || !email || !password) && styles.ctaDisabled]}
          onPress={submit}
        >
          <LinearGradient
            colors={[colors.brand, colors.brandDark]}
            end={{ x: 1, y: 0 }}
            start={{ x: 0, y: 0 }}
            style={styles.ctaInner}
          >
            {busy ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.ctaText}>Sign in to Kajota</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.help}>
          Uses your existing Kajota account (https://kajota.io). The Coach endpoint is auth-required
          server-side.
        </Text>

        {__DEV__ && (
          <TouchableOpacity
            style={styles.demoLink}
            onPress={() => {
              const demoUser: AuthUser = {
                id: 'demo',
                emailAddress: 'demo@kajota.io',
                firstName: 'Demo',
                lastName: 'Merchant',
                fullName: 'Demo Merchant',
                token: 'demo-token',
              };
              onSignedIn(demoUser);
              navigation.replace('Home');
            }}
          >
            <Text style={styles.demoLinkText}>Demo mode → skip sign-in</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.pageBackground },
  hero: {
    paddingHorizontal: spacing.xl,
    paddingTop: 80,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  heroTitle: { color: 'white', fontSize: fontSize.hero, fontWeight: '800' },
  heroSub: { color: 'rgba(255,255,255,0.92)', fontSize: fontSize.md, lineHeight: 20 },

  body: { padding: spacing.xl, gap: spacing.sm },
  fieldLabel: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: fontSize.lg,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.warning,
    marginTop: spacing.md,
  },
  errorText: { color: colors.warning, flex: 1, fontSize: fontSize.md },
  cta: {
    marginTop: spacing.xl,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  ctaDisabled: { opacity: 0.6 },
  ctaInner: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: 'white', fontSize: fontSize.lg, fontWeight: '700' },
  help: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  demoLink: {
    marginTop: spacing.md,
    alignSelf: 'center',
    padding: spacing.sm,
  },
  demoLinkText: {
    color: colors.brand,
    fontSize: fontSize.md,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
