import { createApiRouter } from '../_shared/apiRouter.ts';
import { handleGetAccountProfile } from '../_shared/handlers/getAccountProfile.ts';
import { handleUpsertAccountProfile } from '../_shared/handlers/upsertAccountProfile.ts';
import { servePostFunction } from '../_shared/serve.ts';

servePostFunction(
  'api-account',
  createApiRouter({
    'upsert-account-profile': handleUpsertAccountProfile,
    'get-account-profile': handleGetAccountProfile,
  }),
);
