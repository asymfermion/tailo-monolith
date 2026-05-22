import {
  APP_FONT_STYLES,
  DEFAULT_APP_FONT_STYLE,
  isAppFontStyle,
} from './appFontStyle';

describe('appFontStyle', () => {
  it('exposes five font style options with system default', () => {
    expect(APP_FONT_STYLES).toHaveLength(5);
    expect(DEFAULT_APP_FONT_STYLE).toBe('system');
    expect(isAppFontStyle('system')).toBe(true);
    expect(isAppFontStyle('elegant')).toBe(true);
    expect(isAppFontStyle('comic')).toBe(false);
  });
});
