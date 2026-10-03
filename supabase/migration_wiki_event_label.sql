-- Bezeichnung zum Datum einer Wiki-Seite („Geboren“, „Gegründet“, „Gestorben“ …); eine für den Anfang, eine für das Ende des Zeitraums.
alter table public.wiki_pages add column if not exists event_label text;
alter table public.wiki_pages add column if not exists event_end_label text;
alter table public.wiki_pages drop constraint if exists wiki_pages_event_labels_len;
alter table public.wiki_pages add constraint wiki_pages_event_labels_len check (
  (event_label is null or char_length(event_label) <= 40) and (event_end_label is null or char_length(event_end_label) <= 40)
);
