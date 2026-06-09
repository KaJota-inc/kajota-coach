/**
 * VoiceMicButton — hold-to-talk control for the Coach Agent voice loop
 * (Tier 4). Lives in the chat input bar next to the text field.
 *
 * Press-and-hold opens the mic; release sends the utterance. The icon +
 * colour reflect the {@link VoiceState} so the user always knows
 * whether the agent is listening, thinking, or speaking.
 *
 * Pure presentation + gesture — all the recording / WS / playback logic
 * lives in {@link useVoiceSession}. This component just maps state →
 * icon and press → callbacks.
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { colors, radius } from '@/constants/colors';
import type { VoiceState } from '@/hooks/useVoiceSession';

interface Props {
  state: VoiceState;
  onPressIn: () => void;
  onPressOut: () => void;
  disabled?: boolean;
}

export default function VoiceMicButton({ state, onPressIn, onPressOut, disabled }: Props) {
  const listening = state === 'listening';
  const busy = state === 'thinking' || state === 'connecting';
  const speaking = state === 'speaking';

  return (
    <TouchableOpacity
      accessibilityLabel={listening ? 'Release to send' : 'Hold to talk'}
      activeOpacity={0.8}
      delayPressOut={0}
      disabled={disabled || busy}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[
        styles.btn,
        listening && styles.btnListening,
        speaking && styles.btnSpeaking,
        (disabled || busy) && styles.btnDisabled,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={colors.brand} size="small" />
      ) : (
        <Feather
          color={listening || speaking ? 'white' : colors.textGray}
          name={speaking ? 'volume-2' : 'mic'}
          size={22}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill ?? 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnListening: {
    backgroundColor: colors.brand,
  },
  btnSpeaking: {
    backgroundColor: colors.brand,
  },
  btnDisabled: {
    opacity: 0.4,
  },
});
