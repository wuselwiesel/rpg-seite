-- Die alte Variante ohne Geheimnis gab jeder Person ohne Anmeldung die E-Mail-Adresse zu einem Benutzernamen.
-- Der Login nutzt nur noch get_email_for_username(text, text).
drop function if exists public.get_email_for_username(text);
