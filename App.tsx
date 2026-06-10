// Polyfills — MUST be the first imports in this file, before anything
// that touches global Web APIs gets evaluated. React Native's Hermes
// runtime is intentionally minimal; viem + Privy assume Web globals.
//   1. crypto.getRandomValues — used by viem's keyToAccount + Privy's
//      embedded-wallet entropy.
//   2. TextEncoder / TextDecoder — used by viem's hashing helpers and
//      Privy's webcrypto wrapper.
//   3. URL / URLSearchParams — used by every HTTP client in the stack
//      that takes a URL and reads .pathname etc.
import 'react-native-get-random-values';
import 'text-encoding-polyfill';
import 'react-native-url-polyfill/auto';

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PrivyProvider } from '@privy-io/expo';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/constants/colors';
import { setAuthToken } from '@/services/api';
import { loadStoredAuth, signOut as signOutService } from '@/services/auth';
import CoachAgentChatScreen from '@/screens/CoachAgentChatScreen';
import CoachCaptureScreen from '@/screens/CoachCaptureScreen';
import CoachReviewScreen from '@/screens/CoachReviewScreen';
import ConciergeScreen from '@/screens/ConciergeScreen';
import HomeScreen from '@/screens/HomeScreen';
import MeshSignScreen from '@/screens/MeshSignScreen';
import SignInScreen from '@/screens/SignInScreen';
import type { AuthUser, RootStackParamList } from '@/types';

/* ------------------------------------------------------------------ */
/*  Privy config                                                       */
/*  - appId comes from app.json `extra.privyAppId` (provision at        */
/*    privy.io and paste in; empty string disables the embedded         */
/*    wallet path so the rest of the app still works).                  */
/* ------------------------------------------------------------------ */
const privyConfig = Constants.expoConfig?.extra as
  | { privyAppId?: string; privyClientId?: string }
  | undefined;
const PRIVY_APP_ID = privyConfig?.privyAppId ?? '';
const PRIVY_CLIENT_ID = privyConfig?.privyClientId ?? '';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await loadStoredAuth();
      if (stored) {
        setAuthToken(stored.token);
        setUser(stored);
      }
      setBootstrapping(false);
    })();
  }, []);

  const handleSignOut = async () => {
    setAuthToken(null);
    await signOutService();
    setUser(null);
  };

  if (bootstrapping) {
    return (
      <View style={styles.loading}>
        <StatusBar style="dark" />
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  const navStack = (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={user ? 'Home' : 'SignIn'}
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.pageBackground } }}
      >
        <Stack.Screen name="SignIn">
          {props => <SignInScreen {...props} onSignedIn={u => setUser(u)} />}
        </Stack.Screen>
        <Stack.Screen name="Home">
          {props => <HomeScreen {...props} user={user} onSignOut={handleSignOut} />}
        </Stack.Screen>
        <Stack.Screen
          component={CoachCaptureScreen}
          name="CoachCapture"
          options={{ headerShown: true, title: 'Kajota Coach', headerTintColor: colors.text }}
        />
        <Stack.Screen
          component={CoachReviewScreen}
          name="CoachReview"
          options={{ headerShown: true, title: 'Review draft', headerTintColor: colors.text }}
        />
        <Stack.Screen
          component={CoachAgentChatScreen}
          name="CoachAgentChat"
          options={{ headerShown: true, title: 'Coach Agent', headerTintColor: colors.text }}
        />
        <Stack.Screen
          component={ConciergeScreen}
          name="Concierge"
          options={{ headerShown: true, title: 'KaJota Concierge', headerTintColor: colors.text }}
        />
        <Stack.Screen
          component={MeshSignScreen}
          name="MeshSign"
          options={{ headerShown: true, title: 'Publish on Mesh', headerTintColor: colors.text }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );

  // Wrap with PrivyProvider only when configured. If the appId is
  // unset (e.g. a fresh clone without a privy.io dashboard yet) we
  // skip the provider so the rest of the app still boots — the
  // MeshSign screen handles the missing-provider case explicitly.
  if (!PRIVY_APP_ID) {
    return navStack;
  }
  return (
    <PrivyProvider appId={PRIVY_APP_ID} clientId={PRIVY_CLIENT_ID || undefined}>
      {navStack}
    </PrivyProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.pageBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
