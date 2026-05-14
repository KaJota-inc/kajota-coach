import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fontSize, radius, spacing } from '@/constants/colors';
import { draftListing } from '@/services/coach';
import type { RootStackParamList } from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CoachCapture'>;

const PIPELINE_STAGES = [
  'Looking at your photo…',
  'Matching to a Kajota category…',
  'Checking nearby market prices…',
  'Drafting title + description…',
  'Finishing your social captions…',
];

export default function CoachCaptureScreen({ navigation }: Props) {
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const pickFromCamera = async () => {
    setError(null);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError('Camera permission denied');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPickedUri(result.assets[0].uri);
    }
  };

  const pickFromGallery = async () => {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Media library permission denied');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPickedUri(result.assets[0].uri);
    }
  };

  const tickStages = () => {
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      if (i >= PIPELINE_STAGES.length) {
        clearInterval(interval);
        return;
      }
      setStageIdx(i);
    }, 1300);
    return interval;
  };

  const submit = async () => {
    if (!pickedUri) return;
    setSubmitting(true);
    setStageIdx(0);
    setError(null);
    const interval = tickStages();
    try {
      const base64 = await FileSystem.readAsStringAsync(pickedUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const payload = await draftListing({
        imageBase64: base64,
        currency: 'NGN',
        locale: 'en',
        maxCosellPercentage: 20,
        includeSocial: true,
      });
      clearInterval(interval);
      navigation.replace('CoachReview', {
        draft: payload.draft,
        providersUsed: payload.providersUsed ?? [],
        pipelineTrace: payload.pipelineTrace ?? [],
        imageUri: pickedUri,
      });
    } catch (e: any) {
      clearInterval(interval);
      setError(e?.response?.data?.message ?? e?.message ?? 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <LinearGradient
          colors={[`${colors.brand}25`, `${colors.brand}05`]}
          style={styles.hero}
        >
          <View style={styles.heroIcon}>
            <Ionicons color="white" name="flash" size={26} />
          </View>
          <Text style={styles.heroTitle}>Add a product in one shot</Text>
          <Text style={styles.heroSub}>
            Snap a clear photo and Kajota's AI drafts the listing — title, description, price, and
            social captions. You review, tweak, and publish.
          </Text>
        </LinearGradient>

        {pickedUri ? (
          <View style={styles.previewWrap}>
            <Image resizeMode="cover" source={{ uri: pickedUri }} style={styles.preview} />
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.retakeChip}
              onPress={() => setPickedUri(null)}
            >
              <Feather color={colors.brand} name="refresh-cw" size={14} />
              <Text style={styles.retakeText}>Retake</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.pickerRow}>
            <TouchableOpacity activeOpacity={0.85} style={styles.pickerCard} onPress={pickFromCamera}>
              <View style={styles.pickerCircle}>
                <Ionicons color={colors.brand} name="camera" size={28} />
              </View>
              <Text style={styles.pickerLabel}>Take photo</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.85} style={styles.pickerCard} onPress={pickFromGallery}>
              <View style={styles.pickerCircle}>
                <Ionicons color={colors.brand} name="images" size={28} />
              </View>
              <Text style={styles.pickerLabel}>Choose from gallery</Text>
            </TouchableOpacity>
          </View>
        )}

        {pickedUri && !submitting && (
          <TouchableOpacity activeOpacity={0.85} style={styles.cta} onPress={submit}>
            <LinearGradient
              colors={[colors.brand, colors.brandDark]}
              end={{ x: 1, y: 0 }}
              start={{ x: 0, y: 0 }}
              style={styles.ctaInner}
            >
              <Ionicons color="white" name="flash" size={18} />
              <Text style={styles.ctaText}>Draft my listing with AI</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {submitting && (
          <View style={styles.progressCard}>
            <ActivityIndicator color={colors.brand} size="large" />
            <Text style={styles.progressText}>{PIPELINE_STAGES[stageIdx]}</Text>
            <Text style={styles.progressSub}>
              Step {stageIdx + 1} of {PIPELINE_STAGES.length}
            </Text>
          </View>
        )}

        {error && (
          <View style={styles.errorCard}>
            <Feather color={colors.warning} name="alert-triangle" size={16} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.tipCard}>
          <Feather color={colors.brand} name="info" size={16} />
          <Text style={styles.tipText}>
            Best results: clear photo, good lighting, plain background. The AI anchors price on
            real Kajota catalog data.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.pageBackground },
  scroll: { padding: spacing.lg, paddingBottom: 80 },

  hero: {
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: { color: colors.text, fontSize: fontSize.xxl, fontWeight: '800' },
  heroSub: { color: colors.textGray, fontSize: fontSize.md, lineHeight: 20, marginTop: spacing.sm },

  pickerRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  pickerCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${colors.brand}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  pickerLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },

  previewWrap: { position: 'relative', marginBottom: spacing.lg },
  preview: { width: '100%', height: 280, borderRadius: radius.lg },
  retakeChip: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  retakeText: { color: colors.brand, fontSize: fontSize.sm, fontWeight: '700' },

  cta: { marginBottom: spacing.lg, borderRadius: radius.pill, overflow: 'hidden' },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  ctaText: { color: 'white', fontSize: fontSize.lg, fontWeight: '700' },

  progressCard: {
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressText: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  progressSub: { color: colors.textGray, fontSize: fontSize.sm },

  errorCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warning,
    marginBottom: spacing.lg,
    alignItems: 'flex-start',
  },
  errorText: { flex: 1, color: colors.warning, fontSize: fontSize.md },

  tipCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: `${colors.brand}08`,
    alignItems: 'flex-start',
  },
  tipText: { flex: 1, color: colors.textGray, fontSize: fontSize.sm, lineHeight: 18 },
});
