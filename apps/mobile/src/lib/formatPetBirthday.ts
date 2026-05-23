import { composePetBirthdayIso, splitPetBirthdayIso } from '@tailo/shared';

import { t, type AppLocale } from '@/i18n';

export type BirthdayOption<T extends number> = {
  value: T;
  label: string;
};

export function formatPetBirthdayLabel(
  birthday: string | null | undefined,
  locale: AppLocale,
): string {
  const parts = splitPetBirthdayIso(birthday);

  if (!parts) {
    return t('petProfile.birthdayNotSet');
  }

  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));

  return date.toLocaleDateString(locale === 'zh-Hans' ? 'zh-Hans' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function birthdayIsoToDate(iso: string | null | undefined): Date {
  const parts = splitPetBirthdayIso(iso);

  if (parts) {
    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12));
  }

  const now = new Date();

  return new Date(
    Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate(), 12),
  );
}

export function dateToBirthdayIso(date: Date): string | null {
  return composePetBirthdayIso({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });
}

export function getPetBirthdayMaximumDate(): Date {
  const now = new Date();

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12),
  );
}

export function getPetBirthdayYearOptions(): BirthdayOption<number>[] {
  const currentYear = new Date().getUTCFullYear();

  return Array.from({ length: 41 }, (_, index) => {
    const year = currentYear - index;

    return { value: year, label: String(year) };
  });
}

export function getPetBirthdayMonthOptions(
  locale: AppLocale,
): BirthdayOption<number>[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const label = new Date(Date.UTC(2020, index, 1)).toLocaleDateString(
      locale === 'zh-Hans' ? 'zh-Hans' : 'en-US',
      { month: 'short', timeZone: 'UTC' },
    );

    return { value: month, label };
  });
}

export function getPetBirthdayDayOptions(
  year: number,
  month: number,
): BirthdayOption<number>[] {
  const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return Array.from({ length: maxDay }, (_, index) => {
    const day = index + 1;

    return { value: day, label: String(day) };
  });
}
