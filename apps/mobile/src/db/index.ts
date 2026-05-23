import * as SQLite from 'expo-sqlite';

import { reconcileInstallIdentity } from '@/modules/auth/installIdentity';
import { getCurrentLocalWorkspaceId } from '@/modules/auth/localWorkspace';

import { logDbInfo } from './dbLogger';
import { CURRENT_SCHEMA_VERSION, migrateDatabase } from './migrations';
import { createSerializedDatabase } from './serializeDatabase';

export const DATABASE_NAME = 'tailo.db';

let database: SQLite.SQLiteDatabase | null = null;
let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let databaseWorkspaceId: string | null = null;

/**
 * Opens the local SQLite database and applies pending migrations once.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  const workspaceId = await getCurrentLocalWorkspaceId();

  if (databasePromise && databaseWorkspaceId === workspaceId) {
    return databasePromise;
  }

  if (databasePromise && databaseWorkspaceId !== workspaceId) {
    await closeDatabaseForWorkspaceSwitch();
  }

  if (!databasePromise) {
    databaseWorkspaceId = workspaceId;
    databasePromise = openAndMigrateDatabase(workspaceId).catch(
      (error: unknown) => {
        database = null;
        databasePromise = null;
        databaseWorkspaceId = null;
        throw error;
      },
    );
  }

  return databasePromise;
}

async function closeDatabaseForWorkspaceSwitch(): Promise<void> {
  const currentDatabase = database;

  database = null;
  databasePromise = null;
  databaseWorkspaceId = null;

  if (currentDatabase) {
    await currentDatabase.closeAsync();
  }
}

function databaseNameForWorkspace(workspaceId: string): string {
  return workspaceId === 'device_default'
    ? DATABASE_NAME
    : `tailo.${workspaceId}.db`;
}

async function openAndMigrateDatabase(
  workspaceId: string,
): Promise<SQLite.SQLiteDatabase> {
  if (!database) {
    const databaseName = databaseNameForWorkspace(workspaceId);
    logDbInfo('Opening database', { name: databaseName, workspaceId });
    const rawDatabase = await SQLite.openDatabaseAsync(databaseName);
    const schemaVersion = await migrateDatabase(rawDatabase);
    const install = await reconcileInstallIdentity(rawDatabase);
    database = createSerializedDatabase(rawDatabase);
    logDbInfo('Database ready', {
      name: databaseName,
      workspaceId,
      schemaVersion,
      expectedSchemaVersion: CURRENT_SCHEMA_VERSION,
      installId: install.installId,
      clearedStaleSecureStore: install.clearedStaleSecureStore,
    });
  }
  return database;
}

export { migrateDatabase };
