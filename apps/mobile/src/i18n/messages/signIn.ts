/** Sign-in gate after logout and welcome-modal sign-in. */
export const signInMessages = {
  title: 'Sign in to Tailo',
  body: 'Your memories are on this device. Sign in with the email on your account to open Tailo again.',
  welcomeTitle: 'Sign in to your account',
  welcomeBody:
    'Use the email on your Tailo account to pick up your saved memories on this device.',
  signIn: 'Sign in',
  signingIn: 'Signing in...',
  signInWithGoogle: 'Sign in with Google',
  signInWithApple: 'Sign in with Apple',
  sendCode: 'Send sign-in code',
  verifyCode: 'Sign in',
  passwordPlaceholder: 'Your password',
  useCodeInstead: 'Use a sign-in code instead',
  usePasswordInstead: 'Use your password instead',
  forgotPassword: 'Forgot password?',
  forgotPasswordTitle: 'Reset your password',
  forgotPasswordBody:
    'Enter the email on your Tailo account. We will send an 8-digit code to reset your password.',
  forgotPasswordSendCode: 'Send reset code',
  forgotPasswordVerifyCode: 'Verify code',
  forgotPasswordSave: 'Save new password',
  forgotPasswordSaving: 'Saving password...',
  errors: {
    passwordRequired: 'Enter your password.',
  },
} as const;
