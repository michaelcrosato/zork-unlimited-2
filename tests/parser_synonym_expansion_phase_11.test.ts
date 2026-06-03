import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion Phase 11 (Task-F48)", () => {
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
    expect(mapCommand("scamper to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("sprint to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("dash to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("rush to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("gallop to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("trot to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("amble to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("stroll to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("promenade to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("ramble to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("roam to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("stray to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("make headway to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("advance toward east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("proceed toward east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("hasten to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("direct oneself to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
  });

  it("should map newly added inspection verbs to LOOK action", () => {
    expect(mapCommand("gaze at altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("stare at altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("glance at altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("peer at altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("peep at altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("look closely at altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("inspect minutely altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("examine in detail altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("study carefully altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("survey visually altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("eyeball altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("scan visually altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("observe closely altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
  });

  it("should map newly added take verbs to TAKE action", () => {
    expect(mapCommand("grab hold of katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("lay hands on katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("lay hold of katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take possession of katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("pocket katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("bag katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("scoop up katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("seize control of katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("snag katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("acquire possession of katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
  });

  it("should map newly added drop verbs to DROP action", () => {
    expect(mapCommand("discard boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("throw away boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("toss aside boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("get rid of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("cast off boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("jettison boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("lay aside boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("part with boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("shed boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("abandon boots", actions).action).toEqual({ type: "DROP", item: "boots" });
  });

  it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
    expect(mapCommand("unbar vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("unbolt vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("unlock and swing open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("crack open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("spread open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("pry open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("force open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("bar door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("bolt door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("lock shut door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("secure shut door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("fasten door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("make fast door", actions).action).toEqual({ type: "CLOSE", target: "door" });
  });

  it("should map newly added unlock verbs to UNLOCK action", () => {
    expect(mapCommand("decode the lock on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("disengage the lock on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("release the lock on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("deactivate the lock on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("disable the lock on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("solve the lock on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("key open chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
  });

  it("should map newly added use verbs to USE action", () => {
    expect(mapCommand("consume lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("devour lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("put to use lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("bring to bear lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("employ the use of lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("activate lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("turn on lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("trigger lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("enable lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("switch on lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("imbibe lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("don oneself in lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("put on lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
  });

  it("should map newly added combat verbs to FIGHT action", () => {
    expect(mapCommand("engage in battle with ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("trade blows with ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("wage war against ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("attack ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("strike at ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("inflict blows upon ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("combat ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("fall on ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("slug ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("pummel ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("vanquish ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("slaughter ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
  });

  it("should map newly added dialogue verbs to TALK action", () => {
    expect(mapCommand("chat up capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("natter with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("gab with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("have dialogue with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("exchange words with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("hold a conversation with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("commune with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("socialize with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
  });
});
