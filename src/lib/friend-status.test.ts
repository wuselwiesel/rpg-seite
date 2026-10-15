import { describe, expect, it } from "vitest";
import { friendStatusMap } from "./friend-status";

describe("friendStatusMap", () => {
  it("unterscheidet befreundet, angefragt und Anfrage an mich", () => {
    const m = friendStatusMap(
      [
        { requester_id: "me", addressee_id: "a", status: "accepted" },
        { requester_id: "b", addressee_id: "me", status: "accepted" },
        { requester_id: "me", addressee_id: "c", status: "pending" },
        { requester_id: "d", addressee_id: "me", status: "pending" },
      ],
      "me",
    );
    expect(m.get("a")).toBe("friends");
    expect(m.get("b")).toBe("friends");
    expect(m.get("c")).toBe("pending_out");
    expect(m.get("d")).toBe("pending_in");
    expect(m.get("x")).toBeUndefined();
  });
});
