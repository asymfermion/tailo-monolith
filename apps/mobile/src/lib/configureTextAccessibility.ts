import { Text, TextInput } from 'react-native';

/** Prevent layout blow-up when users enable very large system text. */
export const MAX_FONT_SIZE_MULTIPLIER = 1.35;

type ComponentWithDefaultProps = {
  defaultProps?: {
    allowFontScaling?: boolean;
    maxFontSizeMultiplier?: number;
  };
};

export function configureTextAccessibility(): void {
  const text = Text as ComponentWithDefaultProps;
  text.defaultProps = text.defaultProps ?? {};
  text.defaultProps.allowFontScaling = true;
  text.defaultProps.maxFontSizeMultiplier = MAX_FONT_SIZE_MULTIPLIER;

  const textInput = TextInput as ComponentWithDefaultProps;
  textInput.defaultProps = textInput.defaultProps ?? {};
  textInput.defaultProps.allowFontScaling = true;
  textInput.defaultProps.maxFontSizeMultiplier = MAX_FONT_SIZE_MULTIPLIER;
}
