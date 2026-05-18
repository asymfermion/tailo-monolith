import * as SQLite from 'expo-sqlite';

import { reconcileInstallIdentity } from '@/modules/auth/installIdentity';

import { logDbInfo } from './dbLogger';
import { CURRENT_SCHEMA_VERSION, migrateDatabase } from './migrations';
import { createSerializedDatabase } from './serializeDatabase';

export const DATABASE_NAME = 'tailo.db';

let database: SQLite.SQLiteDatabase | null = null;
let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Opens the local SQLite database and applies pending migrations once.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openAndMigrateDatabase().catch((error: unknown) => {
      database = null;
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

async function openAndMigrateDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!database) {
    logDbInfo('Opening database', { name: DATABASE_NAME });
    const rawDatabase = await SQLite.openDatabaseAsync(DATABASE_NAME);
    const schemaVersion = await migrateDatabase(rawDatabase);
    const install = await reconcileInstallIdentity(rawDatabase);
    database = createSerializedDatabase(rawDatabase);
    logDbInfo('Database ready', {
      name: DATABASE_NAME,
      schemaVersion,
      expectedSchemaVersion: CURRENT_SCHEMA_VERSION,
      installId: install.installId,
      clearedStaleSecureStore: install.clearedStaleSecureStore,
    });
  }
  return database;
}

export { migrateDatabase };
