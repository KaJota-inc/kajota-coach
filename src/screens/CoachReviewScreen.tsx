import React, { useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fontSize, radius, spacing } from '@/constants/colors';
import type { RootStackParamList } from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CoachReview'>;

const localeName = (l: string) => {
  switch ((l || '').toLowerCase()) {
    case 'yo': return 'Yoruba';
    case 'ig': return 'Igbo';
    case 'ha': return 'Hausa';
    default: return 'English';
  }
};

export default function CoachReviewScreen({ navigation, route }: Props) {
  const { draft, providersUsed, pipelineTrace, imageUri } = route.params;

  const [title, setTitle] = useState(draft.title);
  const [description, setDescription] = useState(draft.description);
  const [price, setPrice] = useState(String(draft.suggestedPrice ?? ''));
  const [cosellPct, setCosellPct] = useState(
    draft.suggestedCosellPercentage != null ? draft.suggestedCosellPercentage.toFixed(1) : '',
  );
  const [showTrace, setShowTrace] = useState(false);

  const handlePublish = () =>
    Alert.alert(
      'Ready to publish?',
      `"${title}" at ${draft.currency} ${price} with ${cosellPct}% co-sell markup will be added to the seller's store.`,
      [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Publish',
          onPress: () => {
            Alert.alert(
              'Drafted ✓',
              'For the demo, the listing is staged but not persisted. Production path: confirmed fields hand off to /product/{id}/add-to-cosell-store.',
            );
            navigation.popToTop();
          },
        },
      ],
    );

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {imageUri && (
          <View style={styles.heroWrap}>
            <Image resizeMode="cover" source={{ uri: imageUri }} style={styles.heroImage} />
            <View style={styles.heroOverlay}>
              <LinearGradient
                colors={[`${colors.brand}E0`, `${colors.brand}80`]}
                style={styles.providerBadge}
              >
                <Ionicons color="white" name="flash" size={12} />
                <Text style={styles.providerBadgeText}>
                  AI-drafted · {providersUsed.join(' · ') || 'gemini'}
                </Text>
              </LinearGradient>
            </View>
          </View>
        )}

        <Field label="Product title">
          <TextInput
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={title}
            onChangeText={setTitle}
          />
        </Field>

        <Field label="Category">
          <View style={styles.readonly}>
            <Feather color={colors.brand} name="tag" size={14} />
            <Text style={styles.readonlyText}>{draft.categoryName || 'General'}</Text>
            {!!draft.categoryId && (
              <Text style={styles.readonlyId}>#{draft.categoryId.slice(0, 6)}</Text>
            )}
          </View>
        </Field>

        <Field
          helper={
            draft.translatedDescription
              ? `Also drafted in ${localeName(draft.locale)} below.`
              : 'Generated from the photo. Edit freely.'
          }
          label="Description"
        >
          <TextInput
            multiline
            numberOfLines={4}
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
          />
          {!!draft.translatedDescription && (
            <View style={styles.translation}>
              <Text style={styles.translationLabel}>{localeName(draft.locale)}</Text>
              <Text style={styles.translationText}>{draft.translatedDescription}</Text>
            </View>
          )}
        </Field>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label={`Price (${draft.currency || 'NGN'})`}>
              <TextInput
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={price}
                onChangeText={setPrice}
              />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field helper="Markup for co-sellers (0–20)" label="Co-sell %">
              <TextInput
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={cosellPct}
                onChangeText={setCosellPct}
              />
            </Field>
          </View>
        </View>

        {(draft.cosellReasoning || draft.referenceProducts.length > 0) && (
          <View style={styles.explainer}>
            <View style={styles.explainerHeader}>
              <Feather color={colors.brand} name="bar-chart-2" size={14} />
              <Text style={styles.explainerTitle}>Why we suggested this</Text>
            </View>
            {!!draft.cosellReasoning && (
              <Text style={styles.explainerBody}>{draft.cosellReasoning}</Text>
            )}
            {draft.referenceProducts.length > 0 && (
              <View style={styles.refList}>
                {draft.referenceProducts.slice(0, 3).map(rp => (
                  <View key={rp.productId} style={styles.refRow}>
                    <Text numberOfLines={1} style={styles.refName}>
                      {rp.productName}
                    </Text>
                    <Text style={styles.refPrice}>
                      {rp.currency} {rp.price}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            {draft.visionLabels.length > 0 && (
              <View style={styles.labelsRow}>
                {draft.visionLabels.slice(0, 6).map(l => (
                  <View key={l} style={styles.label}>
                    <Text style={styles.labelText}>{l}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {(draft.whatsapp || draft.instagram) && (
          <View style={styles.socialCard}>
            <View style={styles.socialHeader}>
              <MaterialCommunityIcons color={colors.brand} name="share-variant" size={16} />
              <Text style={styles.socialTitle}>Social captions</Text>
            </View>
            {!!draft.whatsapp && (
              <SocialBlock
                icon="message-circle"
                platform="WhatsApp"
                social={draft.whatsapp}
              />
            )}
            {!!draft.instagram && (
              <SocialBlock
                icon="instagram"
                platform="Instagram"
                social={draft.instagram}
              />
            )}
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.traceToggle}
          onPress={() => setShowTrace(s => !s)}
        >
          <Feather
            color={colors.textGray}
            name={showTrace ? 'chevron-down' : 'chevron-right'}
            size={14}
          />
          <Text style={styles.traceToggleText}>
            How the AI got here ({pipelineTrace.length} steps)
          </Text>
        </TouchableOpacity>
        {showTrace && (
          <View style={styles.traceCard}>
            {pipelineTrace.map((step, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <Text key={`${step}-${i}`} style={styles.traceLine}>
                <Text style={{ color: colors.brand }}>›</Text> {step}
              </Text>
            ))}
          </View>
        )}

        <TouchableOpacity activeOpacity={0.85} style={styles.publishCta} onPress={handlePublish}>
          <LinearGradient
            colors={[colors.brand, colors.brandDark]}
            end={{ x: 1, y: 0 }}
            start={{ x: 0, y: 0 }}
            style={styles.publishInner}
          >
            <Feather color="white" name="check-circle" size={18} />
            <Text style={styles.publishText}>Publish to my store</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const Field: React.FC<{
  label: string;
  helper?: string;
  children: React.ReactNode;
}> = ({ label, helper, children }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {children}
    {!!helper && <Text style={styles.fieldHelper}>{helper}</Text>}
  </View>
);

const SocialBlock: React.FC<{
  platform: string;
  icon: keyof typeof Feather.glyphMap;
  social: { caption: string; hashtags: string[]; callToAction: string };
}> = ({ platform, icon, social }) => (
  <View style={styles.socialBlock}>
    <View style={styles.socialBlockHeader}>
      <Feather color={colors.brand} name={icon} size={14} />
      <Text style={styles.socialPlatform}>{platform}</Text>
    </View>
    <Text style={styles.socialCaption}>{social.caption}</Text>
    {!!social.callToAction && <Text style={styles.socialCta}>{social.callToAction}</Text>}
    {social.hashtags.length > 0 && (
      <Text style={styles.socialHashtags}>{social.hashtags.join(' ')}</Text>
    )}
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.pageBackground },
  scroll: { padding: spacing.lg, paddingBottom: 80 },

  heroWrap: {
    position: 'relative',
    marginBottom: spacing.lg,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  heroImage: { width: '100%', height: 220 },
  heroOverlay: { position: 'absolute', bottom: 10, left: 10 },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 14,
  },
  providerBadgeText: { color: 'white', fontSize: fontSize.xs, fontWeight: '700' },

  field: { marginBottom: spacing.md },
  fieldLabel: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  fieldHelper: { color: colors.textGray, fontSize: fontSize.sm, marginTop: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: fontSize.md,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },

  readonly: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  readonlyText: { flex: 1, color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  readonlyId: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  translation: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: `${colors.brand}08`,
  },
  translationLabel: {
    color: colors.brand,
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  translationText: { color: colors.text, fontSize: fontSize.md, fontStyle: 'italic' },

  row: { flexDirection: 'row', gap: spacing.md },

  explainer: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: `${colors.brand}08`,
    marginBottom: spacing.lg,
  },
  explainerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  explainerTitle: { color: colors.brand, fontSize: fontSize.sm, fontWeight: '700' },
  explainerBody: {
    color: colors.textGray,
    fontSize: fontSize.sm,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  refList: { gap: spacing.xs, marginBottom: spacing.sm },
  refRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  refName: { flex: 1, marginRight: spacing.sm, color: colors.text, fontSize: fontSize.sm },
  refPrice: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  labelsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  label: {
    borderWidth: 1,
    borderColor: colors.brand,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 10,
  },
  labelText: { color: colors.brand, fontSize: fontSize.xs, fontWeight: '600' },

  socialCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  socialHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  socialTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
  socialBlock: { gap: spacing.xs },
  socialBlockHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  socialPlatform: { color: colors.text, fontSize: fontSize.sm, fontWeight: '700' },
  socialCaption: { color: colors.text, fontSize: fontSize.sm, lineHeight: 18 },
  socialCta: { color: colors.brand, fontSize: fontSize.sm, fontWeight: '700' },
  socialHashtags: { color: colors.textGray, fontSize: fontSize.sm },

  traceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginVertical: spacing.sm,
  },
  traceToggleText: { color: colors.textGray, fontSize: fontSize.sm },
  traceCard: {
    padding: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  traceLine: {
    color: colors.textGray,
    fontSize: fontSize.xs,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  publishCta: { marginTop: spacing.sm, borderRadius: radius.pill, overflow: 'hidden' },
  publishInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  publishText: { color: 'white', fontSize: fontSize.lg, fontWeight: '700' },
});
