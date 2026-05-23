import { createApiRouter } from '../_shared/apiRouter.ts';
import { handleEnsureCurrentUser } from '../_shared/handlers/ensureCurrentUser.ts';
import { handleLinkAnonymousUser } from '../_shared/handlers/linkAnonymousUser.ts';
import { servePostFunction } from '../_shared/serve.ts';

servePostFunction(
  'api-auth',
  createApiRouter({
    'ensure-current-user': handleEnsureCurrentUser,
    'link-anonymous-user': handleLinkAnonymousUser,
  }),
);
