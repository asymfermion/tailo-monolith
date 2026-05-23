import { Platform } from 'react-native';

import {
  authFormFieldUsesKeyboardAccessory,
  getAuthFormFieldProps,
} from './authFormFieldProps';

describe('getAuthFormFieldProps', () => {
  const originalOs = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalOs,
    });
  });

  it('uses a plain default keyboard on iOS email fields', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    });

    expect(getAuthFormFieldProps('email')).toMatchObject({
      keyboardType: 'default',
      textContentType: 'none',
      autoComplete: 'off',
      spellCheck: false,
    });
  });

  it('uses email-address keyboard on Android email fields', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    });

    expect(getAuthFormFieldProps('email')).toMatchObject({
      keyboardType: 'email-address',
      autoComplete: 'email',
    });
  });

  it('configures OTP fields for number entry', () => {
    expect(getAuthFormFieldProps('code')).toMatchObject({
      keyboardType: 'number-pad',
      maxLength: 8,
      textContentType: 'oneTimeCode',
    });
  });

  it('uses a plain default keyboard on iOS password fields', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    });

    expect(getAuthFormFieldProps('password')).toMatchObject({
      keyboardType: 'default',
      autoComplete: 'off',
      secureTextEntry: true,
      textContentType: 'none',
      spellCheck: false,
    });

    expect(getAuthFormFieldProps('newPassword')).toMatchObject({
      keyboardType: 'default',
      textContentType: 'none',
    });
  });

  it('keeps password autofill hints on Android', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    });

    expect(getAuthFormFieldProps('password')).toMatchObject({
      autoComplete: 'password',
      textContentType: 'password',
    });
  });
});

describe('authFormFieldUsesKeyboardAccessory', () => {
  it('attaches the Done accessory to every auth field kind', () => {
    expect(authFormFieldUsesKeyboardAccessory('code')).toBe(true);
    expect(authFormFieldUsesKeyboardAccessory('email')).toBe(true);
    expect(authFormFieldUsesKeyboardAccessory('password')).toBe(true);
    expect(authFormFieldUsesKeyboardAccessory('newPassword')).toBe(true);
    expect(authFormFieldUsesKeyboardAccessory('confirmPassword')).toBe(true);
  });
});
