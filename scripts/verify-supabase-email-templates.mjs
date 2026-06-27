#!/usr/bin/env node
/**
 * Ensures Supabase auth email templates in supabase/templates/ include {{ .Token }}
 * for OTP flows and the Tailo wordmark.
 * Run from repo root: node scripts/verify-supabase-email-templates.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const templatesDir = join(process.cwd(), 'supabase', 'templates');

const otpTemplates = new Set([
  'confirmation.html',
  'email_change.html',
  'magic_link.html',
  'recovery.html',
  'invite.html',
  'reauthentication.html',
]);

const emailTemplates = new Set([
  ...otpTemplates,
  'password_changed_notification.html',
]);

const optionalTemplates = new Set([
  '_shared-styles.html',
  'README.md',
  'password_changed_notification.html',
]);

const wordmarkPath = '/assets/tailo-wordmark-dark-transparent.png';

let failed = false;

for (const file of readdirSync(templatesDir)) {
  if (!file.endsWith('.html')) {
    continue;
  }

  const content = readFileSync(join(templatesDir, file), 'utf8');

  if (emailTemplates.has(file)) {
    if (!content.includes(wordmarkPath) || !content.includes('alt="Tailo"')) {
      console.error(`FAIL ${file}: missing Tailo wordmark image`);
      failed = true;
      continue;
    }
  }

  if (otpTemplates.has(file)) {
    if (!content.includes('{{ .Token }}')) {
      console.error(`FAIL ${file}: missing {{ .Token }}`);
      failed = true;
      continue;
    }

    if (
      content.includes('{{ .ConfirmationURL }}') &&
      !content.includes('ignore this email')
    ) {
      console.warn(
        `WARN ${file}: includes {{ .ConfirmationURL }} — ensure OTP is primary`,
      );
    }

    console.log(`OK   ${file}`);
    continue;
  }

  if (!optionalTemplates.has(file)) {
    console.warn(`WARN ${file}: not in OTP or optional list`);
  }
}

if (failed) {
  process.exit(1);
}

console.log('All required email templates include the Tailo wordmark.');
console.log('All required OTP templates include {{ .Token }}.');
