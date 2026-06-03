import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion Phase 7 (Task-F43)", () => {
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

  it("should map newly added movement verbs and compound verbs to MOVE action", () => {
    expect(mapCommand("advance to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("proceed to the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("head to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("journey to the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("make tracks to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("dash to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("sprint to the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("jog to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("teleport to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("rush to the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("crawl to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("creep to the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("slip to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("stealth to the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("stroll to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("march to the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("climb to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("fly to the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("sail to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("ride to the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("run over to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("walk over to the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
  });

  it("should map newly added inspection verbs to LOOK action", () => {
    expect(mapCommand("glance over the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("glance over altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("gaze upon the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("stare upon altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("peer upon the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("check out the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("look at the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("peer into the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("stare into altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("inspect closely the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("examine closely altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("scrutinize closely the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("look through the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("gaze through altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("read closely the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("glimpse the altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("glimpse altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
  });

  it("should map newly added take verbs to TAKE action", () => {
    expect(mapCommand("grab the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("grab katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("snatch the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("lift the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("pick the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("gather the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("collect the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("secure the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("receive the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("harvest the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("reap the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("pluck the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("draw the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("claim the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("gain the katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
  });

  it("should map newly added drop verbs to DROP action", () => {
    expect(mapCommand("dump the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("dump boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("put down the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("set down the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("place down the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("drop off the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("throw down the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("cast down the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("chuck the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("pitch the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
  });

  it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
    expect(mapCommand("unfold the vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("uncover the vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("expose the vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("shut down the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("seal off the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("cover up the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
  });

  it("should map newly added unlock verbs to UNLOCK action", () => {
    expect(mapCommand("crack the lock on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("crack the lock of chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("break lock on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("jimmy the lock on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("solve lock on the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
  });

  it("should map newly added use verbs to USE action", () => {
    expect(mapCommand("trigger the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("fire the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("engage the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("turn on the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("start up the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("toggle the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("press the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("push the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("pull the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("flip the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("switch on the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("light up the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("ignite the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("drink up the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("swallow the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("gulp down the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("ingest the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("devour the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("put on the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("wear the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
  });

  it("should map newly added combat verbs to FIGHT action", () => {
    expect(mapCommand("strike the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("hit the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("punch the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("kick the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("beat the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("bash the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("batter the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("slash the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("stab the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("shoot the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("engage in combat with the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("do battle with the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("fight with the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("defeat the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("overpower the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
  });

  it("should map newly added dialogue verbs to TALK action", () => {
    expect(mapCommand("have dialogue with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("dialogue with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("converse with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("chat with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("speak to the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("talk to the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("exchange words with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("commune with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("discuss with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("plead with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("beg the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
  });
});
