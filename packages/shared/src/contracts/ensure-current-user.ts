/** Success response from `api-auth` action `ensure-current-user` */
export type EnsureCurrentUserResponse = {
  app_user_id: string;
  user_id: string;
  created_app_user: boolean;
  created_supabase_identity: boolean;
  created_email_identity: boolean;
};

export function isEnsureCurrentUserResponse(
  value: unknown,
): value is EnsureCurrentUserResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return (
    typeof Reflect.get(value, 'app_user_id') === 'string' &&
    typeof Reflect.get(value, 'user_id') === 'string' &&
    typeof Reflect.get(value, 'created_app_user') === 'boolean' &&
    typeof Reflect.get(value, 'created_supabase_identity') === 'boolean' &&
    typeof Reflect.get(value, 'created_email_identity') === 'boolean'
  );
}
