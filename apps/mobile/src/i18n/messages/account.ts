/** Account upgrade copy (email linking). */
export const accountMessages = {
  saveMemoriesLink: 'Save your memories',
  title: 'Save your memories',
  body: 'Add an email to keep your pet profile and moments if you get a new phone. Tailo only syncs moments you save — not your whole photo library.',
  emailLabel: 'Email',
  emailPlaceholder: 'you@example.com',
  sendCode: 'Send verification code',
  sendingCode: 'Sending...',
  codeLabel: 'Verification code',
  codePlaceholder: '6-digit code',
  codeHint: 'We sent a code to {{email}}.',
  verifyCode: 'Verify email',
  verifying: 'Verifying...',
  useDifferentEmail: 'Use a different email',
  linkedTitle: 'Memories saved',
  linkedBody:
    'Your account is linked to {{email}}. Your timeline stays on this device until moments sync.',
  unavailableBody: 'Cloud sync is not configured on this build.',
  errors: {
    invalidEmail: 'Enter a valid email address.',
    unavailable: 'Account linking is not available right now.',
  },
} as const;
