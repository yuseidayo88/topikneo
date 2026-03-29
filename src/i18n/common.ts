/**
 * 共通UI文言（エラー・ボタン・バナーなど）
 */
import type { AppLocale } from './appLocale';
import { FALLBACK_APP_LOCALE } from './appLocale';

const commonJa = {
  networkErrorMessage: '接続を確認して、もう一度お試しください。下に引いて再取得することもできます。',
  retry: '再試行',
  offlineBanner: 'オフラインです。接続を確認してください。',
  cancel: 'キャンセル',
  save: '保存',
  done: '完了',
  alertOk: 'OK',
  back: '戻る',
  signOut: 'ログアウト',
  delete: '削除する',
  reload: '再読み込み',
  loadErrorBannerMessage: 'データの読み込みに失敗しました。',
  onboardingLoadError: '設定の読み込みに失敗しました。',
  continueToApp: 'アプリを開く',
  wordsLoadFailed: '単語の読み込みに失敗しました',
  grammarLoadFailed: '文法の読み込みに失敗しました。下に引いて再読み込みしてください。',
  errorWhileLoading: (screenLabel: string) => `${screenLabel}の読み込みでエラーが発生しました`,
  errorDefaultScreen: '画面',
  appRootErrorContext: 'アプリ',
};

const commonEn = {
  networkErrorMessage: 'Please check your connection and try again. You can also pull down to refresh.',
  retry: 'Retry',
  offlineBanner: 'You are offline. Please check your connection.',
  cancel: 'Cancel',
  save: 'Save',
  done: 'Done',
  alertOk: 'OK',
  back: 'Back',
  signOut: 'Sign out',
  delete: 'Delete',
  reload: 'Reload',
  loadErrorBannerMessage: 'Failed to load data.',
  onboardingLoadError: 'Failed to load settings.',
  continueToApp: 'Open app',
  wordsLoadFailed: 'Failed to load vocabulary.',
  grammarLoadFailed: 'Failed to load grammar. Pull down to reload.',
  errorWhileLoading: (screenLabel: string) => `Something went wrong loading ${screenLabel}`,
  errorDefaultScreen: 'this screen',
  appRootErrorContext: 'App',
};

const commonZh = {
  networkErrorMessage: '请检查网络后重试。也可以下拉刷新。',
  retry: '重试',
  offlineBanner: '当前离线，请检查网络连接。',
  cancel: '取消',
  save: '保存',
  done: '完成',
  alertOk: '好',
  back: '返回',
  signOut: '退出登录',
  delete: '删除',
  reload: '重新加载',
  loadErrorBannerMessage: '数据加载失败。',
  onboardingLoadError: '设置加载失败。',
  continueToApp: '打开应用',
  wordsLoadFailed: '词汇加载失败。',
  grammarLoadFailed: '语法加载失败，请下拉重试。',
  errorWhileLoading: (screenLabel: string) => `加载「${screenLabel}」时出错`,
  errorDefaultScreen: '此界面',
  appRootErrorContext: '应用',
};

const commonVi = {
  networkErrorMessage: 'Hãy kiểm tra kết nối và thử lại. Bạn cũng có thể kéo xuống để làm mới.',
  retry: 'Thử lại',
  offlineBanner: 'Bạn đang ngoại tuyến. Hãy kiểm tra kết nối.',
  cancel: 'Hủy',
  save: 'Lưu',
  done: 'Xong',
  alertOk: 'OK',
  back: 'Quay lại',
  signOut: 'Đăng xuất',
  delete: 'Xóa',
  reload: 'Tải lại',
  loadErrorBannerMessage: 'Không tải được dữ liệu.',
  onboardingLoadError: 'Không tải được cài đặt.',
  continueToApp: 'Mở ứng dụng',
  wordsLoadFailed: 'Không tải được từ vựng.',
  grammarLoadFailed: 'Không tải được ngữ pháp. Kéo xuống để tải lại.',
  errorWhileLoading: (screenLabel: string) => `Đã xảy ra lỗi khi tải ${screenLabel}`,
  errorDefaultScreen: 'màn hình này',
  appRootErrorContext: 'Ứng dụng',
};

