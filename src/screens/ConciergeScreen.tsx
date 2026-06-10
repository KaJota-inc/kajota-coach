/**
 * KaJota Concierge — shopping-assistant chat screen.
 *
 * Hackathon target: Google Cloud Rapid Agent (Jun 11, 2026).
 *
 * Talks directly to the standalone Concierge agent on Render
 * (Gemini on Google ADK + MongoDB MCP). The chat IS the surface — the
 * agent itself decides whether to run `find` / `aggregate` /
 * `insert-one` against the buyer's purchases, products, and wishlist
 * collections. Every agent bubble exposes a "Used N tools" expander
 * that surfaces the live MCP trace, which is the judge-facing proof
 * that this is a real agent, not a hard-coded flow.
 *
 * Cloned from CoachAgentChatScreen but stripped to fit the shopping
 * use case: no image picker, no voice mode, no Mesh on-chain CTA.
 * The "Wishlist" quick-action sends a canned prompt rather than a
 * separate REST call so the demo stays purely agent-driven.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import {
  sendConciergeChat,
  eventsToToolTrace,
  extractCards,
  warmupConciergeAgent,
} from '@/services/conciergeAgent';
import { colors, fontSize, radius, spacing } from '@/constants/colors';
import type {
  ConciergeLocalMessage,
  ConciergeProductCard,
  ConciergeToolInvocation,
  RootStackParamList,
} from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Concierge'>;

const STARTER_PROMPTS: ReadonlyArray<{ label: string; prompt: string }> = [
  { label: 'What did I last buy?', prompt: 'What did I last buy?' },
  {
    label: 'Where is my Keychron order?',
    prompt: 'Where is my Keychron K2 order?',
  },
  { label: 'What should I get next?', prompt: 'What should I get next?' },
  {
    label: "What's on my wishlist?",
    prompt: "What's on my wishlist?",
  },
  {
    label: 'Add Supreme to my wishlist',
    prompt: 'Add Supreme to my wishlist',
  },
];

const WISHLIST_PROMPT = "What's on my wishlist?";

export default function ConciergeScreen(_props: Props) {
  const [messages, setMessages] = useState<ConciergeLocalMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList<ConciergeLocalMessage>>(null);

  // Spin Render's free-tier dyno up the moment the user opens the
  // screen. The /healthz roundtrip kicks the container out of sleep
  // so the first real chat turn doesn't pay the 60-80s cold-start
  // tax. Fire-and-forget — the chat call surfaces any actual errors.
  useEffect(() => {
    warmupConciergeAgent();
  }, []);

  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);
  const isInputReady = input.trim().length > 0;
  const isAgentBusy = messages.some(m => m.pending);

  const handleSend = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text || isAgentBusy) return;

      const now = Date.now();
      const userMsg: ConciergeLocalMessage = {
        id: `user-${now}`,
        role: 'user',
        text,
        timestamp: now,
      };
      const agentPlaceholder: ConciergeLocalMessage = {
        id: `agent-${now + 1}`,
        role: 'agent',
        text: '',
        timestamp: now + 1,
        pending: true,
      };
      setMessages(prev => [...prev, userMsg, agentPlaceholder]);
      setInput('');

      try {
        const response = await sendConciergeChat({
          sessionId,
          message: text,
        });
        setSessionId(response.sessionId);
        const tools = eventsToToolTrace(response.events);
        const { text: cleanText, cards } = extractCards(response.response);
        setMessages(prev =>
          prev.map(m =>
            m.id === agentPlaceholder.id
              ? {
                  ...m,
                  pending: false,
                  text: cleanText,
                  cards: cards.length > 0 ? cards : undefined,
                  toolsCalled: tools,
                }
              : m,
          ),
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Something went wrong.';
        setMessages(prev =>
          prev.map(m =>
            m.id === agentPlaceholder.id
              ? { ...m, pending: false, error: message }
              : m,
          ),
        );
      }
    },
    [input, isAgentBusy, sessionId],
  );

  const renderMessage = useCallback(
    ({ item }: { item: ConciergeLocalMessage }) =>
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

      {/* Header banner — sets the shopping-concierge tone */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Feather color="white" name="shopping-bag" size={16} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>KaJota Concierge</Text>
          <Text style={styles.headerSub}>
            Gemini · ADK · MongoDB MCP — live shopping assistant
          </Text>
        </View>
        <TouchableOpacity
          accessibilityLabel="Show my wishlist"
          disabled={isAgentBusy}
          onPress={() => handleSend(WISHLIST_PROMPT)}
          style={[
            styles.headerAction,
            isAgentBusy && styles.headerActionDisabled,
          ]}
        >
          <Feather color={colors.brand} name="heart" size={14} />
          <Text style={styles.headerActionText}>Wishlist</Text>
        </TouchableOpacity>
      </View>

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

      <View style={styles.inputBar}>
        <TextInput
          multiline
          placeholder="Ask the Concierge…"
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
    <ScrollView contentContainerStyle={styles.emptyRoot}>
      <View style={styles.emptyIcon}>
        <Feather color={colors.brand} name="shopping-bag" size={28} />
      </View>
      <Text style={styles.emptyTitle}>Hi, I'm your Concierge.</Text>
      <Text style={styles.emptySub}>
        I can pull up your purchases, track open orders, manage your wishlist,
        and suggest what to buy next — straight from your KaJota account.
      </Text>
      <Text style={styles.starterHeading}>Try one of these:</Text>
      <View style={styles.starterWrap}>
        {STARTER_PROMPTS.map(p => (
          <TouchableOpacity
            key={p.prompt}
            onPress={() => onPick(p.prompt)}
            style={styles.starterChip}
          >
            <Feather color={colors.brand} name="zap" size={14} />
            <Text style={styles.starterText}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.emptyFootnote}>
        First reply may take ~10–15s while the agent warms up on Render free
        tier.
      </Text>
    </ScrollView>
  );
}

