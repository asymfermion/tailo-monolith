import type * as SQLite from 'expo-sqlite';

import { logSqlFailure } from './dbLogger';

/**
 * expo-sqlite allows only one in-flight async statement per connection.
 * Concurrent getAllAsync/runAsync calls cause NativeStatement.finalizeAsync failures.
 */
export function createSerializedDatabase(
  database: SQLite.SQLiteDatabase,
): SQLite.SQLiteDatabase {
  let queue: Promise<unknown> = Promise.resolve();

  const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    const next = queue.then(task, task);
    queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  };

  const runLogged = async <T>(
    operation: string,
    sql: string,
    params: unknown[],
    task: () => Promise<T>,
  ): Promise<T> => {
    try {
      return await task();
    } catch (error) {
      logSqlFailure(operation, sql, params, error);
      throw error;
    }
  };

  const serialized = {
    ...database,
    closeAsync: () => enqueue(() => database.closeAsync()),
    execAsync: (source: string) =>
      enqueue(() =>
        runLogged('execAsync', source, [], () => database.execAsync(source)),
      ),
    runAsync: ((source: string, ...params: unknown[]) =>
      enqueue(() =>
        runLogged('runAsync', source, params, () =>
          database.runAsync(
            source,
            ...(params as Parameters<typeof database.runAsync> extends [
              string,
              ...infer Rest,
            ]
              ? Rest
              : never),
          ),
        ),
      )) as typeof database.runAsync,
    getFirstAsync: ((source: string, ...params: unknown[]) =>
      enqueue(() =>
        runLogged('getFirstAsync', source, params, () =>
          database.getFirstAsync(
            source,
            ...(params as Parameters<typeof database.getFirstAsync> extends [
              string,
              ...infer Rest,
            ]
              ? Rest
              : never),
          ),
        ),
      )) as typeof database.getFirstAsync,
    getAllAsync: ((source: string, ...params: unknown[]) =>
      enqueue(() =>
        runLogged('getAllAsync', source, params, () =>
          database.getAllAsync(
            source,
            ...(params as Parameters<typeof database.getAllAsync> extends [
              string,
              ...infer Rest,
            ]
              ? Rest
              : never),
          ),
        ),
      )) as typeof database.getAllAsync,
    getEachAsync: ((source: string, ...params: unknown[]) =>
      database.getEachAsync(
        source,
        ...(params as Parameters<typeof database.getEachAsync> extends [
          string,
          ...infer Rest,
        ]
          ? Rest
          : never),
      )) as typeof database.getEachAsync,
    prepareAsync: (source: string) =>
      enqueue(() => database.prepareAsync(source)),
    withTransactionAsync: (task: () => Promise<void>) =>
      enqueue(() => database.withTransactionAsync(task)),
  };

  return serialized as SQLite.SQLiteDatabase;
}
