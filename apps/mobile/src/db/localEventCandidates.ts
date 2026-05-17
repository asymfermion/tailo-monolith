import type * as SQLite from 'expo-sqlite';

import type { NewLocalEventCandidate } from '@/types';

export type LocalEventCandidateRow = {
  localEventId: string;
  timestamp: string;
  source: string;
  candidateStatus: string;
  selectedAssetIds: string;
};

const UPSERT_LOCAL_EVENT_CANDIDATE_SQL = `
  INSERT INTO local_event_candidates (
    local_event_id,
    timestamp,
    source,
    candidate_status,
    selected_asset_ids
  )
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(local_event_id) DO UPDATE SET
    timestamp = excluded.timestamp,
    source = excluded.source,
    candidate_status = excluded.candidate_status,
    selected_asset_ids = excluded.selected_asset_ids,
    updated_at = CURRENT_TIMESTAMP
`;

export async function clearLocalEventPipeline(
  db: SQLite.SQLiteDatabase,
): Promise<void> {
  await db.execAsync(`
    DELETE FROM local_media_scores;
    DELETE FROM local_event_candidates;
  `);
}

export async function upsertLocalEventCandidates(
  db: SQLite.SQLiteDatabase,
  candidates: NewLocalEventCandidate[],
): Promise<number> {
  for (const candidate of candidates) {
    await db.runAsync(UPSERT_LOCAL_EVENT_CANDIDATE_SQL, [
      candidate.localEventId,
      candidate.timestamp,
      candidate.source,
      candidate.candidateStatus ?? 'pending',
      JSON.stringify(candidate.selectedAssetIds ?? []),
    ]);
  }

  return candidates.length;
}

export async function getScorableLocalEventCandidates(
  db: SQLite.SQLiteDatabase,
): Promise<LocalEventCandidateRow[]> {
  return db.getAllAsync<LocalEventCandidateRow>(`
    SELECT
      local_event_id AS localEventId,
      timestamp,
      source,
      candidate_status AS candidateStatus,
      selected_asset_ids AS selectedAssetIds
    FROM local_event_candidates
    WHERE candidate_status IN ('pending', 'clustering')
    ORDER BY timestamp DESC
  `);
}

export async function updateLocalEventCandidateSelection(
  db: SQLite.SQLiteDatabase,
  localEventId: string,
  selectedAssetIds: string[],
  candidateStatus: 'scored' | 'ready' = 'scored',
): Promise<void> {
  await db.runAsync(
    `
      UPDATE local_event_candidates
      SET
        selected_asset_ids = ?,
        candidate_status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE local_event_id = ?
    `,
    [JSON.stringify(selectedAssetIds), candidateStatus, localEventId],
  );
}
