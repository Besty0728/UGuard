export type Language = 'zh' | 'en';

export const LANGUAGE_STORAGE_KEY = 'uguard-language';

export function isLanguage(value: string | null): value is Language {
  return value === 'zh' || value === 'en';
}

export function detectInitialLanguage(): Language {
  if (typeof window === 'undefined') {
    return 'zh';
  }

  const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (isLanguage(saved)) {
    return saved;
  }

  return window.navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function getLocale(language: Language): string {
  return language === 'zh' ? 'zh-CN' : 'en-US';
}
