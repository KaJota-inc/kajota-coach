import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/constants/colors';
import { setAuthToken } from '@/services/api';
import { loadStoredAuth, signOut as signOutService } from '@/services/auth';
import CoachAgentChatScreen from '@/screens/CoachAgentChatScreen';
import CoachCaptureScreen from '@/screens/CoachCaptureScreen';
import CoachReviewScreen from '@/screens/CoachReviewScreen';
import HomeScreen from '@/screens/HomeScreen';
import SignInScreen from '@/screens/SignInScreen';
import type { AuthUser, RootStackParamList } from '@/types';

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

  return (
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
      </Stack.Navigator>
    </NavigationContainer>
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
