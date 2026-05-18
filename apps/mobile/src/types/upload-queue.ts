export type UploadQueueStatus = 'pending' | 'uploading' | 'done' | 'failed';

export interface UploadQueueItem {
  id: string;
  localEventId: string;
  localAssetId: string;
  status: UploadQueueStatus;
  retryCount: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NewUploadQueueItem = Pick<
  UploadQueueItem,
  'localEventId' | 'localAssetId'
> &
  Partial<Pick<UploadQueueItem, 'id' | 'status' | 'retryCount' | 'lastError'>>;
