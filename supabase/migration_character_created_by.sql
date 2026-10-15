-- Wer hat den Charakter ursprünglich angelegt? (bleibt auch nach einer Übergabe erhalten; Grundlage der Liste „Angelegt“)
alter table public.characters add column if not exists created_by uuid references public.profiles (id) on delete set null;
update public.characters set created_by = owner_id where created_by is null;
create index if not exists characters_created_by_idx on public.characters (created_by, world_id) where deleted_at is null;

create or replace function public.characters_set_created_by() returns trigger
language plpgsql as $$
begin
  if new.created_by is null then
    new.created_by := new.owner_id;
  end if;
  return new;
end $$;
drop trigger if exists characters_set_created_by_trg on public.characters;
create trigger characters_set_created_by_trg before insert on public.characters
  for each row execute function public.characters_set_created_by();

notify pgrst, 'reload schema';
