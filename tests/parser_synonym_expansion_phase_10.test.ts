import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion Phase 10 (Task-F47)", () => {
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

  it("should map newly added movement verbs and compound verbs to MOVE action", () => {
    expect(mapCommand("drift to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("strut to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("march to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("plod to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("shuffle to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("scurry to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("scoot to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("waddle to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("limp to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("creep to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("bound to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("travel toward east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("journey toward east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("navigate to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("steer toward east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("wend one's way to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
  });

  it("should map newly added inspection verbs to LOOK action", () => {
    expect(mapCommand("inspect visually altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("scrutinize closely altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("regard altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("check over altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("reconnoiter altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("audit altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("read through altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("peruse altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("pore over altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("take note of altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
  });

  it("should map newly added take verbs to TAKE action", () => {
    expect(mapCommand("confiscate katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("commandeer katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("appropriate katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("harvest katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("gather katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("extract katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("salvage katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("claim katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("snatch up katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("secure katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("wrest katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("lift katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("hoist katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("pluck katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
  });

  it("should map newly added drop verbs to DROP action", () => {
    expect(mapCommand("relinquish boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("forfeit boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("leave behind boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("dump boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("place down boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("set down boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("deposit boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("lay down boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("drop off boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("leave here boots", actions).action).toEqual({ type: "DROP", item: "boots" });
  });

  it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
    expect(mapCommand("unlock and open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("unseal vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("unlatch vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("unveil vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("pull open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("swing open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("lift open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("unlock open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("seal door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("latch door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("shut door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("push shut door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("swing shut door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("obstruct door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("block door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("block up door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("close down door", actions).action).toEqual({ type: "CLOSE", target: "door" });
  });

  it("should map newly added unlock verbs to UNLOCK action", () => {
    expect(mapCommand("bypass the lock on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("crack the lock of chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("pick lock on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("unlatch lock on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("break open lock on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("force open lock on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
  });

  it("should map newly added use verbs to USE action", () => {
    expect(mapCommand("apply lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("utilize lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("engage lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("interact with lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("operate lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("wield lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("drink lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("ingest lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("eat lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("swallow lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("don lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("wear lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("equip lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("clothe oneself in lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
  });

  it("should map newly added combat verbs to FIGHT action", () => {
    expect(mapCommand("strike down ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("assault ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("engage in combat with ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("do battle with ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("confront ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("lay into ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("clash with ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("skirmish with ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("execute ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("destroy ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("slay ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
  });

  it("should map newly added dialogue verbs to TALK action", () => {
    expect(mapCommand("speak with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("converse with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("chat with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("have a word with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("engage in conversation with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("address capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("speak to capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
  });
});
