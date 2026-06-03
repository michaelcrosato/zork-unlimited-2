import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion Phase 40 (Task-F77)", () => {
  const actions = [
    { id: "move-east", command: "go east", action: { type: "MOVE" as const, direction: "east" } },
    { id: "look-altar", command: "look altar", action: { type: "LOOK" as const, target: "altar" } },
    { id: "take-katana", command: "take steel katana", action: { type: "TAKE" as const, item: "katana" } },
    { id: "drop-boots", command: "drop leather boots", action: { type: "DROP" as const, item: "boots" } },
    { id: "talk-capo", command: "talk to smuggler capo", action: { type: "TALK" as const, npc: "capo" } },
    { id: "use-lockpick", command: "use lockpick on chest", action: { type: "USE" as const, target: "chest" } },
    { id: "unlock-chest", command: "unlock chest with key", action: { type: "UNLOCK" as const, target: "chest" } },
    { id: "open-vault", command: "open iron vault", action: { type: "OPEN" as const, target: "vault" } },
    { id: "close-door", command: "close heavy door", action: { type: "CLOSE" as const, target: "door" } },
    { id: "fight-ghoul", command: "fight crypt ghoul", action: { type: "FIGHT" as const, npc: "ghoul" } }
  ];

  it("should map newly added movement verbs to MOVE action", () => {
    expect(mapCommand("navigate one's heading towards the location of east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("navigate one's heading towards the location of the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("navigate ones heading towards the location of east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("navigate ones heading towards the location of the east", actions).action).toEqual({ type: "MOVE", direction: "east" });

    expect(mapCommand("steer one's heading in the direction of the coordinates of east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("steer one's heading in the direction of the coordinates of the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("steer ones heading in the direction of the coordinates of east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("steer ones heading in the direction of the coordinates of the east", actions).action).toEqual({ type: "MOVE", direction: "east" });

    expect(mapCommand("direct one's heading towards the coordinates of the location of east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("direct one's heading towards the coordinates of the location of the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("direct ones heading towards the coordinates of the location of east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("direct ones heading towards the coordinates of the location of the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
  });

  it("should map newly added inspection verbs to LOOK action", () => {
    expect(mapCommand("subject to a comprehensive visual assessment altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("subject to a comprehensive visual assessment the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });

    expect(mapCommand("subject to a thorough visual assessment altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("subject to a thorough visual assessment the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });

    expect(mapCommand("subject to a detailed visual assessment altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("subject to a detailed visual assessment the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
  });

  it("should map newly added take verbs to TAKE action", () => {
    expect(mapCommand("assume direct stewardship of katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("assume direct stewardship of the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });

    expect(mapCommand("assume absolute stewardship of katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("assume absolute stewardship of the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });

    expect(mapCommand("assume immediate stewardship of katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("assume immediate stewardship of the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
  });

  it("should map newly added drop verbs to DROP action", () => {
    expect(mapCommand("divest oneself of all stewardship of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("divest oneself of all stewardship of the boots", actions).action).toEqual({ type: "DROP", item: "boots" });

    expect(mapCommand("relinquish all stewardship of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("relinquish all stewardship of the boots", actions).action).toEqual({ type: "DROP", item: "boots" });

    expect(mapCommand("free oneself from all stewardship of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("free oneself from all stewardship of the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
  });

  it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
    expect(mapCommand("force completely and absolutely wide open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("force completely and absolutely wide open the vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("pry completely and absolutely wide open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("pry completely and absolutely wide open the vault", actions).action).toEqual({ type: "OPEN", target: "vault" });

    expect(mapCommand("fasten completely and absolutely closed door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("fasten completely and absolutely closed the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("seal completely and absolutely shut door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("seal completely and absolutely shut the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
  });

  it("should map newly added unlock verbs to UNLOCK action", () => {
    expect(mapCommand("deactivate all perimeter security devices of chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("deactivate all perimeter security devices of the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("bypass all perimeter security devices on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("bypass all perimeter security devices on the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("disengage the primary perimeter security device on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("disengage the primary perimeter security device on the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
  });

  it("should map newly added use verbs to USE action", () => {
    expect(mapCommand("harness the full physical deployment of lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("harness the full physical deployment of the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });

    expect(mapCommand("bring into active physical deployment lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("bring into active physical deployment the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });

    expect(mapCommand("make complete physical deployment of lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("make complete physical deployment of the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
  });

  it("should map newly added combat verbs to FIGHT action", () => {
    expect(mapCommand("initiate a lethal confrontation against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("initiate a lethal confrontation against the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });

    expect(mapCommand("commence a lethal confrontation against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("commence a lethal confrontation against the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });

    expect(mapCommand("engage in a lethal confrontation against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("engage in a lethal confrontation against the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
  });

  it("should map newly added dialogue verbs to TALK action", () => {
    expect(mapCommand("initiate a formal face to face discussion with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("initiate a formal face to face discussion with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });

    expect(mapCommand("engage in a formal face to face discussion with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("engage in a formal face to face discussion with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });

    expect(mapCommand("strike up a formal face to face discussion with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("strike up a formal face to face discussion with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
  });
});
