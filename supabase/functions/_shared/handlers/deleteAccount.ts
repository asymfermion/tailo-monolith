import { isDeleteAccountResponse } from '../../../../packages/shared/src/contracts/delete-account.ts';
import { getServiceRoleClient, jsonResponse } from '../http.ts';
import { lookupCallerAppUserId } from '../resolveAppUser.ts';
import type { ApiHandler } from './types.ts';

const EVENT_MEDIA_BUCKET = 'event-media';

async function collectEventMediaPaths(
  adminClient: ReturnType<typeof getServiceRoleClient>,
  appUserId: string,
): Promise<string[]> {
  const { data: events, error: eventsError } = await adminClient
    .from('events')
    .select('event_id')
    .eq('app_user_id', appUserId);

  if (eventsError) {
    throw new Error(eventsError.message);
  }

  const eventIds = (events ?? []).map((row) => row.event_id);

  if (eventIds.length === 0) {
    return [];
  }

  const { data: mediaRows, error: mediaError } = await adminClient
    .from('event_media')
    .select('storage_path, thumbnail_path')
    .in('event_id', eventIds);

  if (mediaError) {
    throw new Error(mediaError.message);
  }

  const paths = new Set<string>();

  for (const row of mediaRows ?? []) {
    if (row.storage_path) {
      paths.add(row.storage_path);
    }

    if (row.thumbnail_path) {
      paths.add(row.thumbnail_path);
    }
  }

  return [...paths];
}

export const handleDeleteAccount: ApiHandler = async ({ user, log }) => {
  const adminClient = getServiceRoleClient();
  const appUser = await lookupCallerAppUserId(user, adminClient);

  if (appUser) {
    try {
      const storagePaths = await collectEventMediaPaths(
        adminClient,
        appUser.appUserId,
      );

      if (storagePaths.length > 0) {
        const { error: storageError } = await adminClient.storage
          .from(EVENT_MEDIA_BUCKET)
          .remove(storagePaths);

        if (storageError) {
          log.warn('delete_account_storage_error', {
            appUserId: appUser.appUserId,
            message: storageError.message,
          });
        }
      }

      const { error: deleteAppUserError } = await adminClient
        .from('app_users')
        .delete()
        .eq('app_user_id', appUser.appUserId);

      if (deleteAppUserError) {
        return jsonResponse({ error: deleteAppUserError.message }, 500);
      }

      log.info('delete_account_app_user_ok', {
        appUserId: appUser.appUserId,
        storageObjects: storagePaths.length,
      });
    } catch (error) {
      return jsonResponse(
        {
          error:
            error instanceof Error
              ? error.message
              : 'Could not delete account data.',
        },
        500,
      );
    }
  } else {
    log.info('delete_account_no_app_user', { authUserId: user.id });
  }

  const { error: deleteAuthUserError } =
    await adminClient.auth.admin.deleteUser(user.id);

  if (deleteAuthUserError) {
    return jsonResponse({ error: deleteAuthUserError.message }, 500);
  }

  log.info('delete_account_auth_user_ok', { authUserId: user.id });

  const responseBody = {
    deleted: true,
    app_user_id: appUser?.appUserId ?? null,
    auth_user_id: user.id,
  };

  if (!isDeleteAccountResponse(responseBody)) {
    return jsonResponse({ error: 'Invalid delete response.' }, 500);
  }

  return jsonResponse(responseBody);
};
