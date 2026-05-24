/** User-facing Edge Functions: POST /functions/v1/api-{domain} */

export const TAILO_API_AUTH_ACTIONS = [
  'ensure-current-user',
  'link-anonymous-user',
] as const;

export const TAILO_API_PET_ACTIONS = ['upsert-pet', 'get-pet'] as const;

export const TAILO_API_ACCOUNT_ACTIONS = [
  'upsert-account-profile',
  'get-account-profile',
] as const;

export const TAILO_API_EVENTS_ACTIONS = [
  'create-upload-urls',
  'sync-event',
  'get-event-updates',
  'bootstrap-timeline',
  'delete-event',
] as const;

export const TAILO_API_FUNCTIONS = [
  'api-auth',
  'api-pet',
  'api-account',
  'api-events',
] as const;

export type TailoApiAuthAction = (typeof TAILO_API_AUTH_ACTIONS)[number];
export type TailoApiPetAction = (typeof TAILO_API_PET_ACTIONS)[number];
export type TailoApiAccountAction = (typeof TAILO_API_ACCOUNT_ACTIONS)[number];
export type TailoApiEventsAction = (typeof TAILO_API_EVENTS_ACTIONS)[number];

export type TailoApiAction =
  | TailoApiAuthAction
  | TailoApiPetAction
  | TailoApiAccountAction
  | TailoApiEventsAction;

export type TailoApiFunction = (typeof TAILO_API_FUNCTIONS)[number];

export const TAILO_API_ACTIONS: readonly TailoApiAction[] = [
  ...TAILO_API_AUTH_ACTIONS,
  ...TAILO_API_PET_ACTIONS,
  ...TAILO_API_ACCOUNT_ACTIONS,
  ...TAILO_API_EVENTS_ACTIONS,
];

const ACTION_TO_FUNCTION: Record<TailoApiAction, TailoApiFunction> = {
  'ensure-current-user': 'api-auth',
  'link-anonymous-user': 'api-auth',
  'upsert-pet': 'api-pet',
  'get-pet': 'api-pet',
  'upsert-account-profile': 'api-account',
  'get-account-profile': 'api-account',
  'create-upload-urls': 'api-events',
  'sync-event': 'api-events',
  'get-event-updates': 'api-events',
  'bootstrap-timeline': 'api-events',
  'delete-event': 'api-events',
};

export function getTailoApiFunctionForAction(
  action: TailoApiAction,
): TailoApiFunction {
  return ACTION_TO_FUNCTION[action];
}

export function isTailoApiAction(value: string): value is TailoApiAction {
  return (TAILO_API_ACTIONS as readonly string[]).includes(value);
}

export type TailoApiRequest = {
  action: TailoApiAction;
  [key: string]: unknown;
};

export function parseTailoApiRequest(
  body: unknown,
  allowedActions: readonly string[] = TAILO_API_ACTIONS,
): { action: TailoApiAction; payload: Record<string, unknown> } | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const action = Reflect.get(body, 'action');

  if (
    typeof action !== 'string' ||
    !allowedActions.includes(action) ||
    !isTailoApiAction(action)
  ) {
    return null;
  }

  const payload: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body)) {
    if (key !== 'action') {
      payload[key] = value;
    }
  }

  return { action, payload };
}

export function buildTailoApiBody(
  action: TailoApiAction,
  payload: Record<string, unknown> = {},
): TailoApiRequest {
  return { action, ...payload };
}
