import type { TextStyle } from 'react-native';

import type { AppFontStyle } from '@/lib/appFontStyle';

export type FontWeightName = '400' | '500' | '600' | '700';

const FONT_FAMILY_BY_STYLE: Record<
  Exclude<AppFontStyle, 'system'>,
  Record<FontWeightName, string>
> = {
  serif: {
    '400': 'Lora_400Regular',
    '500': 'Lora_500Medium',
    '600': 'Lora_600SemiBold',
    '700': 'Lora_700Bold',
  },
  rounded: {
    '400': 'Nunito_400Regular',
    '500': 'Nunito_500Medium',
    '600': 'Nunito_600SemiBold',
    '700': 'Nunito_700Bold',
  },
  modern: {
    '400': 'Inter_400Regular',
    '500': 'Inter_500Medium',
    '600': 'Inter_600SemiBold',
    '700': 'Inter_700Bold',
  },
  elegant: {
    '400': 'Playfair_400Regular',
    '500': 'Playfair_500Medium',
    '600': 'Playfair_600SemiBold',
    '700': 'Playfair_700Bold',
  },
};

export function normalizeFontWeight(
  fontWeight: TextStyle['fontWeight'] = '400',
): FontWeightName {
  if (fontWeight === 'normal' || fontWeight === '400' || fontWeight === 400) {
    return '400';
  }

  if (fontWeight === '500' || fontWeight === 500) {
    return '500';
  }

  if (fontWeight === '600' || fontWeight === 'semibold' || fontWeight === 600) {
    return '600';
  }

  if (fontWeight === 'bold' || fontWeight === '700' || fontWeight === 700) {
    return '700';
  }

  return '400';
}

export function getFontFamilyForStyle(
  fontStyle: AppFontStyle,
  fontWeight: TextStyle['fontWeight'] = '400',
): string | undefined {
  if (fontStyle === 'system') {
    return undefined;
  }

  return FONT_FAMILY_BY_STYLE[fontStyle][normalizeFontWeight(fontWeight)];
}

export function getFontFamilies(
  fontStyle: AppFontStyle,
): Record<FontWeightName, string | undefined> {
  return {
    '400': getFontFamilyForStyle(fontStyle, '400'),
    '500': getFontFamilyForStyle(fontStyle, '500'),
    '600': getFontFamilyForStyle(fontStyle, '600'),
    '700': getFontFamilyForStyle(fontStyle, '700'),
  };
}
