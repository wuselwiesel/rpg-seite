-- Der alte Constraint erlaubte nur die ursprünglichen 6 Schriftarten per fester Liste und brach
-- beim Speichern, sobald jemand eine der seither hinzugefügten Schriftarten wählte. Jetzt wird nur
-- noch das allgemeine Format geprüft (Buchstaben/Zahlen, siehe PROFILE_FONTS-ids in profile-theme.ts),
-- damit neue Schriftarten künftig ohne DB-Migration nutzbar sind.
alter table public.characters drop constraint if exists characters_theme_format;
alter table public.characters add constraint characters_theme_format check (
  (theme_accent is null or theme_accent ~ '^#[0-9a-fA-F]{6}$')
  and (theme_bg is null or theme_bg ~ '^#[0-9a-fA-F]{6}$')
  and (theme_font is null or theme_font ~ '^[a-zA-Z0-9]{1,40}$')
);

notify pgrst, 'reload schema';
