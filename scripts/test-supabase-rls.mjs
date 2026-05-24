#!/usr/bin/env node
/**
 * B2.1.10 — Run RLS cross-user smoke tests against linked or local Postgres.
 *
 * Usage (repo root):
 *   npm run test:supabase:rls
 *   npm run test:supabase:rls -- --linked
 */
import {
  existsSync,
  lstatSync,
  readFileSync,
  symlinkSync,
  unlinkSync,
} from 'fs';
import { spawnSync } from 'child_process';

const TEST_FILE = 'supabase/tests/rls_cross_user_smoke.sql';
const ROOT_TEMPLATES_LINK = 'templates';
const SUPABASE_TEMPLATES_DIR = 'supabase/templates';
let createdTemplatesLink = false;

function ensureTemplateConfigPaths() {
  if (existsSync(ROOT_TEMPLATES_LINK)) {
    if (!lstatSync(ROOT_TEMPLATES_LINK).isSymbolicLink()) {
      console.error(
        `error: ${ROOT_TEMPLATES_LINK} exists and is not a symlink to ${SUPABASE_TEMPLATES_DIR}`,
      );
      process.exit(1);
    }
    return;
  }

  symlinkSync(SUPABASE_TEMPLATES_DIR, ROOT_TEMPLATES_LINK, 'dir');
  createdTemplatesLink = true;
}

function cleanupTemplateConfigPaths() {
  if (createdTemplatesLink) {
    unlinkSync(ROOT_TEMPLATES_LINK);
  }
}

process.on('exit', cleanupTemplateConfigPaths);

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

function runPsql(databaseUrl) {
  console.log(`Running RLS smoke: psql -f ${TEST_FILE}\n`);
  const result = spawnSync(
    'psql',
    [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-f', TEST_FILE],
    { stdio: 'inherit' },
  );
  process.exit(result.status ?? 1);
}

function runSupabaseDbQuery(extraArgs) {
  ensureTemplateConfigPaths();

  const args = ['supabase', 'db', 'query', ...extraArgs, '--file', TEST_FILE];
  console.log(`Running: npx ${args.join(' ')}\n`);
  const result = spawnSync('npx', args, {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  process.exit(result.status ?? 1);
}

const argv = process.argv.slice(2);
const useLinked = argv.includes('--linked');

if (useLinked) {
  runSupabaseDbQuery(['--linked']);
}

const dbEnv = loadEnv('supabase/.env.local');
const databaseUrl = dbEnv.DATABASE_URL?.trim() ?? '';

if (databaseUrl) {
  runPsql(databaseUrl);
}

console.error(
  'RLS smoke tests need a Postgres connection.\n' +
    '  Option A: npx supabase link && npm run test:supabase:rls -- --linked\n' +
    '  Option B: set DATABASE_URL in supabase/.env.local && npm run test:supabase:rls\n' +
    '  (requires psql on PATH for Option B)\n',
);
process.exit(1);
