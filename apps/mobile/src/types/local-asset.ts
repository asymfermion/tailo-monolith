/** Camera-roll item tracked during local scan (maps to `local_assets`). */

export type MediaType = 'photo' | 'video';
export type DetectedPetType = 'dog' | 'cat';

export type AssetProcessingStatus =
  | 'pending'
  | 'processing'
  | 'processed'
  | 'failed';

export interface LocalAsset {
  localAssetId: string;
  uri: string;
  createdAt: string;
  width: number;
  height: number;
  mediaType: MediaType;
  processingStatus: AssetProcessingStatus;
  processedAt: string | null;
  isPetCandidate: boolean;
  petConfidence: number | null;
  detectedPetType: DetectedPetType | null;
}

/** Fields required when inserting a newly scanned asset. */
export type NewLocalAsset = Pick<
  LocalAsset,
  'localAssetId' | 'uri' | 'createdAt' | 'width' | 'height' | 'mediaType'
> &
  Partial<
    Pick<
      LocalAsset,
      | 'processingStatus'
      | 'processedAt'
      | 'isPetCandidate'
      | 'petConfidence'
      | 'detectedPetType'
    >
  > & { detectedBreed?: string | null };
