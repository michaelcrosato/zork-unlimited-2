import { describe, it, expect } from "vitest";
import { normalizeCommandString, mapCommand } from "../src/parser/command_map.js";

describe("normalizeCommandString", () => {
  it("normalizes single-letter directional shortcuts", () => {
    expect(normalizeCommandString("n")).toBe("go north");
    expect(normalizeCommandString("s")).toBe("go south");
    expect(normalizeCommandString("e")).toBe("go east");
    expect(normalizeCommandString("w")).toBe("go west");
    expect(normalizeCommandString("u")).toBe("go up");
    expect(normalizeCommandString("d")).toBe("go down");
  });

  it("normalizes inventory and look shortcuts", () => {
    expect(normalizeCommandString("i")).toBe("inventory");
    expect(normalizeCommandString("l")).toBe("look");
  });

  it("trims whitespace and lowercases input", () => {
    expect(normalizeCommandString("  GO NORTH  ")).toBe("go north");
    expect(normalizeCommandString("LOOK")).toBe("look");
    expect(normalizeCommandString("  Take Lamp  ")).toBe("take lamp");
  });

  it("passes through multi-word commands unchanged (after trim + lower)", () => {
    expect(normalizeCommandString("open chest")).toBe("open chest");
    expect(normalizeCommandString("talk to guard")).toBe("talk to guard");
  });
});

