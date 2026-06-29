import type * as SQLite from 'expo-sqlite';

export const SYNC_STATE_KEYS = {
  PIPELINE_PHASE: 'pipeline.phase',
  SCAN_MODE: 'scan.mode',
  SCAN_AFTER: 'scan.after',
  SCAN_HAS_NEXT: 'scan.has_next',
  SCAN_CREATED_AFTER_MS: 'scan.created_after_ms',
  APP_INSTALL_ID: 'app.install_id',
  PROFILE_PET_FILTER_APPLIED: 'pipeline.profile_pet_filter_applied',
  EVENTS_CURSOR: 'sync.events_cursor',
  BOOTSTRAP_BACKFILL_CURSOR: 'sync.bootstrap_backfill_cursor',
  BOOTSTRAP_BACKFILL_COMPLETED: 'sync.bootstrap_backfill_completed',
  THUMBNAIL_REFRESHED_AT: 'sync.thumbnail_refreshed_at',
  TIMELINE_GENERATION: 'sync.timeline_generation',
  NOTIFICATIONS_CURSOR: 'sync.notifications_cursor',
} as const;

export type SyncStateKey =
  (typeof SYNC_STATE_KEYS)[keyof typeof SYNC_STATE_KEYS];

export type PipelinePhase =
  'idle' | 'scan' | 'detect' | 'cluster' | 'select' | 'promote';

export type ScanMode = 'idle' | 'recent' | 'older';

type SyncStateRow = {
  stateValue: string;
};

export async function getSyncStateValue(
  db: SQLite.SQLiteDatabase,
  key: SyncStateKey,
): Promise<string | null> {
  const row = await db.getFirstAsync<SyncStateRow>(
    `
      SELECT state_value AS stateValue
      FROM sync_state
      WHERE state_key = ?
      LIMIT 1
    `,
    [key],
  );

  return row?.stateValue ?? null;
}

export async function setSyncStateValue(
  db: SQLite.SQLiteDatabase,
  key: SyncStateKey,
  value: string,
): Promise<void> {
  await db.runAsync(
    `
      INSERT INTO sync_state (state_key, state_value)
      VALUES (?, ?)
      ON CONFLICT(state_key) DO UPDATE SET
        state_value = excluded.state_value,
        updated_at = CURRENT_TIMESTAMP
    `,
    [key, value],
  );
}

export async function clearScanSyncState(
  db: SQLite.SQLiteDatabase,
): Promise<void> {
  await db.runAsync(
    `
      DELETE FROM sync_state
      WHERE state_key IN (?, ?, ?, ?)
    `,
    [
      SYNC_STATE_KEYS.SCAN_MODE,
      SYNC_STATE_KEYS.SCAN_AFTER,
      SYNC_STATE_KEYS.SCAN_HAS_NEXT,
      SYNC_STATE_KEYS.SCAN_CREATED_AFTER_MS,
    ],
  );
}

export async function setPipelinePhase(
  db: SQLite.SQLiteDatabase,
  phase: PipelinePhase,
): Promise<void> {
  await setSyncStateValue(db, SYNC_STATE_KEYS.PIPELINE_PHASE, phase);
}

export async function getPipelinePhase(
  db: SQLite.SQLiteDatabase,
): Promise<PipelinePhase> {
  const value = await getSyncStateValue(db, SYNC_STATE_KEYS.PIPELINE_PHASE);
  return isPipelinePhase(value) ? value : 'idle';
}

export async function saveScanProgress(
  db: SQLite.SQLiteDatabase,
  progress: {
    mode: ScanMode;
    after?: string | null;
    hasNextPage: boolean;
    createdAfterMs?: number | null;
  },
): Promise<void> {
  await setSyncStateValue(db, SYNC_STATE_KEYS.SCAN_MODE, progress.mode);
  await setSyncStateValue(
    db,
    SYNC_STATE_KEYS.SCAN_HAS_NEXT,
    progress.hasNextPage ? '1' : '0',
  );

  if (progress.after) {
    await setSyncStateValue(db, SYNC_STATE_KEYS.SCAN_AFTER, progress.after);
  } else {
    await db.runAsync(`DELETE FROM sync_state WHERE state_key = ?`, [
      SYNC_STATE_KEYS.SCAN_AFTER,
    ]);
  }

  if (progress.createdAfterMs != null) {
    await setSyncStateValue(
      db,
      SYNC_STATE_KEYS.SCAN_CREATED_AFTER_MS,
      String(progress.createdAfterMs),
    );
  } else {
    await db.runAsync(`DELETE FROM sync_state WHERE state_key = ?`, [
      SYNC_STATE_KEYS.SCAN_CREATED_AFTER_MS,
    ]);
  }
}

export async function getTimelineGeneration(
  db: SQLite.SQLiteDatabase,
): Promise<number> {
  const raw = await getSyncStateValue(db, SYNC_STATE_KEYS.TIMELINE_GENERATION);

  if (!raw) {
    return 0;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export async function incrementTimelineGeneration(
  db: SQLite.SQLiteDatabase,
): Promise<number> {
  const next = (await getTimelineGeneration(db)) + 1;
  await setSyncStateValue(
    db,
    SYNC_STATE_KEYS.TIMELINE_GENERATION,
    String(next),
  );
  return next;
}

export async function getScanProgress(db: SQLite.SQLiteDatabase): Promise<{
  mode: ScanMode;
  after: string | null;
  hasNextPage: boolean;
  createdAfterMs: number | null;
}> {
  const modeValue = await getSyncStateValue(db, SYNC_STATE_KEYS.SCAN_MODE);
  const after = await getSyncStateValue(db, SYNC_STATE_KEYS.SCAN_AFTER);
  const hasNextValue = await getSyncStateValue(
    db,
    SYNC_STATE_KEYS.SCAN_HAS_NEXT,
  );
  const createdAfterRaw = await getSyncStateValue(
    db,
    SYNC_STATE_KEYS.SCAN_CREATED_AFTER_MS,
  );
  const createdAfterMs = createdAfterRaw
    ? Number.parseInt(createdAfterRaw, 10)
    : Number.NaN;

  return {
    mode: isScanMode(modeValue) ? modeValue : 'idle',
    after,
    hasNextPage: hasNextValue === '1',
    createdAfterMs:
      Number.isFinite(createdAfterMs) && createdAfterMs >= 0
        ? createdAfterMs
        : null,
  };
}

function isPipelinePhase(value: string | null): value is PipelinePhase {
  return (
    value === 'idle' ||
    value === 'scan' ||
    value === 'detect' ||
    value === 'cluster' ||
    value === 'select' ||
    value === 'promote'
  );
}

function isScanMode(value: string | null): value is ScanMode {
  return value === 'idle' || value === 'recent' || value === 'older';
}
