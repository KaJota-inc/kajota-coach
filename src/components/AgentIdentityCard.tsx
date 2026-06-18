/**
 * AgentIdentityCard — surfaces the Coach Agent's ERC-8004 on-chain
 * identity + benchmark record at the top of the agent chat.
 *
 * Pillars it makes visible in-app:
 *   - ERC-8004 identity: the agentId + "verified on Mantle" badge.
 *   - on-chain benchmarking: the live count of runs recorded on the
 *     Mantle ReputationRegistry.
 *   - transparency: both are read live from chain and link out to the
 *     Mantle explorer so anyone can verify.
 */
import React, { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { colors, fontSize, radius, spacing } from '@/constants/colors';
import {
  fetchAgentIdentity,
  fetchAgentRunCount,
  type AgentIdentity,
} from '@/services/agentIdentity';

export default function AgentIdentityCard() {
  const [identity, setIdentity] = useState<AgentIdentity | null>(null);
  const [runs, setRuns] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [id, count] = await Promise.all([fetchAgentIdentity(), fetchAgentRunCount()]);
      if (!alive) return;
      setIdentity(id);
      setRuns(count);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Nothing to show if the registry isn't configured or the read failed.
  if (!loading && !identity) return null;

  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Feather color="white" name="cpu" size={16} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {identity?.name ?? 'Kajota Coach Agent'}
          </Text>
          <View style={styles.badge}>
            <Feather color={colors.success} name="check" size={10} />
            <Text style={styles.badgeText}>ERC-8004</Text>
          </View>
        </View>
        <Text style={styles.sub} numberOfLines={1}>
          {loading
            ? 'Reading on-chain identity…'
            : `Agent #${identity?.agentId} · Mantle Sepolia · ${
                runs === null ? '—' : runs
              } run${runs === 1 ? '' : 's'} benchmarked on-chain`}
        </Text>
        {identity && (
          <TouchableOpacity onPress={() => void Linking.openURL(identity.explorerTokenUrl)}>
            <Text style={styles.link}>View identity on Mantle explorer →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    margin: spacing.md,
    marginBottom: spacing.xs,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { color: colors.text, fontSize: fontSize.md, fontWeight: '800', flexShrink: 1 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: `${colors.success}15`,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
  badgeText: { color: colors.success, fontSize: fontSize.xs, fontWeight: '800' },
  sub: { color: colors.textGray, fontSize: fontSize.xs, marginTop: 2 },
  link: {
    color: colors.brand,
    fontSize: fontSize.xs,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
});
