import { getFontFamilyForStyle } from './typography';

describe('typography', () => {
  it('returns undefined for system default', () => {
    expect(getFontFamilyForStyle('system', '600')).toBeUndefined();
  });

  it('maps custom styles to loaded font families', () => {
    expect(getFontFamilyForStyle('serif', '600')).toBe('Lora_600SemiBold');
    expect(getFontFamilyForStyle('modern', '400')).toBe('Inter_400Regular');
    expect(getFontFamilyForStyle('elegant', '700')).toBe('Playfair_700Bold');
  });
});
