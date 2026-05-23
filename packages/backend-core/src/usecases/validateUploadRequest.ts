import {
  UPLOAD_MAX_ASSETS_PER_EVENT,
  UPLOAD_MIN_ASSETS_PER_EVENT,
} from '@tailo/shared';

export type UploadRequestAsset = {
  sourceLocalAssetId: string;
};

export type ValidateUploadRequestInput = {
  callerAppUserId: string;
  petId: string;
  sourceLocalEventId: string;
  assets: UploadRequestAsset[];
  petOwnerAppUserId: string | null;
};

export type ValidateUploadRequestSuccess = {
  ok: true;
};

export type ValidateUploadRequestFailure = {
  ok: false;
  code: 'invalid_input' | 'forbidden';
  message: string;
};

export type ValidateUploadRequestResult =
  | ValidateUploadRequestSuccess
  | ValidateUploadRequestFailure;

export function validateUploadRequest(
  input: ValidateUploadRequestInput,
): ValidateUploadRequestResult {
  if (!input.petId.trim()) {
    return {
      ok: false,
      code: 'invalid_input',
      message: 'pet_id is required.',
    };
  }

  if (!input.sourceLocalEventId.trim()) {
    return {
      ok: false,
      code: 'invalid_input',
      message: 'source_local_event_id is required.',
    };
  }

  if (
    input.assets.length < UPLOAD_MIN_ASSETS_PER_EVENT ||
    input.assets.length > UPLOAD_MAX_ASSETS_PER_EVENT
  ) {
    return {
      ok: false,
      code: 'invalid_input',
      message: `Upload batch must include ${UPLOAD_MIN_ASSETS_PER_EVENT}–${UPLOAD_MAX_ASSETS_PER_EVENT} assets.`,
    };
  }

  const seenAssetIds = new Set<string>();

  for (const asset of input.assets) {
    const sourceLocalAssetId = asset.sourceLocalAssetId.trim();

    if (!sourceLocalAssetId) {
      return {
        ok: false,
        code: 'invalid_input',
        message: 'Each asset must include source_local_asset_id.',
      };
    }

    if (seenAssetIds.has(sourceLocalAssetId)) {
      return {
        ok: false,
        code: 'invalid_input',
        message: 'Duplicate source_local_asset_id in request.',
      };
    }

    seenAssetIds.add(sourceLocalAssetId);
  }

  if (!input.petOwnerAppUserId) {
    return {
      ok: false,
      code: 'forbidden',
      message: 'Pet not found for this account.',
    };
  }

  if (input.petOwnerAppUserId !== input.callerAppUserId) {
    return {
      ok: false,
      code: 'forbidden',
      message: 'Pet does not belong to this account.',
    };
  }

  return { ok: true };
}
