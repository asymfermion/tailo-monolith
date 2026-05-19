#!/usr/bin/env node
/**
 * Verifies Supabase CLI link + mobile .env.local without printing secrets.
 * Run from repo root: node scripts/verify-supabase-setup.mjs
 */
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';

function loadEnv(file) {
  const out = {};
  if (!existsSync(file)) {
    return out;
  }

  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separator = trimmed.indexOf('=');
    if (separator === -1) {
      continue;
    }

    out[trimmed.slice(0, separator)] = trimmed.slice(separator + 1);
  }

  return out;
}

function check(name, ok, detail = '') {
  const status = ok ? 'OK' : 'FAIL';
  console.log(`${status}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) {
    passed = false;
  }
  return ok;
}

let passed = true;
const fail = (name, detail) => {
  passed = false;
  check(name, false, detail);
};

console.log('Tailo Supabase setup verification\n');

const linkedRefPath = 'supabase/.temp/project-ref';
if (existsSync(linkedRefPath)) {
  const ref = readFileSync(linkedRefPath, 'utf8').trim();
  check('CLI project linked', ref === 'sgxtyxvithlmuuofkzlk', `ref=${ref}`);
} else {
  fail('CLI project linked', 'run: npx supabase link --project-ref sgxtyxvithlmuuofkzlk');
}

try {
  const projects = execSync('npx supabase projects list', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  check('CLI authenticated', projects.includes('sgxtyxvithlmuuofkzlk'));
} catch {
  fail('CLI authenticated', 'run: npx supabase login --token <access-token>');
}

const dbEnv = loadEnv('supabase/.env.local');
check('supabase/.env.local exists', existsSync('supabase/.env.local'));

const databaseUrl = dbEnv.DATABASE_URL?.trim() ?? '';
const hasDatabaseUrl =
  databaseUrl.length > 0 && databaseUrl.startsWith('postgresql://');
if (!hasDatabaseUrl) {
  const detail = existsSync('supabase/.env.local')
    ? 'add an uncommented DATABASE_URL=postgresql://... (see supabase/env.example)'
    : 'copy supabase/env.example → supabase/.env.local';
  fail('DATABASE_URL in supabase/.env.local', detail);
} else {
  check('DATABASE_URL in supabase/.env.local', true);
}

const mobileEnv = loadEnv('apps/mobile/.env.local');
check('apps/mobile/.env.local exists', existsSync('apps/mobile/.env.local'));

const url = mobileEnv.EXPO_PUBLIC_SUPABASE_URL;
const key = mobileEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;

check('EXPO_PUBLIC_SUPABASE_URL set', Boolean(url));
check('EXPO_PUBLIC_SUPABASE_ANON_KEY set', Boolean(key && key.length > 20));

if (url && key) {
  const client = createClient(url, key);
  const { error: sessionError } = await client.auth.getSession();
  check('Mobile API reachable (auth.getSession)', !sessionError);

  const { data, error: anonError } = await client.auth.signInAnonymously();
  if (anonError) {
    fail(
      'Anonymous sign-in enabled (B0.2)',
      `${anonError.message} — enable in Dashboard → Authentication → Providers`,
    );
  } else {
    check('Anonymous sign-in enabled (B0.2)', Boolean(data.session));
  }
} else {
  fail('Mobile API check', 'set apps/mobile/.env.local first');
}

console.log(passed ? '\nAll checks passed.' : '\nSome checks failed — see above.');
process.exit(passed ? 0 : 1);
