/** Prefix for Metro / Xcode logs — filter console with `[Tailo DB]`. */
export const DB_LOG_PREFIX = '[Tailo DB]';

export type DbLogDetails = Record<string, unknown>;

export function logDbInfo(message: string, details?: DbLogDetails): void {
  if (details) {
    console.warn(DB_LOG_PREFIX, message, details);
    return;
  }

  console.warn(DB_LOG_PREFIX, message);
}

export function logSqlFailure(
  operation: string,
  sql: string,
  params: unknown[],
  error: unknown,
): void {
  console.warn(DB_LOG_PREFIX, 'SQL failure', {
    operation,
    sql: summarizeSql(sql),
    params: sanitizeParams(params),
    error: formatDbError(error),
  });
}

export function logForeignKeyDiagnostics(details: DbLogDetails): void {
  console.warn(DB_LOG_PREFIX, 'Foreign key diagnostics', details);
}

export function formatDbError(error: unknown): DbLogDetails {
  if (!(error instanceof Error)) {
    return { raw: String(error) };
  }

  const details: DbLogDetails = {
    name: error.name,
    message: error.message,
  };

  const cause = error.cause;
  if (cause instanceof Error) {
    details.cause = {
      name: cause.name,
      message: cause.message,
    };
  } else if (cause != null) {
    details.cause = String(cause);
  }

  const code = (error as Error & { code?: string }).code;
  if (code) {
    details.code = code;
  }

  return details;
}

export function isForeignKeyConstraintError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? `${error.message} ${error.cause instanceof Error ? error.cause.message : ''}`
      : String(error);

  return /foreign key constraint failed/i.test(message);
}

export function isClosedDatabaseError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? `${error.message} ${error.cause instanceof Error ? error.cause.message : ''}`
      : String(error);

  return (
    /access to closed resource/i.test(message) ||
    (error as Error & { code?: string }).code === 'ERR_ACCESS_CLOSED_RESOURCE'
  );
}

function summarizeSql(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim().slice(0, 600);
}

function sanitizeParams(params: unknown[]): unknown[] {
  return params.map((value) => {
    if (typeof value === 'string' && value.length > 200) {
      return `${value.slice(0, 200)}…`;
    }

    return value;
  });
}
