import type { AppLocale } from './appLocale';
import type { StudyLevelKey } from '../store/profileStore';

type LevelLabels = Record<Exclude<StudyLevelKey, ''>, string>;

const ja: LevelLabels = {
  beginner: '初級（はじめて）',
  elementary: '初中級',
  intermediate: '中級',
  advanced: '上級',
};

const en: LevelLabels = {
  beginner: 'Beginner',
  elementary: 'Elementary',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const zh: LevelLabels = {
  beginner: '初级（入门）',
  elementary: '初中级',
  intermediate: '中级',
  advanced: '高级',
};

const vi: LevelLabels = {
  beginner: 'Sơ cấp (mới bắt đầu)',
  elementary: 'Sơ–trung cấp',
  intermediate: 'Trung cấp',
  advanced: 'Cao cấp',
};

const es: LevelLabels = {
  beginner: 'Principiante',
  elementary: 'Elemental',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

const id: LevelLabels = {
  beginner: 'Pemula',
  elementary: 'Dasar–menengah',
  intermediate: 'Menengah',
  advanced: 'Lanjutan',
};

const th: LevelLabels = {
  beginner: 'เริ่มต้น',
  elementary: 'ต้น–กลาง',
  intermediate: 'ระดับกลาง',
  advanced: 'ระดับสูง',
};

const maps: Record<AppLocale, LevelLabels> = { ja, en, zh, vi, es, id, th };

export function getStudyLevelLabels(locale: AppLocale): LevelLabels {
  return maps[locale] ?? maps.en;
}
