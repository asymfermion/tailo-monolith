import { logTailo } from '@/lib/tailoLogger';
import type { DbLogDetails } from '@/db/dbLogger';

export function logAuth(message: string, details?: DbLogDetails): void {
  logTailo('Auth', message, details);
}
