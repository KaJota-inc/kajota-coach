/**
 * Coach Agent v2 — multi-turn chat screen.
 *
 * Hackathon targets: Google Cloud Rapid Agent (Jun 11) +
 * Mantle Turing Test Phase 2 (Jun 15).
 *
 * UI shape:
 *   - Inverted FlatList of chat bubbles (newest at the bottom).
 *   - User bubbles right-aligned in brand orange; agent bubbles left-aligned
 *     in muted surface.
 *   - Each agent bubble has a "Used N tools" expander that reveals the
 *     trace (analyzeProductImage, matchCategory, anchorPrice, …) for
 *     transparency. Judges love this.
 *   - Bottom input bar: paperclip (camera/gallery sheet), multi-line text,
 *     send button. Attached image preview floats above the input bar
 *     until sent.
 *   - Empty-state suggestion chips that pre-fill the message — these
 *     are the most-likely first prompts and double as a feature
 *     showcase.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';

import { sendAgentChat } from '@/services/coachAgent';
import { colors, fontSize, radius, spacing } from '@/constants/colors';
import type {
  CoachAgentLocalMessage,
  CoachAgentToolInvocation,
  RootStackParamList,
} from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CoachAgentChat'>;

const STARTER_PROMPTS: ReadonlyArray<string> = [
  'I want to list a new product',
  "What's the going rate for sneakers on Kajota?",
  'Translate "Fresh tomatoes, sweet and ripe" to Yoruba',
  'Help me write a catchy WhatsApp caption',
];

export default function CoachAgentChatScreen({ navigation }: Props) {
  const [messages, setMessages] = useState<CoachAgentLocalMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [pendingImage, setPendingImage] = useState<{
    uri: string;
    base64: string;
  } | null>(null);
  const listRef = useRef<FlatList<CoachAgentLocalMessage>>(null);

  // FlatList rendered inverted — newest message at the bottom of the
  // screen, oldest at the top. So we reverse for display.
  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

  const isInputReady = input.trim().length > 0 || pendingImage !== null;
  const isAgentBusy = messages.some(m => m.pending);

  /* --- input handlers -------------------------------------------------- */

  const handlePickImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]?.base64) return;
    setPendingImage({
      uri: result.assets[0].uri,
      base64: result.assets[0].base64,
    });
  }, []);

  const handleSend = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text && !pendingImage) return;
      if (isAgentBusy) return;

      const now = Date.now();
      const userMsg: CoachAgentLocalMessage = {
        id: `user-${now}`,
        role: 'user',
        text: text || '(sent a photo)',
        imageUri: pendingImage?.uri,
        timestamp: now,
      };
      const agentPlaceholder: CoachAgentLocalMessage = {
        id: `agent-${now + 1}`,
        role: 'agent',
        text: '',
        timestamp: now + 1,
        pending: true,
      };
      setMessages(prev => [...prev, userMsg, agentPlaceholder]);

      const sentImage = pendingImage;
      setInput('');
      setPendingImage(null);

      try {
        const response = await sendAgentChat({
          sessionId,
          userMessage: text || 'What do you see in this photo?',
          imageBase64: sentImage?.base64,
        });
        setSessionId(response.sessionId);
        setMessages(prev =>
          prev.map(m =>
            m.id === agentPlaceholder.id
              ? {
                  ...m,
                  pending: false,
                  text: response.reply,
                  toolsCalled: response.toolsCalled,
                }
              : m,
          ),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Something went wrong.';
        setMessages(prev =>
          prev.map(m =>
            m.id === agentPlaceholder.id
              ? { ...m, pending: false, error: message }
              : m,
          ),
        );
      }
    },
    [input, pendingImage, sessionId, isAgentBusy],
  );

  /* --- render ---------------------------------------------------------- */

  const renderMessage = useCallback(
    ({ item }: { item: CoachAgentLocalMessage }) =>
      item.role === 'user' ? (
        <UserBubble message={item} />
      ) : (
        <AgentBubble message={item} />
      ),
    [],
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <StatusBar style="dark" />

      {messages.length === 0 ? (
        <EmptyState onPick={handleSend} />
      ) : (
        <FlatList
          ref={listRef}
          contentContainerStyle={styles.listContent}
          data={reversedMessages}
          inverted
          keyExtractor={m => m.id}
          renderItem={renderMessage}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {pendingImage && (
        <View style={styles.attachmentPreview}>
          <Image source={{ uri: pendingImage.uri }} style={styles.attachmentThumb} />
          <View style={{ flex: 1 }}>
            <Text style={styles.attachmentLabel}>Photo attached</Text>
            <Text style={styles.attachmentSub}>The agent will analyse it next turn.</Text>
          </View>
          <TouchableOpacity onPress={() => setPendingImage(null)} style={styles.attachmentClose}>
            <Feather color={colors.textGray} name="x" size={18} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputBar}>
        <TouchableOpacity
          accessibilityLabel="Attach photo"
          onPress={handlePickImage}
          style={styles.attachBtn}
        >
          <Feather color={colors.textGray} name="image" size={22} />
        </TouchableOpacity>
        <TextInput
          multiline
          placeholder="Message Kajota Coach…"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          value={input}
          onChangeText={setInput}
        />
        <TouchableOpacity
          accessibilityLabel="Send"
          disabled={!isInputReady || isAgentBusy}
          onPress={() => handleSend()}
          style={[
            styles.sendBtn,
            (!isInputReady || isAgentBusy) && styles.sendBtnDisabled,
          ]}
        >
          {isAgentBusy ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Feather color="white" name="arrow-up" size={20} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <View style={styles.emptyRoot}>
      <View style={styles.emptyIcon}>
        <Feather color={colors.brand} name="message-square" size={28} />
      </View>
      <Text style={styles.emptyTitle}>Talk to your Coach</Text>
      <Text style={styles.emptySub}>
        Multi-turn agent powered by Gemini Function Calling. Ask for prices, drafts, translations
        — or send a photo to start a listing.
      </Text>
      <View style={styles.starterWrap}>
        {STARTER_PROMPTS.map(p => (
          <TouchableOpacity key={p} onPress={() => onPick(p)} style={styles.starterChip}>
            <Text style={styles.starterText}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function UserBubble({ message }: { message: CoachAgentLocalMessage }) {
  return (
    <View style={[styles.row, styles.rowUser]}>
      <View style={[styles.bubble, styles.bubbleUser]}>
        {message.imageUri ? (
          <Image source={{ uri: message.imageUri }} style={styles.bubbleImage} />
        ) : null}
        {message.text ? <Text style={styles.bubbleUserText}>{message.text}</Text> : null}
      </View>
    </View>
  );
}

function AgentBubble({ message }: { message: CoachAgentLocalMessage }) {
  const [traceOpen, setTraceOpen] = useState(false);
  return (
    <View style={[styles.row, styles.rowAgent]}>
      <View style={styles.agentAvatar}>
        <Feather color="white" name="zap" size={14} />
      </View>
      <View style={[styles.bubble, styles.bubbleAgent]}>
        {message.pending ? (
          <View style={styles.thinkingRow}>
            <ActivityIndicator color={colors.brand} size="small" />
            <Text style={styles.thinkingText}>Thinking…</Text>
          </View>
        ) : message.error ? (
          <Text style={styles.errorText}>{message.error}</Text>
        ) : (
          <Text style={styles.bubbleAgentText}>{message.text}</Text>
        )}

        {message.toolsCalled && message.toolsCalled.length > 0 && (
          <TouchableOpacity
            onPress={() => setTraceOpen(o => !o)}
            style={styles.traceToggle}
          >
            <Feather
              color={colors.textGray}
              name={traceOpen ? 'chevron-down' : 'chevron-right'}
              size={14}
            />
            <Text style={styles.traceToggleText}>
              Used {message.toolsCalled.length}{' '}
              {message.toolsCalled.length === 1 ? 'tool' : 'tools'}
            </Text>
          </TouchableOpacity>
        )}
        {traceOpen &&
          message.toolsCalled?.map((t, i) => <ToolRow key={`${t.name}-${i}`} tool={t} />)}
      </View>
    </View>
  );
}

function ToolRow({ tool }: { tool: CoachAgentToolInvocation }) {
  return (
    <View style={styles.toolRow}>
      <Text style={styles.toolName}>{tool.name}</Text>
      <Text style={styles.toolMeta}>{tool.latencyMs} ms</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.pageBackground },
  listContent: { padding: spacing.lg, gap: spacing.md },

  /* empty state */
  emptyRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${colors.brand}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: { color: colors.text, fontSize: fontSize.xxl, fontWeight: '800' },
  emptySub: {
    color: colors.textGray,
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  starterWrap: { width: '100%', gap: spacing.sm },
  starterChip: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  starterText: { color: colors.text, fontSize: fontSize.md },

  /* bubble layout */
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  rowUser: { justifyContent: 'flex-end' },
  rowAgent: { justifyContent: 'flex-start' },

  agentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },

  bubble: {
    maxWidth: '78%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
  },
  bubbleUser: { backgroundColor: colors.brand, borderBottomRightRadius: 4 },
  bubbleAgent: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleUserText: { color: 'white', fontSize: fontSize.md, lineHeight: 20 },
  bubbleAgentText: { color: colors.text, fontSize: fontSize.md, lineHeight: 20 },

  bubbleImage: {
    width: 180,
    height: 180,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },

  /* thinking / error */
  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  thinkingText: { color: colors.textGray, fontSize: fontSize.sm, fontStyle: 'italic' },
  errorText: { color: colors.warning, fontSize: fontSize.sm },

  /* tool trace */
  traceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  traceToggleText: { color: colors.textGray, fontSize: fontSize.sm, fontWeight: '600' },
  toolRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  toolName: { color: colors.brand, fontSize: fontSize.sm, fontWeight: '700' },
  toolMeta: { color: colors.textMuted, fontSize: fontSize.xs },

  /* attachment preview */
  attachmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  attachmentThumb: { width: 40, height: 40, borderRadius: radius.sm },
  attachmentLabel: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  attachmentSub: { color: colors.textGray, fontSize: fontSize.xs },
  attachmentClose: { padding: spacing.xs },

  /* input bar */
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 28 : spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  attachBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 40,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.textMuted },
});
