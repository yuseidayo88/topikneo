import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeArea } from '@/src/hooks/useSafeArea';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useThemeStyles } from '@/src/hooks/useThemeStyles';
import { useOnboardingStore } from '@/src/store/onboardingStore';
import { triggerLightImpact, triggerMediumImpact, triggerSelectionHaptic } from '@/src/utils/haptics';
import { typographyScale } from '@/src/theme';
import { getSettingsFlowTokens, RADIUS, PAD, GAP, CONTENT_W } from '@/src/theme/settingsFlowTokens';
import { Ionicons } from '@expo/vector-icons';
import { useProfileStore } from '@/src/store/profileStore';
import { getDailyGoalScreenStrings } from '@/src/i18n/flowScreens';

const GOAL_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

type EditingType = 'word' | 'grammar' | null;

export default function DailyGoalScreen() {
  const router = useRouter();
  const { headerPaddingTop, footerPaddingBottom } = useSafeArea();
  const { resolvedMode } = useTheme();
  const { flowShadow: SHADOW } = useThemeStyles();
  const TOKEN = useMemo(() => getSettingsFlowTokens(resolvedMode), [resolvedMode]);
  const displayLanguage = useProfileStore((s) => s.displayLanguage);
  const dt = useMemo(
    () => getDailyGoalScreenStrings(displayLanguage),
    [displayLanguage]
  );
  const formatGoalValue = (n: number) => (n === 0 ? dt.goalNone : String(n));
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        headerFixed: { paddingHorizontal: PAD, alignItems: 'center', backgroundColor: 'transparent' },
        headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16 },
        headerCircleBtn: {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: TOKEN.surface,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: TOKEN.border,
          ...SHADOW,
        },
        headerTitle: { ...typographyScale.header, color: TOKEN.ink },
        headerRight: { width: 40 },
        scroll: { flex: 1 },
        scrollContent: { paddingHorizontal: PAD, alignItems: 'center' },
        wrap: { gap: 12 },
        sectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
        sectionAccent: { width: 3, height: 16, borderRadius: 4, backgroundColor: TOKEN.accent, marginRight: 8 },
        sectionTitle: { ...typographyScale.section, color: TOKEN.ink, flex: 1 },
        description: { ...typographyScale.caption, color: TOKEN.inkMuted, marginBottom: 16, lineHeight: 18 },
        card: {
          backgroundColor: TOKEN.surface,
          borderRadius: RADIUS.card,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: TOKEN.border,
          ...SHADOW,
        },
        goalRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 16,
          paddingHorizontal: PAD,
          minHeight: 56,
        },
        goalRowPressed: { backgroundColor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' },
        cardIconWrap: {
          width: 44,
          height: 44,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: TOKEN.accentSoft,
          marginRight: 12,
        },
        goalLabel: { ...typographyScale.bodyMedium, color: TOKEN.ink, flex: 1, fontWeight: '600' },
        goalValueWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
        goalValue: { ...typographyScale.bodyLarge, fontWeight: '700', color: TOKEN.accent },
        cardDivider: { height: 1, backgroundColor: TOKEN.border, marginLeft: PAD + 44 + 12 },
        footerFixed: {
          paddingHorizontal: PAD,
          alignItems: 'center',
          backgroundColor: TOKEN.bg,
          borderTopWidth: 1,
          borderTopColor: TOKEN.border,
        },
        saveBtn: {
          height: 48,
          borderRadius: RADIUS.option,
          backgroundColor: TOKEN.accent,
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
        },
        saveBtnText: { ...typographyScale.button, color: '#FFF' },
        modalOverlay: { flex: 1, justifyContent: 'flex-end' },
        modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
        modalContent: { justifyContent: 'flex-end' },
        modalCard: {
          backgroundColor: TOKEN.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingHorizontal: PAD,
          paddingTop: 20,
          paddingBottom: Platform.OS === 'ios' ? 34 : PAD,
          alignItems: 'center',
        },
        modalTitle: { ...typographyScale.header, color: TOKEN.ink, marginBottom: 4 },
        modalHint: { ...typographyScale.caption, color: TOKEN.inkMuted, marginBottom: 8 },
        modalPicker: { width: '100%', height: Platform.OS === 'ios' ? 160 : 120 },
        modalPickerItem: { ...typographyScale.score, color: TOKEN.ink, fontWeight: '600' },
        modalDoneBtn: {
          width: '100%',
          height: 48,
          borderRadius: RADIUS.option,
          backgroundColor: TOKEN.accent,
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 8,
        },
        modalDoneText: { ...typographyScale.button, color: '#FFF' },
      }),
    [TOKEN, SHADOW, resolvedMode]
  );

  const load = useOnboardingStore((s) => s.load);
  const setDailyGoals = useOnboardingStore((s) => s.setDailyGoals);
  const [word, setWord] = useState(1);
  const [grammar, setGrammar] = useState(1);
  const [editing, setEditing] = useState<EditingType>(null);
  const [draft, setDraft] = useState(1);

  useEffect(() => {
    load().then(() => {
      const { dailyGoalWordLessons: w, dailyGoalGrammarLessons: g } = useOnboardingStore.getState();
      setWord(Math.min(10, Math.max(0, w)));
      setGrammar(Math.min(10, Math.max(0, g)));
    });
  }, [load]);

  const openPicker = (type: EditingType) => {
    void triggerSelectionHaptic();
    if (type === 'word') {
      setDraft(word);
      setEditing('word');
    } else if (type === 'grammar') {
      setDraft(grammar);
      setEditing('grammar');
    }
  };

  const closePicker = () => {
    if (editing === 'word') setWord(draft);
    if (editing === 'grammar') setGrammar(draft);
    setEditing(null);
  };

  const handleSave = async () => {
    void triggerMediumImpact();
    await setDailyGoals(word, grammar);
    router.back();
  };

  const pickerModalTitle = editing === 'word' ? dt.wordRow : editing === 'grammar' ? dt.grammarRow : '';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[TOKEN.bg, TOKEN.bgEnd]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <View style={[styles.headerFixed, { paddingTop: headerPaddingTop }]}>
        <View style={[styles.headerRow, { width: CONTENT_W }]}>
          <Pressable
            style={({ pressed }) => [styles.headerCircleBtn, pressed && { opacity: 0.8 }]}
            onPress={() => {
              void triggerLightImpact();
              router.back();
            }}
            accessibilityLabel={dt.backA11y}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={22} color={TOKEN.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>{dt.title}</Text>
          <View style={styles.headerRight} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.wrap, { width: CONTENT_W }]}>
          <View style={styles.sectionHead}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionTitle}>{dt.sectionTitle}</Text>
          </View>
          <Text style={styles.description}>
            {dt.description}
          </Text>

          <View style={styles.card}>
            <Pressable
              style={({ pressed }) => [styles.goalRow, pressed && styles.goalRowPressed]}
              onPress={() => openPicker('word')}
              accessibilityLabel={dt.wordGoalA11y(formatGoalValue(word))}
              accessibilityRole="button"
            >
              <View style={styles.cardIconWrap}>
                <Ionicons name="book-outline" size={22} color={TOKEN.accent} />
              </View>
              <Text style={styles.goalLabel}>{dt.wordRow}</Text>
              <View style={styles.goalValueWrap}>
                <Text style={styles.goalValue}>{formatGoalValue(word)}</Text>
                <Ionicons name="chevron-forward" size={20} color={TOKEN.inkFaint} />
              </View>
            </Pressable>
            <View style={styles.cardDivider} />
            <Pressable
              style={({ pressed }) => [styles.goalRow, pressed && styles.goalRowPressed]}
              onPress={() => openPicker('grammar')}
              accessibilityLabel={dt.grammarGoalA11y(formatGoalValue(grammar))}
              accessibilityRole="button"
            >
              <View style={[styles.cardIconWrap, { backgroundColor: TOKEN.grammarSoft }]}>
                <Ionicons name="reader-outline" size={22} color={TOKEN.grammar} />
              </View>
              <Text style={styles.goalLabel}>{dt.grammarRow}</Text>
              <View style={styles.goalValueWrap}>
                <Text style={styles.goalValue}>{formatGoalValue(grammar)}</Text>
                <Ionicons name="chevron-forward" size={20} color={TOKEN.inkFaint} />
              </View>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footerFixed, { paddingBottom: footerPaddingBottom + PAD, paddingTop: PAD }]}>
        <View style={{ width: CONTENT_W }}>
          <Pressable
            style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.9 }]}
            onPress={handleSave}
            accessibilityLabel={dt.saveA11y}
            accessibilityRole="button"
          >
            <Text style={styles.saveBtnText}>{dt.save}</Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={editing !== null}
        transparent
        animationType="slide"
        onRequestClose={closePicker}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={closePicker}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContent}
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{pickerModalTitle}</Text>
              <Text style={styles.modalHint}>{dt.modalHint}</Text>
              <Picker
                selectedValue={draft}
                onValueChange={(v) => setDraft(typeof v === 'number' ? v : Number(v))}
                style={styles.modalPicker}
                itemStyle={Platform.OS === 'ios' ? styles.modalPickerItem : undefined}
                {...(Platform.OS === 'android' ? { mode: 'dialog' as const } : {})}
              >
                {GOAL_OPTIONS.map((n) => (
                  <Picker.Item key={n} label={formatGoalValue(n)} value={n} />
                ))}
              </Picker>
              <Pressable
                style={({ pressed }) => [styles.modalDoneBtn, pressed && { opacity: 0.9 }]}
                onPress={closePicker}
                accessibilityLabel={dt.done}
                accessibilityRole="button"
              >
                <Text style={styles.modalDoneText}>{dt.done}</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}
