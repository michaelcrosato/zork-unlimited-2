import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";
import { getGreekNumber } from "../src/parser/tools/generate_synonyms.js";

describe("Greek Number Generation Verification", () => {
  it("should return valid Greek numbers up to 450", () => {
    for (let i = 1; i <= 450; i++) {
      const name = getGreekNumber(i);
      expect(name).toBeDefined();
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it("should return correct specific values", () => {
    expect(getGreekNumber(1)).toBe("hena");
    expect(getGreekNumber(10)).toBe("decarchy");
    expect(getGreekNumber(50)).toBe("pentacontarchy");
    expect(getGreekNumber(100)).toBe("hectarchy");
    expect(getGreekNumber(200)).toBe("dihectarchy");
    expect(getGreekNumber(250)).toBe("pentacontadihectarchy");
    expect(getGreekNumber(300)).toBe("trihectarchy");
    expect(getGreekNumber(350)).toBe("pentacontatrihectarchy");
    expect(getGreekNumber(400)).toBe("tetrahectarchy");
    expect(getGreekNumber(450)).toBe("pentacontatetrahectarchy");
  });
});

describe("Parser Synonym Expansion (Generated)", () => {
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

  describe("Phase 368 (Cycle #410)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of basophilocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of basophilocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transastatination altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive hexacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehexacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive hexacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and basophilocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and basophilocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all basophilocytoclastologist and basophiloblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full basophilocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-cascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodcascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an basophilocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 369 (Cycle #411)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of mesosomoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of mesosomoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transvanaheimstoneititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive henahexacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehenahexacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive henahexacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and mesosomoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and mesosomoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all mesosomoidblastocytoclastologist and mesosomoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full mesosomoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-pouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodpouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an mesosomoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 370 (Cycle #412)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of mesosomoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of mesosomoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transvanaheimstoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive dihexacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicedihexacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive dihexacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and mesosomoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and mesosomoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all mesosomoidcytoclastologist and mesosomoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full mesosomoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-streaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodstreaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an mesosomoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 371 (Cycle #413)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of pyrenoidoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of pyrenoidoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transvanaheimstoneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive trihexacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetrihexacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive trihexacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and pyrenoidoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and pyrenoidoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all pyrenoidoidblastocytoclastologist and pyrenoidoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full pyrenoidoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-splattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodsplattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an pyrenoidoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 372 (Cycle #414)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of pyrenoidoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of pyrenoidoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsvartalfheimstoneititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tetrahexacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetetrahexacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tetrahexacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and pyrenoidoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and pyrenoidoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all pyrenoidoidcytoclastologist and pyrenoidoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full pyrenoidoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an pyrenoidoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 373 (Cycle #415)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of chromoplastoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of chromoplastoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsvartalfheimstoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive pentahexacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicepentahexacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive pentahexacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and chromoplastoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and chromoplastoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all chromoplastoidblastocytoclastologist and chromoplastoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full chromoplastoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-dripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously blooddripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an chromoplastoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 374 (Cycle #416)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of chromoplastoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of chromoplastoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsvartalfheimstoneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive hexahexacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehexahexacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive hexahexacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and chromoplastoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and chromoplastoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all chromoplastoidcytoclastologist and chromoplastoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full chromoplastoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-flowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodflowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an chromoplastoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 375 (Cycle #417)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of statolithoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of statolithoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transalfheimstoneititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive heptahexacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceheptahexacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive heptahexacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and statolithoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and statolithoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all statolithoidblastocytoclastologist and statolithoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full statolithoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an statolithoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 376 (Cycle #418)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of statolithoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of statolithoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transalfheimstoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive octahexacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceoctahexacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive octahexacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and statolithoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and statolithoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all statolithoidcytoclastologist and statolithoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full statolithoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-gushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodgushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an statolithoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 377 (Cycle #419)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of leucoplastoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of leucoplastoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transalfheimstoneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive enneahexacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceenneahexacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive enneahexacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and leucoplastoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and leucoplastoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all leucoplastoidblastocytoclastologist and leucoplastoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full leucoplastoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-welling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodwelling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an leucoplastoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 378 (Cycle #420)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of leucoplastoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of leucoplastoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transjotunheimstoneititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive heptacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceheptacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive heptacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and leucoplastoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and leucoplastoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all leucoplastoidcytoclastologist and leucoplastoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full leucoplastoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-cascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodcascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an leucoplastoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 379 (Cycle #421)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of etioplastoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of etioplastoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transjotunheimstoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive henaheptacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehenaheptacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive henaheptacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and etioplastoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and etioplastoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all etioplastoidblastocytoclastologist and etioplastoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full etioplastoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-pouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodpouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an etioplastoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 380 (Cycle #422)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of etioplastoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of etioplastoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transjotunheimstoneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive diheptacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicediheptacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive diheptacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and etioplastoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and etioplastoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all etioplastoidcytoclastologist and etioplastoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full etioplastoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-streaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodstreaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an etioplastoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 381 (Cycle #423)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of proteinoplastoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of proteinoplastoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transhelheimstoneititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive triheptacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetriheptacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive triheptacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and proteinoplastoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and proteinoplastoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all proteinoplastoidblastocytoclastologist and proteinoplastoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full proteinoplastoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-splattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodsplattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an proteinoplastoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 382 (Cycle #424)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of proteinoplastoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of proteinoplastoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transhelheimstoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tetraheptacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetetraheptacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tetraheptacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and proteinoplastoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and proteinoplastoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all proteinoplastoidcytoclastologist and proteinoplastoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full proteinoplastoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an proteinoplastoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 383 (Cycle #425)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of elaioplastoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of elaioplastoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transhelheimstoneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive pentaheptacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicepentaheptacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive pentaheptacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and elaioplastoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and elaioplastoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all elaioplastoidblastocytoclastologist and elaioplastoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full elaioplastoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-dripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously blooddripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an elaioplastoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 384 (Cycle #426)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of elaioplastoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of elaioplastoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmuspelheimstoneititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive hexaheptacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehexaheptacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive hexaheptacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and elaioplastoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and elaioplastoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all elaioplastoidcytoclastologist and elaioplastoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full elaioplastoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-flowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodflowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an elaioplastoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 385 (Cycle #427)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of amyloplastoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of amyloplastoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmuspelheimstoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive heptaheptacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceheptaheptacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive heptaheptacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and amyloplastoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and amyloplastoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all amyloplastoidblastocytoclastologist and amyloplastoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full amyloplastoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an amyloplastoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 386 (Cycle #428)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of amyloplastoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of amyloplastoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmuspelheimstoneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive octaheptacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceoctaheptacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive octaheptacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and amyloplastoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and amyloplastoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all amyloplastoidcytoclastologist and amyloplastoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full amyloplastoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-gushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodgushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an amyloplastoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 387 (Cycle #429)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of chloroplastoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of chloroplastoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transniflheimstoneititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive enneaheptacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceenneaheptacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive enneaheptacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and chloroplastoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and chloroplastoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all chloroplastoidblastocytoclastologist and chloroplastoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full chloroplastoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-welling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodwelling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an chloroplastoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 388 (Cycle #430)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of chloroplastoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of chloroplastoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transniflheimstoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive octacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceoctacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive octacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and chloroplastoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and chloroplastoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all chloroplastoidcytoclastologist and chloroplastoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full chloroplastoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-cascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodcascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an chloroplastoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 389 (Cycle #431)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of chromatinoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of chromatinoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transniflheimstoneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive henaoctacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehenaoctacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive henaoctacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and chromatinoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and chromatinoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all chromatinoidblastocytoclastologist and chromatinoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full chromatinoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-pouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodpouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an chromatinoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 390 (Cycle #432)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of chromatinoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of chromatinoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transgladsheimstoneititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive dioctacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicedioctacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive dioctacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and chromatinoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and chromatinoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all chromatinoidcytoclastologist and chromatinoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full chromatinoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-streaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodstreaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an chromatinoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 391 (Cycle #433)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of tonoplastoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of tonoplastoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transgladsheimstoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive trioctacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetrioctacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive trioctacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and tonoplastoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and tonoplastoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all tonoplastoidblastocytoclastologist and tonoplastoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full tonoplastoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-splattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodsplattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an tonoplastoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 392 (Cycle #434)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of tonoplastoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of tonoplastoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transgladsheimstoneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tetraoctacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetetraoctacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tetraoctacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and tonoplastoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and tonoplastoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all tonoplastoidcytoclastologist and tonoplastoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full tonoplastoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an tonoplastoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 393 (Cycle #435)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of plasmodesmatoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of plasmodesmatoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmidgardititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive pentaoctacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicepentaoctacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive pentaoctacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and plasmodesmatoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and plasmodesmatoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all plasmodesmatoidblastocytoclastologist and plasmodesmatoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full plasmodesmatoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-dripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously blooddripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an plasmodesmatoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 394 (Cycle #436)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of plasmodesmatoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of plasmodesmatoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmidgarditeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive hexaoctacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehexaoctacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive hexaoctacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and plasmodesmatoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and plasmodesmatoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all plasmodesmatoidcytoclastologist and plasmodesmatoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full plasmodesmatoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-flowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodflowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an plasmodesmatoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 395 (Cycle #437)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of dictyosomoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of dictyosomoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transvalhallastoneititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive heptaoctacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceheptaoctacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive heptaoctacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and dictyosomoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and dictyosomoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all dictyosomoidblastocytoclastologist and dictyosomoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full dictyosomoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an dictyosomoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 396 (Cycle #438)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of dictyosomoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of dictyosomoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transvalhallastoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive octaoctacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceoctaoctacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive octaoctacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and dictyosomoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and dictyosomoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all dictyosomoidcytoclastologist and dictyosomoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full dictyosomoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-gushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodgushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an dictyosomoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 397 (Cycle #439)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of spliceosomoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of spliceosomoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transvalhallastoneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive enneaoctacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceenneaoctacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive enneaoctacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and spliceosomoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and spliceosomoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all spliceosomoidblastocytoclastologist and spliceosomoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full spliceosomoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-welling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodwelling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an spliceosomoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 398 (Cycle #440)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of spliceosomoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of spliceosomoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transbifroststoneititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive enneacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceenneacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive enneacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and spliceosomoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and spliceosomoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all spliceosomoidcytoclastologist and spliceosomoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full spliceosomoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-cascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodcascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an spliceosomoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 399 (Cycle #441)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of histonoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of histonoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transbifroststoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive henaenneacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehenaenneacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive henaenneacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and histonoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and histonoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all histonoidblastocytoclastologist and histonoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full histonoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-pouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodpouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an histonoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 400 (Cycle #442)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of histonoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of histonoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transbifroststoneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive dienneacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicedienneacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive dienneacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and histonoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and histonoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all histonoidcytoclastologist and histonoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full histonoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-streaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodstreaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an histonoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 401 (Cycle #443)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of nucleosomoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of nucleosomoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transasgardstoneititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive trienneacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetrienneacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive trienneacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and nucleosomoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and nucleosomoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all nucleosomoidblastocytoclastologist and nucleosomoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full nucleosomoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-splattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodsplattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an nucleosomoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 402 (Cycle #444)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of nucleosomoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of nucleosomoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transasgardstoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tetraenneacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetetraenneacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tetraenneacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and nucleosomoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and nucleosomoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all nucleosomoidcytoclastologist and nucleosomoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full nucleosomoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an nucleosomoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 403 (Cycle #445)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of melanosomoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of melanosomoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transasgardstoneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive pentaenneacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicepentaenneacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive pentaenneacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and melanosomoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and melanosomoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all melanosomoidblastocytoclastologist and melanosomoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full melanosomoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-dripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously blooddripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an melanosomoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 404 (Cycle #446)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of melanosomoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of melanosomoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transdryadititeititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive hexaenneacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehexaenneacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive hexaenneacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and melanosomoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and melanosomoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all melanosomoidcytoclastologist and melanosomoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full melanosomoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-flowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodflowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an melanosomoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 405 (Cycle #447)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of endosomoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of endosomoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transnymphstoneititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive heptaenneacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceheptaenneacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive heptaenneacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and endosomoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and endosomoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all endosomoidblastocytoclastologist and endosomoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full endosomoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an endosomoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 406 (Cycle #448)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of endosomoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of endosomoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsatyrititeititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive octaenneacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceoctaenneacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive octaenneacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and endosomoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and endosomoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all endosomoidcytoclastologist and endosomoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full endosomoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-gushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodgushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an endosomoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 407 (Cycle #449)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of autophagosomoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of autophagosomoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transpegasusstoneititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive enneaenneacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceenneaenneacontarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive enneaenneacontarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and autophagosomoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and autophagosomoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all autophagosomoidblastocytoclastologist and autophagosomoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full autophagosomoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-welling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodwelling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an autophagosomoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 408 (Cycle #450)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of autophagosomoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of autophagosomoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transhydrastoneititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive hectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive hectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and autophagosomoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and autophagosomoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all autophagosomoidcytoclastologist and autophagosomoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full autophagosomoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-cascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodcascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an autophagosomoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 409 (Cycle #451)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of microfilamentoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of microfilamentoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcerberiteititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive henahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehenahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive henahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and microfilamentoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and microfilamentoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all microfilamentoidblastocytoclastologist and microfilamentoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full microfilamentoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-pouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodpouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an microfilamentoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 410 (Cycle #452)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of microfilamentoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of microfilamentoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transyggdrasilstoneititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive dihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicedihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive dihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and microfilamentoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and microfilamentoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all microfilamentoidcytoclastologist and microfilamentoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full microfilamentoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-streaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodstreaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an microfilamentoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 411 (Cycle #453)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of microtubuloidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of microtubuloidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transyggdrasilstoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive trihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive trihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and microtubuloidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and microtubuloidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all microtubuloidblastocytoclastologist and microtubuloidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full microtubuloidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-splattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodsplattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an microtubuloidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 412 (Cycle #454)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of microtubuloidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of microtubuloidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transyggdrasilstoneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tetrahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetetrahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tetrahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and microtubuloidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and microtubuloidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all microtubuloidcytoclastologist and microtubuloidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full microtubuloidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an microtubuloidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 413 (Cycle #455)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of flagellooidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of flagellooidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transhelstoneititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive pentahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicepentahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive pentahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and flagellooidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and flagellooidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all flagellooidblastocytoclastologist and flagellooidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full flagellooidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-dripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously blooddripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an flagellooidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 414 (Cycle #456)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of flagellooidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of flagellooidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transhelstoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive hexahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehexahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive hexahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and flagellooidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and flagellooidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all flagellooidcytoclastologist and flagellooidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full flagellooidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-flowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodflowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an flagellooidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 415 (Cycle #457)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of ciliooidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of ciliooidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transhelstoneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive heptahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceheptahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive heptahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and ciliooidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and ciliooidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all ciliooidblastocytoclastologist and ciliooidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full ciliooidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an ciliooidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 416 (Cycle #458)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of ciliooidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of ciliooidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transfreystoneititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive octahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceoctahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive octahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and ciliooidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and ciliooidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all ciliooidcytoclastologist and ciliooidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full ciliooidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-gushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodgushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an ciliooidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 417 (Cycle #459)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of golgioidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of golgioidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transfreystoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive enneahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceenneahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive enneahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and golgioidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and golgioidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all golgioidblastocytoclastologist and golgioidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full golgioidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-welling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodwelling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an golgioidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 418 (Cycle #460)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of golgioidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of golgioidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transfreystoneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive decahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicedecahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive decahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and golgioidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and golgioidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all golgioidcytoclastologist and golgioidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full golgioidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-cascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodcascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an golgioidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 419 (Cycle #461)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of membranoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of membranoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual translokistoneititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive henadecahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehenadecahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive henadecahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and membranoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and membranoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all membranoidblastocytoclastologist and membranoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full membranoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-pouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodpouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an membranoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 420 (Cycle #462)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of membranoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of membranoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual translokistoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive didecahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicedidecahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive didecahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and membranoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and membranoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all membranoidcytoclastologist and membranoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full membranoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-streaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodstreaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an membranoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 421 (Cycle #463)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of cytoskeletonoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of cytoskeletonoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual translokistoneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tridecahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetridecahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tridecahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and cytoskeletonoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and cytoskeletonoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all cytoskeletonoidblastocytoclastologist and cytoskeletonoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full cytoskeletonoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-splattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodsplattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an cytoskeletonoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 422 (Cycle #464)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of cytoskeletonoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of cytoskeletonoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transthorstoneititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tetradecahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetetradecahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tetradecahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and cytoskeletonoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and cytoskeletonoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all cytoskeletonoidcytoclastologist and cytoskeletonoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full cytoskeletonoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an cytoskeletonoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 423 (Cycle #465)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of myofibriloidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of myofibriloidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transthorstoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive pentadecahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicepentadecahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive pentadecahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and myofibriloidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and myofibriloidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all myofibriloidblastocytoclastologist and myofibriloidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full myofibriloidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-dripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously blooddripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an myofibriloidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 424 (Cycle #466)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of myofibriloidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of myofibriloidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transthorstoneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive hexadecahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehexadecahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive hexadecahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and myofibriloidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and myofibriloidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all myofibriloidcytoclastologist and myofibriloidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full myofibriloidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-flowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodflowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an myofibriloidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 425 (Cycle #467)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of neurofilamentoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of neurofilamentoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transodinstoneititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive heptadecahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceheptadecahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive heptadecahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and neurofilamentoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and neurofilamentoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all neurofilamentoidblastocytoclastologist and neurofilamentoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full neurofilamentoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an neurofilamentoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 426 (Cycle #468)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of neurofilamentoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of neurofilamentoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transodinstoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive octadecahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceoctadecahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive octadecahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and neurofilamentoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and neurofilamentoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all neurofilamentoidcytoclastologist and neurofilamentoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full neurofilamentoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-gushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodgushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an neurofilamentoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 427 (Cycle #469)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of desmosomoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of desmosomoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transodinstoneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive enneadecahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceenneadecahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive enneadecahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and desmosomoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and desmosomoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all desmosomoidblastocytoclastologist and desmosomoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full desmosomoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-welling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodwelling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an desmosomoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 428 (Cycle #470)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of desmosomoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of desmosomoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmidgardstoneititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive icosahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceicosahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive icosahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and desmosomoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and desmosomoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all desmosomoidcytoclastologist and desmosomoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full desmosomoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-cascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodcascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an desmosomoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 429 (Cycle #471)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of spindleoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of spindleoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmidgardstoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive henaicosahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehenaicosahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive henaicosahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and spindleoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and spindleoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all spindleoidblastocytoclastologist and spindleoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full spindleoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-pouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodpouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an spindleoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 430 (Cycle #472)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of spindleoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of spindleoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmidgardstoneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive diicosahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicediicosahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive diicosahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and spindleoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and spindleoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all spindleoidcytoclastologist and spindleoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full spindleoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-streaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodstreaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an spindleoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 431 (Cycle #473)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of kinetochoroidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of kinetochoroidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transjormungandriteititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive triicosahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetriicosahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive triicosahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and kinetochoroidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and kinetochoroidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all kinetochoroidblastocytoclastologist and kinetochoroidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full kinetochoroidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-splattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodsplattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an kinetochoroidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 432 (Cycle #474)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of kinetochoroidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of kinetochoroidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transjormungandrititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tetraicosahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetetraicosahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tetraicosahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and kinetochoroidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and kinetochoroidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all kinetochoroidcytoclastologist and kinetochoroidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full kinetochoroidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an kinetochoroidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 433 (Cycle #475)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of telomeroidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of telomeroidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transjormungandriteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive pentaicosahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicepentaicosahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive pentaicosahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and telomeroidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and telomeroidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all telomeroidblastocytoclastologist and telomeroidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full telomeroidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-dripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously blooddripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an telomeroidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 434 (Cycle #476)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of telomeroidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of telomeroidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transfenririteititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive hexaicosahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehexaicosahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive hexaicosahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and telomeroidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and telomeroidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all telomeroidcytoclastologist and telomeroidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full telomeroidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-flowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodflowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an telomeroidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 435 (Cycle #477)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of centromeroidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of centromeroidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transfenrirititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive heptaicosahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceheptaicosahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive heptaicosahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and centromeroidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and centromeroidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all centromeroidblastocytoclastologist and centromeroidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full centromeroidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an centromeroidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 436 (Cycle #478)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of centromeroidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of centromeroidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transfenririteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive octaicosahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceoctaicosahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive octaicosahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and centromeroidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and centromeroidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all centromeroidcytoclastologist and centromeroidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full centromeroidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-gushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodgushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an centromeroidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 437 (Cycle #479)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of myeloplasmoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of myeloplasmoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transvalkyriestoneititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive enneaicosahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceenneaicosahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive enneaicosahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and myeloplasmoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and myeloplasmoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all myeloplasmoidblastocytoclastologist and myeloplasmoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full myeloplasmoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-welling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodwelling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an myeloplasmoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 438 (Cycle #480)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of myeloplasmoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of myeloplasmoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transvalkyriestoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive triacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetriacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive triacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and myeloplasmoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and myeloplasmoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all myeloplasmoidcytoclastologist and myeloplasmoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full myeloplasmoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-cascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodcascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an myeloplasmoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 439 (Cycle #481)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of reticuloplasmoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of reticuloplasmoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transvalkyriestoneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive henatriacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehenatriacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive henatriacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and reticuloplasmoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and reticuloplasmoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all reticuloplasmoidblastocytoclastologist and reticuloplasmoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full reticuloplasmoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-pouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodpouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an reticuloplasmoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 440 (Cycle #482)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of reticuloplasmoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of reticuloplasmoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcentauriteititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive ditriacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceditriacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive ditriacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and reticuloplasmoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and reticuloplasmoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all reticuloplasmoidcytoclastologist and reticuloplasmoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full reticuloplasmoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-streaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodstreaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an reticuloplasmoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 441 (Cycle #483)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of protoplasmoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of protoplasmoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsphinxstoneititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tritriacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetritriacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tritriacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and protoplasmoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and protoplasmoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all protoplasmoidblastocytoclastologist and protoplasmoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full protoplasmoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-splattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodsplattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an protoplasmoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 442 (Cycle #484)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of protoplasmoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of protoplasmoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmanticoreiteititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tetratriacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetetratriacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tetratriacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and protoplasmoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and protoplasmoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all protoplasmoidcytoclastologist and protoplasmoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full protoplasmoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an protoplasmoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 443 (Cycle #485)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of karyoplasmoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of karyoplasmoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsirenstoneititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive pentatriacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicepentatriacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive pentatriacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and karyoplasmoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and karyoplasmoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all karyoplasmoidblastocytoclastologist and karyoplasmoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full karyoplasmoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-dripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously blooddripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an karyoplasmoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 444 (Cycle #486)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of karyoplasmoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of karyoplasmoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transharpyiteititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive hexatriacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehexatriacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive hexatriacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and karyoplasmoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and karyoplasmoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all karyoplasmoidcytoclastologist and karyoplasmoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full karyoplasmoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-flowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodflowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an karyoplasmoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 445 (Cycle #487)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of nucleoplasmoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of nucleoplasmoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcyclopsstoneititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive heptatriacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceheptatriacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive heptatriacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and nucleoplasmoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and nucleoplasmoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all nucleoplasmoidblastocytoclastologist and nucleoplasmoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full nucleoplasmoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an nucleoplasmoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 446 (Cycle #488)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of nucleoplasmoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of nucleoplasmoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transminotauriteititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive octatriacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceoctatriacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive octatriacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and nucleoplasmoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and nucleoplasmoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all nucleoplasmoidcytoclastologist and nucleoplasmoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full nucleoplasmoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-gushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodgushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an nucleoplasmoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 447 (Cycle #489)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of cytoplasmoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of cytoplasmoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transgorgoniteititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive enneatriacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceenneatriacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive enneatriacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and cytoplasmoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and cytoplasmoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all cytoplasmoidblastocytoclastologist and cytoplasmoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full cytoplasmoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-welling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodwelling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an cytoplasmoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 448 (Cycle #490)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of cytoplasmoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of cytoplasmoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transkrakeniteititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tetracontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetetracontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tetracontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and cytoplasmoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and cytoplasmoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all cytoplasmoidcytoclastologist and cytoplasmoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full cytoplasmoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-cascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodcascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an cytoplasmoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 449 (Cycle #491)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of cytosoloidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of cytosoloidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transbasiliskstoneititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive henatetracontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehenatetracontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive henatetracontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and cytosoloidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and cytosoloidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all cytosoloidblastocytoclastologist and cytosoloidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full cytosoloidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-pouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodpouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an cytosoloidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 450 (Cycle #492)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of cytosoloidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of cytosoloidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transwyvernstoneititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive ditetracontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceditetracontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive ditetracontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and cytosoloidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and cytosoloidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all cytosoloidcytoclastologist and cytosoloidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full cytosoloidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-streaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodstreaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an cytosoloidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 451 (Cycle #493)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of organelloidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of organelloidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transchimeraititeititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tritetracontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetritetracontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tritetracontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and organelloidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and organelloidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all organelloidblastocytoclastologist and organelloidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full organelloidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-splattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodsplattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an organelloidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 452 (Cycle #494)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of organelloidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of organelloidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transgriffonstoneititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tetratetracontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetetratetracontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tetratetracontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and organelloidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and organelloidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all organelloidcytoclastologist and organelloidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full organelloidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an organelloidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 453 (Cycle #495)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of plasmidoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of plasmidoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transpegasiteititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive pentatetracontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicepentatetracontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive pentatetracontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and plasmidoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and plasmidoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all plasmidoidblastocytoclastologist and plasmidoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full plasmidoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-dripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously blooddripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an plasmidoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 454 (Cycle #496)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of plasmidoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of plasmidoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transphoenixstoneititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive hexatetracontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehexatetracontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive hexatetracontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and plasmidoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and plasmidoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all plasmidoidcytoclastologist and plasmidoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full plasmidoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-flowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodflowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an plasmidoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 455 (Cycle #497)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of chromosomoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of chromosomoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transdryadititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive heptatetracontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceheptatetracontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive heptatetracontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and chromosomoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and chromosomoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all chromosomoidblastocytoclastologist and chromosomoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full chromosomoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an chromosomoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 456 (Cycle #498)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of chromosomoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of chromosomoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transdryaditeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive octatetracontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceoctatetracontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive octatetracontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and chromosomoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and chromosomoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all chromosomoidcytoclastologist and chromosomoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full chromosomoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-gushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodgushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an chromosomoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 457 (Cycle #499)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of centrioloidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of centrioloidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transnymphstoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive enneatetracontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceenneatetracontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive enneatetracontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and centrioloidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and centrioloidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all centrioloidblastocytoclastologist and centrioloidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full centrioloidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-welling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodwelling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an centrioloidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 458 (Cycle #500)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of centrioloidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of centrioloidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transnymphstoneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive pentacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicepentacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive pentacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and centrioloidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and centrioloidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all centrioloidcytoclastologist and centrioloidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full centrioloidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-cascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodcascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an centrioloidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 459 (Cycle #501)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of vesiculoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of vesiculoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsatyrititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive henapentacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehenapentacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive henapentacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and vesiculoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and vesiculoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all vesiculoidblastocytoclastologist and vesiculoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full vesiculoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-pouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodpouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an vesiculoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 460 (Cycle #502)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of vesiculoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of vesiculoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsatyriteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive dipentacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicedipentacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive dipentacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and vesiculoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and vesiculoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all vesiculoidcytoclastologist and vesiculoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full vesiculoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-streaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodstreaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an vesiculoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 461 (Cycle #503)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of vacuoloidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of vacuoloidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transpegasusstoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tripentacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetripentacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tripentacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and vacuoloidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and vacuoloidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all vacuoloidblastocytoclastologist and vacuoloidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full vacuoloidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-splattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodsplattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an vacuoloidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 462 (Cycle #504)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of vacuoloidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of vacuoloidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transpegasusstoneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tetrapentacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetetrapentacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tetrapentacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and vacuoloidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and vacuoloidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all vacuoloidcytoclastologist and vacuoloidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full vacuoloidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an vacuoloidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 463 (Cycle #505)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of nucleoidoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of nucleoidoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcentaurititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive pentapentacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicepentapentacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive pentapentacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and nucleoidoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and nucleoidoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all nucleoidoidblastocytoclastologist and nucleoidoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full nucleoidoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-dripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously blooddripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an nucleoidoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 464 (Cycle #506)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of nucleoidoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of nucleoidoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcentauriteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive hexapentacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehexapentacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive hexapentacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and nucleoidoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and nucleoidoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all nucleoidoidcytoclastologist and nucleoidoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full nucleoidoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-flowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodflowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an nucleoidoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 465 (Cycle #507)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of nucleoloidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of nucleoloidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsphinxstoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive heptapentacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceheptapentacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive heptapentacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and nucleoloidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and nucleoloidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all nucleoloidblastocytoclastologist and nucleoloidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full nucleoloidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an nucleoloidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 466 (Cycle #508)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of nucleoloidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of nucleoloidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsphinxstoneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive octapentacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceoctapentacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive octapentacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and nucleoloidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and nucleoloidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all nucleoloidcytoclastologist and nucleoloidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full nucleoloidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-gushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodgushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an nucleoloidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 467 (Cycle #509)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of plastidoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of plastidoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmanticoreititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive enneapentacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceenneapentacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive enneapentacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and plastidoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and plastidoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all plastidoidblastocytoclastologist and plastidoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full plastidoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-welling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodwelling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an plastidoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 468 (Cycle #510)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of plastidoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of plastidoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmanticoreiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive hexacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehexacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive hexacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and plastidoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and plastidoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all plastidoidcytoclastologist and plastidoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full plastidoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-cascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodcascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an plastidoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 469 (Cycle #511)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of peroxisomoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of peroxisomoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsirenstoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive henahexacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehenahexacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive henahexacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and peroxisomoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and peroxisomoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all peroxisomoidblastocytoclastologist and peroxisomoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full peroxisomoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-pouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodpouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an peroxisomoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 470 (Cycle #512)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of peroxisomoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of peroxisomoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsirenstoneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive dihexacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicedihexacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive dihexacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and peroxisomoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and peroxisomoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all peroxisomoidcytoclastologist and peroxisomoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full peroxisomoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-streaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodstreaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an peroxisomoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 471 (Cycle #513)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of lysosomoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of lysosomoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transharpyititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive trihexacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetrihexacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive trihexacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and lysosomoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and lysosomoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all lysosomoidblastocytoclastologist and lysosomoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full lysosomoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-splattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodsplattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an lysosomoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 472 (Cycle #514)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of lysosomoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of lysosomoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transharpyiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tetrahexacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetetrahexacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tetrahexacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and lysosomoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and lysosomoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all lysosomoidcytoclastologist and lysosomoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full lysosomoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an lysosomoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 473 (Cycle #515)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of mitochondrioidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of mitochondrioidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcyclopsstoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive pentahexacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicepentahexacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive pentahexacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and mitochondrioidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and mitochondrioidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all mitochondrioidblastocytoclastologist and mitochondrioidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full mitochondrioidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-dripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously blooddripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an mitochondrioidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 474 (Cycle #516)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of mitochondrioidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of mitochondrioidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcyclopsstoneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive hexahexacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehexahexacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive hexahexacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and mitochondrioidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and mitochondrioidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all mitochondrioidcytoclastologist and mitochondrioidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full mitochondrioidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-flowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodflowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an mitochondrioidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 475 (Cycle #517)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of ribosomoidblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of ribosomoidblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transminotaurititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive heptahexacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceheptahexacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive heptahexacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and ribosomoidblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and ribosomoidblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all ribosomoidblastocytoclastologist and ribosomoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full ribosomoidblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an ribosomoidblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 476 (Cycle #518)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of ribosomoidcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of ribosomoidcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transminotauriteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive octahexacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceoctahexacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive octahexacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and ribosomoidcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and ribosomoidcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all ribosomoidcytoclastologist and ribosomoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full ribosomoidcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-gushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodgushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an ribosomoidcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 477 (Cycle #519)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of ependymalblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of ependymalblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transgorgonititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive enneahexacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceenneahexacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive enneahexacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and ependymalblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and ependymalblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all ependymalblastocytoclastologist and ependymalblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full ependymalblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-welling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodwelling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an ependymalblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 478 (Cycle #520)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of schwannblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of schwannblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transgorgoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive heptacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceheptacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive heptacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and schwannblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and schwannblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all schwannblastocytoclastologist and schwannblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full schwannblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-cascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodcascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an schwannblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 479 (Cycle #521)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of purkinjoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of purkinjoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transkrakenititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive henaheptacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehenaheptacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive henaheptacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and purkinjoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and purkinjoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all purkinjoblastocytoclastologist and purkinjoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full purkinjoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-pouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodpouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an purkinjoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 480 (Cycle #522)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of tenocytoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of tenocytoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transkrakeniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive diheptacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicediheptacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive diheptacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and tenocytoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and tenocytoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all tenocytoblastocytoclastologist and tenocytoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full tenocytoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-streaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodstreaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an tenocytoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 481 (Cycle #523)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of keratocytoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of keratocytoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transbasiliskstoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive triheptacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetriheptacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive triheptacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and keratocytoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and keratocytoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all keratocytoblastocytoclastologist and keratocytoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full keratocytoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-splattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodsplattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an keratocytoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 482 (Cycle #524)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of epithelialblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of epithelialblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transbasiliskstoneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tetraheptacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetetraheptacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tetraheptacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and epithelialblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and epithelialblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all epithelialblastocytoclastologist and epithelialblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full epithelialblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an epithelialblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 483 (Cycle #525)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of mesothelialblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of mesothelialblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transwyvernstoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive pentaheptacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicepentaheptacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive pentaheptacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and mesothelialblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and mesothelialblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all mesothelialblastocytoclastologist and mesothelialblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full mesothelialblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-dripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously blooddripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an mesothelialblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 484 (Cycle #526)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of endothelialblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of endothelialblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transwyvernstoneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive hexaheptacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehexaheptacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive hexaheptacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and endothelialblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and endothelialblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all endothelialblastocytoclastologist and endothelialblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full endothelialblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-flowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodflowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an endothelialblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 485 (Cycle #527)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of pericytoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of pericytoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transchimeraititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive heptaheptacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceheptaheptacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive heptaheptacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and pericytoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and pericytoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all pericytoblastocytoclastologist and pericytoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full pericytoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an pericytoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 486 (Cycle #528)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of lipoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of lipoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transchimeraiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive octaheptacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceoctaheptacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive octaheptacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and lipoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and lipoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all lipoblastocytoclastologist and lipoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full lipoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-gushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodgushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an lipoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 487 (Cycle #529)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of plasmacytoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of plasmacytoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transgriffonstoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive enneaheptacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceenneaheptacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive enneaheptacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and plasmacytoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and plasmacytoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all plasmacytoblastocytoclastologist and plasmacytoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full plasmacytoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-welling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodwelling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an plasmacytoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 488 (Cycle #530)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of mastocytoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of mastocytoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transgriffonstoneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive octacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceoctacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive octacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and mastocytoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and mastocytoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all mastocytoblastocytoclastologist and mastocytoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full mastocytoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-cascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodcascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an mastocytoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 489 (Cycle #531)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of histiocytoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of histiocytoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transpegasititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive henaoctacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehenaoctacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive henaoctacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and histiocytoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and histiocytoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all histiocytoblastocytoclastologist and histiocytoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full histiocytoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-pouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodpouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an histiocytoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 490 (Cycle #532)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of reticuloblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of reticuloblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transpegasiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive dioctacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicedioctacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive dioctacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and reticuloblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and reticuloblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all reticuloblastocytoclastologist and reticuloblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full reticuloblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-streaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodstreaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an reticuloblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 491 (Cycle #533)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of adipoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of adipoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transhydrastonititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive trioctacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetrioctacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive trioctacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and adipoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and adipoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all adipoblastocytoclastologist and adipoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full adipoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-splattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodsplattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an adipoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 492 (Cycle #534)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of dendritoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of dendritoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transhydrastoneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tetraoctacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetetraoctacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tetraoctacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and dendritoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and dendritoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all dendritoblastocytoclastologist and dendritoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full dendritoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an dendritoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 493 (Cycle #535)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of macrophagoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of macrophagoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transphoenixstoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive pentaoctacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicepentaoctacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive pentaoctacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and macrophagoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and macrophagoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all macrophagoblastocytoclastologist and macrophagoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full macrophagoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-dripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously blooddripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an macrophagoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 494 (Cycle #536)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of microglialcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of microglialcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transphoenixstoneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive hexaoctacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehexaoctacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive hexaoctacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and microglialcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and microglialcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all microglialcytoclastologist and microglialoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full microglialcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-flowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodflowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an microglialcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 495 (Cycle #537)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of microglioblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of microglioblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcerberititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive heptaoctacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceheptaoctacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive heptaoctacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and microglioblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and microglioblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all microglioblastocytoclastologist and microglioblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full microglioblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an microglioblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 496 (Cycle #538)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of oligodendrocytoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of oligodendrocytoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcerberiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive octaoctacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceoctaoctacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive octaoctacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and oligodendrocytoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and oligodendrocytoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all oligodendrocytoblastocytoclastologist and oligodendrocytoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full oligodendrocytoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-gushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodgushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an oligodendrocytoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 497 (Cycle #539)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of astrocytoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of astrocytoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetaeuxenititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive enneaoctacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceenneaoctacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive enneaoctacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and astrocytoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and astrocytoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all astrocytoblastocytoclastologist and astrocytoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full astrocytoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-welling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodwelling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an astrocytoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 498 (Cycle #540)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of keratinocytoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of keratinocytoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetaeuxeniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive enneacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceenneacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive enneacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and keratinocytoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and keratinocytoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all keratinocytoblastocytoclastologist and keratinocytoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full keratinocytoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-cascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodcascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an keratinocytoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 499 (Cycle #541)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of melanocytoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of melanocytoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetasamarskititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive henaenneacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehenaenneacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive henaenneacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and melanocytoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and melanocytoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all melanocytoblastocytoclastologist and melanocytoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full melanocytoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-pouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodpouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an melanocytoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 500 (Cycle #542)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of enterocytoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of enterocytoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetasamarskiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive dienneacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicedienneacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive dienneacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and enterocytoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and enterocytoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all enterocytoblastocytoclastologist and enterocytoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full enterocytoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-streaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodstreaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an enterocytoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 501 (Cycle #543)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of pneumocytoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of pneumocytoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetafergusonititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive trienneacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetrienneacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive trienneacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and pneumocytoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and pneumocytoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all pneumocytoblastocytoclastologist and pneumocytoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full pneumocytoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-splattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodsplattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an pneumocytoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 502 (Cycle #544)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of cardiocytoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of cardiocytoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetafergusoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tetraenneacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetetraenneacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tetraenneacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and cardiocytoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and cardiocytoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all cardiocytoblastocytoclastologist and cardiocytoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full cardiocytoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an cardiocytoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 503 (Cycle #545)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of nephrocytoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of nephrocytoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetabrannerititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive pentaenneacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicepentaenneacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive pentaenneacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and nephrocytoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and nephrocytoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all nephrocytoblastocytoclastologist and nephrocytoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full nephrocytoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-dripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously blooddripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an nephrocytoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 504 (Cycle #546)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of splenocytoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of splenocytoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetabranneriteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive hexaenneacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehexaenneacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive hexaenneacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and splenocytoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and splenocytoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all splenocytoblastocytoclastologist and splenocytoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full splenocytoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-flowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodflowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an splenocytoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 505 (Cycle #547)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of hepatocytoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of hepatocytoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetacoffinititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive heptaenneacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceheptaenneacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive heptaenneacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and hepatocytoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and hepatocytoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all hepatocytoblastocytoclastologist and hepatocytoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full hepatocytoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an hepatocytoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 506 (Cycle #548)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of myocytoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of myocytoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetacoffiniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive octaenneacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceoctaenneacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive octaenneacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and myocytoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and myocytoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all myocytoblastocytoclastologist and myocytoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full myocytoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-gushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodgushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an myocytoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 507 (Cycle #549)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of fibrocytoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of fibrocytoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetaurancircititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive enneaenneacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceenneaenneacontahectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive enneaenneacontahectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and fibrocytoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and fibrocytoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all fibrocytoblastocytoclastologist and fibrocytoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full fibrocytoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-welling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodwelling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an fibrocytoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 508 (Cycle #550)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of osteocytoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of osteocytoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetaurancirciteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive dihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicedihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive dihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and osteocytoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and osteocytoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all osteocytoblastocytoclastologist and osteocytoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full osteocytoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-cascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodcascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an osteocytoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 509 (Cycle #551)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of chondrocytoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of chondrocytoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetatyuyamunititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive henadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehenadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive henadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and chondrocytoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and chondrocytoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all chondrocytoblastocytoclastologist and chondrocytoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full chondrocytoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-pouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodpouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an chondrocytoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 510 (Cycle #552)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of glioblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of glioblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetatyuyamuniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive didihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicedidihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive didihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and glioblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and glioblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all glioblastocytoclastologist and glioblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full glioblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-streaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodstreaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an glioblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 511 (Cycle #553)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of pinocytocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of pinocytocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetacarnotititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tridihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetridihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tridihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and pinocytocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and pinocytocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all pinocytocytoclastologist and pinocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full pinocytocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-splattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodsplattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an pinocytocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 512 (Cycle #554)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of phagocytocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of phagocytocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetacarnotiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tetradihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetetradihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tetradihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and phagocytocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and phagocytocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all phagocytocytoclastologist and phagocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full phagocytocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an phagocytocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 513 (Cycle #555)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of agranulocytocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of agranulocytocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetauranospinititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive pentadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicepentadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive pentadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and agranulocytocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and agranulocytocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all agranulocytocytoclastologist and agranulocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full agranulocytocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-dripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously blooddripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an agranulocytocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 514 (Cycle #556)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of granulocytocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of granulocytocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetauranospiniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive hexadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehexadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive hexadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and granulocytocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and granulocytocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all granulocytocytoclastologist and granulocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full granulocytocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-flowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodflowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an granulocytocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 515 (Cycle #557)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of splenocytocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of splenocytocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetaheinrichititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive heptadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceheptadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive heptadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and splenocytocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and splenocytocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all splenocytocytoclastologist and splenocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full splenocytocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an splenocytocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 516 (Cycle #558)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of gliocytocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of gliocytocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetaheinrichiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive octadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceoctadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive octadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and gliocytocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and gliocytocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all gliocytocytoclastologist and gliocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full gliocytocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-gushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodgushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an gliocytocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 517 (Cycle #559)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of neurocytocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of neurocytocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetakahlerititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive enneadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceenneadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive enneadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and neurocytocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and neurocytocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all neurocytocytoclastologist and neurocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full neurocytocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-welling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodwelling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an neurocytocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 518 (Cycle #560)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of vesiculocytoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of vesiculocytoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetakahleriteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive decadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicedecadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive decadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and vesiculocytoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and vesiculocytoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all vesiculocytoblastocytoclastologist and vesiculocytoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full vesiculocytoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-cascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodcascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an vesiculocytoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 519 (Cycle #561)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of plastocytoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of plastocytoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetanovacekititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive henadecadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehenadecadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive henadecadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and plastocytoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and plastocytoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all plastocytoblastocytoclastologist and plastocytoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full plastocytoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-pouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodpouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an plastocytoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 520 (Cycle #562)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of nucleocytoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of nucleocytoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetanovacekiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive didecadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicedidecadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive didecadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and nucleocytoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and nucleocytoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all nucleocytoblastocytoclastologist and nucleocytoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full nucleocytoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-streaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodstreaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an nucleocytoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 521 (Cycle #563)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of karyoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of karyoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetasaleeititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tridecadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetridecadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tridecadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and karyoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and karyoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all karyoblastocytoclastologist and karyoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full karyoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-splattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodsplattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an karyoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 522 (Cycle #564)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of macrokaryocytocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of macrokaryocytocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetasaleeiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tetradecadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetetradecadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tetradecadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and macrokaryocytocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and macrokaryocytocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all macrokaryocytocytoclastologist and macrokaryocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full macrokaryocytocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an macrokaryocytocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 523 (Cycle #565)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of microkaryocytocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of microkaryocytocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetazeunerititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive pentadecadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicepentadecadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive pentadecadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and microkaryocytocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and microkaryocytocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all microkaryocytocytoclastologist and microkaryocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full microkaryocytocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-dripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously blooddripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an microkaryocytocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 524 (Cycle #566)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of mesokaryocytocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of mesokaryocytocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetazeuneriteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive hexadecadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehexadecadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive hexadecadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and mesokaryocytocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and mesokaryocytocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all mesokaryocytocytoclastologist and mesokaryocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full mesokaryocytocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-flowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodflowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an mesokaryocytocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 525 (Cycle #567)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of pinosomoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of pinosomoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetauranocircititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive heptadecadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceheptadecadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive heptadecadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and pinosomoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and pinosomoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all pinosomoblastocytoclastologist and pinosomeblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full pinosomoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an pinosomoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 526 (Cycle #568)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of pinosomocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of pinosomocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetauranocirciteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive octadecadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceoctadecadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive octadecadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and pinosomocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and pinosomocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all pinosomocytoclastologist and pinosomeoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full pinosomocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-gushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodgushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an pinosomocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 527 (Cycle #569)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of phagolysomoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of phagolysomoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetaautunititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive enneadecadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceenneadecadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive enneadecadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and phagolysomoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and phagolysomoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all phagolysomoblastocytoclastologist and phagolysomeblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full phagolysomoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-welling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodwelling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an phagolysomoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 528 (Cycle #570)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of phagolysomocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of phagolysomocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetaautuniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive icosadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceicosadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive icosadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and phagolysomocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and phagolysomocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all phagolysomocytoclastologist and phagolysomeoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full phagolysomocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-cascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodcascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an phagolysomocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 529 (Cycle #571)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of cytolysomoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of cytolysomoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetatorbernititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive henaicosadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehenaicosadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive henaicosadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and cytolysomoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and cytolysomoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all cytolysomoblastocytoclastologist and cytolysomeblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full cytolysomoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-pouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodpouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an cytolysomoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 530 (Cycle #572)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of cytolysomocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of cytolysomocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmetatorberniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive diicosadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicediicosadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive diicosadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and cytolysomocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and cytolysomocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all cytolysomocytoclastologist and cytolysomeoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full cytolysomocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-streaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodstreaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an cytolysomocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 531 (Cycle #573)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of naturalkillerblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of naturalkillerblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transstudtititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive triicosadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetriicosadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive triicosadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and naturalkillerblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and naturalkillerblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all naturalkillerblastocytoclastologist and naturalkillerblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full naturalkillerblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-splattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodsplattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an naturalkillerblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 532 (Cycle #574)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of naturalkillercytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of naturalkillercytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transstudtiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tetraicosadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetetraicosadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tetraicosadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and naturalkillercytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and naturalkillercytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all naturalkillercytoclastologist and naturalkilleroblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full naturalkillercytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an naturalkillercytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 533 (Cycle #575)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of bcellblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of bcellblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transfourmarierititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive pentaicosadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicepentaicosadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive pentaicosadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and bcellblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and bcellblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all bcellblastocytoclastologist and bcellblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full bcellblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-dripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously blooddripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an bcellblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 534 (Cycle #576)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of tcellblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of tcellblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transfourmarieriteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive hexaicosadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehexaicosadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive hexaicosadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and tcellblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and tcellblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all tcellblastocytoclastologist and tcellblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full tcellblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-flowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodflowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an tcellblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 535 (Cycle #577)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of agranulocyteblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of agranulocyteblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transvandendriesscheititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive heptaicosadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceheptaicosadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive heptaicosadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and agranulocyteblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and agranulocyteblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all agranulocyteblastocytoclastologist and agranulocyteblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full agranulocyteblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an agranulocyteblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 536 (Cycle #578)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of agranulocytecytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of agranulocytecytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transvandendriesscheiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive octaicosadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceoctaicosadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive octaicosadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and agranulocytecytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and agranulocytecytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all agranulocytecytoclastologist and agranulocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full agranulocytecytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-gushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodgushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an agranulocytecytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 537 (Cycle #579)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of granulocyteblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of granulocyteblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transrichetititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive enneaicosadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceenneaicosadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive enneaicosadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and granulocyteblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and granulocyteblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all granulocyteblastocytoclastologist and granulocyteblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full granulocyteblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-welling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodwelling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an granulocyteblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 538 (Cycle #580)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of granulocytecytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of granulocytecytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transrichetiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive triacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetriacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive triacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and granulocytecytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and granulocytecytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all granulocytecytoclastologist and granulocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full granulocytecytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-cascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodcascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an granulocytecytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 539 (Cycle #581)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of leukocyteblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of leukocyteblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmasuyititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive henatriacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehenatriacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive henatriacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and leukocyteblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and leukocyteblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all leukocyteblastocytoclastologist and leukocyteblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full leukocyteblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-pouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodpouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an leukocyteblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 540 (Cycle #582)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of leukocytecytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of leukocytecytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmasuyiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive ditriacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceditriacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive ditriacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and leukocytecytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and leukocytecytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all leukocytecytoclastologist and leukocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full leukocytecytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-streaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodstreaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an leukocytecytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 541 (Cycle #583)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of organelleblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of organelleblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcompreignacititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tritriacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetritriacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tritriacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and organelleblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and organelleblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all organelleblastocytoclastologist and organelleblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full organelleblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-splattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodsplattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an organelleblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 542 (Cycle #584)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of organellecytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of organellecytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcompreignaciteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tetratriacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetetratriacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tetratriacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and organellecytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and organellecytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all organellecytoclastologist and organelleoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full organellecytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an organellecytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 543 (Cycle #585)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of cytoproctblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of cytoproctblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transbillietititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive pentatriacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicepentatriacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive pentatriacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and cytoproctblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and cytoproctblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all cytoproctblastocytoclastologist and cytoproctblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full cytoproctblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-dripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously blooddripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an cytoproctblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 544 (Cycle #586)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of cytoproctcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of cytoproctcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transbillietiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive hexatriacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehexatriacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive hexatriacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and cytoproctcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and cytoproctcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all cytoproctcytoclastologist and cytoproctoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full cytoproctcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-flowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodflowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an cytoproctcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 545 (Cycle #587)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of cytostomeblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of cytostomeblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transbecquerelititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive heptatriacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceheptatriacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive heptatriacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and cytostomeblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and cytostomeblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all cytostomeblastocytoclastologist and cytostomeblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full cytostomeblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an cytostomeblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 546 (Cycle #588)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of cytostomecytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of cytostomecytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transbecquereliteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive octatriacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceoctatriacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive octatriacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and cytostomecytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and cytostomecytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all cytostomecytoclastologist and cytostomeoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full cytostomecytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-gushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodgushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an cytostomecytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 547 (Cycle #589)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of haptonemoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of haptonemoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transschoepititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive enneatriacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceenneatriacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive enneatriacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and haptonemoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and haptonemoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all haptonemoblastocytoclastologist and haptonemablastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full haptonemoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-welling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodwelling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an haptonemoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 548 (Cycle #590)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of haptonemacytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of haptonemacytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transschoepiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tetracontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetetracontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tetracontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and haptonemacytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and haptonemacytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all haptonemacytoclastologist and haptonemaoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full haptonemacytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-cascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodcascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an haptonemacytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 549 (Cycle #591)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of axopodoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of axopodoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transkasolititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive henatetracontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehenatetracontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive henatetracontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and axopodoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and axopodoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all axopodoblastocytoclastologist and axopodiablastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full axopodoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-pouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodpouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an axopodoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 550 (Cycle #592)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of axopodocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of axopodocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transkasoliteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive ditetracontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceditetracontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive ditetracontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and axopodocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and axopodocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all axopodocytoclastologist and axopodiaoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full axopodocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-streaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodstreaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an axopodocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 551 (Cycle #593)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of reticulopodoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of reticulopodoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsoddyititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tritetracontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetritetracontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tritetracontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and reticulopodoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and reticulopodoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all reticulopodoblastocytoclastologist and reticulopodiablastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full reticulopodoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-splattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodsplattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an reticulopodoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 552 (Cycle #594)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of reticulopodocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of reticulopodocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsoddyiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tetratetracontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetetratetracontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tetratetracontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and reticulopodocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and reticulopodocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all reticulopodocytoclastologist and reticulopodiaoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full reticulopodocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an reticulopodocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 553 (Cycle #595)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of nuclearlaminablastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of nuclearlaminablastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcurititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive pentatetracontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicepentatetracontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive pentatetracontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and nuclearlaminablastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and nuclearlaminablastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all nuclearlaminablastocytoclastologist and nuclearlaminablastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full nuclearlaminablastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-dripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously blooddripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an nuclearlaminablastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 554 (Cycle #596)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of nuclearlaminacytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of nuclearlaminacytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcuriteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive hexatetracontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehexatetracontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive hexatetracontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and nuclearlaminacytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and nuclearlaminacytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all nuclearlaminacytoclastologist and nuclearlaminaoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full nuclearlaminacytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-flowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodflowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an nuclearlaminacytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 555 (Cycle #597)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of asteroblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of asteroblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transgummititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive heptatetracontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceheptatetracontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive heptatetracontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and asteroblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and asteroblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all asteroblastocytoclastologist and asterblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full asteroblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an asteroblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 556 (Cycle #598)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of asterocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of asterocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transgummiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive octatetracontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceoctatetracontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive octatetracontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and asterocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and asterocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all asterocytoclastologist and asteroblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full asterocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-gushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodgushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an asterocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 557 (Cycle #599)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of axonemoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of axonemoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transpitchblenditeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive enneatetracontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceenneatetracontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive enneatetracontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and axonemoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and axonemoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all axonemoblastocytoclastologist and axonemoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full axonemoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-welling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodwelling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an axonemoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 558 (Cycle #600)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of axonemocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of axonemocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transpitchblendeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive pentacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicepentacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive pentacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and axonemocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and axonemocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all axonemocytoclastologist and axonemeoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full axonemocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-cascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodcascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an axonemocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 559 (Cycle #601)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of blastocystocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of blastocystocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transuranophaniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive henapentacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehenapentacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive henapentacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and blastocystocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and blastocystocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all blastocystocytoclastologist and blastocystoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full blastocystocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-pouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodpouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an blastocystocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 560 (Cycle #602)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of macromereblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of macromereblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transuranophaneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive dipentacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicedipentacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive dipentacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and macromereblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and macromereblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all macromereblastocytoclastologist and macromereblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full macromereblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-streaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodstreaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an macromereblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 561 (Cycle #603)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of macromeresocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of macromeresocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transchalcolititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tripentacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetripentacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tripentacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and macromeresocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and macromeresocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all macromeresocytoclastologist and macromereoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full macromeresocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-splattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodsplattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an macromeresocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 562 (Cycle #604)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of micromereblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of micromereblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transchalcoliteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tetrapentacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetetrapentacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tetrapentacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and micromereblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and micromereblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all micromereblastocytoclastologist and micromereblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full micromereblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an micromereblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 563 (Cycle #605)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of micromeresocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of micromeresocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transhiboniteiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive pentapentacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicepentapentacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive pentapentacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and micromeresocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and micromeresocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all micromeresocytoclastologist and micromereoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full micromeresocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-dripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously blooddripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an micromeresocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 564 (Cycle #606)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of mesomereblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of mesomereblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transhiboniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive hexapentacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehexapentacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive hexapentacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and mesomereblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and mesomereblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all mesomereblastocytoclastologist and mesomereblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full mesomereblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-flowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodflowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an mesomereblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 565 (Cycle #607)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of mesomeresocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of mesomeresocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmagnetoplumbiteiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive heptapentacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceheptapentacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive heptapentacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and mesomeresocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and mesomeresocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all mesomeresocytoclastologist and mesomereoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full mesomeresocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an mesomeresocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 566 (Cycle #608)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of notochordoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of notochordoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmagnetoplumbiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive octapentacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceoctapentacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive octapentacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and notochordoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and notochordoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all notochordoblastocytoclastologist and notochordoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full notochordoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-gushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodgushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an notochordoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 567 (Cycle #609)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of notochordocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of notochordocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transhematophaniteiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive enneapentacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceenneapentacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive enneapentacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and notochordocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and notochordocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all notochordocytoclastologist and notochordooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full notochordocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-welling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodwelling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an notochordocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 568 (Cycle #610)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of somitoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of somitoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transhematophaniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive hexacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehexacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive hexacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and somitoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and somitoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all somitoblastocytoclastologist and somitoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full somitoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-cascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodcascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an somitoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 569 (Cycle #611)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of somitocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of somitocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transpseudobrookiteiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive henahexacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehenahexacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive henahexacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and somitocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and somitocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all somitocytoclastologist and somiteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full somitocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-pouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodpouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an somitocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 570 (Cycle #612)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of organogenoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of organogenoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transpseudobrookiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive dihexacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicedihexacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive dihexacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and organogenoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and organogenoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all organogenoblastocytoclastologist and organogenoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full organogenoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-streaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodstreaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an organogenoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 571 (Cycle #613)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of organogenocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of organogenocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transulvospineliteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive trihexacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetrihexacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive trihexacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and organogenocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and organogenocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all organogenocytoclastologist and organogenooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full organogenocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-splattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodsplattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an organogenocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 572 (Cycle #614)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of neurulablastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of neurulablastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transulvospinelation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tetrahexacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetetrahexacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tetrahexacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and neurulablastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and neurulablastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all neurulablastocytoclastologist and neurulablastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full neurulablastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an neurulablastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 573 (Cycle #615)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of neurulacytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of neurulacytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmagnesioferriteiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive pentahexacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicepentahexacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive pentahexacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and neurulacytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and neurulacytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all neurulacytoclastologist and neurulaoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full neurulacytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-dripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously blooddripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an neurulacytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 574 (Cycle #616)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of gastrulablastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of gastrulablastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmagnesioferriteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive hexahexacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehexahexacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive hexahexacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and gastrulablastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and gastrulablastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all gastrulablastocytoclastologist and gastrulablastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full gastrulablastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-flowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodflowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an gastrulablastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 575 (Cycle #617)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of gastrulacytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of gastrulacytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transtrevoriteiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive heptahexacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceheptahexacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive heptahexacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and gastrulacytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and gastrulacytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all gastrulacytoclastologist and gastrulaoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full gastrulacytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an gastrulacytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 576 (Cycle #618)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of blastulablastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of blastulablastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transtrevoriteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive octahexacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceoctahexacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive octahexacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and blastulablastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and blastulablastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all blastulablastocytoclastologist and blastulablastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full blastulablastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-gushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodgushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an blastulablastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 577 (Cycle #619)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of blastulacytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of blastulacytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transjacobsiteiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive enneahexacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceenneahexacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive enneahexacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and blastulacytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and blastulacytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all blastulacytoclastologist and blastulaoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full blastulacytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-welling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodwelling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an blastulacytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 578 (Cycle #620)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of morulablastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of morulablastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transjacobsiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive heptacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceheptacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive heptacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and morulablastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and morulablastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all morulablastocytoclastologist and morulablastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full morulablastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-cascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodcascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an morulablastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 579 (Cycle #621)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of morulacytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of morulacytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transpentlanditeiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive henaheptacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehenaheptacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive henaheptacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and morulacytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and morulacytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all morulacytoclastologist and morulaoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full morulacytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-pouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodpouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an morulacytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 580 (Cycle #622)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of hypoblastblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of hypoblastblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transpyrrhotiteiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive diheptacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicediheptacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive diheptacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and hypoblastblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and hypoblastblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all hypoblastblastocytoclastologist and hypoblastblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full hypoblastblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-streaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodstreaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an hypoblastblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 581 (Cycle #623)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of hypoblastcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of hypoblastcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transenargiteiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive triheptacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetriheptacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive triheptacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and hypoblastcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and hypoblastcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all hypoblastcytoclastologist and hypoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full hypoblastcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-splattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodsplattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an hypoblastcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 582 (Cycle #624)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of epiblastblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of epiblastblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transtetrahedriteiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tetraheptacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetetraheptacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tetraheptacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and epiblastblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and epiblastblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all epiblastblastocytoclastologist and epiblastblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full epiblastblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an epiblastblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 583 (Cycle #625)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of epiblastcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of epiblastcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcovelliteiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive pentaheptacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicepentaheptacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive pentaheptacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and epiblastcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and epiblastcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all epiblastcytoclastologist and epiblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full epiblastcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-dripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously blooddripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an epiblastcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 584 (Cycle #626)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of blastocelblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of blastocelblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transborniteiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive hexaheptacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehexaheptacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive hexaheptacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and blastocelblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and blastocelblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all blastocelblastocytoclastologist and blastocelblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full blastocelblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-flowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodflowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an blastocelblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 585 (Cycle #627)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of blastocelocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of blastocelocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transchalcociteiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive heptaheptacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceheptaheptacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive heptaheptacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and blastocelocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and blastocelocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all blastocelocytoclastologist and blastoceloblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full blastocelocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an blastocelocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 586 (Cycle #628)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of nephrotomeblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of nephrotomeblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transwollastoniteiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive octaheptacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceoctaheptacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive octaheptacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and nephrotomeblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and nephrotomeblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all nephrotomeblastocytoclastologist and nephrotomeblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full nephrotomeblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-gushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodgushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an nephrotomeblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 587 (Cycle #629)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of nephrotomecytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of nephrotomecytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transrhodoniteiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive enneaheptacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceenneaheptacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive enneaheptacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and nephrotomecytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and nephrotomecytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all nephrotomecytoclastologist and nephrotomeoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full nephrotomecytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-welling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodwelling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an nephrotomecytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 588 (Cycle #630)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of sclerotomeblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of sclerotomeblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transuvaroviteiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive octacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceoctacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive octacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and sclerotomeblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and sclerotomeblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all sclerotomeblastocytoclastologist and sclerotomeblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full sclerotomeblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-cascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodcascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an sclerotomeblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 589 (Cycle #631)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of sclerotomecytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of sclerotomecytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transandraditeiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive henaoctacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehenaoctacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive henaoctacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and sclerotomecytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and sclerotomecytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all sclerotomecytoclastologist and sclerotomeoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full sclerotomecytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-pouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodpouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an sclerotomecytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 590 (Cycle #632)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of dermatomeblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of dermatomeblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transgrossulariteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive dioctacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicedioctacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive dioctacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and dermatomeblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and dermatomeblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all dermatomeblastocytoclastologist and dermatomeblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full dermatomeblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-streaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodstreaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an dermatomeblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 591 (Cycle #633)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of dermatomecytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of dermatomecytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transspessartiniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive trioctacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetrioctacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive trioctacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and dermatomecytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and dermatomecytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all dermatomecytoclastologist and dermatomeoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full dermatomecytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-splattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodsplattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an dermatomecytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 592 (Cycle #634)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of myotomeblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of myotomeblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transalmandiniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tetraoctacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetetraoctacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tetraoctacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and myotomeblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and myotomeblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all myotomeblastocytoclastologist and myotomeblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full myotomeblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an myotomeblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 593 (Cycle #635)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of myotomecytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of myotomecytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transpyropetiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive pentaoctacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicepentaoctacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive pentaoctacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and myotomecytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and myotomecytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all myotomecytoclastologist and myotomeoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full myotomecytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-dripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously blooddripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an myotomecytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 594 (Cycle #636)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of mesenchymeblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of mesenchymeblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transobsidianititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive hexaoctacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehexaoctacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive hexaoctacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and mesenchymeblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and mesenchymeblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all mesenchymeblastocytoclastologist and mesenchymeblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full mesenchymeblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-flowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodflowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an mesenchymeblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 595 (Cycle #637)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of mesenchymecytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of mesenchymecytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transobsidianiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive heptaoctacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceheptaoctacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive heptaoctacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and mesenchymecytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and mesenchymecytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all mesenchymecytoclastologist and mesenchymeoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full mesenchymecytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an mesenchymecytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 596 (Cycle #638)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of neuralcrestblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of neuralcrestblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transshulkerititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive octaoctacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceoctaoctacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive octaoctacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and neuralcrestblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and neuralcrestblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all neuralcrestblastocytoclastologist and neuralcrestblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full neuralcrestblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-gushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodgushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an neuralcrestblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 597 (Cycle #639)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of neuralcrestcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of neuralcrestcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transshulkeriteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive enneaoctacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceenneaoctacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive enneaoctacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and neuralcrestcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and neuralcrestcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all neuralcrestcytoclastologist and neuralcrestoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full neuralcrestcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-welling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodwelling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an neuralcrestcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 598 (Cycle #640)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of neuroectodermblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of neuroectodermblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsoulstonititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive enneacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceenneacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive enneacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and neuroectodermblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and neuroectodermblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all neuroectodermblastocytoclastologist and neuroectodermblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full neuroectodermblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-cascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodcascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an neuroectodermblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 599 (Cycle #641)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of neuroectodermcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of neuroectodermcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsoulstoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive henaenneacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehenaenneacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive henaenneacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and neuroectodermcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and neuroectodermcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all neuroectodermcytoclastologist and neuroectodermoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full neuroectodermcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-pouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodpouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an neuroectodermcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 600 (Cycle #642)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of endodermblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of endodermblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsoulstoneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive dienneacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicedienneacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive dienneacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and endodermblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and endodermblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all endodermblastocytoclastologist and endodermblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full endodermblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-streaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodstreaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an endodermblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 601 (Cycle #643)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of endodermcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of endodermcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transblazestonititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive trienneacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetrienneacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive trienneacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and endodermcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and endodermcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all endodermcytoclastologist and endodermoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full endodermcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-splattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodsplattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an endodermcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 602 (Cycle #644)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of mesodermblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of mesodermblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transblazestoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tetraenneacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetetraenneacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tetraenneacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and mesodermblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and mesodermblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all mesodermblastocytoclastologist and mesodermblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full mesodermblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an mesodermblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 603 (Cycle #645)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of mesodermcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of mesodermcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transblazestoneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive pentaenneacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicepentaenneacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive pentaenneacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and mesodermcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and mesodermcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all mesodermcytoclastologist and mesodermoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full mesodermcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-dripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously blooddripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an mesodermcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 604 (Cycle #646)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of ectodermblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of ectodermblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transpurpurititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive hexaenneacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehexaenneacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive hexaenneacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and ectodermblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and ectodermblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all ectodermblastocytoclastologist and ectodermblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full ectodermblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-flowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodflowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an ectodermblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 605 (Cycle #647)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of ectodermcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of ectodermcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transpurpuriteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive heptaenneacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceheptaenneacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive heptaenneacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and ectodermcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and ectodermcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all ectodermcytoclastologist and ectodermoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full ectodermcytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an ectodermcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 606 (Cycle #648)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of trophoblastblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of trophoblastblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transpurpuration altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive octaenneacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceoctaenneacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive octaenneacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and trophoblastblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and trophoblastblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all trophoblastblastocytoclastologist and trophoblastblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full trophoblastblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-gushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodgushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an trophoblastblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 607 (Cycle #649)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of trophoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of trophoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transprismarinifiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive enneaenneacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceenneaenneacontadihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive enneaenneacontadihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and trophoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and trophoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all trophoblastocytoclastologist and trophoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full trophoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-welling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodwelling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an trophoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 608 (Cycle #650)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of polarbodyblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of polarbodyblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transprismariniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive trihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive trihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and polarbodyblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and polarbodyblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all polarbodyblastocytoclastologist and polarbodyblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full polarbodyblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-cascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodcascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an polarbodyblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 609 (Cycle #651)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of polarbodycytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of polarbodycytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transprismarineation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive henatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehenatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive henatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and polarbodycytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and polarbodycytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all polarbodycytoclastologist and polarbodyoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full polarbodycytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-pouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodpouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an polarbodycytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 610 (Cycle #652)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of ooblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of ooblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transenderititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive ditrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceditrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive ditrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and ooblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and ooblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all ooblastocytoclastologist and ooblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full ooblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-streaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodstreaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an ooblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 611 (Cycle #653)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of spermatoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of spermatoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transenderiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tritrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetritrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tritrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and spermatoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and spermatoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all spermatoblastocytoclastologist and spermatoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full spermatoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-splattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodsplattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an spermatoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 612 (Cycle #654)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of plasmablastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of plasmablastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transnetherititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tetratrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetetratrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tetratrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and plasmablastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and plasmablastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all plasmablastocytoclastologist and plasmablastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full plasmablastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an plasmablastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 613 (Cycle #655)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of lipoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of lipoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transnetheriteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive pentatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicepentatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive pentatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and lipoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and lipoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all lipoblastocytoclastologist and lipoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full lipoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-dripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously blooddripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an lipoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 614 (Cycle #656)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of thymoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of thymoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual translapislazulititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive hexatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehexatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive hexatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and thymoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and thymoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all thymoblastocytoclastologist and thymoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full thymoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-flowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodflowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an thymoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 615 (Cycle #657)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of pinealoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of pinealoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual translapislazuliteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive heptatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceheptatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive heptatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and pinealoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and pinealoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all pinealoblastocytoclastologist and pinealoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full pinealoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an pinealoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 616 (Cycle #658)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of glioblastoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of glioblastoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transglowstonititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive octatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceoctatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive octatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and glioblastoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and glioblastoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all glioblastoblastocytoclastologist and glioblastblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full glioblastoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-gushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodgushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an glioblastoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 617 (Cycle #659)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of glioblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of glioblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transglowstoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive enneatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceenneatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive enneatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and glioblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and glioblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all glioblastocytoclastologist and glioblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full glioblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-welling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodwelling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an glioblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 618 (Cycle #660)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of ciliaremoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of ciliaremoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transglowstoneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive decatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicedecatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive decatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and ciliaremoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and ciliaremoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all ciliaremoblastocytoclastologist and ciliaremoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full ciliaremoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-cascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodcascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an ciliaremoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 619 (Cycle #661)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of cytochalasinblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of cytochalasinblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transredstonititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive henadecatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehenadecatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive henadecatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and cytochalasinblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and cytochalasinblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all cytochalasinblastocytoclastologist and cytochalasinblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full cytochalasinblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-pouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodpouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an cytochalasinblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 620 (Cycle #662)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of cytochalasinocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of cytochalasinocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transredstoniteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive didecatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicedidecatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive didecatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and cytochalasinocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and cytochalasinocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all cytochalasinocytoclastologist and cytochalasinoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full cytochalasinocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-streaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodstreaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an cytochalasinocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 621 (Cycle #663)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of karyoskeletonblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of karyoskeletonblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transredstoneation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tridecatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetridecatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tridecatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and karyoskeletonblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and karyoskeletonblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all karyoskeletonblastocytoclastologist and karyoskeletonblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full karyoskeletonblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-splattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodsplattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an karyoskeletonblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 622 (Cycle #664)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of karyoskeletonocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of karyoskeletonocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual translamprophyllititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tetradecatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetetradecatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tetradecatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and karyoskeletonocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and karyoskeletonocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all karyoskeletonocytoclastologist and karyoskeletonoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full karyoskeletonocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an karyoskeletonocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 623 (Cycle #665)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of nucleoplasminblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of nucleoplasminblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual translamprophylliteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive pentadecatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicepentadecatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive pentadecatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and nucleoplasminblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and nucleoplasminblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all nucleoplasminblastocytoclastologist and nucleoplasminblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full nucleoplasminblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-dripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously blooddripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an nucleoplasminblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 624 (Cycle #666)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of nucleoplasminocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of nucleoplasminocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transastrophyllititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive hexadecatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehexadecatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive hexadecatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and nucleoplasminocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and nucleoplasminocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all nucleoplasminocytoclastologist and nucleoplasminoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full nucleoplasminocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-flowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodflowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an nucleoplasminocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 625 (Cycle #667)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of reticuloplasmoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of reticuloplasmoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transastrophylliteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive heptadecatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceheptadecatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive heptadecatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and reticuloplasmoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and reticuloplasmoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all reticuloplasmoblastocytoclastologist and reticuloplasmoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full reticuloplasmoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an reticuloplasmoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 626 (Cycle #668)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of reticuloplasmocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of reticuloplasmocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transeudialytiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive octadecatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceoctadecatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive octadecatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and reticuloplasmocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and reticuloplasmocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all reticuloplasmocytoclastologist and reticuloplasmoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full reticuloplasmocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-gushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodgushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an reticuloplasmocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 627 (Cycle #669)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of ectosomeblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of ectosomeblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transeudialyteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive enneadecatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceenneadecatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive enneadecatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and ectosomeblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and ectosomeblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all ectosomeblastocytoclastologist and ectosomeblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full ectosomeblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-welling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodwelling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an ectosomeblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 628 (Cycle #670)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of ectosomecytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of ectosomecytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transserandititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive icosatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceicosatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive icosatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and ectosomecytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and ectosomecytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all ectosomecytoclastologist and ectosomeoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full ectosomecytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-cascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodcascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an ectosomecytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 629 (Cycle #671)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of exosomeblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of exosomeblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transseranditeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive henaicosatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehenaicosatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive henaicosatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and exosomeblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and exosomeblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all exosomeblastocytoclastologist and exosomeblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full exosomeblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-pouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodpouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an exosomeblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 630 (Cycle #672)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of exosomecytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of exosomecytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transpectolititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive diicosatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicediicosatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive diicosatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and exosomecytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and exosomecytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all exosomecytoclastologist and exosomeoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full exosomecytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-streaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodstreaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an exosomecytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 631 (Cycle #673)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of microvesicleblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of microvesicleblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transpectoliteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive triicosatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetriicosatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive triicosatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and microvesicleblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and microvesicleblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all microvesicleblastocytoclastologist and microvesicleblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full microvesicleblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-splattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodsplattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an microvesicleblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 632 (Cycle #674)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of microvesiclecytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of microvesiclecytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transrhodochrosititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tetraicosatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetetraicosatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tetraicosatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and microvesiclecytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and microvesiclecytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all microvesiclecytoclastologist and microvesicleoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full microvesiclecytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an microvesiclecytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 633 (Cycle #675)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of thrombocyteblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of thrombocyteblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transrhodochrositeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive pentaicosatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicepentaicosatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive pentaicosatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and thrombocyteblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and thrombocyteblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all thrombocyteblastocytoclastologist and thrombocyteblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full thrombocyteblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-dripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously blooddripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an thrombocyteblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 634 (Cycle #676)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of erythrocyteblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of erythrocyteblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsugilititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive hexaicosatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehexaicosatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive hexaicosatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and erythrocyteblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and erythrocyteblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all erythrocyteblastocytoclastologist and erythrocyteblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full erythrocyteblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-flowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodflowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an erythrocyteblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 635 (Cycle #677)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of lymphocyteblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of lymphocyteblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsugiliteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive heptaicosatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceheptaicosatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive heptaicosatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and lymphocyteblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and lymphocyteblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all lymphocyteblastocytoclastologist and lymphocyteblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full lymphocyteblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an lymphocyteblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 636 (Cycle #678)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of monocyteblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of monocyteblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcharoititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive octaicosatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceoctaicosatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive octaicosatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and monocyteblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and monocyteblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all monocyteblastocytoclastologist and monocyteblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full monocyteblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-gushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodgushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an monocyteblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 637 (Cycle #679)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of basophilblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of basophilblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcharoiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive enneaicosatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceenneaicosatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive enneaicosatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and basophilblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and basophilblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all basophilblastocytoclastologist and basophilblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full basophilblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-welling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodwelling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an basophilblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 638 (Cycle #680)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of eosinophilblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of eosinophilblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual translarimarititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive triacontatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetriacontatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive triacontatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and eosinophilblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and eosinophilblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all eosinophilblastocytoclastologist and eosinophilblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full eosinophilblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-cascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodcascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an eosinophilblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 639 (Cycle #681)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of neutrophilblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of neutrophilblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual translarimariteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive henatriacontatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehenatriacontatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive henatriacontatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and neutrophilblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and neutrophilblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all neutrophilblastocytoclastologist and neutrophilblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full neutrophilblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-pouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodpouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an neutrophilblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 640 (Cycle #682)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of bcellocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of bcellocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual translarimaration altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive ditriacontatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceditriacontatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive ditriacontatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and bcellocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and bcellocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all bcellocytoclastologist and bcelloblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full bcellocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-streaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodstreaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an bcellocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 641 (Cycle #683)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of killertcellocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of killertcellocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transorthoclaseititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tritriacontatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetritriacontatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tritriacontatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and killertcellocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and killertcellocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all killertcellocytoclastologist and killertcelloblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full killertcellocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-splattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodsplattering confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an killertcellocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 642 (Cycle #684)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of helpertcellocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of helpertcellocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transorthoclaseiteation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tetratriacontatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetetratriacontatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tetratriacontatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and helpertcellocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and helpertcellocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all helpertcellocytoclastologist and helpertcelloblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full helpertcellocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspraying confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an helpertcellocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 643 (Cycle #685)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of interneuronoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of interneuronoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transapatiteititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive pentatriacontatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicepentatriacontatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive pentatriacontatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and interneuronoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and interneuronoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all interneuronoblastocytoclastologist and interneuronblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full interneuronoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-dripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously blooddripping confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an interneuronoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 644 (Cycle #686)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of motorneuronoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of motorneuronoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transfluoriteititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive hexatriacontatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehexatriacontatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive hexatriacontatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and motorneuronoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and motorneuronoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all motorneuronoblastocytoclastologist and motorneuronblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full motorneuronoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-flowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodflowing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an motorneuronoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 645 (Cycle #687)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of sensoryneuronoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of sensoryneuronoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transgypsititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive heptatriacontatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceheptatriacontatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive heptatriacontatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and sensoryneuronoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and sensoryneuronoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all sensoryneuronoblastocytoclastologist and sensoryneuronblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full sensoryneuronoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-spilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodspilling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an sensoryneuronoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 646 (Cycle #688)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of interneuronocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of interneuronocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transtalcititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive octatriacontatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceoctatriacontatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive octatriacontatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and interneuronocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and interneuronocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all interneuronocytoclastologist and interneuronoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full interneuronocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-gushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodgushing confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an interneuronocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 647 (Cycle #689)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of motorneuronocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of motorneuronocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transamphibolititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive enneatriacontatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceenneatriacontatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive enneatriacontatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and motorneuronocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and motorneuronocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all motorneuronocytoclastologist and motorneuronoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full motorneuronocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-welling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodwelling confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an motorneuronocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 648 (Cycle #690)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of sensoryneuronocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of sensoryneuronocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transpyroxenititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive tetracontatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicetetracontatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive tetracontatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and sensoryneuronocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and sensoryneuronocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all sensoryneuronocytoclastologist and sensoryneuronoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full sensoryneuronocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-cascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodcascading confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an sensoryneuronocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 649 (Cycle #691)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of occludinblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of occludinblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transolivinititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive henatetracontatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive vicehenatetracontatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive henatetracontatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and occludinblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and occludinblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all occludinblastocytoclastologist and occludinblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full occludinblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-pouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodpouring confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an occludinblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 650 (Cycle #692)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of occludinocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of occludinocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transquartzititeation altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive ditetracontatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive viceditetracontatrihectarchy of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive ditetracontatrihectarchy of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and occludinocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and occludinocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all occludinocytoclastologist and occludinoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full occludinocytoclastokinetic deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ferociously blood-streaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ferociously bloodstreaming confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an occludinocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });
});
