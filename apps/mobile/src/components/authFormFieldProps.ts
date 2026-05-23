import { Platform, type TextInputProps } from 'react-native';

export type AuthFormFieldKind =
  | 'email'
  | 'password'
  | 'newPassword'
  | 'confirmPassword'
  | 'code';

/** All auth fields use the shared Done toolbar on iOS (and Android bar). */
export function authFormFieldUsesKeyboardAccessory(
  _kind: AuthFormFieldKind,
): boolean {
  return true;
}

/**
 * iOS auth keyboards: avoid `email-address`, `password`, `ascii-capable`, and
 * `textContentType` autofill hints — they snap back to letters after one digit
 * on the 123 number layer.
 */
const IOS_PLAIN_KEYBOARD_PROPS = {
  autoCapitalize: 'none',
  autoCorrect: false,
  spellCheck: false,
  autoComplete: 'off',
  keyboardType: 'default',
  textContentType: 'none',
} as const satisfies Partial<TextInputProps>;

/**
 * Keyboard presets for auth forms.
 */
export function getAuthFormFieldProps(
  kind: AuthFormFieldKind,
): Partial<TextInputProps> {
  switch (kind) {
    case 'email':
      return Platform.OS === 'ios'
        ? IOS_PLAIN_KEYBOARD_PROPS
        : {
            autoCapitalize: 'none',
            autoCorrect: false,
            autoComplete: 'email',
            keyboardType: 'email-address',
            textContentType: 'emailAddress',
          };
    case 'password':
      return Platform.OS === 'ios'
        ? {
            ...IOS_PLAIN_KEYBOARD_PROPS,
            secureTextEntry: true,
          }
        : {
            autoCapitalize: 'none',
            autoCorrect: false,
            autoComplete: 'password',
            secureTextEntry: true,
            textContentType: 'password',
          };
    case 'newPassword':
      return Platform.OS === 'ios'
        ? {
            ...IOS_PLAIN_KEYBOARD_PROPS,
            secureTextEntry: true,
          }
        : {
            autoCapitalize: 'none',
            autoCorrect: false,
            autoComplete: 'new-password',
            secureTextEntry: true,
            textContentType: 'newPassword',
          };
    case 'confirmPassword':
      return Platform.OS === 'ios'
        ? {
            ...IOS_PLAIN_KEYBOARD_PROPS,
            secureTextEntry: true,
          }
        : {
            autoCapitalize: 'none',
            autoCorrect: false,
            autoComplete: 'new-password',
            secureTextEntry: true,
            textContentType: 'newPassword',
          };
    case 'code':
      return {
        autoCapitalize: 'none',
        autoCorrect: false,
        autoComplete: 'one-time-code',
        keyboardType: 'number-pad',
        maxLength: 8,
        textContentType: 'oneTimeCode',
      };
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
