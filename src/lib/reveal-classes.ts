// Aktions-Symbole der Szenen-Karte (`group/scene`): mit Maus erst beim Darüberfahren, am Handy erst nach Antippen der Karte.
export const SCENE_REVEAL =
  "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/scene:opacity-100 [@media(hover:hover)]:focus-within:opacity-100 [@media(hover:none)]:pointer-events-none [@media(hover:none)]:opacity-0 [@media(hover:none)]:group-data-[tapped]/scene:pointer-events-auto [@media(hover:none)]:group-data-[tapped]/scene:opacity-100";
