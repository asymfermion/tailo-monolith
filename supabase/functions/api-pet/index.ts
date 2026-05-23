import { createApiRouter } from '../_shared/apiRouter.ts';
import { handleUpsertPet } from '../_shared/handlers/upsertPet.ts';
import { servePostFunction } from '../_shared/serve.ts';

servePostFunction(
  'api-pet',
  createApiRouter({
    'upsert-pet': handleUpsertPet,
  }),
);
