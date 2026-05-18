import { en, type TranslationTree } from './locales/en';

type TranslationParams = Record<string, string | number>;

function getNestedValue(
  tree: TranslationTree,
  path: string,
): string | undefined {
  const segments = path.split('.');
  let current: unknown = tree;

  for (const segment of segments) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === 'string' ? current : undefined;
}

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) {
    return template;
  }

  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = params[key];

    if (value === undefined) {
      return match;
    }

    return String(value);
  });
}

/** Resolve a dot-path UI string for the active locale. */
export function t(path: string, params?: TranslationParams): string {
  const template = getNestedValue(en, path);

  if (!template) {
    return path;
  }

  return interpolate(template, params);
}

/** Locale-aware number formatting for counts in copy. */
export function formatCount(value: number): string {
  return value.toLocaleString();
}

/** Empty string or `s` for simple English plural suffixes in templates. */
export function pluralSuffix(count: number): string {
  return count === 1 ? '' : 's';
}
