-- Cloud pet validation result on events (process-ai-job / Vertex)

alter table public.events
  add column if not exists pet_validation_status text not null default 'pending'
    check (pet_validation_status in ('pending', 'valid', 'rejected'));

create index if not exists events_pet_validation_status_idx
  on public.events (pet_validation_status)
  where pet_validation_status = 'rejected';