function UserBubble({ message }: { message: ConciergeLocalMessage }) {
  return (
    <View style={[styles.row, styles.rowUser]}>
      <View style={[styles.bubble, styles.bubbleUser]}>
        <Text style={styles.bubbleUserText}>{message.text}</Text>
      </View>
    </View>
  );
}

function AgentBubble({ message }: { message: ConciergeLocalMessage }) {
  const [traceOpen, setTraceOpen] = useState(false);

  return (
    <View style={[styles.row, styles.rowAgent]}>
      <View style={styles.agentAvatar}>
        <Feather color="white" name="shopping-bag" size={14} />
      </View>
      <View style={[styles.bubble, styles.bubbleAgent]}>
        {message.pending ? (
          <View style={styles.thinkingRow}>
            <ActivityIndicator color={colors.brand} size="small" />
            <Text style={styles.thinkingText}>Looking that up…</Text>
          </View>
        ) : message.error ? (
          <Text style={styles.errorText}>{message.error}</Text>
        ) : (
          <Text style={styles.bubbleAgentText}>{message.text}</Text>
        )}

        {message.cards && message.cards.length > 0 && (
          <View style={styles.cardsWrap}>
            {message.cards.map((card, i) => (
              <ProductCard key={`${card.title}-${i}`} card={card} />
            ))}
          </View>
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
              Used {message.toolsCalled.length} MongoDB MCP{' '}
              {message.toolsCalled.length === 1 ? 'tool' : 'tools'}
            </Text>
          </TouchableOpacity>
        )}
        {traceOpen &&
          message.toolsCalled?.map((t, i) => (
            <ToolRow key={`${t.name}-${i}`} tool={t} />
          ))}
      </View>
    </View>
  );
}

function ProductCard({ card }: { card: ConciergeProductCard }) {
  return (
    <View style={styles.productCard}>
      <View style={styles.productCardThumb}>
        <Feather color={colors.brand} name="shopping-bag" size={18} />
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={styles.productCardTitle}>
          {card.title}
        </Text>
        {card.subtitle ? (
          <Text numberOfLines={1} style={styles.productCardSub}>
            {card.subtitle}
          </Text>
        ) : null}
        <View style={styles.productCardRow}>
          {card.price ? (
            <Text style={styles.productCardPrice}>{card.price}</Text>
          ) : null}
          {card.footer ? (
            <Text numberOfLines={1} style={styles.productCardFooter}>
              {card.footer}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function ToolRow({ tool }: { tool: ConciergeToolInvocation }) {
  return (
    <View style={styles.toolRow}>
      <Text style={styles.toolName}>{tool.name}</Text>
      {tool.args ? (
        <Text numberOfLines={2} style={styles.toolArgs}>
          {tool.args}
        </Text>
      ) : null}
      {tool.preview ? (
        <Text numberOfLines={3} style={styles.toolPreview}>
          {tool.preview}
        </Text>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.pageBackground },

  /* header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: '800' },
  headerSub: { color: colors.textGray, fontSize: fontSize.xs, marginTop: 1 },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: `${colors.brand}40`,
    backgroundColor: `${colors.brand}10`,
  },
  headerActionDisabled: { opacity: 0.5 },
  headerActionText: {
    color: colors.brand,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },

  listContent: { padding: spacing.lg, gap: spacing.md },

  /* empty state */
  emptyRoot: {
    flexGrow: 1,
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
  starterHeading: {
    alignSelf: 'flex-start',
    color: colors.textGray,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  starterWrap: { width: '100%', gap: spacing.sm },
  starterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  starterText: { color: colors.text, fontSize: fontSize.md, flex: 1 },
  emptyFootnote: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.xl,
    fontStyle: 'italic',
  },

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

  /* thinking / error */
  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  thinkingText: {
    color: colors.textGray,
    fontSize: fontSize.sm,
    fontStyle: 'italic',
  },
  errorText: { color: colors.warning, fontSize: fontSize.sm },

  /* product cards (parsed from [CARDS] block) */
  cardsWrap: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  productCardThumb: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: `${colors.brand}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productCardTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  productCardSub: {
    color: colors.textGray,
    fontSize: fontSize.xs,
    marginTop: 1,
    textTransform: 'capitalize',
  },
  productCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  productCardPrice: {
    color: colors.brand,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  productCardFooter: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    flexShrink: 1,
  },

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
  traceToggleText: {
    color: colors.textGray,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  toolRow: { paddingVertical: spacing.sm },
  toolName: { color: colors.brand, fontSize: fontSize.sm, fontWeight: '700' },
  toolArgs: {
    color: colors.textGray,
    fontSize: fontSize.xs,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  toolPreview: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

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
