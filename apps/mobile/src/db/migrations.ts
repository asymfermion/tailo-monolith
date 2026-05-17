import type * as SQLite from 'expo-sqlite';

export const CURRENT_SCHEMA_VERSION = 3;

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
        ALTER TABLE local_assets
          ADD COLUMN detection_debug_label TEXT;
      `);
    },
  },
];

export async function migrateDatabase(
  db: SQLite.SQLiteDatabase,
): Promise<number> {
  await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');

  const currentVersion = await getUserVersion(db);
  const pendingMigrations = migrations.filter(
    (migration) => migration.version > currentVersion,
  );

  for (const migration of pendingMigrations) {
    await db.execAsync('BEGIN;');
    try {
      await migration.up(db);
      await db.execAsync(`PRAGMA user_version = ${migration.version};`);
      await db.execAsync('COMMIT;');
    } catch (error) {
      await db.execAsync('ROLLBACK;');
      throw new Error(
        `Failed to apply database migration ${migration.version} (${migration.name})`,
        { cause: error },
      );
    }
  }

  return getUserVersion(db);
}

async function getUserVersion(db: SQLite.SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<UserVersionRow>('PRAGMA user_version;');
  return row?.user_version ?? 0;
}
