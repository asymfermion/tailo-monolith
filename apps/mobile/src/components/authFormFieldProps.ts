import { Platform, type TextInputProps } from 'react-native';

export type AuthFormFieldKind =
  'email' | 'password' | 'newPassword' | 'confirmPassword' | 'code';

/** All auth fields use the shared Done toolbar on iOS (and Android bar). */
export function authFormFieldUsesKeyboardAccessory(
  _kind: AuthFormFieldKind,
): boolean {
  return true;
}

/**
 * Keyboard presets for auth forms.
 */
export function getAuthFormFieldProps(
  kind: AuthFormFieldKind,
): Partial<TextInputProps> {
  switch (kind) {
    case 'email':
      return {
        autoCapitalize: 'none',
        autoCorrect: false,
        autoComplete: 'email',
        keyboardType: 'email-address',
        spellCheck: false,
        textContentType: 'emailAddress',
      };
    case 'password':
      return Platform.OS === 'ios'
        ? {
            autoCapitalize: 'none',
            autoCorrect: false,
            autoComplete: 'off',
            keyboardType: 'default',
            secureTextEntry: true,
            spellCheck: false,
            textContentType: 'none',
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
            autoCapitalize: 'none',
            autoCorrect: false,
            autoComplete: 'new-password',
            keyboardType: 'default',
            secureTextEntry: true,
            spellCheck: false,
            textContentType: 'newPassword',
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
            autoCapitalize: 'none',
            autoCorrect: false,
            autoComplete: 'new-password',
            keyboardType: 'default',
            secureTextEntry: true,
            spellCheck: false,
            textContentType: 'newPassword',
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
