import { createApiRouter } from '../_shared/apiRouter.ts';
import { handleGetPet } from '../_shared/handlers/getPet.ts';
import { handleUpsertPet } from '../_shared/handlers/upsertPet.ts';
import { handleUploadPetPortrait } from '../_shared/handlers/uploadPetPortrait.ts';
import { servePostFunction } from '../_shared/serve.ts';

servePostFunction(
  'api-pet',
  createApiRouter({
    'upsert-pet': handleUpsertPet,
    'get-pet': handleGetPet,
    'upload-portrait': handleUploadPetPortrait,
  }),
);
