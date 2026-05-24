import {
  canSaveAccountProfileDraft,
  hasAccountProfileDraftChanges,
  isAccountProfileDisplayNameChanged,
} from './accountProfileReadiness';

const savedProfile = {
  displayName: 'Alex',
  preferredLocale: 'en' as const,
  preferredTheme: 'light' as const,
  preferredFontStyle: 'system' as const,
};

describe('accountProfileReadiness', () => {
  it('detects display name changes using trimmed values', () => {
    expect(isAccountProfileDisplayNameChanged('Alex ', 'Alex')).toBe(false);
    expect(isAccountProfileDisplayNameChanged('Sam', 'Alex')).toBe(true);
    expect(isAccountProfileDisplayNameChanged('', null)).toBe(false);
    expect(isAccountProfileDisplayNameChanged('   ', 'Alex')).toBe(true);
  });

  it('requires changes before save is allowed', () => {
    expect(
      canSaveAccountProfileDraft(
        {
          displayName: 'Alex',
          preferredLocale: 'en',
          preferredTheme: 'light',
          preferredFontStyle: 'system',
        },
        savedProfile,
      ),
    ).toBe(false);
  });

  it('blocks save when a changed display name is empty', () => {
    expect(
      canSaveAccountProfileDraft(
        {
          displayName: '   ',
          preferredLocale: 'en',
          preferredTheme: 'light',
          preferredFontStyle: 'system',
        },
        savedProfile,
      ),
    ).toBe(false);
  });

  it('allows save when display name changed to a non-empty value', () => {
    expect(
      canSaveAccountProfileDraft(
        {
          displayName: 'Sam',
          preferredLocale: 'en',
          preferredTheme: 'light',
          preferredFontStyle: 'system',
        },
        savedProfile,
      ),
    ).toBe(true);
  });

  it('allows save when only non-text preferences changed', () => {
    expect(
      hasAccountProfileDraftChanges(
        {
          displayName: 'Alex',
          preferredLocale: 'zh-Hans',
          preferredTheme: 'light',
          preferredFontStyle: 'system',
        },
        savedProfile,
      ),
    ).toBe(true);

    expect(
      canSaveAccountProfileDraft(
        {
          displayName: 'Alex',
          preferredLocale: 'zh-Hans',
          preferredTheme: 'light',
          preferredFontStyle: 'system',
        },
        savedProfile,
      ),
    ).toBe(true);
  });
});
