import { PdfEmbeds } from "@/components/pdf-embeds";
import { ShareWikiButton } from "../share-wiki-button";
import { EmojiHtml, EmojiText } from "@/components/custom-emoji-provider";
import { WikiGallery } from "@/components/wiki-gallery";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Clock, MapPin, Network, Pencil, Plus, UserRound, Lock, LockOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getWorldRights } from "@/lib/world-rights";
import { canEditWikiPage } from "@/lib/world-permissions";
import { sanitizePostHtml } from "@/lib/sanitize";
import { autolinkHtml } from "@/lib/autolink";
import { escapeHtml, linkCharacterMentions } from "@/lib/character-links";
import { getCharacterWikiRows, getWorldCharacterTerms } from "@/lib/wiki-characters";
import { getCharacterGalleryUrls, getCharacterStory, getHouseMembers, getRelationCards } from "@/lib/character-wiki-data";
import { CharacterTimeline, PersonCards, RecentScenes } from "@/components/character-wiki-sections";
import { getWikiTerms } from "@/lib/wiki-terms";
import { getMapsForPage } from "@/lib/wiki-map-data";
import { getWikiCalendar } from "@/lib/wiki-calendar-data";
import { datesFromRow, formatLabeled } from "@/lib/wiki-calendar";
import { getWikiFavoriteIds, getWikiFolders, getWikiLinkPages, getWikiPageRows, getWikiTypes } from "@/lib/wiki-data";
import { buildWikiTree, folderPath, pageAncestors, type TreePage } from "@/lib/wiki-tree";
import { findBacklinks } from "@/lib/wiki-links";
import { addHeadingIds } from "@/lib/wiki-html";
import { formatDateTime } from "@/lib/format";
import type { WikiPage } from "@/lib/types";
import { stripHtml } from "@/lib/strip-html";
import { WikiTile } from "@/components/wiki-tile";
import { WikiTypeBadge } from "@/components/wiki-type-icon";
import { usesPortraitImage } from "@/lib/wiki-types";
import { PageCard } from "../wiki-cards";
import { WikiCrumbs } from "../wiki-crumbs";
import { DeleteWikiPageButton } from "./delete-wiki-page-button";
import { FavoriteButton } from "./favorite-button";
import { TargetNotesButton } from "@/components/target-notes-button";
import { noteCountForTarget } from "@/lib/notes-data";
import { PublishButton } from "./publish-button";
import { RevealSecretButton } from "./reveal-secret-button";

