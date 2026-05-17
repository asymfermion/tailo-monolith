import * as SQLite from 'expo-sqlite';

import { migrateDatabase } from './migrations';

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
    database = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await migrateDatabase(database);
  }
  return database;
}

export { migrateDatabase };
