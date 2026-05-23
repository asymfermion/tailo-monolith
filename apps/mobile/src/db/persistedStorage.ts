import type * as SQLite from 'expo-sqlite';

type PersistedRow = {
  stateValue: string;
};

/** Read an arbitrary string value from `sync_state` (no size limit vs SecureStore). */
export async function getPersistedString(
  db: SQLite.SQLiteDatabase,
  key: string,
): Promise<string | null> {
  const row = await db.getFirstAsync<PersistedRow>(
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

export async function setPersistedString(
  db: SQLite.SQLiteDatabase,
  key: string,
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

export async function deletePersistedString(
  db: SQLite.SQLiteDatabase,
  key: string,
): Promise<void> {
  await db.runAsync(`DELETE FROM sync_state WHERE state_key = ?`, [key]);
}
