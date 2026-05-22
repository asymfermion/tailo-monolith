import { DEFAULT_APP_THEME, isAppTheme } from './appTheme';

describe('appTheme', () => {
  it('validates theme ids', () => {
    expect(isAppTheme('light')).toBe(true);
    expect(isAppTheme('dark')).toBe(true);
    expect(isAppTheme('sepia')).toBe(false);
    expect(DEFAULT_APP_THEME).toBe('light');
  });
});
