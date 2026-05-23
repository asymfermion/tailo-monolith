/** Payload for `api-auth` action `link-anonymous-user` */
export type LinkAnonymousUserRequest = {
  anonymous_user_id: string;
};

/** Success response from link-anonymous-user */
export type LinkAnonymousUserResponse = {
  user_id: string;
  app_user_id: string;
  created: boolean;
};

export function parseLinkAnonymousUserRequest(
  body: unknown,
): LinkAnonymousUserRequest | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const anonymousUserId = Reflect.get(body, 'anonymous_user_id');

  if (typeof anonymousUserId !== 'string' || anonymousUserId.trim() === '') {
    return null;
  }

  return { anonymous_user_id: anonymousUserId.trim() };
}

export function isLinkAnonymousUserResponse(
  value: unknown,
): value is LinkAnonymousUserResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return (
    typeof Reflect.get(value, 'user_id') === 'string' &&
    typeof Reflect.get(value, 'app_user_id') === 'string' &&
    typeof Reflect.get(value, 'created') === 'boolean'
  );
}