describe("mapCommand", () => {
  const sampleActions = [
    { id: "go-north", command: "go north", action: { type: "GO" as const, direction: "north" } },
    { id: "take-lamp", command: "take lamp", action: { type: "TAKE" as const, item: "lamp" } },
    { id: "look", command: "look", action: { type: "LOOK" as const } },
  ];

  it("matches exact command strings case-insensitively", () => {
    const result = mapCommand("go north", sampleActions);
    expect(result.action).toEqual({ type: "GO", direction: "north" });
    expect(result.error).toBeUndefined();
  });

  it("matches after normalization of shortcuts", () => {
    const result = mapCommand("n", sampleActions);
    expect(result.action).toEqual({ type: "GO", direction: "north" });
  });

  it("returns an error for unrecognized commands", () => {
    const result = mapCommand("fly to the moon", sampleActions);
    expect(result.action).toBeUndefined();
    expect(result.error).toBeDefined();
    expect(result.error).toContain("don't understand");
  });

  it("error message lists valid verbs", () => {
    const result = mapCommand("xyz", sampleActions);
    expect(result.error).toContain("go");
    expect(result.error).toContain("take");
    expect(result.error).toContain("look");
  });

  it("handles verb synonyms and partial noun matches", () => {
    const complexActions = [
      { id: "use-wall", command: "use stone wall", action: { type: "USE" as const, target: "stone_wall" } },
      {
        id: "unlock-chest",
        command: "unlock banded oak chest with brass key",
        action: { type: "UNLOCK" as const, target: "chest" },
      },
      { id: "take-rope", command: "take coil of rope", action: { type: "TAKE" as const, item: "rope" } },
    ];

    expect(mapCommand("climb wall", complexActions).action).toEqual({ type: "USE", target: "stone_wall" });
    expect(mapCommand("unlock chest", complexActions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("get rope", complexActions).action).toEqual({ type: "TAKE", item: "rope" });
  });

  it("handles dialogue topic and contract synonyms correctly", () => {
    const dialogueActions = [
      {
        id: "dialogue_accept",
        command: "ask about accept the smuggling contract",
        action: { type: "ASK" as const, npc: "npc", topic: "take_smuggle" },
      },
      {
        id: "dialogue_report",
        command: "ask about report completion of the smuggling contract",
        action: { type: "ASK" as const, npc: "npc", topic: "turn_in_smuggle" },
      },
      {
        id: "dialogue_prestige",
        command: "ask about check your prestige",
        action: { type: "ASK" as const, npc: "npc", topic: "check_prestige" },
      },
      {
        id: "dialogue_bye",
        command: "ask about say goodbye",
        action: { type: "ASK" as const, npc: "npc", topic: "bye" },
      },
      {
        id: "dialogue_well",
        command: "ask about the well",
        action: { type: "ASK" as const, npc: "npc", topic: "well_clue" },
      },
    ];

    expect(mapCommand("accept smuggling contract", dialogueActions).action).toEqual({
      type: "ASK",
      npc: "npc",
      topic: "take_smuggle",
    });
    expect(mapCommand("accept smuggling", dialogueActions).action).toEqual({
      type: "ASK",
      npc: "npc",
      topic: "take_smuggle",
    });
    expect(mapCommand("accept contract", dialogueActions).action).toEqual({
      type: "ASK",
      npc: "npc",
      topic: "take_smuggle",
    });

    expect(mapCommand("turn in smuggling contract", dialogueActions).action).toEqual({
      type: "ASK",
      npc: "npc",
      topic: "turn_in_smuggle",
    });
    expect(mapCommand("report completion", dialogueActions).action).toEqual({
      type: "ASK",
      npc: "npc",
      topic: "turn_in_smuggle",
    });
    expect(mapCommand("complete contract", dialogueActions).action).toEqual({
      type: "ASK",
      npc: "npc",
      topic: "turn_in_smuggle",
    });

    expect(mapCommand("check prestige", dialogueActions).action).toEqual({
      type: "ASK",
      npc: "npc",
      topic: "check_prestige",
    });
    expect(mapCommand("say goodbye", dialogueActions).action).toEqual({ type: "ASK", npc: "npc", topic: "bye" });
    expect(mapCommand("goodbye", dialogueActions).action).toEqual({ type: "ASK", npc: "npc", topic: "bye" });

    expect(mapCommand("talk about well", dialogueActions).action).toEqual({
      type: "ASK",
      npc: "npc",
      topic: "well_clue",
    });
  });

  it("handles complex extended synonym categories and compound verbs", () => {
    const extendedActions = [
      { id: "take-gem", command: "take magic gem", action: { type: "TAKE" as const, item: "gem" } },
      { id: "drop-lamp", command: "drop brass lamp", action: { type: "DROP" as const, item: "lamp" } },
      { id: "look-mirror", command: "look at dusty mirror", action: { type: "LOOK" as const, target: "mirror" } },
      { id: "talk-guard", command: "talk to dungeon guard", action: { type: "TALK" as const, npc: "guard" } },
      { id: "fight-goblin", command: "fight green goblin", action: { type: "FIGHT" as const, npc: "goblin" } },
      {
        id: "cast-spell",
        command: "cast fireball on goblin",
        action: { type: "CAST" as const, spell: "fireball", target: "goblin" },
      },
      { id: "flee-combat", command: "flee combat", action: { type: "FLEE" as const } },
      {
        id: "buy-sword",
        command: "buy steel sword from merchant",
        action: { type: "BUY" as const, item: "sword", npc: "merchant" },
      },
      { id: "use-wall", command: "use stone wall", action: { type: "USE" as const, target: "wall" } },
    ];

    expect(mapCommand("loot gem", extendedActions).action).toEqual({ type: "TAKE", item: "gem" });
    expect(mapCommand("pilfer gem", extendedActions).action).toEqual({ type: "TAKE", item: "gem" });
    expect(mapCommand("abandon lamp", extendedActions).action).toEqual({ type: "DROP", item: "lamp" });
    expect(mapCommand("put down lamp", extendedActions).action).toEqual({ type: "DROP", item: "lamp" });
    expect(mapCommand("peer into mirror", extendedActions).action).toEqual({ type: "LOOK", target: "mirror" });
    expect(mapCommand("scrutinize mirror", extendedActions).action).toEqual({ type: "LOOK", target: "mirror" });
    expect(mapCommand("speak with guard", extendedActions).action).toEqual({ type: "TALK", npc: "guard" });
    expect(mapCommand("chat with guard", extendedActions).action).toEqual({ type: "TALK", npc: "guard" });
    expect(mapCommand("stab goblin", extendedActions).action).toEqual({ type: "FIGHT", npc: "goblin" });
    expect(mapCommand("strike goblin", extendedActions).action).toEqual({ type: "FIGHT", npc: "goblin" });
    expect(mapCommand("use magic on goblin", extendedActions).action).toEqual({
      type: "CAST",
      spell: "fireball",
      target: "goblin",
    });
    expect(mapCommand("run away", extendedActions).action).toEqual({ type: "FLEE" });
    expect(mapCommand("purchase sword", extendedActions).action).toEqual({
      type: "BUY",
      item: "sword",
      npc: "merchant",
    });
    expect(mapCommand("climb wall", extendedActions).action).toEqual({ type: "USE", target: "wall" });
  });

  it("handles newly expanded synonyms for MOVE, LOOK, TAKE, DROP, OPEN, CLOSE, UNLOCK, USE, TALK, GIVE, INVENTORY, FIGHT, CAST, FLEE, BUY, and SELL", () => {
    const actions = [
      { id: "climb-cliff", command: "go up steep cliffside", action: { type: "MOVE" as const, direction: "up" } },
      {
        id: "look-mirror",
        command: "look closely at dusty mirror",
        action: { type: "LOOK" as const, target: "mirror" },
      },
      { id: "gather-lotus", command: "take ancient black lotus", action: { type: "TAKE" as const, item: "lotus" } },
      { id: "discard-sword", command: "drop steel sword", action: { type: "DROP" as const, item: "sword" } },
      { id: "swing-door", command: "open wooden door", action: { type: "OPEN" as const, target: "door" } },
      { id: "shut-chest", command: "close massive chest", action: { type: "CLOSE" as const, target: "chest" } },
      { id: "unlock-gate", command: "unlock iron gate with key", action: { type: "UNLOCK" as const, target: "gate" } },
      { id: "pull-lever", command: "use brass lever", action: { type: "USE" as const, target: "lever" } },
      { id: "talk-npc", command: "talk to goblin merchant", action: { type: "TALK" as const, npc: "merchant" } },
      { id: "give-gold", command: "give gold to merchant", action: { type: "GIVE" as const, target: "merchant" } },
      { id: "show-inv", command: "inventory", action: { type: "INVENTORY" as const } },
      { id: "engage-goblin", command: "fight green goblin", action: { type: "FIGHT" as const, npc: "goblin" } },
      {
        id: "cast-spell",
        command: "cast fireball on goblin",
        action: { type: "CAST" as const, spell: "fireball", target: "goblin" },
      },
      { id: "retreat-goblin", command: "flee goblin", action: { type: "FLEE" as const } },
      { id: "buy-ring", command: "buy golden ring from merchant", action: { type: "BUY" as const, item: "ring" } },
      { id: "sell-ring", command: "sell golden ring to merchant", action: { type: "SELL" as const, item: "ring" } },
    ];

    expect(mapCommand("climb up cliffside", actions).action).toEqual({ type: "MOVE", direction: "up" });
    expect(mapCommand("scramble up cliffside", actions).action).toEqual({ type: "MOVE", direction: "up" });
    expect(mapCommand("take a look at mirror", actions).action).toEqual({ type: "LOOK", target: "mirror" });
    expect(mapCommand("look closely at mirror", actions).action).toEqual({ type: "LOOK", target: "mirror" });
    expect(mapCommand("scoop up lotus", actions).action).toEqual({ type: "TAKE", item: "lotus" });
    expect(mapCommand("gather up lotus", actions).action).toEqual({ type: "TAKE", item: "lotus" });
    expect(mapCommand("toss out sword", actions).action).toEqual({ type: "DROP", item: "sword" });
    expect(mapCommand("swing open door", actions).action).toEqual({ type: "OPEN", target: "door" });
    expect(mapCommand("shut close chest", actions).action).toEqual({ type: "CLOSE", target: "chest" });
    expect(mapCommand("use key to unlock gate", actions).action).toEqual({ type: "UNLOCK", target: "gate" });
    expect(mapCommand("pull lever", actions).action).toEqual({ type: "USE", target: "lever" });
    expect(mapCommand("question merchant", actions).action).toEqual({ type: "TALK", npc: "merchant" });
    expect(mapCommand("hand item to merchant", actions).action).toEqual({ type: "GIVE", target: "merchant" });
    expect(mapCommand("show inventory", actions).action).toEqual({ type: "INVENTORY" });
    expect(mapCommand("engage in combat with goblin", actions).action).toEqual({ type: "FIGHT", npc: "goblin" });
    expect(mapCommand("cast spell on goblin", actions).action).toEqual({
      type: "CAST",
      spell: "fireball",
      target: "goblin",
    });
    expect(mapCommand("run away from goblin", actions).action).toEqual({ type: "FLEE" });
    expect(mapCommand("purchase ring", actions).action).toEqual({ type: "BUY", item: "ring" });
    expect(mapCommand("sell ring to merchant", actions).action).toEqual({ type: "SELL", item: "ring" });
  });

  it("handles new player synonyms correctly (disarm, climb down, peer down, etc.)", () => {
    const actions = [
      {
        id: "disarm-sarcophagus",
        command: "use brass key on granite sarcophagus",
        action: { type: "USE" as const, item: "brass_key", target: "sarcophagus" },
      },
      { id: "go-down-well", command: "go down", action: { type: "MOVE" as const, direction: "down" } },
      { id: "peer-well", command: "look old well", action: { type: "LOOK" as const, target: "old_well" } },
    ];

    expect(mapCommand("disarm sarcophagus with brass key", actions).action).toEqual({
      type: "USE",
      item: "brass_key",
      target: "sarcophagus",
    });
    expect(mapCommand("disarm sarcophagus", actions).action).toEqual({
      type: "USE",
      item: "brass_key",
      target: "sarcophagus",
    });
    expect(mapCommand("climb down well", actions).action).toEqual({ type: "MOVE", direction: "down" });
    expect(mapCommand("peer down into well", actions).action).toEqual({ type: "LOOK", target: "old_well" });
  });

  it("handles 'the' suffix/prefix compound verbs correctly (e.g. use the lever, talk to the capo, climb up the cliffside)", () => {
    const actions = [
      { id: "pull-lever", command: "use brass lever", action: { type: "USE" as const, target: "lever" } },
      { id: "talk-capo", command: "talk to smuggler capo", action: { type: "TALK" as const, npc: "smuggler_capo" } },
      { id: "climb-cliff", command: "go up steep cliffside", action: { type: "MOVE" as const, direction: "up" } },
      {
        id: "take-cargo",
        command: "take contraband cargo",
        action: { type: "TAKE" as const, item: "contraband_cargo" },
      },
      { id: "fight-thug", command: "fight bandit thug", action: { type: "FIGHT" as const, npc: "bandit_thug" } },
      { id: "unlock-gate", command: "unlock iron gate with key", action: { type: "UNLOCK" as const, target: "gate" } },
    ];

    expect(mapCommand("use the lever", actions).action).toEqual({ type: "USE", target: "lever" });
    expect(mapCommand("pull the lever", actions).action).toEqual({ type: "USE", target: "lever" });
    expect(mapCommand("talk to the capo", actions).action).toEqual({ type: "TALK", npc: "smuggler_capo" });
    expect(mapCommand("speak with the capo", actions).action).toEqual({ type: "TALK", npc: "smuggler_capo" });
    expect(mapCommand("climb up the cliffside", actions).action).toEqual({ type: "MOVE", direction: "up" });
    expect(mapCommand("take the cargo", actions).action).toEqual({ type: "TAKE", item: "contraband_cargo" });
    expect(mapCommand("pick up the cargo", actions).action).toEqual({ type: "TAKE", item: "contraband_cargo" });
    expect(mapCommand("fight the thug", actions).action).toEqual({ type: "FIGHT", npc: "bandit_thug" });
    expect(mapCommand("attack the thug", actions).action).toEqual({ type: "FIGHT", npc: "bandit_thug" });
    expect(mapCommand("unlock the gate", actions).action).toEqual({ type: "UNLOCK", target: "gate" });
  });

  it("handles automatic spelling corrections", () => {
    const actions = [
      { id: "climb-wall", command: "climb wall", action: { type: "USE" as const, target: "wall" } },
      {
        id: "unlock-chest",
        command: "unlock chest with brass key",
        action: { type: "UNLOCK" as const, target: "chest" },
      },
      { id: "fight-goblin", command: "fight green goblin", action: { type: "FIGHT" as const, npc: "goblin" } },
    ];

    expect(mapCommand("clmb wall", actions).action).toEqual({ type: "USE", target: "wall" });
    expect(mapCommand("climb wal", actions).action).toEqual({ type: "USE", target: "wall" });
    expect(mapCommand("unlock chest with brass kee", actions).action).toEqual({ type: "UNLOCK", target: "chest" });
    expect(mapCommand("fight gobelin", actions).action).toEqual({ type: "FIGHT", npc: "goblin" });
  });

  it("handles fuzzy target/noun matching", () => {
    const actions = [
      {
        id: "disarm-sarcophagus",
        command: "use brass key on granite sarcophagus",
        action: { type: "USE" as const, item: "brass_key", target: "sarcophagus" },
      },
      { id: "climb-cliff", command: "go up steep cliffside", action: { type: "MOVE" as const, direction: "up" } },
    ];

    expect(mapCommand("disarm sarcofagus", actions).action).toEqual({
      type: "USE",
      item: "brass_key",
      target: "sarcophagus",
    });
    expect(mapCommand("climb cliff", actions).action).toEqual({ type: "MOVE", direction: "up" });
  });

  it("handles context-aware parser disambiguation queries", () => {
    const actions = [
      { id: "climb-wall", command: "climb wall", action: { type: "USE" as const, target: "wall" } },
      { id: "climb-well", command: "climb down well", action: { type: "MOVE" as const, direction: "down" } },
    ];

    const result = mapCommand("climb", actions);
    expect(result.action).toBeUndefined();
    expect(result.error).toContain("Did you mean 'climb wall' or 'climb down well'?");
  });

  it("prioritizes exact target matches over synonym matches to avoid redundant disambiguation", () => {
    const actions = [
      { id: "take-sword", command: "take iron sword", action: { type: "TAKE" as const, item: "iron_sword" } },
      { id: "take-blade", command: "take iron blade", action: { type: "TAKE" as const, item: "iron_blade" } },
    ];
    // "sword" and "blade" are in the same synonym group.
    // When the user says "take sword", the exact match on "sword" should win
    // over the synonym match on "blade".
    const result = mapCommand("take sword", actions);
    expect(result.action).toEqual({ type: "TAKE", item: "iron_sword" });
  });

  it("handles newly added synonyms and verbs (break, decipher, peek, wear, coffer, blade)", () => {
    const actions = [
      {
        id: "break-barricade",
        command: "use iron axe on wooden barricade",
        action: { type: "USE" as const, item: "iron_axe", target: "barricade" },
      },
      { id: "read-sign", command: "look ancient sign", action: { type: "LOOK" as const, target: "sign" } },
      { id: "peek-chest", command: "look inside heavy iron chest", action: { type: "LOOK" as const, target: "chest" } },
      { id: "equip-sword", command: "use sharp iron sword", action: { type: "USE" as const, item: "iron_sword" } },
    ];

    expect(mapCommand("break barricade with iron axe", actions).action).toEqual({
      type: "USE",
      item: "iron_axe",
      target: "barricade",
    });
    expect(mapCommand("decipher sign", actions).action).toEqual({ type: "LOOK", target: "sign" });
    expect(mapCommand("peek inside coffer", actions).action).toEqual({ type: "LOOK", target: "chest" });
    expect(mapCommand("wear blade", actions).action).toEqual({ type: "USE", item: "iron_sword" });
  });

  it("handles Task-F24 expanded synonym variety and compound verbs (add target to inventory, get rid of, play around with, etc.)", () => {
    const actions = [
      { id: "add-lever-inv", command: "take heavy brass lever", action: { type: "TAKE" as const, item: "lever" } },
      { id: "drop-scroll", command: "drop magical scroll", action: { type: "DROP" as const, item: "scroll" } },
      { id: "fight-ghoul", command: "fight crypt ghoul", action: { type: "FIGHT" as const, npc: "ghoul" } },
      { id: "read-diary", command: "look ancient diary", action: { type: "LOOK" as const, target: "diary" } },
      { id: "use-switch", command: "use secret switch", action: { type: "USE" as const, target: "switch" } },
      { id: "move-north", command: "go north", action: { type: "MOVE" as const, direction: "north" } },
    ];

    expect(mapCommand("add lever to inventory", actions).action).toEqual({ type: "TAKE", item: "lever" });
    expect(mapCommand("stash lever", actions).action).toEqual({ type: "TAKE", item: "lever" });
    expect(mapCommand("get rid of scroll", actions).action).toEqual({ type: "DROP", item: "scroll" });
    expect(mapCommand("assail ghoul", actions).action).toEqual({ type: "FIGHT", npc: "ghoul" });
    expect(mapCommand("read page diary", actions).action).toEqual({ type: "LOOK", target: "diary" });
    expect(mapCommand("play around with switch", actions).action).toEqual({ type: "USE", target: "switch" });
    expect(mapCommand("walk northward", actions).action).toEqual({ type: "MOVE", direction: "north" });
    expect(mapCommand("head northward", actions).action).toEqual({ type: "MOVE", direction: "north" });
  });

  it("handles Q4/AF-25 newly added synonyms and compound verbs", () => {
    const actions = [
      { id: "move-east", command: "go east", action: { type: "MOVE" as const, direction: "east" } },
      { id: "look-scroll", command: "look scroll", action: { type: "LOOK" as const, target: "scroll" } },
      { id: "take-receptacle", command: "take wooden container", action: { type: "TAKE" as const, item: "container" } },
      { id: "drop-sabre", command: "drop sharp sabre", action: { type: "DROP" as const, item: "sabre" } },
      { id: "open-hatch", command: "open iron hatch", action: { type: "OPEN" as const, target: "hatch" } },
      { id: "close-grate", command: "close rusty grate", action: { type: "CLOSE" as const, target: "grate" } },
      {
        id: "unlock-hatch",
        command: "unlock iron hatch with key",
        action: { type: "UNLOCK" as const, target: "hatch" },
      },
      { id: "use-brew", command: "use magic brew", action: { type: "USE" as const, item: "brew" } },
      { id: "talk-clerk", command: "talk to shopkeeper clerk", action: { type: "TALK" as const, npc: "clerk" } },
      { id: "give-gold", command: "give money to enforcer", action: { type: "GIVE" as const, target: "enforcer" } },
      { id: "fight-brigand", command: "fight outlaw brigand", action: { type: "FIGHT" as const, npc: "brigand" } },
      {
        id: "cast-magic",
        command: "cast magic on brigand",
        action: { type: "CAST" as const, spell: "spell", target: "brigand" },
      },
      { id: "flee-brigand", command: "flee brigand", action: { type: "FLEE" as const } },
      { id: "buy-knife", command: "buy sharp knife from merchant", action: { type: "BUY" as const, item: "knife" } },
      { id: "sell-knife", command: "sell sharp knife to merchant", action: { type: "SELL" as const, item: "knife" } },
    ];

    // MOVE tests
    expect(mapCommand("plod east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("trek east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("dash to east", actions).action).toEqual({ type: "MOVE", direction: "east" });

    // LOOK tests
    expect(mapCommand("audit manuscript", actions).action).toEqual({ type: "LOOK", target: "scroll" });
    expect(mapCommand("pore over ledger", actions).action).toEqual({ type: "LOOK", target: "scroll" });
    expect(mapCommand("scan through scroll", actions).action).toEqual({ type: "LOOK", target: "scroll" });

    // TAKE tests
    expect(mapCommand("purloin casket", actions).action).toEqual({ type: "TAKE", item: "container" });
    expect(mapCommand("commandeer receptacle", actions).action).toEqual({ type: "TAKE", item: "container" });
    expect(mapCommand("pocket item container", actions).action).toEqual({ type: "TAKE", item: "container" });

    // DROP tests
    expect(mapCommand("relinquish cutlass", actions).action).toEqual({ type: "DROP", item: "sabre" });
    expect(mapCommand("dispose of blade", actions).action).toEqual({ type: "DROP", item: "sabre" });

    // OPEN/CLOSE tests
    expect(mapCommand("unlock and open hatch", actions).action).toEqual({ type: "OPEN", target: "hatch" });
    expect(mapCommand("slam doorway", actions).action).toEqual({ type: "CLOSE", target: "grate" });

    // UNLOCK tests
    expect(mapCommand("decrypt hatch", actions).action).toEqual({ type: "UNLOCK", target: "hatch" });
    expect(mapCommand("disengage lock hatch", actions).action).toEqual({ type: "UNLOCK", target: "hatch" });

    // USE tests
    expect(mapCommand("quaff mead", actions).action).toEqual({ type: "USE", item: "brew" });
    expect(mapCommand("swill liquid", actions).action).toEqual({ type: "USE", item: "brew" });

    // TALK tests
    expect(mapCommand("chatter with figure", actions).action).toEqual({ type: "TALK", npc: "clerk" });
    expect(mapCommand("greet townsperson", actions).action).toEqual({ type: "TALK", npc: "clerk" });

    // GIVE tests
    expect(mapCommand("donate gold to sheriff", actions).action).toEqual({ type: "GIVE", target: "enforcer" });

    // FIGHT tests
    expect(mapCommand("duel thief", actions).action).toEqual({ type: "FIGHT", npc: "brigand" });
    expect(mapCommand("clash with rogue", actions).action).toEqual({ type: "FIGHT", npc: "brigand" });

    // CAST tests
    expect(mapCommand("conjure magic on enemy", actions).action).toEqual({
      type: "CAST",
      spell: "spell",
      target: "brigand",
    });
    expect(mapCommand("invoke spell on foe", actions).action).toEqual({
      type: "CAST",
      spell: "spell",
      target: "brigand",
    });

    // FLEE tests
    expect(mapCommand("scurry away from outlaw", actions).action).toEqual({ type: "FLEE" });
    expect(mapCommand("back away", actions).action).toEqual({ type: "FLEE" });

    // BUY/SELL tests
    expect(mapCommand("acquire from merchant knife", actions).action).toEqual({ type: "BUY", item: "knife" });
    expect(mapCommand("dispose to merchant knife", actions).action).toEqual({ type: "SELL", item: "knife" });
  });

  it("handles Cycle #58 newly added synonyms (strike with, take from, fire, ice, potion, scroll, altar)", () => {
    const actions = [
      { id: "move-east", command: "go east", action: { type: "MOVE" as const, direction: "east" } },
      {
        id: "take-pearl",
        command: "take shiny pearl from altar",
        action: { type: "TAKE" as const, item: "pearl", target: "altar" },
      },
      { id: "fight-specter", command: "fight spooky specter", action: { type: "FIGHT" as const, npc: "specter" } },
      {
        id: "cast-spell",
        command: "cast freeze on specter",
        action: { type: "CAST" as const, spell: "freeze", target: "specter" },
      },
      { id: "use-healing", command: "use healing potion", action: { type: "USE" as const, item: "healing_potion" } },
      { id: "read-tome", command: "look ancient tome", action: { type: "LOOK" as const, target: "tome" } },
    ];

    expect(mapCommand("travel east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("clamber east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("take pearl from shrine", actions).action).toEqual({
      type: "TAKE",
      item: "pearl",
      target: "altar",
    });
    expect(mapCommand("retrieve pearl from dais", actions).action).toEqual({
      type: "TAKE",
      item: "pearl",
      target: "altar",
    });
    expect(mapCommand("strike specter with sword", actions).action).toEqual({ type: "FIGHT", npc: "specter" });
    expect(mapCommand("slay specter", actions).action).toEqual({ type: "FIGHT", npc: "specter" });
    expect(mapCommand("cast ice on ghost", actions).action).toEqual({
      type: "CAST",
      spell: "freeze",
      target: "specter",
    });
    expect(mapCommand("use elixir", actions).action).toEqual({ type: "USE", item: "healing_potion" });
    expect(mapCommand("read codex", actions).action).toEqual({ type: "LOOK", target: "tome" });
  });

  it("handles Task-F34 merchant trading, dynamic pricing inquiries, and inventory combination crafting synonyms", () => {
    const actions = [
      {
        id: "buy-sword",
        command: "buy iron sword from merchant bob",
        action: { type: "BUY" as const, item: "iron_sword", npc: "merchant_bob" },
      },
      {
        id: "sell-shield",
        command: "sell wooden shield to merchant bob",
        action: { type: "SELL" as const, item: "wooden_shield", npc: "merchant_bob" },
      },
      {
        id: "ask-price-sword",
        command: "ask about price of iron sword",
        action: { type: "ASK" as const, npc: "merchant_bob", topic: "price_iron_sword" },
      },
      {
        id: "ask-cost-shield",
        command: "ask about cost of wooden shield",
        action: { type: "ASK" as const, npc: "merchant_bob", topic: "cost_wooden_shield" },
      },
      {
        id: "craft-torch",
        command: "combine piece of flint and piece of steel",
        action: { type: "CRAFT" as const, recipeId: "light_torch" },
      },
      {
        id: "craft-potion",
        command: "use healing herb on spring water",
        action: { type: "CRAFT" as const, recipeId: "brew_potion" },
      },
    ];

    // Trading synonyms
    expect(mapCommand("purchase sword from bob", actions).action).toEqual({
      type: "BUY",
      item: "iron_sword",
      npc: "merchant_bob",
    });
    expect(mapCommand("acquire blade from bob", actions).action).toEqual({
      type: "BUY",
      item: "iron_sword",
      npc: "merchant_bob",
    });
    expect(mapCommand("trade shield to merchant bob", actions).action).toEqual({
      type: "SELL",
      item: "wooden_shield",
      npc: "merchant_bob",
    });
    expect(mapCommand("barter shield to merchant bob", actions).action).toEqual({
      type: "SELL",
      item: "wooden_shield",
      npc: "merchant_bob",
    });

    // Dynamic pricing inquiries synonyms
    expect(mapCommand("ask about cost of iron sword", actions).action).toEqual({
      type: "ASK",
      npc: "merchant_bob",
      topic: "price_iron_sword",
    });
    expect(mapCommand("inquire about price of sword", actions).action).toEqual({
      type: "ASK",
      npc: "merchant_bob",
      topic: "price_iron_sword",
    });
    expect(mapCommand("check price of sword", actions).action).toEqual({
      type: "ASK",
      npc: "merchant_bob",
      topic: "price_iron_sword",
    });
    expect(mapCommand("what is cost of sword", actions).action).toEqual({
      type: "ASK",
      npc: "merchant_bob",
      topic: "price_iron_sword",
    });
    expect(mapCommand("how much for iron sword", actions).action).toEqual({
      type: "ASK",
      npc: "merchant_bob",
      topic: "price_iron_sword",
    });

    // Crafting / combining synonyms
    expect(mapCommand("craft flint and steel", actions).action).toEqual({ type: "CRAFT", recipeId: "light_torch" });
    expect(mapCommand("assemble flint and steel", actions).action).toEqual({ type: "CRAFT", recipeId: "light_torch" });
    expect(mapCommand("mix flint and steel", actions).action).toEqual({ type: "CRAFT", recipeId: "light_torch" });
    expect(mapCommand("prepare flint and steel", actions).action).toEqual({ type: "CRAFT", recipeId: "light_torch" });
    expect(mapCommand("make flint and steel", actions).action).toEqual({ type: "CRAFT", recipeId: "light_torch" });
    expect(mapCommand("combine flint with steel", actions).action).toEqual({ type: "CRAFT", recipeId: "light_torch" });
    expect(mapCommand("mix herb with water", actions).action).toEqual({ type: "CRAFT", recipeId: "brew_potion" });
    expect(mapCommand("join herb and water", actions).action).toEqual({ type: "CRAFT", recipeId: "brew_potion" });
    expect(mapCommand("connect herb to water", actions).action).toEqual({ type: "CRAFT", recipeId: "brew_potion" });
  });

  it("handles Cycle #59 newly added synonyms and complex verb structures", () => {
    const actions = [
      { id: "move-east", command: "go east", action: { type: "MOVE" as const, direction: "east" } },
      { id: "look-scroll", command: "look scroll", action: { type: "LOOK" as const, target: "scroll" } },
      { id: "take-receptacle", command: "take wooden container", action: { type: "TAKE" as const, item: "container" } },
      { id: "drop-sabre", command: "drop sharp sabre", action: { type: "DROP" as const, item: "sabre" } },
      { id: "open-hatch", command: "open iron hatch", action: { type: "OPEN" as const, target: "hatch" } },
      { id: "close-grate", command: "close rusty grate", action: { type: "CLOSE" as const, target: "grate" } },
      {
        id: "unlock-hatch",
        command: "unlock iron hatch with key",
        action: { type: "UNLOCK" as const, target: "hatch" },
      },
      { id: "use-brew", command: "use magic brew", action: { type: "USE" as const, item: "brew" } },
      { id: "talk-clerk", command: "talk to shopkeeper clerk", action: { type: "TALK" as const, npc: "clerk" } },
      { id: "give-gold", command: "give money to enforcer", action: { type: "GIVE" as const, target: "enforcer" } },
      { id: "fight-brigand", command: "fight outlaw brigand", action: { type: "FIGHT" as const, npc: "brigand" } },
      {
        id: "cast-magic",
        command: "cast magic on brigand",
        action: { type: "CAST" as const, spell: "spell", target: "brigand" },
      },
      { id: "flee-brigand", command: "flee brigand", action: { type: "FLEE" as const } },
      { id: "buy-knife", command: "buy sharp knife from merchant", action: { type: "BUY" as const, item: "knife" } },
      { id: "sell-knife", command: "sell sharp knife to merchant", action: { type: "SELL" as const, item: "knife" } },
    ];

    expect(mapCommand("walk towards the east", actions).action).toEqual({ type: "MOVE", direction: "east" });
    expect(mapCommand("read the scroll", actions).action).toEqual({ type: "LOOK", target: "scroll" });
    expect(mapCommand("grab the wooden container", actions).action).toEqual({ type: "TAKE", item: "container" });
    expect(mapCommand("get rid of the sabre", actions).action).toEqual({ type: "DROP", item: "sabre" });
    expect(mapCommand("open the hatch", actions).action).toEqual({ type: "OPEN", target: "hatch" });
    expect(mapCommand("close the grate", actions).action).toEqual({ type: "CLOSE", target: "grate" });
    expect(mapCommand("unlock the hatch", actions).action).toEqual({ type: "UNLOCK", target: "hatch" });
    expect(mapCommand("drink the magic brew", actions).action).toEqual({ type: "USE", item: "brew" });
    expect(mapCommand("talk with the clerk", actions).action).toEqual({ type: "TALK", npc: "clerk" });
    expect(mapCommand("give the money to enforcer", actions).action).toEqual({ type: "GIVE", target: "enforcer" });
    expect(mapCommand("fight the brigand", actions).action).toEqual({ type: "FIGHT", npc: "brigand" });
    expect(mapCommand("cast spell on the brigand", actions).action).toEqual({
      type: "CAST",
      spell: "spell",
      target: "brigand",
    });
    expect(mapCommand("run away from the brigand", actions).action).toEqual({ type: "FLEE" });
    expect(mapCommand("buy the knife from merchant", actions).action).toEqual({ type: "BUY", item: "knife" });
    expect(mapCommand("sell the knife to merchant", actions).action).toEqual({ type: "SELL", item: "knife" });
  });
});
