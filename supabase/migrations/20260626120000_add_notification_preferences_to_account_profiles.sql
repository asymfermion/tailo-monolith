alter table account_profiles
  add column if not exists notification_preferences text;
