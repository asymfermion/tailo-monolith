/** Per-asset scores used for best-image selection (maps to `local_media_scores`). */

export interface LocalMediaScore {
  localAssetId: string;
  localEventId: string;
  sharpness: number;
  brightness: number;
  subjectVisibility: number;
  uniqueness: number;
  /** Combined ranking score (higher is better). */
  overallScore: number;
  isPrimary: boolean;
}

export type NewLocalMediaScore = Omit<LocalMediaScore, 'isPrimary'> &
  Partial<Pick<LocalMediaScore, 'isPrimary'>>;
