/** Pet birthday stored as an ISO calendar date (YYYY-MM-DD). */
export type PetBirthdayIso = string;

export function isPetBirthdayIso(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);

  if (!year || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parsePetBirthdayIso(
  value: string | null | undefined,
): PetBirthdayIso | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return isPetBirthdayIso(trimmed) ? trimmed : null;
}

export function composePetBirthdayIso(parts: {
  year: number;
  month: number;
  day: number;
}): PetBirthdayIso | null {
  const iso = `${parts.year.toString().padStart(4, '0')}-${parts.month
    .toString()
    .padStart(2, '0')}-${parts.day.toString().padStart(2, '0')}`;

  return isPetBirthdayIso(iso) ? iso : null;
}

export function splitPetBirthdayIso(
  value: string | null | undefined,
): { year: number; month: number; day: number } | null {
  const iso = parsePetBirthdayIso(value);

  if (!iso) {
    return null;
  }

  const [year, month, day] = iso.split('-').map(Number);

  return { year, month, day };
}
