/** Upload pipeline limits (mobile + Edge Functions). */
export const UPLOAD_MAX_ASSETS_PER_EVENT = 5;
export const UPLOAD_MIN_ASSETS_PER_EVENT = 1;
export const UPLOAD_MAX_ORIGINAL_WIDTH_PX = 1280;
export const UPLOAD_MAX_THUMB_WIDTH_PX = 400;
export const UPLOAD_ORIGINAL_JPEG_QUALITY = 0.82;
export const UPLOAD_THUMB_JPEG_QUALITY = 0.75;
export const UPLOAD_MAX_ORIGINAL_BYTES = 3 * 1024 * 1024;
export const UPLOAD_TARGET_THUMB_BYTES = 200 * 1024;
export const UPLOAD_SIGNED_URL_TTL_SECONDS = 15 * 60;
export const UPLOAD_MAX_RETRIES = 3;
export const UPLOAD_RETRY_BACKOFF_MS = [60_000, 300_000, 900_000] as const;
