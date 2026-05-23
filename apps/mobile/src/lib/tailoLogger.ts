import type { DbLogDetails } from '@/db/dbLogger';

/** Filter Metro / Xcode console with `[Tailo]`. */
export const TAILO_LOG_PREFIX = '[Tailo]';

export type TailoLogArea =
  | 'App'
  | 'Auth'
  | 'Pipeline'
  | 'Scan'
  | 'Detect'
  | 'Cluster'
  | 'Promote'
  | 'Upload'
  | 'Sync';

export function logTailo(
  area: TailoLogArea,
  message: string,
  details?: DbLogDetails,
): void {
  const tag = `[${area}]`;

  if (details) {
    console.warn(TAILO_LOG_PREFIX, tag, message, details);
    return;
  }

  console.warn(TAILO_LOG_PREFIX, tag, message);
}
