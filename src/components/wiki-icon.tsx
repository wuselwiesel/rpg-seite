"use client";

import {
  Anchor, Axe, Baby, Bell, Bird, Biohazard, BookOpen, Bone, Brain, Bug, CalendarDays, Castle, Cat, Church, Cloud, Coins, Compass, Crown, Dog, Drama, Droplets, Eye, Feather,
  FileText, Fish, Flag, Flame, FlaskConical, Flower, Footprints, Gavel, Gem, Ghost, Gift, Hammer, Hand, Handshake, Heart, HeartPulse, Hourglass, House, Key, Landmark, Languages,
  Leaf, Lock, Map, MapPin, Moon, Mountain, Music, Orbit, Palette, PartyPopper, PawPrint, Pickaxe, Rocket, Scale, Scroll, ScrollText, Shield, Ship, Shirt, Skull, Snowflake, Sparkles,
  Star, Sun, Sword, Swords, Telescope, Tent, TreePine, Trees, User, Users, Utensils, Waves, WandSparkles, Wheat, Wind, Wine, Zap, type LucideIcon,
} from "lucide-react";

// Auswahl an Symbolen für Seitenarten und Ordner im Wiki. Der Name wird als Text gespeichert (wie ein Emoji), Reihenfolge = Reihenfolge im Auswahlfenster.
export const WIKI_ICON_LIBRARY: { name: string; label: string; Icon: LucideIcon }[] = [
  { name: "map-pin", label: "Ort", Icon: MapPin },
  { name: "map", label: "Karte", Icon: Map },
  { name: "compass", label: "Kompass", Icon: Compass },
  { name: "mountain", label: "Berg", Icon: Mountain },
  { name: "trees", label: "Wald", Icon: Trees },
  { name: "tree-pine", label: "Tanne", Icon: TreePine },
  { name: "leaf", label: "Blatt", Icon: Leaf },
  { name: "flower", label: "Blume", Icon: Flower },
  { name: "wheat", label: "Getreide", Icon: Wheat },
  { name: "waves", label: "Meer", Icon: Waves },
  { name: "droplets", label: "Wasser", Icon: Droplets },
  { name: "flame", label: "Feuer", Icon: Flame },
  { name: "wind", label: "Wind", Icon: Wind },
  { name: "snowflake", label: "Eis", Icon: Snowflake },
  { name: "sun", label: "Sonne", Icon: Sun },
  { name: "moon", label: "Mond", Icon: Moon },
  { name: "star", label: "Stern", Icon: Star },
  { name: "cloud", label: "Wolke", Icon: Cloud },
  { name: "zap", label: "Blitz", Icon: Zap },
  { name: "castle", label: "Burg", Icon: Castle },
  { name: "landmark", label: "Gebäude", Icon: Landmark },
  { name: "church", label: "Kirche", Icon: Church },
  { name: "house", label: "Haus", Icon: House },
  { name: "tent", label: "Zelt", Icon: Tent },
  { name: "ship", label: "Schiff", Icon: Ship },
  { name: "anchor", label: "Anker", Icon: Anchor },
  { name: "crown", label: "Krone", Icon: Crown },
  { name: "shield", label: "Schild", Icon: Shield },
  { name: "sword", label: "Schwert", Icon: Sword },
  { name: "swords", label: "Schwerter", Icon: Swords },
  { name: "axe", label: "Axt", Icon: Axe },
  { name: "flag", label: "Flagge", Icon: Flag },
  { name: "gavel", label: "Gesetz", Icon: Gavel },
  { name: "scale", label: "Waage", Icon: Scale },
  { name: "coins", label: "Münzen", Icon: Coins },
  { name: "key", label: "Schlüssel", Icon: Key },
  { name: "lock", label: "Schloss", Icon: Lock },
  { name: "user", label: "Person", Icon: User },
  { name: "users", label: "Gruppe", Icon: Users },
  { name: "baby", label: "Kind", Icon: Baby },
  { name: "handshake", label: "Bündnis", Icon: Handshake },
  { name: "hand", label: "Hand", Icon: Hand },
  { name: "eye", label: "Auge", Icon: Eye },
  { name: "brain", label: "Geist", Icon: Brain },
  { name: "heart", label: "Herz", Icon: Heart },
  { name: "heart-pulse", label: "Krankheit", Icon: HeartPulse },
  { name: "skull", label: "Totenkopf", Icon: Skull },
  { name: "bone", label: "Knochen", Icon: Bone },
  { name: "ghost", label: "Geist (Gespenst)", Icon: Ghost },
  { name: "paw-print", label: "Spuren", Icon: PawPrint },
  { name: "footprints", label: "Fußspuren", Icon: Footprints },
  { name: "cat", label: "Katze", Icon: Cat },
  { name: "dog", label: "Hund", Icon: Dog },
  { name: "bird", label: "Vogel", Icon: Bird },
  { name: "fish", label: "Fisch", Icon: Fish },
  { name: "bug", label: "Insekt", Icon: Bug },
  { name: "wand-sparkles", label: "Zauberstab", Icon: WandSparkles },
  { name: "sparkles", label: "Funkeln", Icon: Sparkles },
  { name: "gem", label: "Edelstein", Icon: Gem },
  { name: "flask-conical", label: "Trank", Icon: FlaskConical },
  { name: "biohazard", label: "Gift", Icon: Biohazard },
  { name: "hourglass", label: "Sanduhr", Icon: Hourglass },
  { name: "telescope", label: "Fernrohr", Icon: Telescope },
  { name: "orbit", label: "Sterne", Icon: Orbit },
  { name: "book-open", label: "Buch", Icon: BookOpen },
  { name: "scroll-text", label: "Schriftrolle", Icon: ScrollText },
  { name: "scroll", label: "Pergament", Icon: Scroll },
  { name: "feather", label: "Feder", Icon: Feather },
  { name: "languages", label: "Sprache", Icon: Languages },
  { name: "music", label: "Musik", Icon: Music },
  { name: "drama", label: "Theater", Icon: Drama },
  { name: "palette", label: "Kunst", Icon: Palette },
  { name: "party-popper", label: "Fest", Icon: PartyPopper },
  { name: "gift", label: "Geschenk", Icon: Gift },
  { name: "wine", label: "Wein", Icon: Wine },
  { name: "utensils", label: "Essen", Icon: Utensils },
  { name: "shirt", label: "Kleidung", Icon: Shirt },
  { name: "hammer", label: "Hammer", Icon: Hammer },
  { name: "pickaxe", label: "Spitzhacke", Icon: Pickaxe },
  { name: "rocket", label: "Rakete", Icon: Rocket },
  { name: "bell", label: "Glocke", Icon: Bell },
  { name: "calendar-days", label: "Datum", Icon: CalendarDays },
  { name: "file-text", label: "Seite", Icon: FileText },
];

const BY_NAME = new globalThis.Map(WIKI_ICON_LIBRARY.map((i) => [i.name, i.Icon]));

// Ist der gespeicherte Text ein Symbol der Bibliothek (sonst ein Emoji oder ein eigenes :emoji:)?
export function isWikiIcon(name: string | null | undefined): boolean {
  return Boolean(name && BY_NAME.has(name));
}

export function WikiIcon({ name, ...props }: { name: string } & React.ComponentProps<LucideIcon>) {
  // Nachschlagen in einer festen Tabelle, keine neue Komponente
  const Icon = BY_NAME.get(name);
  // eslint-disable-next-line react-hooks/static-components
  return Icon ? <Icon {...props} /> : null;
}
