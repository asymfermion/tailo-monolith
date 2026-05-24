import { formatCount, pluralSuffix, t } from './t';

describe('t', () => {
  it('resolves nested keys', () => {
    expect(t('common.continue')).toBe('Continue');
  });

  it('interpolates template variables', () => {
    expect(t('onboarding.petTypeTitle', { name: 'Milo' })).toBe(
      'Is Milo a dog or cat?',
    );
  });

  it('keeps separate welcome copy for local-start and registered paths', () => {
    expect(t('onboarding.welcomeTextNoAccount')).toContain(
      'Start without an account.',
    );
    expect(t('onboarding.welcomeText')).not.toContain('without an account');
  });

  it('returns the key path when a translation is missing', () => {
    expect(t('missing.key')).toBe('missing.key');
  });
});

describe('formatCount', () => {
  it('formats numbers with locale grouping', () => {
    expect(formatCount(1200)).toBe((1200).toLocaleString());
  });
});

describe('pluralSuffix', () => {
  it('returns empty for singular and s for plural', () => {
    expect(pluralSuffix(1)).toBe('');
    expect(pluralSuffix(2)).toBe('s');
  });
});
