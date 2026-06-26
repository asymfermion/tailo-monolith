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

  it('uses email keyboard and autofill on iOS email fields', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    });

    expect(getAuthFormFieldProps('email')).toMatchObject({
      keyboardType: 'email-address',
      textContentType: 'emailAddress',
      autoComplete: 'email',
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

  it('uses a stable plain keyboard on iOS sign-in password fields', () => {
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
  });

  it('keeps password manager hints on iOS new-password fields', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    });

    expect(getAuthFormFieldProps('newPassword')).toMatchObject({
      keyboardType: 'default',
      autoComplete: 'new-password',
      textContentType: 'newPassword',
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
