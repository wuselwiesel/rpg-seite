// Text hinter dem Namen einer Benachrichtigung; bei gebündelten ("X und 4 weitere ...") steht das Verb im Plural.
export function notificationTail(actorCount: number | undefined, message: string): string {
  if (!actorCount || actorCount < 2) return ` ${message}`;
  const others = actorCount - 1;
  const plural = message.replace(/^hat /, "haben ").replace(/^gefällt /, "gefallen ");
  return ` und ${others} ${others === 1 ? "weitere Person" : "weitere"} ${plural}`;
}

export function notificationText(actorName: string | null, actorCount: number | undefined, message: string): string {
  return `${actorName ?? "Jemand"}${notificationTail(actorCount, message)}`;
}
