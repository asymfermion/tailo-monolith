/** Success response from `api-account` action `delete-account`. */
export type DeleteAccountResponse = {
  deleted: true;
  app_user_id: string | null;
  auth_user_id: string;
};

export function isDeleteAccountResponse(
  value: unknown,
): value is DeleteAccountResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const appUserId = Reflect.get(value, 'app_user_id');

  return (
    Reflect.get(value, 'deleted') === true &&
    typeof Reflect.get(value, 'auth_user_id') === 'string' &&
    (appUserId === null || typeof appUserId === 'string')
  );
}
