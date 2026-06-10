import { createApiRouter } from '../_shared/apiRouter.ts';
import { handleCreateUploadUrls } from '../_shared/handlers/createUploadUrls.ts';
import { handleDeleteEvent } from '../_shared/handlers/deleteEvent.ts';
import { handleBootstrapTimeline } from '../_shared/handlers/bootstrapTimeline.ts';
import { handleGetEventUpdates } from '../_shared/handlers/getEventUpdates.ts';
import { handleSyncEvent } from '../_shared/handlers/syncEvent.ts';
import { handleSyncNotifications } from '../_shared/handlers/syncNotification.ts';
import { servePostFunction } from '../_shared/serve.ts';

servePostFunction(
  'api-events',
  createApiRouter({
    'create-upload-urls': handleCreateUploadUrls,
    'sync-event': handleSyncEvent,
    'get-event-updates': handleGetEventUpdates,
    'sync-notifications': handleSyncNotifications,
    'bootstrap-timeline': handleBootstrapTimeline,
    'delete-event': handleDeleteEvent,
  }),
);