export default async function WikiPageDetailPage({ params }: PageProps<"/wiki/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: page } = await supabase.from("wiki_pages").select("*").eq("id", id).maybeSingle<WikiPage>();
  if (!page) notFound();

  const rights = await getWorldRights(page.world_id, user.id);
  const canEdit = canEditWikiPage(rights, page.created_by, user.id);
  const canDelete = rights.isAdmin || (page.created_by === user.id && canEdit);

  const [wikiTerms, folders, pageRows, linkPages, favoriteIds, onMaps, characters, calendar, wikiTypeRows] = await Promise.all([
    getWikiTerms(page.world_id),
    getWikiFolders(page.world_id),
    getWikiPageRows(page.world_id),
    getWikiLinkPages(page.world_id),
    getWikiFavoriteIds(user.id),
    getMapsForPage(page.id),
    getWorldCharacterTerms(page.world_id),
    getWikiCalendar(page.world_id),
    getWikiTypes(page.world_id),
  ]);
  const pageDates = datesFromRow(page);
  // Wer die Seite zuletzt geändert hat (Konto-Name)
  const lastEditorId = page.updated_by ?? null;
  const { data: editor } = lastEditorId ? await supabase.from("profiles").select("username, nickname").eq("id", lastEditorId).maybeSingle<{ username: string; nickname: string | null }>() : { data: null };
  const editorName = editor ? editor.nickname || editor.username : null;

  const tree = buildWikiTree(folders, pageRows);
  const findNode = (list: TreePage[]): TreePage | null => {
    for (const p of list) {
      if (p.id === page.id) return p;
      const hit = findNode(p.children);
      if (hit) return hit;
    }
    return null;
  };
  const allRoots: TreePage[] = [...tree.loose];
  const collect = (list: typeof tree.folders) => {
    for (const f of list) {
      allRoots.push(...f.pages);
      collect(f.children);
    }
  };
  collect(tree.folders);
  const node = findNode(allRoots);

  const folderTrail = folderPath(folders, page.folder_id ?? null);
  const pageTrail = pageAncestors(pageRows, page.id);
  // Szenen, die an diesem Ort spielen (Ortsangabe der Szene = Titel der Seite)
  const { data: placeScenes } = await supabase
    .from("story_posts")
    .select("id, title, created_at")
    .eq("world_id", page.world_id)
    .ilike("location", page.title.replace(/[\\%_]/g, (m) => `\\${m}`))
    .order("created_at", { ascending: false })
    .limit(12)
    .returns<{ id: string; title: string; created_at: string }[]>();
  const backlinks = findBacklinks(linkPages, page.id)
    .map((bid) => pageRows.find((p) => p.id === bid))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  // Erwähnungen (@) werden zuerst zu Links, damit der Name darin nicht noch einmal automatisch verlinkt wird.
  const withMentions = linkCharacterMentions(sanitizePostHtml(page.content), new Map(characters.map((c) => [c.id, c])));
  const linked = autolinkHtml(withMentions, { wiki: wikiTerms, characters, excludeWikiId: page.id });
  // Steckbrief-Texte: Klartext, aber [[Seite]], Alternativnamen und Charaktere werden zu Links.
  const fieldHtml = (text: string) => autolinkHtml(escapeHtml(text), { wiki: wikiTerms, characters, excludeWikiId: page.id });
  const { html, headings } = addHeadingIds(linked);
  // Wiki-Seite einer Figur: die öffentlichen ChaBo-Angaben stehen live im Steckbrief, darunter die eigenen Felder der Seite
  // (gleiche Bezeichnung = die eigene Angabe gilt).
  const chabo = page.character_id ? await getCharacterWikiRows(page.character_id) : { rows: [], hasSheet: false, enabled: false, portraitUrl: null, avatarUrl: null };
  // Geheime Felder: die Datenbank liefert sie nur der Besitzer:in der Figur und den Figuren, für die sie freigegeben sind
  const ownsPage = page.character_id ? (await supabase.rpc("owns_wiki_character_page", { p_page: page.id })).data === true : false;
  const { data: secretRows } = page.character_id
    ? await supabase.from("wiki_page_secret_items").select("id, icon, title, text, shared_with").eq("page_id", page.id).order("position").returns<{ id: string; icon: string; title: string; text: string; shared_with: string[] }[]>()
    : { data: null };
  const secretFields = secretRows ?? [];
  const nameOfCharacter = (id: string) => characters.find((c) => c.id === id)?.name ?? "?";
  const ownFields = page.fields ?? [];
  const ownTitles = new Set(ownFields.map((f) => f.title.trim().toLowerCase()));
  const fields = [...chabo.rows.filter((r) => !ownTitles.has(r.title.trim().toLowerCase())), ...ownFields];
  // Figuren-Seite (Option der Welt an): Titelbild, Galerie, Beziehungen und Szenen kommen live aus dem ChaBo und dem Beziehungsnetz,
  // damit sie nur einmal gepflegt werden.
  const { data: worldFlag } = await supabase.from("worlds").select("character_wiki_enabled").eq("id", page.world_id).maybeSingle<{ character_wiki_enabled: boolean | null }>();
  const figureOn = worldFlag?.character_wiki_enabled === true;
  const isCharPage = !!page.character_id && chabo.enabled;
  const [charGallery, relations, story] = isCharPage
    ? await Promise.all([
        getCharacterGalleryUrls(page.character_id!),
        getRelationCards(page.character_id!),
        getCharacterStory({ id: page.character_id!, world_id: page.world_id }, ownsPage),
      ])
    : [[] as string[], [], { recent: [], knows: [], timeline: [], total: 0 }];
  const houseMembers = figureOn && !page.character_id && page.page_type === "organisation" ? await getHouseMembers(page.world_id, page.title) : [];
  const coverImage = isCharPage ? (chabo.portraitUrl ?? chabo.avatarUrl ?? page.cover_image_url) : page.cover_image_url;
  const gallery = [...new Set([...(page.gallery ?? []), ...charGallery])];
  const isEmpty = stripHtml(page.content ?? "").trim() === "" && !/<img\b/i.test(page.content ?? "");
  // Initiale nur, wenn der erste Absatz mit einem Buchstaben beginnt und lang genug ist, damit sie schön umflossen wird.
  const firstPara = html.match(/^\s*<p[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? "";
  const dropCap = /^[A-Za-zÄÖÜäöüß]/.test(stripHtml(firstPara).trim()) && stripHtml(firstPara).length >= 150;
  const hasSide = fields.length > 0 || secretFields.length > 0 || headings.length >= 3;
  const crumbs = [
    ...folderTrail.map((f) => ({ href: `/wiki/ordner/${f.id}`, label: f.name })),
    ...pageTrail.map((p) => ({ href: `/wiki/${p.id}`, label: p.title })),
  ];
  const portrait = usesPortraitImage(page.page_type, wikiTypeRows);
  const sectionHead = "mb-4 flex items-baseline gap-2 font-serif text-2xl text-fg";

  return (
    <article className="flex flex-col gap-10">
      <header className="flex flex-col gap-5">
        <WikiCrumbs crumbs={crumbs} />

        {page.is_draft && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-accent/60 bg-accent/5 px-4 py-3 text-sm text-fg-soft">
            <span>
              <strong className="font-semibold text-fg">Entwurf.</strong> Nur du siehst diese Seite, bis du sie veröffentlichst.
            </span>
            {page.created_by === user.id && <PublishButton wikiPageId={page.id} />}
          </div>
        )}

        <div className="flex items-start gap-4 @xl:gap-5">
          {page.icon_url ? (
            // Icon: durchsichtig, ohne Rahmen und Zuschnitt
            // eslint-disable-next-line @next/next/no-img-element
            <img loading="lazy" decoding="async" src={page.icon_url} alt={page.title} className="h-24 w-24 shrink-0 object-contain @xl:h-32 @xl:w-32 @4xl:h-40 @4xl:w-40" />
          ) : coverImage ? (
            // Titelbild in normalem Format neben dem Namen (Person: Hochformat, sonst 4:3), nie als breiter Streifen.
            // eslint-disable-next-line @next/next/no-img-element
            <img loading="lazy" decoding="async"
              src={coverImage}
              alt={page.title}
              className={`${portrait ? "aspect-[4/5]" : "aspect-[4/3]"} w-28 shrink-0 rounded-2xl bg-surface-2 object-cover shadow-sm @xl:w-40 @4xl:w-52`}
            />
          ) : (
            <WikiTile id={page.id} title={page.title} size="lg" />
          )}
          <div className="min-w-0 flex-1">
            {page.page_type && (
              <p className="mb-2">
                <WikiTypeBadge type={page.page_type} />
              </p>
            )}
            <h1 className="font-serif text-4xl leading-[1.05] text-fg [overflow-wrap:anywhere] @xl:text-5xl @4xl:text-6xl">{page.title}</h1>
            {page.lead && (
              <p className="mt-3 max-w-[56ch] font-serif text-xl italic leading-snug text-fg-soft @xl:text-2xl">
                <EmojiText text={page.lead} />
              </p>
            )}
          </div>
        </div>

        {pageDates.start && (
          <p>
            <Link
              href={`/wiki/zeitleiste#jahr-${pageDates.start.year}`}
              title="In der Zeitleiste ansehen"
              className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1 text-sm font-medium text-fg-soft transition hover:text-accent"
            >
              <Clock className="h-3.5 w-3.5" strokeWidth={2} />
              {formatLabeled(calendar, pageDates, { start: page.event_label, end: page.event_end_label })}
            </Link>
          </p>
        )}

        {(page.tags ?? []).length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
            {(page.tags ?? []).map((t) => (
              <li key={t}>
                <Link
                  href={`/wiki/suche?tag=${encodeURIComponent(t)}`}
                  className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-fg-soft transition hover:text-accent"
                >
                  #{t}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-y border-line py-2.5">
          <p className="text-xs text-muted">
            Zuletzt bearbeitet am {formatDateTime(page.updated_at)}
            {editorName && <> von {editorName}</>}
            {" · "}
            <Link href={`/wiki/${page.id}/verlauf`} className="underline underline-offset-2 transition hover:text-fg">
              Verlauf
            </Link>
          </p>
          <div className="flex flex-wrap items-center gap-1">
            <FavoriteButton wikiPageId={page.id} initial={favoriteIds.includes(page.id)} />
            <TargetNotesButton kind="wiki" targetId={page.id} targetLabel={page.title} count={await noteCountForTarget(supabase, user.id, "wiki", page.id)} showLabel className="px-3 py-1.5 text-sm" />
            <ShareWikiButton pageId={page.id} title={page.title} />
            {page.character_id && (
              <Link
                href={chabo.hasSheet ? `/characters/${page.character_id}/chabo` : `/characters/${page.character_id}`}
                title={chabo.hasSheet ? "Zum Charakterbogen" : "Zum Profil"}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-fg-soft transition hover:bg-surface-2 hover:text-fg"
              >
                <UserRound className="h-3.5 w-3.5" strokeWidth={2} />
                {chabo.hasSheet ? "ChaBo" : "Profil"}
              </Link>
            )}
            <Link
              href={`/wiki/graph?fokus=${page.id}`}
              title="Verbindungen dieser Seite im Graph ansehen"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-fg-soft transition hover:bg-surface-2 hover:text-fg"
            >
              <Network className="h-3.5 w-3.5" strokeWidth={2} />
              Graph
            </Link>
            {canEdit && (
              <Link
                href={`/wiki/${page.id}/edit`}
                className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5 text-sm font-medium text-fg-soft transition hover:text-fg"
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                Bearbeiten
              </Link>
            )}
            {canDelete && <DeleteWikiPageButton wikiPageId={page.id} hasSubpages={(node?.children.length ?? 0) > 0} backTo={page.folder_id ? `/wiki/ordner/${page.folder_id}` : "/wiki"} />}
          </div>
        </div>
      </header>

      <div className={hasSide ? "grid gap-10 @3xl:grid-cols-[minmax(0,1fr)_260px] @3xl:items-start" : ""}>
        {isEmpty ? (
          <div className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">
            Dieser Artikel hat noch keinen Text.{" "}
            {canEdit && (
              <Link href={`/wiki/${page.id}/edit`} className="text-accent underline underline-offset-2">
                Text ergänzen
              </Link>
            )}
          </div>
        ) : (
          <>
            <EmojiHtml className={`post-content wiki-prose min-w-0 ${dropCap ? "wiki-dropcap" : ""}`} html={html} />
            <PdfEmbeds />
          </>
        )}

        {hasSide && (
          <aside className="order-first flex flex-col gap-6 @3xl:sticky @3xl:top-4 @3xl:order-none">
            {fields.length > 0 && (
              <section aria-label="Steckbrief" className="overflow-hidden rounded-2xl border border-line bg-surface">
                <h2 className="border-b border-line bg-surface-2/60 px-4 py-2.5 font-serif text-lg text-fg">Steckbrief</h2>
                <dl className="grid gap-px bg-line grid-cols-2 @3xl:grid-cols-1">
                  {fields.map((f, i) => (
                    <div key={i} className="flex flex-col gap-0.5 bg-surface px-4 py-2.5 text-sm">
                      <dt className="flex items-center gap-1.5 text-xs text-muted">
                        {f.icon && <EmojiText text={f.icon} />}
                        {f.title}
                      </dt>
                      <dd className="min-w-0 break-words text-fg">
                        <EmojiHtml html={fieldHtml(f.text)} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
            {secretFields.length > 0 && (
              <section aria-label={ownsPage ? "Geheim" : "Mit dir geteilt"} className="overflow-hidden rounded-2xl border border-dashed border-accent/60 bg-surface">
                <h2 className="flex items-center gap-2 border-b border-line bg-surface-2/60 px-4 py-2.5 font-serif text-lg text-fg">
                  {ownsPage ? <Lock className="h-4 w-4" strokeWidth={2} /> : <LockOpen className="h-4 w-4" strokeWidth={2} />}
                  {ownsPage ? "Geheim" : "Mit dir geteilt"}
                </h2>
                <dl className="grid gap-px bg-line grid-cols-2 @3xl:grid-cols-1">
                  {secretFields.map((f) => (
                    <div key={f.id} className="flex flex-col gap-0.5 bg-surface px-4 py-2.5 text-sm">
                      <dt className="flex items-center gap-1.5 text-xs text-muted">
                        {f.icon && <EmojiText text={f.icon} />}
                        {f.title}
                        {ownsPage && (
                          <span className="ml-auto flex items-center gap-1">
                            <span className="text-[11px]">{f.shared_with.length === 0 ? "nur du" : `für ${f.shared_with.map(nameOfCharacter).join(", ")}`}</span>
                            <RevealSecretButton itemId={f.id} title={f.title} />
                          </span>
                        )}
                      </dt>
                      <dd className="min-w-0 break-words text-fg">
                        <EmojiHtml html={fieldHtml(f.text)} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
            {headings.length >= 3 && (
              <nav aria-label="Auf dieser Seite" className="hidden text-sm @3xl:block">
                <p className="mb-2 font-serif text-lg text-fg">Auf dieser Seite</p>
                <ol className="flex flex-col gap-1.5 border-l border-line pl-3">
                  {headings.map((h) => (
                    <li key={h.id} className={h.level === 3 ? "pl-3" : ""}>
                      <a href={`#${h.id}`} className="text-muted transition hover:text-accent">
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
          </aside>
        )}
      </div>

      {gallery.length > 0 && (
        <section aria-labelledby="bilder">
          <h2 id="bilder" className={sectionHead}>
            Bilder <span className="text-base text-muted">{gallery.length}</span>
          </h2>
          <WikiGallery urls={gallery} title={page.title} />
        </section>
      )}

      <PersonCards id="beziehungen" title="Beziehungen" people={relations} />
      <PersonCards id="kennt" title="Wer kennt wen" people={story.knows} />
      <RecentScenes scenes={story.recent} total={story.total} />
      <CharacterTimeline items={story.timeline} />
      <PersonCards id="mitglieder" title="Mitglieder" people={houseMembers} />

      {node && node.children.length > 0 && (
        <section aria-labelledby="unterseiten">
          <h2 id="unterseiten" className={sectionHead}>
            Unterseiten <span className="text-base text-muted">{node.children.length}</span>
            {rights.wikiCreate && (
              <Link href={`/wiki/new?parent=${page.id}`} className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 font-sans text-sm text-muted transition hover:bg-surface-2 hover:text-fg">
                <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                Neue Unterseite
              </Link>
            )}
          </h2>
          <ul className="grid grid-cols-1 gap-3 @3xl:grid-cols-2">
            {node.children.map((c) => (
              <li key={c.id}>
                <PageCard page={c} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {onMaps.length > 0 && (
        <section aria-labelledby="auf-karte">
          <h2 id="auf-karte" className={sectionHead}>
            Auf der Karte <span className="text-base text-muted">{onMaps.length}</span>
          </h2>
          <ul className="flex flex-wrap gap-2">
            {onMaps.map((m) => (
              <li key={m.pinId}>
                <Link
                  href={`/wiki/karten/${m.mapId}?pin=${m.pinId}`}
                  className="flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1 text-sm text-fg-soft transition hover:text-accent"
                >
                  <MapPin className="h-3.5 w-3.5" strokeWidth={2} />
                  {m.mapTitle}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {placeScenes && placeScenes.length > 0 && (
        <section aria-labelledby="szenen-hier">
          <h2 id="szenen-hier" className={sectionHead}>
            Szenen an diesem Ort <span className="text-base text-muted">{placeScenes.length}</span>
          </h2>
          <ul className="flex flex-col gap-1.5">
            {placeScenes.map((sc) => (
              <li key={sc.id}>
                <Link href={`/story/${sc.id}`} className="text-fg-soft transition hover:text-accent">
                  {sc.title}
                  <span className="ml-2 text-xs text-muted">{formatDateTime(sc.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {backlinks.length > 0 && (
        <section aria-labelledby="verlinkt">
          <h2 id="verlinkt" className={sectionHead}>
            Verlinkt von <span className="text-base text-muted">{backlinks.length}</span>
          </h2>
          <ul className="flex flex-wrap gap-2">
            {backlinks.map((p) => (
              <li key={p.id}>
                <Link href={`/wiki/${p.id}`} className="flex items-center gap-2 rounded-full bg-surface-2 py-1 pl-1 pr-3 text-sm text-fg-soft transition hover:text-accent">
                  <WikiTile id={p.id} title={p.title} cover={p.cover_image_url} icon={p.icon_url} size="sm" />
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
