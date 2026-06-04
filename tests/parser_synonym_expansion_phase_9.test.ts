import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion Phase 9 (Task-F45)", () => {
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
    expect(mapCommand("meander to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("glide to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("amble to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("prowl to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("sashay to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("skip to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("skulk to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("vault to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("hop to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("tread to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("advance toward east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("make one's way toward east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("direct oneself to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("travel to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("proceed toward east", actions).action).toEqual({ type: "MOVE", direction: "east" });
  });

  it("should map newly added inspection verbs to LOOK action", () => {
    expect(mapCommand("glare at altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("gloat over altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("eyeball altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("size up altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("take a gander at altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("check out closely altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("look over altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast one's eyes upon altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("have a look at altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("peer closely at altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("stare intently at altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("examine in detail altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("give a once-over to altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
  });

  it("should map newly added take verbs to TAKE action", () => {
    expect(mapCommand("pilfer katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("swipe katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("filch katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("purloin katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("snag katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("pocket katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("bag katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("scoop up katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("capture katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("seize control of katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("take hold of katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("lay one's hands on katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
  });

  it("should map newly added drop verbs to DROP action", () => {
    expect(mapCommand("abandon boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("discard boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("jettison boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("shed boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("scrap boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("throw away boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("toss aside boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("cast aside boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("ditch boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("unload boots", actions).action).toEqual({ type: "DROP", item: "boots" });
  });

  it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
    expect(mapCommand("prop open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("crack open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("pry open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("slide open vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("draw back vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("shut tight door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("slam shut door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("fasten door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("secure shut door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("slide shut door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("bolt shut door", actions).action).toEqual({ type: "CLOSE", target: "door" });
  });

  it("should map newly added unlock verbs to UNLOCK action", () => {
    expect(mapCommand("jimmy open chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("pick the lock of chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("unbolt chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("disarm lock on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("undo the lock of chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("release the lock of chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("deactivate lock on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
  });

  it("should map newly added use verbs to USE action", () => {
    expect(mapCommand("activate the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("consume the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("deploy the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("run lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("bring into play lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("make use of the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("put to work lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("exercise lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("take advantage of lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("exploit lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("down lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("quaff lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("sip lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("digest lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("slip into lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("put on oneself lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("throw on lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
  });

  it("should map newly added combat verbs to FIGHT action", () => {
    expect(mapCommand("neutralize the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("decimate the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("obliterate the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("annihilate the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("vanquish the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("assassinate the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("lay waste to the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("wage battle against the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("assail the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("fall upon the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("throw down with the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("take a swing at the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("square off with the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
  });

  it("should map newly added dialogue verbs to TALK action", () => {
    expect(mapCommand("chinwag with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("rap with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("parley with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("chitchat with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("gossip with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("consult with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("interview capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("interrogate capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("confab with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("palaver with capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
  });
});
