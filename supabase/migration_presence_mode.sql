-- Online-Status pro Account: „online“ = andere sehen dich, solange die App offen ist; „offline“ = du erscheinst für andere offline (manuell).
alter table public.profiles add column if not exists presence_mode text not null default 'online';
alter table public.profiles drop constraint if exists profiles_presence_mode_check;
alter table public.profiles add constraint profiles_presence_mode_check check (presence_mode in ('online', 'offline'));
