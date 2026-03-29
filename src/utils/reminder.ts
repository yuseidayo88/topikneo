import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Localization from 'expo-localization';
import * as db from '@/src/db/database';
import type { AppLocale } from '@/src/i18n/appLocale';
import { FALLBACK_APP_LOCALE } from '@/src/i18n/appLocale';

const REMINDER_ENABLED_KEY = 'reminder_enabled';
const REMINDER_TIME_KEY = 'reminder_time';
const REMINDER_ID = 'kla_daily_reminder';

export type ReminderLocale = AppLocale;

const ANDROID_REMINDER_CHANNEL_NAME: Record<AppLocale, string> = {
  ja: '学習リマインダー',
  en: 'Study reminders',
  zh: '学习提醒',
  vi: 'Nhắc học',
  es: 'Recordatorios de estudio',
  id: 'Pengingat belajar',
  th: 'การแจ้งเตือนการเรียน',
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** 端末ロケールから推定（表示言語未指定時） */
function inferLocale(): ReminderLocale {
  const code = Localization.getLocales()[0]?.languageCode?.toLowerCase?.();
  if (code === 'ja') return 'ja';
  if (code === 'zh') return 'zh';
  if (code === 'vi') return 'vi';
  if (code === 'es') return 'es';
  if (code === 'id') return 'id';
  if (code === 'th') return 'th';
  return FALLBACK_APP_LOCALE;
}

function pickVariant(seed: number, length: number): number {
  if (length <= 0) return 0;
  return Math.abs(Math.floor(seed)) % length;
}

type ReminderPack = {
  titles: string[];
  withStreak: ((n: number) => string)[];
  noStreak: string[];
};

const REMINDER_PACK_JA: ReminderPack = {
  titles: ['勉強の時間だ！📚', 'KLA からひとこと', '今日の韓国語、どう？', '連続記録、キープしよ 🔥'],
  withStreak: [
    (n: number) => `🔥 ${n}日連続！今日も1レッスンでキープ`,
    (n: number) => `ストリーク ${n}日目。忘れる前にサクッと1本`,
    (n: number) => `${n}日連続中。今日の分、まだなら今がチャンス`,
    (n: number) => `いい感じ！${n}日連続。今日もクリアしよ`,
  ],
  noStreak: [
    '今日から連続記録をスタート。1レッスンでOK！',
    'サボりがちな日こそ、5分だけ韓国語タイム',
    '習慣は小さく。今日のレッスン、済ませた？',
    'また再開しよ。1本クリアで気分スッキリ',
  ],
};

const REMINDER_PACK_EN: ReminderPack = {
  titles: ['Time to study! 📚', 'From KLA', 'Your Korean moment', "Don't break the chain 🔥"],
  withStreak: [
    (n: number) => `🔥 ${n}-day streak — one lesson keeps it alive!`,
    (n: number) => `Day ${n} strong. Finish today's lesson before bed?`,
    (n: number) => `${n} days in a row! Quick session now?`,
    (n: number) => `Streak: ${n}. Open the app and clear one lesson.`,
  ],
  noStreak: [
    'Start a streak today — one lesson is enough!',
    '5 minutes of Korean beats zero. Jump in!',
    'Ready to come back? One lesson starts your streak.',
    'Tiny step: one lesson. You’ve got this.',
  ],
};

const REMINDER_PACK_ZH: ReminderPack = {
  titles: ['该学习啦！📚', '来自 KLA', '今天的韩语练了吗？', '别让连胜断掉 🔥'],
  withStreak: [
    (n: number) => `🔥 已连续 ${n} 天！今天一课就能保持`,
    (n: number) => `第 ${n} 天连胜。趁还记得，来一课`,
    (n: number) => `已连 ${n} 天。今天的课还没做？就现在`,
    (n: number) => `不错！${n} 天连胜。今天也完成一课吧`,
  ],
  noStreak: [
    '从今天开启连胜，一课就够！',
    '再忙也抽 5 分钟学韩语',
    '习惯从小开始。今天的课完成了吗？',
    '重新开始吧，一课就轻松',
  ],
};

const REMINDER_PACK_VI: ReminderPack = {
  titles: ['Đến giờ học! 📚', 'Từ KLA', 'Hôm nay học tiếng Hàn chưa?', 'Đừng để mất chuỗi 🔥'],
  withStreak: [
    (n: number) => `🔥 Chuỗi ${n} ngày — 1 bài là giữ được!`,
    (n: number) => `Ngày ${n} rồi. Làm 1 bài trước khi quên`,
    (n: number) => `${n} ngày liên tiếp! Còn hôm nay thì làm ngay`,
    (n: number) => `Tuyệt! ${n} ngày. Hôm nay cũng 1 bài nhé`,
  ],
  noStreak: [
    'Bắt đầu chuỗi hôm nay — 1 bài là đủ!',
    '5 phút cũng hơn 0. Vào học thôi!',
    'Quay lại nhé — 1 bài là khởi động chuỗi',
    'Bước nhỏ: 1 bài. Bạn làm được!',
  ],
};

const REMINDER_PACK_ES: ReminderPack = {
  titles: ['¡Hora de estudiar! 📚', 'Desde KLA', '¿Tu coreano de hoy?', 'No rompas la racha 🔥'],
  withStreak: [
    (n: number) => `🔥 ¡Racha de ${n} días! Una lección la mantiene`,
    (n: number) => `Día ${n}. ¿Una lección antes de dormir?`,
    (n: number) => `¡${n} días seguidos! ¿Sesión rápida ahora?`,
    (n: number) => `Racha: ${n}. Abre la app y completa una lección`,
  ],
  noStreak: [
    'Empieza una racha hoy — ¡una lección basta!',
    '5 minutos de coreano valen más que cero',
    '¿Vuelves? Una lección inicia la racha',
    'Un paso: una lección. ¡Tú puedes!',
  ],
};

const REMINDER_PACK_ID: ReminderPack = {
  titles: ['Saatnya belajar! 📚', 'Dari KLA', 'Korea hari ini?', 'Jangan putus streak 🔥'],
  withStreak: [
    (n: number) => `🔥 Streak ${n} hari — satu pelajaran menjaganya!`,
    (n: number) => `Hari ke-${n}. Selesaikan satu pelajaran?`,
    (n: number) => `${n} hari berturut-turut! Ses singkat sekarang?`,
    (n: number) => `Streak: ${n}. Buka app dan selesaikan satu pelajaran`,
  ],
  noStreak: [
    'Mulai streak hari ini — satu pelajaran cukup!',
    '5 menit lebih baik dari nol',
    'Kembali? Satu pelajaran memulai streak',
    'Langkah kecil: satu pelajaran. Kamu bisa!',
  ],
};

const REMINDER_PACK_TH: ReminderPack = {
  titles: ['ถึงเวลาเรียน! 📚', 'จาก KLA', 'วันนี้ฝึกเกาหลีหรือยัง?', 'อย่าให้สตรีคขาด 🔥'],
  withStreak: [
    (n: number) => `🔥 ติดกัน ${n} วัน — เรียนหนึ่งบทก็รักษาได้!`,
    (n: number) => `วันที่ ${n} แล้ว ทำหนึ่งบทก่อนนอนไหม?`,
    (n: number) => `${n} วันติดกัน! ซ้อมสั้นๆ เลยไหม?`,
    (n: number) => `สตรีค ${n} วัน เปิดแอปแล้วจบหนึ่งบท`,
  ],
  noStreak: [
    'เริ่มสตรีควันนี้ — หนึ่งบทก็พอ!',
    'ห้านนาทีดีกว่าไม่เรียน',
    'กลับมาเรียนไหม? หนึ่งบทเริ่มสตรีค',
    'ก้าวเล็กๆ: หนึ่งบท คุณทำได้!',
  ],
};

const REMINDER_BY_LOCALE: Record<ReminderLocale, ReminderPack> = {
  ja: REMINDER_PACK_JA,
  en: REMINDER_PACK_EN,
  zh: REMINDER_PACK_ZH,
  vi: REMINDER_PACK_VI,
  es: REMINDER_PACK_ES,
  id: REMINDER_PACK_ID,
  th: REMINDER_PACK_TH,
};

/**
 * Duolingo 風: ストリークと日付でタイトル・本文をローテーション（毎日ちょっと違うノリ）
 */
export function buildDailyReminderContent(locale: ReminderLocale): { title: string; body: string } {
  let streak = 0;
  try {
    streak = db.getStreak().current;
  } catch {
    streak = 0;
  }

  const daySeed = Math.floor(Date.now() / 86_400_000);
  const pack = REMINDER_BY_LOCALE[locale] ?? REMINDER_BY_LOCALE[FALLBACK_APP_LOCALE];
  const ti = pickVariant(daySeed, pack.titles.length);
  if (streak > 0) {
    const bi = pickVariant(daySeed + streak * 31, pack.withStreak.length);
    return { title: pack.titles[ti], body: pack.withStreak[bi](streak) };
  }
  const bi = pickVariant(daySeed, pack.noStreak.length);
  return { title: pack.titles[ti], body: pack.noStreak[bi] };
}

export async function requestReminderPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function getReminderEnabled(): Promise<boolean> {
  const v = await AsyncStorage.getItem(REMINDER_ENABLED_KEY);
  return v === 'true';
}

export async function getReminderTime(): Promise<string | null> {
  return await AsyncStorage.getItem(REMINDER_TIME_KEY);
}

export async function setReminderEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(REMINDER_ENABLED_KEY, enabled ? 'true' : 'false');
  if (!enabled) await cancelReminder();
}

