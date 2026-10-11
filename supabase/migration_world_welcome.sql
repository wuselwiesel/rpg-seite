-- Willkommenstext der Welt (Regeln, Orte, offene Rollen), von Besitzer:in/Admins gepflegt
alter table public.worlds add column if not exists welcome_html text;
alter table public.worlds drop constraint if exists worlds_welcome_len;
alter table public.worlds add constraint worlds_welcome_len check (welcome_html is null or char_length(welcome_html) <= 30000);
