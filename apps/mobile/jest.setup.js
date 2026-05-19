/**
 * Jest runs in Node (GitHub Actions uses Node 20), which has no native WebSocket.
 * @supabase/supabase-js initializes Realtime on createClient() and needs one.
 * React Native provides WebSocket at runtime — this file is test-only.
 */
if (typeof WebSocket === 'undefined') {
  global.WebSocket = require('ws');
}