export async function setReminderTime(time: string, locale?: ReminderLocale): Promise<void> {
  await AsyncStorage.setItem(REMINDER_TIME_KEY, time);
  const enabled = await getReminderEnabled();
  if (enabled) await scheduleReminder(time, locale ?? inferLocale());
}

async function scheduleReminder(time: string, locale: ReminderLocale): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
  const [hourStr, minuteStr] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  if (isNaN(hour) || isNaN(minute)) return;

  const { title, body } = buildDailyReminderContent(locale);

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: ANDROID_REMINDER_CHANNEL_NAME[locale] ?? ANDROID_REMINDER_CHANNEL_NAME[FALLBACK_APP_LOCALE],
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  }

  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: {
      title,
      body,
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      ...(Platform.OS === 'android' && { channelId: 'reminders' }),
    },
  });
}

export async function cancelReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
}

/**
 * 権限OKなら毎日通知を再登録。起動時・復帰時に呼ぶとストリークに合わせて文言が更新される。
 */
export async function applyReminder(locale?: ReminderLocale): Promise<void> {
  try {
    const loc = locale ?? inferLocale();
    const enabled = await getReminderEnabled();
    const time = await getReminderTime();
    if (!enabled || !time) {
      await cancelReminder();
      return;
    }
    const granted = await requestReminderPermission();
    if (granted) await scheduleReminder(time, loc);
  } catch {
    /* Web 等で通知 API が使えない環境でもアプリを落とさない */
  }
}
