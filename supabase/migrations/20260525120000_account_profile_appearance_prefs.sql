-- Account profile appearance preferences (theme + font style).

alter table public.account_profiles
  add column if not exists preferred_theme text,
  add column if not exists preferred_font_style text;

alter table public.account_profiles
  drop constraint if exists account_profiles_preferred_theme_check;

alter table public.account_profiles
  add constraint account_profiles_preferred_theme_check
  check (preferred_theme is null or preferred_theme in ('light', 'dark'));

alter table public.account_profiles
  drop constraint if exists account_profiles_preferred_font_style_check;

alter table public.account_profiles
  add constraint account_profiles_preferred_font_style_check
  check (
    preferred_font_style is null
    or preferred_font_style in ('system', 'serif', 'rounded', 'modern', 'elegant')
  );
