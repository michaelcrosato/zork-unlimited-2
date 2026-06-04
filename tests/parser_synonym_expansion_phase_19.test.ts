import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion Phase 19 (Task-F56)", () => {
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
    { id: "fight-ghoul", command: "fight crypt ghoul", action: { type: "FIGHT" as const, npc: "ghoul" } },
  ];

  it("should map newly added movement verbs to MOVE action", () => {
    expect(mapCommand("make one's way towards east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("make one's way towards the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("make ones way towards east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("make ones way towards the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("steer a course towards east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("steer a course towards the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("take a hike to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("take a hike to the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
  });

  it("should map newly added inspection verbs to LOOK action", () => {
    expect(mapCommand("run a check over altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("run a check over the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("do an inspection of altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("do an inspection of the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("have a look at altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("have a look at the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
  });

  it("should map newly added take verbs to TAKE action", () => {
    expect(mapCommand("take control of katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take control of the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take possession of katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take possession of the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("gain custody of katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("gain custody of the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
  });

  it("should map newly added drop verbs to DROP action", () => {
    expect(mapCommand("cast to the ground boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("cast to the ground the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("throw to the ground boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("throw to the ground the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("drop down boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("drop down the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
  });

  it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
    expect(mapCommand("push wide open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("push wide open the vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("pull wide open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("pull wide open the vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("press close door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("press close the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("shut tight door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("shut tight the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
  });

  it("should map newly added unlock verbs to UNLOCK action", () => {
    expect(mapCommand("crack the locks on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("crack the locks on the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("disengage the locks on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("disengage the locks on the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("bypass the security on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("bypass the security on the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
  });

  it("should map newly added use verbs to USE action", () => {
    expect(mapCommand("put to action lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("put to action the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("turn to the use of lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("turn to the use of the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("employ the use of lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("employ the use of the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
  });

  it("should map newly added combat verbs to FIGHT action", () => {
    expect(mapCommand("initiate battle with ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("initiate battle with the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("wage a battle against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("wage a battle against the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("initiate combat against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("initiate combat against the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
  });

  it("should map newly added dialogue verbs to TALK action", () => {
    expect(mapCommand("strike up a conversation with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("strike up a conversation with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("engage in a discussion with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("engage in a discussion with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("have a talk with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("have a talk with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
  });
});
