-- Enable scheduled HTTP invokes for process-ai-job sweep (B2.5.7).
-- Cron job itself is created via: npm run setup:ai-job-cron (requires service role in env).

create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create extension if not exists pg_net with schema extensions;

grant usage on schema net to postgres;
grant all privileges on all tables in schema net to postgres;
