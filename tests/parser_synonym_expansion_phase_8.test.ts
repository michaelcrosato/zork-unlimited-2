import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion Phase 8 (Task-F44)", () => {
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
    expect(mapCommand("slink to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("sidle to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("tiptoe to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("scamper to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("scurry to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("plod to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("scramble to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("bound to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("prance to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("troop to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("locomote to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("navigate to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("make headway to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("forge ahead to east", actions).action).toEqual({ type: "MOVE", direction: "east" });
  });

  it("should map newly added inspection verbs to LOOK action", () => {
    expect(mapCommand("ogle altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("peek at altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("take a peep at altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("survey closely altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("reconnoiter altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("scrutinize every inch of altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("inspect every detail of altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("study closely altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("pour over altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("pore over altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("cast a glance at altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("run eyes over altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("behold altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("witness altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("take note of altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
    expect(mapCommand("keep watch on altar", actions).action).toEqual({ type: "LOOK", target: "altar" });
  });

  it("should map newly added take verbs to TAKE action", () => {
    expect(mapCommand("pinch katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("make off with katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("walk off with katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("lay claim to katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("help oneself to katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("procure katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("derive katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("gain possession of katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
    expect(mapCommand("bring along katana", actions).action).toEqual({ type: "TAKE", item: "katana" });
  });

  it("should map newly added drop verbs to DROP action", () => {
    expect(mapCommand("get rid of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("leave behind the boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("part with boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("lay aside boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("set aside boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("wash hands of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
    expect(mapCommand("divest oneself of boots", actions).action).toEqual({ type: "DROP", item: "boots" });
  });

  it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
    expect(mapCommand("unbar vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("unblock vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("unlock and open the vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("swing wide the vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("throw open the vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("clear the vault", actions).action).toEqual({ type: "OPEN", target: "vault" });
    expect(mapCommand("block up the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("bar the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("seal up the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("latch the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
    expect(mapCommand("lock up the door", actions).action).toEqual({ type: "CLOSE", target: "door" });
  });

  it("should map newly added unlock verbs to UNLOCK action", () => {
    expect(mapCommand("unlatch the lock of the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("bypass the lock on the chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("disengage the locking mechanism of chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("key open chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("decode the lock on chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("crack the code of chest", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
  });

  it("should map newly added use verbs to USE action", () => {
    expect(mapCommand("operate on the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("employ the use of the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("make application of the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("take advantage of the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("resort to the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("bring to bear the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("utilize the services of the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("consume the contents of the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("imbibe the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("swill the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("gulp the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("partake of the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("gobble up the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("feast upon the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("don the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("slip on the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
    expect(mapCommand("clothe oneself in the lockpick", actions).action).toEqual({ type: "USE", target: "chest" });
  });

  it("should map newly added combat verbs to FIGHT action", () => {
    expect(mapCommand("lay into the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("set upon the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("let fly at the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("wage war against the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("draw weapon on the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("launch assault on the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("go to war with the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("strike a blow to the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("clash with the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("grapple with the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("tussle with the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("skirmish with the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("slaughter the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("execute the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("liquidate the ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
  });

  it("should map newly added dialogue verbs to TALK action", () => {
    expect(mapCommand("have dialogue with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("gab with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("natter with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("shoot the breeze with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("swap stories with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("have a word with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
    expect(mapCommand("hold talks with the capo", actions).action).toEqual({ type: "TALK", npc: "capo" });
  });
});
