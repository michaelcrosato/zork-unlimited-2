import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion Phase 20 (Task-F57)", () => {
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
    expect(mapCommand("make one's way to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("make one's way to the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("make ones way to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("make ones way to the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("steer a course to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("steer a course to the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("undertake a journey to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("undertake a journey to the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
  });

  it("should map newly added inspection verbs to LOOK action", () => {
    expect(mapCommand("do a walkthrough of altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("do a walkthrough of the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("run an inspection over altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("run an inspection over the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast one's gaze at altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast one's gaze at the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast ones gaze at altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast ones gaze at the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
  });

  it("should map newly added take verbs to TAKE action", () => {
    expect(mapCommand("take ownership of katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take ownership of the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("assume control of katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("assume control of the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take charge of katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take charge of the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
  });

  it("should map newly added drop verbs to DROP action", () => {
    expect(mapCommand("let go of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("let go of the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("cast down boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("cast down the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("rid oneself of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("rid oneself of the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
  });

  it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
    expect(mapCommand("fling wide open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("fling wide open the vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("slam shut door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("slam shut the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("force shut door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("force shut the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
  });

  it("should map newly added unlock verbs to UNLOCK action", () => {
    expect(mapCommand("disengage the lock on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("disengage the lock on the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("bypass the security of chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("bypass the security of the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("clear the locks on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("clear the locks on the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
  });

  it("should map newly added use verbs to USE action", () => {
    expect(mapCommand("bring into action lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("bring into action the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("put into service lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("put into service the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("resort to the use of lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("resort to the use of the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
  });

  it("should map newly added combat verbs to FIGHT action", () => {
    expect(mapCommand("initiate a fight with ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("initiate a fight with the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("launch an attack against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("launch an attack against the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
  });

  it("should map newly added dialogue verbs to TALK action", () => {
    expect(mapCommand("initiate a chat with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("initiate a chat with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("engage in a conversation with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("engage in a conversation with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
  });
});