const commonEs = {
  networkErrorMessage: 'Comprueba la conexión e inténtalo de nuevo. También puedes deslizar hacia abajo para actualizar.',
  retry: 'Reintentar',
  offlineBanner: 'Sin conexión. Comprueba tu red.',
  cancel: 'Cancelar',
  save: 'Guardar',
  done: 'Hecho',
  alertOk: 'OK',
  back: 'Atrás',
  signOut: 'Cerrar sesión',
  delete: 'Eliminar',
  reload: 'Volver a cargar',
  loadErrorBannerMessage: 'No se pudieron cargar los datos.',
  onboardingLoadError: 'No se pudieron cargar los ajustes.',
  continueToApp: 'Abrir la app',
  wordsLoadFailed: 'No se pudo cargar el vocabulario.',
  grammarLoadFailed: 'No se pudo cargar la gramática. Desliza para recargar.',
  errorWhileLoading: (screenLabel: string) => `Error al cargar ${screenLabel}`,
  errorDefaultScreen: 'esta pantalla',
  appRootErrorContext: 'App',
};

const commonId = {
  networkErrorMessage: 'Periksa koneksi dan coba lagi. Anda juga bisa tarik untuk menyegarkan.',
  retry: 'Coba lagi',
  offlineBanner: 'Anda offline. Periksa koneksi.',
  cancel: 'Batal',
  save: 'Simpan',
  done: 'Selesai',
  alertOk: 'OK',
  back: 'Kembali',
  signOut: 'Keluar',
  delete: 'Hapus',
  reload: 'Muat ulang',
  loadErrorBannerMessage: 'Gagal memuat data.',
  onboardingLoadError: 'Gagal memuat pengaturan.',
  continueToApp: 'Buka aplikasi',
  wordsLoadFailed: 'Gagal memuat kosakata.',
  grammarLoadFailed: 'Gagal memuat tata bahasa. Tarik untuk memuat ulang.',
  errorWhileLoading: (screenLabel: string) => `Terjadi kesalahan saat memuat ${screenLabel}`,
  errorDefaultScreen: 'layar ini',
  appRootErrorContext: 'Aplikasi',
};

const commonTh = {
  networkErrorMessage: 'ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง หรือดึงลงเพื่อรีเฟรช',
  retry: 'ลองอีกครั้ง',
  offlineBanner: 'คุณออฟไลน์อยู่ โปรดตรวจสอบการเชื่อมต่อ',
  cancel: 'ยกเลิก',
  save: 'บันทึก',
  done: 'เสร็จสิ้น',
  alertOk: 'ตกลง',
  back: 'กลับ',
  signOut: 'ออกจากระบบ',
  delete: 'ลบ',
  reload: 'โหลดใหม่',
  loadErrorBannerMessage: 'โหลดข้อมูลไม่สำเร็จ',
  onboardingLoadError: 'โหลดการตั้งค่าไม่สำเร็จ',
  continueToApp: 'เปิดแอป',
  wordsLoadFailed: 'โหลดคำศัพท์ไม่สำเร็จ',
  grammarLoadFailed: 'โหลดไวยากรณ์ไม่สำเร็จ ดึงลงเพื่อโหลดใหม่',
  errorWhileLoading: (screenLabel: string) => `เกิดข้อผิดพลาดขณะโหลด${screenLabel}`,
  errorDefaultScreen: 'หน้าจอนี้',
  appRootErrorContext: 'แอป',
};

const maps = {
  ja: commonJa,
  en: commonEn,
  zh: commonZh,
  vi: commonVi,
  es: commonEs,
  id: commonId,
  th: commonTh,
} as const;

export type CommonStrings = (typeof maps)[AppLocale];

export function getCommonStrings(locale: AppLocale = FALLBACK_APP_LOCALE) {
  return maps[locale] ?? maps[FALLBACK_APP_LOCALE];
}
