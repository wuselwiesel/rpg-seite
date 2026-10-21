// Stabile Namensfarbe je Figur für Gruppenchats: gleicher Name, gleiche Farbe, in Hell und Dunkel lesbar.
export function senderHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

export const SENDER_COLOR_CLASS = "text-[hsl(var(--sc)_55%_32%)] dark:text-[hsl(var(--sc)_70%_76%)]";

export function senderColorStyle(id: string | null | undefined): React.CSSProperties | undefined {
  return id ? ({ "--sc": senderHue(id) } as React.CSSProperties) : undefined;
}
