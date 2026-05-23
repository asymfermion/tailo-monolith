import type { User } from '@supabase/supabase-js';

import type { FunctionLogger } from '../logger.ts';

export type ApiHandlerContext = {
  user: User;
  log: FunctionLogger;
  payload: unknown;
};

export type ApiHandler = (ctx: ApiHandlerContext) => Promise<Response>;
