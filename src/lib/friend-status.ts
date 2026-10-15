// Wie steht es zwischen mir und einer anderen Person? (aus meinen Freundschafts-Zeilen)
export type FriendStatus = "none" | "friends" | "pending_out" | "pending_in";

type Row = { requester_id: string; addressee_id: string; status: "pending" | "accepted" };

export function friendStatusMap(rows: Row[], me: string): Map<string, FriendStatus> {
  const map = new Map<string, FriendStatus>();
  for (const r of rows) {
    const other = r.requester_id === me ? r.addressee_id : r.requester_id;
    map.set(other, r.status === "accepted" ? "friends" : r.requester_id === me ? "pending_out" : "pending_in");
  }
  return map;
}
