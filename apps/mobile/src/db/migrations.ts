import type * as SQLite from 'expo-sqlite';

import { logDbInfo, logSqlFailure } from './dbLogger';

export const CURRENT_SCHEMA_VERSION = 7;

type Migration = {
  version: number;
  name: string;
  up: (db: SQLite.SQLiteDatabase) => Promise<void>;
};

type UserVersionRow = {
  user_version: number;
};

const migrations: Migration[] = [
  {
    version: 1,
    name: 'create local media pipeline tables',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS local_assets (
          local_asset_id TEXT PRIMARY KEY NOT NULL,
          uri TEXT NOT NULL,
          created_at TEXT NOT NULL,
          width INTEGER NOT NULL CHECK (width >= 0),
          height INTEGER NOT NULL CHECK (height >= 0),
          media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
          processing_status TEXT NOT NULL DEFAULT 'pending'
            CHECK (processing_status IN ('pending', 'processing', 'processed', 'failed')),
          processed_at TEXT,
          is_pet_candidate INTEGER NOT NULL DEFAULT 0 CHECK (is_pet_candidate IN (0, 1)),
          pet_confidence REAL CHECK (pet_confidence IS NULL OR (pet_confidence >= 0 AND pet_confidence <= 1)),
          inserted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS local_assets_created_at_idx
          ON local_assets (created_at DESC);

        CREATE INDEX IF NOT EXISTS local_assets_processing_status_idx
          ON local_assets (processing_status);

        CREATE INDEX IF NOT EXISTS local_assets_pet_candidate_idx
          ON local_assets (is_pet_candidate, pet_confidence DESC);

        CREATE TABLE IF NOT EXISTS local_event_candidates (
          local_event_id TEXT PRIMARY KEY NOT NULL,
          timestamp TEXT NOT NULL,
          source TEXT NOT NULL CHECK (source IN ('camera_roll', 'in_app', 'manual')),
          candidate_status TEXT NOT NULL DEFAULT 'pending'
            CHECK (candidate_status IN ('pending', 'clustering', 'scored', 'ready', 'rejected')),
          selected_asset_ids TEXT NOT NULL DEFAULT '[]',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS local_event_candidates_timestamp_idx
          ON local_event_candidates (timestamp DESC);

        CREATE INDEX IF NOT EXISTS local_event_candidates_status_idx
          ON local_event_candidates (candidate_status);

        CREATE TABLE IF NOT EXISTS local_media_scores (
          local_asset_id TEXT NOT NULL,
          local_event_id TEXT NOT NULL,
          sharpness REAL NOT NULL DEFAULT 0 CHECK (sharpness >= 0 AND sharpness <= 1),
          brightness REAL NOT NULL DEFAULT 0 CHECK (brightness >= 0 AND brightness <= 1),
          subject_visibility REAL NOT NULL DEFAULT 0 CHECK (subject_visibility >= 0 AND subject_visibility <= 1),
          uniqueness REAL NOT NULL DEFAULT 0 CHECK (uniqueness >= 0 AND uniqueness <= 1),
          overall_score REAL NOT NULL DEFAULT 0,
          is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
          scored_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (local_asset_id, local_event_id),
          FOREIGN KEY (local_asset_id) REFERENCES local_assets (local_asset_id) ON DELETE CASCADE,
          FOREIGN KEY (local_event_id) REFERENCES local_event_candidates (local_event_id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS local_media_scores_event_score_idx
          ON local_media_scores (local_event_id, overall_score DESC);

        CREATE INDEX IF NOT EXISTS local_media_scores_primary_idx
          ON local_media_scores (local_event_id, is_primary);
      `);
    },
  },
  {
    version: 2,
    name: 'add local dog cat detection type',
    up: async (db) => {
      await db.execAsync(`
        ALTER TABLE local_assets
          ADD COLUMN detected_pet_type TEXT CHECK (detected_pet_type IN ('dog', 'cat') OR detected_pet_type IS NULL);
      `);
    },
  },
  {
    version: 3,
    name: 'add detection debug metadata',
    up: async (db) => {
      await db.execAsync(`
        ALTER TABLE local_assets
          ADD COLUMN detection_source TEXT;
      `);
      await db.execAsync(`
        ALTER TABLE local_assets
          ADD COLUMN detection_debug_label TEXT;
      `);
    },
  },
  {
    version: 4,
    name: 'add local events and candidate processing state',
    up: async (db) => {
      await db.execAsync(`
        ALTER TABLE local_event_candidates
          ADD COLUMN processing_state TEXT NOT NULL DEFAULT 'pending'
            CHECK (processing_state IN ('pending', 'processing', 'processed', 'failed'));

        CREATE TABLE IF NOT EXISTS local_events (
          local_event_id TEXT PRIMARY KEY NOT NULL,
          pet_id TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          source TEXT NOT NULL CHECK (source IN ('camera_roll', 'in_app', 'manual')),
          event_type TEXT NOT NULL DEFAULT 'unknown'
            CHECK (event_type IN ('walk', 'play', 'rest', 'eating', 'unknown')),
          caption TEXT,
          caption_language TEXT,
          confidence REAL,
          is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1)),
          processing_state TEXT NOT NULL DEFAULT 'ready'
            CHECK (processing_state IN ('pending', 'processing', 'processed', 'failed')),
          selected_asset_ids TEXT NOT NULL DEFAULT '[]',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS local_events_timestamp_idx
          ON local_events (timestamp DESC);

        CREATE INDEX IF NOT EXISTS local_events_pet_timestamp_idx
          ON local_events (pet_id, timestamp DESC);

        CREATE INDEX IF NOT EXISTS local_events_processing_state_idx
          ON local_events (processing_state);

        UPDATE local_event_candidates
        SET processing_state = 'processed'
        WHERE candidate_status IN ('scored', 'ready');

        UPDATE local_event_candidates
        SET processing_state = 'failed'
        WHERE candidate_status = 'rejected';
      `);

      await backfillLocalEventsFromCandidates(db);
    },
  },
  {
    version: 5,
    name: 'add upload queue and sync state tables',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS upload_queue (
          id TEXT PRIMARY KEY NOT NULL,
          local_event_id TEXT NOT NULL,
          local_asset_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending'
            CHECK (status IN ('pending', 'uploading', 'done', 'failed')),
          retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
          last_error TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (local_event_id, local_asset_id),
          FOREIGN KEY (local_event_id) REFERENCES local_events (local_event_id) ON DELETE CASCADE,
          FOREIGN KEY (local_asset_id) REFERENCES local_assets (local_asset_id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS upload_queue_status_created_idx
          ON upload_queue (status, created_at);

        CREATE TABLE IF NOT EXISTS sync_state (
          state_key TEXT PRIMARY KEY NOT NULL,
          state_value TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        INSERT OR IGNORE INTO sync_state (state_key, state_value)
        VALUES ('pipeline.phase', 'idle');
      `);
    },
  },
  {
    version: 6,
    name: 'extend upload queue for remote paths and retry scheduling',
    up: async (db) => {
      await db.execAsync(`
        ALTER TABLE upload_queue
          ADD COLUMN storage_path TEXT;
      `);
      await db.execAsync(`
        ALTER TABLE upload_queue
          ADD COLUMN thumbnail_path TEXT;
      `);
      await db.execAsync(`
        ALTER TABLE upload_queue
          ADD COLUMN next_attempt_at TEXT;
      `);
    },
  },
  {
    version: 7,
    name: 'add remote sync metadata to local events',
    up: async (db) => {
      await db.execAsync(`
        ALTER TABLE local_events
          ADD COLUMN remote_event_id TEXT;
      `);
      await db.execAsync(`
        ALTER TABLE local_events
          ADD COLUMN server_sync_version INTEGER NOT NULL DEFAULT 0;
      `);
      await db.execAsync(`
        ALTER TABLE local_events
          ADD COLUMN caption_source TEXT
            CHECK (caption_source IN ('user', 'ai', 'placeholder') OR caption_source IS NULL);
      `);
      await db.execAsync(`
        ALTER TABLE local_events
          ADD COLUMN user_edited_caption INTEGER NOT NULL DEFAULT 0
            CHECK (user_edited_caption IN (0, 1));
      `);
      await db.execAsync(`
        ALTER TABLE local_events
          ADD COLUMN user_edited_event_type INTEGER NOT NULL DEFAULT 0
            CHECK (user_edited_event_type IN (0, 1));
      `);
      await db.execAsync(`
        ALTER TABLE local_events
          ADD COLUMN pending_ai INTEGER NOT NULL DEFAULT 0
            CHECK (pending_ai IN (0, 1));
      `);
    },
  },
];

async function backfillLocalEventsFromCandidates(
  db: SQLite.SQLiteDatabase,
): Promise<void> {
  const rows = await db.getAllAsync<{
    localEventId: string;
    timestamp: string;
    source: string;
    selectedAssetIds: string;
  }>(`
    SELECT
      local_event_id AS localEventId,
      timestamp,
      source,
      selected_asset_ids AS selectedAssetIds
    FROM local_event_candidates
    WHERE candidate_status IN ('scored', 'ready')
  `);

  for (const row of rows) {
    await db.runAsync(
      `
        INSERT INTO local_events (
          local_event_id,
          pet_id,
          timestamp,
          source,
          event_type,
          processing_state,
          selected_asset_ids
        )
        VALUES (?, 'local_pet_default', ?, ?, 'unknown', 'processed', ?)
        ON CONFLICT(local_event_id) DO NOTHING
      `,
      [row.localEventId, row.timestamp, row.source, row.selectedAssetIds],
    );
  }
}

export async function migrateDatabase(
  db: SQLite.SQLiteDatabase,
): Promise<number> {
  await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');

  const currentVersion = await getUserVersion(db);
  const pendingMigrations = migrations.filter(
    (migration) => migration.version > currentVersion,
  );

  for (const migration of pendingMigrations) {
    logDbInfo('Applying migration', {
      version: migration.version,
      name: migration.name,
    });

    try {
      await db.withTransactionAsync(async () => {
        await migration.up(db);
        await db.execAsync(`PRAGMA user_version = ${migration.version};`);
      });
      logDbInfo('Migration applied', {
        version: migration.version,
        name: migration.name,
      });
    } catch (error) {
      logSqlFailure(
        `migration v${migration.version}`,
        migration.name,
        [],
        error,
      );
      throw new Error(
        `Failed to apply database migration ${migration.version} (${migration.name})`,
        { cause: error },
      );
    }
  }

  return getUserVersion(db);
}

async function getUserVersion(db: SQLite.SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<UserVersionRow>('PRAGMA user_version');
  return row?.user_version ?? 0;
}
