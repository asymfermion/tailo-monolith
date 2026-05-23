-- Pet birthday (optional calendar date)

alter table public.pets
  add column if not exists birthday date;

comment on column public.pets.birthday is 'Optional pet birthday (calendar date, no time zone).';
