import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

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
        mapCommand("navigate one's vector of carboxysomeblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of carboxysomeblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcarnotititeation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and carboxysomeblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and carboxysomeblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all carboxysomeblastocytoclastologist and carboxysomeblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full carboxysomeblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an carboxysomeblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 370 (Cycle #412)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of dictyosomeblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of dictyosomeblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transautunititeation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and dictyosomeblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and dictyosomeblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all dictyosomeblastocytoclastologist and dictyosomeblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full dictyosomeblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an dictyosomeblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 371 (Cycle #413)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of melanosomeblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of melanosomeblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transtorbernititeation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and melanosomeblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and melanosomeblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all melanosomeblastocytoclastologist and melanosomeblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full melanosomeblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an melanosomeblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 372 (Cycle #414)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of endosomeblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of endosomeblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transwalpurgititeation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and endosomeblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and endosomeblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all endosomeblastocytoclastologist and endosomeblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full endosomeblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an endosomeblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 373 (Cycle #415)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of autophagosomeblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of autophagosomeblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transuranospinititeation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and autophagosomeblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and autophagosomeblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all autophagosomeblastocytoclastologist and autophagosomeblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full autophagosomeblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an autophagosomeblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 374 (Cycle #416)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of telomereblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of telomereblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transnatrouranospinititeation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and telomereblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and telomereblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all telomereblastocytoclastologist and telomereblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full telomereblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an telomereblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 375 (Cycle #417)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of centromereblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of centromereblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transkirchheimerititeation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and centromereblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and centromereblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all centromereblastocytoclastologist and centromereblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full centromereblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an centromereblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 376 (Cycle #418)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of spindleblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of spindleblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transkahlerititeation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and spindleblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and spindleblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all spindleblastocytoclastologist and spindleblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full spindleblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an spindleblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 377 (Cycle #419)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of kinetochoreblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of kinetochoreblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transheinrichititeation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and kinetochoreblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and kinetochoreblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all kinetochoreblastocytoclastologist and kinetochoreblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full kinetochoreblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an kinetochoreblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 378 (Cycle #420)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of heterochromatinblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of heterochromatinblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transfritzscheititeation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and heterochromatinblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and heterochromatinblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all heterochromatinblastocytoclastologist and heterochromatinblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full heterochromatinblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an heterochromatinblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 379 (Cycle #421)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of euchromatinblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of euchromatinblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transbassettititeation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and euchromatinblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and euchromatinblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all euchromatinblastocytoclastologist and euchromatinblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full euchromatinblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an euchromatinblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 380 (Cycle #422)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of nucleoplasmblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of nucleoplasmblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsabugalititeation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and nucleoplasmblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and nucleoplasmblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all nucleoplasmblastocytoclastologist and nucleoplasmblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full nucleoplasmblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an nucleoplasmblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 381 (Cycle #423)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of protoplastblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of protoplastblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transnovacekititeation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and protoplastblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and protoplastblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all protoplastblastocytoclastologist and protoplastblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full protoplastblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an protoplastblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 382 (Cycle #424)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of cytoplasmblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of cytoplasmblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsaleeititeation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and cytoplasmblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and cytoplasmblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all cytoplasmblastocytoclastologist and cytoplasmblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full cytoplasmblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an cytoplasmblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 383 (Cycle #425)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of cytosolblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of cytosolblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transzeunerititeation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and cytosolblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and cytosolblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all cytosolblastocytoclastologist and cytosolblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full cytosolblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an cytosolblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 384 (Cycle #426)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of piloblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of piloblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transwalpurgiteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and piloblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and piloblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all piloblastocytoclastologist and piloblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full piloblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an piloblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 385 (Cycle #427)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of plasmidoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of plasmidoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transuranospiniteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and plasmidoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and plasmidoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all plasmidoblastocytoclastologist and plasmidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full plasmidoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an plasmidoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 386 (Cycle #428)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of chromosomoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of chromosomoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transnatrouranospiniteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and chromosomoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and chromosomoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all chromosomoblastocytoclastologist and chromosomoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full chromosomoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an chromosomoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 387 (Cycle #429)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of centrioloblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of centrioloblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transkirchheimeriteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and centrioloblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and centrioloblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all centrioloblastocytoclastologist and centrioloblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full centrioloblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an centrioloblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 388 (Cycle #430)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of golgiblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of golgiblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transkahleriteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and golgiblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and golgiblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all golgiblastocytoclastologist and golgiblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full golgiblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an golgiblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 389 (Cycle #431)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of membranoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of membranoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transheinrichiteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and membranoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and membranoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all membranoblastocytoclastologist and membranoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full membranoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an membranoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 390 (Cycle #432)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of cytoskeletonoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of cytoskeletonoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transfritzscheiteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and cytoskeletonoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and cytoskeletonoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all cytoskeletonoblastocytoclastologist and cytoskeletonblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full cytoskeletonoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an cytoskeletonoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 391 (Cycle #433)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of plasmodesmatoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of plasmodesmatoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transbassettiteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and plasmodesmatoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and plasmodesmatoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all plasmodesmatoblastocytoclastologist and plasmodesmatoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full plasmodesmatoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an plasmodesmatoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 392 (Cycle #434)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of vesiculoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of vesiculoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsabugaliteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and vesiculoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and vesiculoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all vesiculoblastocytoclastologist and vesiculoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full vesiculoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an vesiculoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 393 (Cycle #435)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of chloroplastoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of chloroplastoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transnovacekiteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and chloroplastoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and chloroplastoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all chloroplastoblastocytoclastologist and chloroplastoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full chloroplastoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an chloroplastoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 394 (Cycle #436)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of centrosomoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of centrosomoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsaleeiteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and centrosomoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and centrosomoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all centrosomoblastocytoclastologist and centrosomoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full centrosomoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an centrosomoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 395 (Cycle #437)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of chromatinoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of chromatinoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transzeuneriteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and chromatinoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and chromatinoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all chromatinoblastocytoclastologist and chromatinblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full chromatinoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an chromatinoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 396 (Cycle #438)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of nucleoloblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of nucleoloblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transurancirciteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and nucleoloblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and nucleoloblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all nucleoloblastocytoclastologist and nucleoloblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full nucleoloblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an nucleoloblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 397 (Cycle #439)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of nucleoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of nucleoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transtorberniteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and nucleoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and nucleoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all nucleoblastocytoclastologist and nucleoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full nucleoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an nucleoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 398 (Cycle #440)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of statolithoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of statolithoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transautuniteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and statolithoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and statolithoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all statolithoblastocytoclastologist and statolithoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full statolithoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an statolithoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 399 (Cycle #441)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of statolithocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of statolithocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transtyuyamuniteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and statolithocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and statolithocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all statolithocytoclastologist and statolithoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full statolithocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an statolithocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 400 (Cycle #442)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of etioplastoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of etioplastoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcarnotiteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and etioplastoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and etioplastoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all etioplastoblastocytoclastologist and etioplastoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full etioplastoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an etioplastoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 401 (Cycle #443)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of etioplastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of etioplastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transbranneriteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and etioplastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and etioplastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all etioplastocytoclastologist and etioplastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full etioplastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an etioplastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 402 (Cycle #444)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of proteinoplastoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of proteinoplastoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcoffiniteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and proteinoplastoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and proteinoplastoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all proteinoplastoblastocytoclastologist and proteinoplastoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full proteinoplastoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an proteinoplastoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 403 (Cycle #445)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of proteinoplastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of proteinoplastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transuraniniteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and proteinoplastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and proteinoplastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all proteinoplastocytoclastologist and proteinoplastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full proteinoplastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an proteinoplastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 404 (Cycle #446)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of elaioplastoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of elaioplastoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transthorianiteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and elaioplastoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and elaioplastoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all elaioplastoblastocytoclastologist and elaioplastoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full elaioplastoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an elaioplastoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 405 (Cycle #447)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of elaioplastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of elaioplastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transnatronositeation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and elaioplastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and elaioplastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all elaioplastocytoclastologist and elaioplastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full elaioplastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an elaioplastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 406 (Cycle #448)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of leucoplastoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of leucoplastoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual translueshiteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and leucoplastoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and leucoplastoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all leucoplastoblastocytoclastologist and leucoplastoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full leucoplastoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an leucoplastoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 407 (Cycle #449)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of leucoplastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of leucoplastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual translatrappiteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and leucoplastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and leucoplastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all leucoplastocytoclastologist and leucoplastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full leucoplastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an leucoplastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 408 (Cycle #450)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of chromoplastoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of chromoplastoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual translopariteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and chromoplastoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and chromoplastoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all chromoplastoblastocytoclastologist and chromoplastoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full chromoplastoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an chromoplastoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 409 (Cycle #451)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of chromoplastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of chromoplastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transancyliteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and chromoplastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and chromoplastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all chromoplastocytoclastologist and chromoplastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full chromoplastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an chromoplastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 410 (Cycle #452)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of amyloplastoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of amyloplastoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsynchysiteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and amyloplastoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and amyloplastoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all amyloplastoblastocytoclastologist and amyloplastoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full amyloplastoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an amyloplastoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 411 (Cycle #453)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of amyloplastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of amyloplastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transparisiteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and amyloplastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and amyloplastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all amyloplastocytoclastologist and amyloplastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full amyloplastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an amyloplastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 412 (Cycle #454)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of plastidoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of plastidoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transallaniteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and plastidoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and plastidoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all plastidoblastocytoclastologist and plastidoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full plastidoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an plastidoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 413 (Cycle #455)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of plastidocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of plastidocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transgadoliniteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and plastidocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and plastidocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all plastidocytoclastologist and plastidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full plastidocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an plastidocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 414 (Cycle #456)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of mitochondrioblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of mitochondrioblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transpolycraseation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and mitochondrioblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and mitochondrioblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all mitochondrioblastocytoclastologist and mitochondrioblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full mitochondrioblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an mitochondrioblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 415 (Cycle #457)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of carboxysomblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of carboxysomblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transeuxeniteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and carboxysomblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and carboxysomblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all carboxysomblastocytoclastologist and carboxysomblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full carboxysomblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an carboxysomblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 416 (Cycle #458)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of carboxysomocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of carboxysomocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsamarskiteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and carboxysomocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and carboxysomocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all carboxysomocytoclastologist and carboxysomeoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full carboxysomocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an carboxysomocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 417 (Cycle #459)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of dictyosomblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of dictyosomblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transfergusoniteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and dictyosomblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and dictyosomblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all dictyosomblastocytoclastologist and dictyosomblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full dictyosomblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an dictyosomblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 418 (Cycle #460)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of dictyosomocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of dictyosomocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmicroliteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and dictyosomocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and dictyosomocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all dictyosomocytoclastologist and dictyosomeoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full dictyosomocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an dictyosomocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 419 (Cycle #461)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of glyoxysomblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of glyoxysomblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transpyrochloreation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and glyoxysomblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and glyoxysomblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all glyoxysomblastocytoclastologist and glyoxysomblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full glyoxysomblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an glyoxysomblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 420 (Cycle #462)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of glyoxysomocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of glyoxysomocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transtantaliteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and glyoxysomocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and glyoxysomocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all glyoxysomocytoclastologist and glyoxysomeoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full glyoxysomocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an glyoxysomocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 421 (Cycle #463)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of proteasomocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of proteasomocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcolumbiteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and proteasomocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and proteasomocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all proteasomocytoclastologist and proteasomeoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full proteasomocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an proteasomocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 422 (Cycle #464)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of ribozymocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of ribozymocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transstruveriteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and ribozymocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and ribozymocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all ribozymocytoclastologist and ribozymeoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full ribozymocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an ribozymocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 423 (Cycle #465)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of spliceosomblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of spliceosomblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transilmenorutileation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and spliceosomblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and spliceosomblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all spliceosomblastocytoclastologist and spliceosomblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full spliceosomblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an spliceosomblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 424 (Cycle #466)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of spliceosomocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of spliceosomocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transleucoxeneation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and spliceosomocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and spliceosomocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all spliceosomocytoclastologist and spliceosomeoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full spliceosomocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an spliceosomocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 425 (Cycle #467)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of replisomblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of replisomblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transtitaniteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and replisomblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and replisomblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all replisomblastocytoclastologist and replisomblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full replisomblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an replisomblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 426 (Cycle #468)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of replisomocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of replisomocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transspheneation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and replisomocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and replisomocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all replisomocytoclastologist and replisomeoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full replisomocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an replisomocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 427 (Cycle #469)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of solenoidoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of solenoidoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transzirconation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and solenoidoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and solenoidoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all solenoidoblastocytoclastologist and solenoidblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full solenoidoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an solenoidoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 428 (Cycle #470)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of solenoidocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of solenoidocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transxenotimeation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and solenoidocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and solenoidocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all solenoidocytoclastologist and solenoidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full solenoidocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an solenoidocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 429 (Cycle #471)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of histoneblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of histoneblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transbastnasiteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and histoneblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and histoneblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all histoneblastocytoclastologist and histoneblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full histoneblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an histoneblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 430 (Cycle #472)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of histonocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of histonocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmonaziteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and histonocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and histonocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all histonocytoclastologist and histoneoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full histonocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an histonocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 431 (Cycle #473)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of nucleosomblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of nucleosomblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transapatiteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and nucleosomblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and nucleosomblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all nucleosomblastocytoclastologist and nucleosomblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full nucleosomblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an nucleosomblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 432 (Cycle #474)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of nucleosomocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of nucleosomocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transfluoriteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and nucleosomocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and nucleosomocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all nucleosomocytoclastologist and nucleosomeoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full nucleosomocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an nucleosomocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 433 (Cycle #475)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of chromatosmoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of chromatosmoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcryoliteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and chromatosmoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and chromatosmoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all chromatosmoblastocytoclastologist and chromatosmoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full chromatosmoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an chromatosmoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 434 (Cycle #476)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of chromatosomocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of chromatosomocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transpyrolusiteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and chromatosomocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and chromatosomocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all chromatosomocytoclastologist and chromatosomeoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full chromatosomocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an chromatosomocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 435 (Cycle #477)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of melanosomocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of melanosomocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transbrookiteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and melanosomocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and melanosomocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all melanosomocytoclastologist and melanosomeoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full melanosomocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an melanosomocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 436 (Cycle #478)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of endosomocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of endosomocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transanataseation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and endosomocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and endosomocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all endosomocytoclastologist and endosomeoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full endosomocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an endosomocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 437 (Cycle #479)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of autophagosomocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of autophagosomocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transrutileation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and autophagosomocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and autophagosomocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all autophagosomocytoclastologist and autophagosomeoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full autophagosomocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an autophagosomocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 438 (Cycle #480)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of telomerocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of telomerocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transilmeniteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and telomerocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and telomerocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all telomerocytoclastologist and telomereoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full telomerocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an telomerocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 439 (Cycle #481)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of centromerocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of centromerocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transtungstiteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and centromerocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and centromerocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all centromerocytoclastologist and centromereoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full centromerocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an centromerocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 440 (Cycle #482)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of spindlocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of spindlocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmolybditeation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and spindlocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and spindlocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all spindlocytoclastologist and spindleoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full spindlocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an spindlocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 441 (Cycle #483)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of kinetochorocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of kinetochorocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transbismiteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and kinetochorocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and kinetochorocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all kinetochorocytoclastologist and kinetochoreoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full kinetochorocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an kinetochorocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 442 (Cycle #484)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of heterochromatinocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of heterochromatinocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transvalentiniteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and heterochromatinocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and heterochromatinocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all heterochromatinocytoclastologist and heterochromatinoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full heterochromatinocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an heterochromatinocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 443 (Cycle #485)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of euchromatinocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of euchromatinocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsenarmontiteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and euchromatinocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and euchromatinocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all euchromatinocytoclastologist and euchromatinoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full euchromatinocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an euchromatinocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 444 (Cycle #486)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of nucleoplasmocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of nucleoplasmocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transarsenoliteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and nucleoplasmocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and nucleoplasmocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all nucleoplasmocytoclastologist and nucleoplasmoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full nucleoplasmocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an nucleoplasmocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 445 (Cycle #487)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of protoplastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of protoplastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmarcasiteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and protoplastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and protoplastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all protoplastocytoclastologist and protoplastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full protoplastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an protoplastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 446 (Cycle #488)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of cytoplasmocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of cytoplasmocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transullmanniteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and cytoplasmocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and cytoplasmocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all cytoplasmocytoclastologist and cytoplasmoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full cytoplasmocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an cytoplasmocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 447 (Cycle #489)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of cytosolocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of cytosolocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transskutteruditeation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and cytosolocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and cytosolocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all cytosolocytoclastologist and cytosoloblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full cytosolocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an cytosolocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 448 (Cycle #490)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of pilocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of pilocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transarsenopyriteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and pilocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and pilocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all pilocytoclastologist and pilioblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full pilocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an pilocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 449 (Cycle #491)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of plasmidocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of plasmidocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transpentlanditeation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and plasmidocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and plasmidocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all plasmidocytoclastologist and plasmidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full plasmidocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an plasmidocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 450 (Cycle #492)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of chromatidocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of chromatidocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transpyrhotiteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and chromatidocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and chromatidocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all chromatidocytoclastologist and chromatidoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full chromatidocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an chromatidocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 451 (Cycle #493)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of chromosomocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of chromosomocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transenargiteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and chromosomocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and chromosomocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all chromosomocytoclastologist and chromosomeoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full chromosomocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an chromosomocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 452 (Cycle #494)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of centriolocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of centriolocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transtetrahedriteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and centriolocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and centriolocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all centriolocytoclastologist and centrioleoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full centriolocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an centriolocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 453 (Cycle #495)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of microtubuloblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of microtubuloblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcovelliteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and microtubuloblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and microtubuloblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all microtubuloblastocytoclastologist and microtubuloblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full microtubuloblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an microtubuloblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 454 (Cycle #496)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of microfilamentoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of microfilamentoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transborniteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and microfilamentoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and microfilamentoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all microfilamentoblastocytoclastologist and microfilamentoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full microfilamentoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an microfilamentoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 455 (Cycle #497)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of desmosomoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of desmosomoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transchalcociteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and desmosomoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and desmosomoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all desmosomoblastocytoclastologist and desmosomoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full desmosomoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an desmosomoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 456 (Cycle #498)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of elastinoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of elastinoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transwollastoniteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and elastinoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and elastinoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all elastinoblastocytoclastologist and elastinoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full elastinoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an elastinoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 457 (Cycle #499)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of collagenoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of collagenoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transrhodoniteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and collagenoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and collagenoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all collagenoblastocytoclastologist and collagenoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full collagenoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an collagenoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 458 (Cycle #500)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of sarcomeroblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of sarcomeroblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transuvaroviteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and sarcomeroblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and sarcomeroblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all sarcomeroblastocytoclastologist and sarcomeroblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full sarcomeroblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an sarcomeroblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 459 (Cycle #501)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of synapsoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of synapsoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transandraditeation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and synapsoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and synapsoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all synapsoblastocytoclastologist and synapsoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full synapsoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an synapsoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 460 (Cycle #502)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of axonoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of axonoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transgrossularation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and axonoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and axonoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all axonoblastocytoclastologist and axonoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full axonoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an axonoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 461 (Cycle #503)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of myelinoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of myelinoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transspessartineation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and myelinoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and myelinoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all myelinoblastocytoclastologist and myelinoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full myelinoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an myelinoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 462 (Cycle #504)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of flagelloblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of flagelloblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transalmandineation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and flagelloblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and flagelloblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all flagelloblastocytoclastologist and flagelloblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full flagelloblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an flagelloblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 463 (Cycle #505)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of cilioblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of cilioblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transpyropiteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and cilioblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and cilioblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all cilioblastocytoclastologist and cilioblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full cilioblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an cilioblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 464 (Cycle #506)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of lysosomoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of lysosomoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transalexandrititeation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and lysosomoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and lysosomoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all lysosomoblastocytoclastologist and lysosomoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full lysosomoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an lysosomoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 465 (Cycle #507)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of vacuoloblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of vacuoloblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transtanzanititeation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and vacuoloblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and vacuoloblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all vacuoloblastocytoclastologist and vacuoloblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full vacuoloblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an vacuoloblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 466 (Cycle #508)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of peroxisomoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of peroxisomoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsiderititeation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and peroxisomoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and peroxisomoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all peroxisomoblastocytoclastologist and peroxisomoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full peroxisomoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an peroxisomoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 467 (Cycle #509)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of ribosomoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of ribosomoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual translimonititeation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and ribosomoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and ribosomoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all ribosomoblastocytoclastologist and ribosomoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full ribosomoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an ribosomoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 468 (Cycle #510)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of golgicytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of golgicytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transazurititeation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and golgicytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and golgicytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all golgicytoclastologist and golgioblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full golgicytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an golgicytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 469 (Cycle #511)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of membranocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of membranocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmalachititeation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and membranocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and membranocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all membranocytoclastologist and membraneoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full membranocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an membranocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 470 (Cycle #512)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of cytoskeletonocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of cytoskeletonocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transobsidianation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and cytoskeletonocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and cytoskeletonocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all cytoskeletonocytoclastologist and cytoskeletonoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full cytoskeletonocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an cytoskeletonocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 471 (Cycle #513)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of plasmodesmatocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of plasmodesmatocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transalexandriteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and plasmodesmatocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and plasmodesmatocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all plasmodesmatocytoclastologist and plasmodesmataoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full plasmodesmatocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an plasmodesmatocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 472 (Cycle #514)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of vesiculocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of vesiculocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transtanzaniteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and vesiculocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and vesiculocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all vesiculocytoclastologist and vesicleoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full vesiculocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an vesiculocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 473 (Cycle #515)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of vacuolocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of vacuolocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsideriteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and vacuolocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and vacuolocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all vacuolocytoclastologist and vacuoleoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full vacuolocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an vacuolocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 474 (Cycle #516)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of chloroplastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of chloroplastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual translimoniteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and chloroplastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and chloroplastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all chloroplastocytoclastologist and chloroplastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full chloroplastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an chloroplastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 475 (Cycle #517)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of peroxisomocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of peroxisomocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transazuriteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and peroxisomocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and peroxisomocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all peroxisomocytoclastologist and peroxisomeoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full peroxisomocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an peroxisomocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 476 (Cycle #518)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of flagellocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of flagellocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmalachiteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and flagellocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and flagellocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all flagellocytoclastologist and flagellooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full flagellocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an flagellocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 477 (Cycle #519)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of ciliocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of ciliocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcinnabaration altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and ciliocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and ciliocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all ciliocytoclastologist and ciliooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full ciliocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an ciliocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 478 (Cycle #520)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of centrosomocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of centrosomocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsphaleriteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and centrosomocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and centrosomocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all centrosomocytoclastologist and centrosomeoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full centrosomocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an centrosomocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 479 (Cycle #521)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of chromatinocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of chromatinocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transbauxiteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and chromatinocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and chromatinocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all chromatinocytoclastologist and chromatinoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full chromatinocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an chromatinocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 480 (Cycle #522)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of nucleolocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of nucleolocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transgalenaation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and nucleolocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and nucleolocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all nucleolocytoclastologist and nucleolusoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full nucleolocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an nucleolocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 481 (Cycle #523)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of nucleocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of nucleocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transchalcopyriteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and nucleocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and nucleocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all nucleocytoclastologist and nucleusoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full nucleocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an nucleocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 482 (Cycle #524)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of ribosomocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of ribosomocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transpyriteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and ribosomocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and ribosomocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all ribosomocytoclastologist and ribosomeoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full ribosomocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an ribosomocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 483 (Cycle #525)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of mitochondriocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of mitochondriocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transhematiteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and mitochondriocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and mitochondriocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all mitochondriocytoclastologist and mitochondriaoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full mitochondriocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an mitochondriocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 484 (Cycle #526)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of lysosomocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of lysosomocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmagnetiteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and lysosomocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and lysosomocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all lysosomocytoclastologist and lysosomeoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full lysosomocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an lysosomocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 485 (Cycle #527)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of microtubulocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of microtubulocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transchromiteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and microtubulocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and microtubulocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all microtubulocytoclastologist and microtubuleoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full microtubulocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an microtubulocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 486 (Cycle #528)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of microfilamentocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of microfilamentocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcobaltiteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and microfilamentocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and microfilamentocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all microfilamentocytoclastologist and microfilamentoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full microfilamentocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an microfilamentocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 487 (Cycle #529)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of desmosomocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of desmosomocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transastatineation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and desmosomocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and desmosomocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all desmosomocytoclastologist and desmosomeoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full desmosomocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an desmosomocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 488 (Cycle #530)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of neurolemmocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of neurolemmocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transiodineation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and neurolemmocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and neurolemmocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all neurolemmocytoclastologist and neurolemmooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full neurolemmocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an neurolemmocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 489 (Cycle #531)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of sarcolemmocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of sarcolemmocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transbromineation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and sarcolemmocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and sarcolemmocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all sarcolemmocytoclastologist and sarcolemmooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full sarcolemmocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an sarcolemmocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 490 (Cycle #532)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of elastinocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of elastinocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transchlorineation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and elastinocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and elastinocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all elastinocytoclastologist and elastinoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full elastinocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an elastinocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 491 (Cycle #533)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of collagenocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of collagenocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transfluorineation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and collagenocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and collagenocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all collagenocytoclastologist and collagenoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full collagenocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an collagenocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 492 (Cycle #534)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of chondrinocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of chondrinocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transneonation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and chondrinocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and chondrinocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all chondrinocytoclastologist and chondrinoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full chondrinocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an chondrinocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 493 (Cycle #535)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of osteonocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of osteonocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transargonation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and osteonocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and osteonocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all osteonocytoclastologist and osteonoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full osteonocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an osteonocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 494 (Cycle #536)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of synapsocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of synapsocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transkryptonation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and synapsocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and synapsocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all synapsocytoclastologist and synapseoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full synapsocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an synapsocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 495 (Cycle #537)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of axonocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of axonocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transkaliumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and axonocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and axonocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all axonocytoclastologist and axonoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full axonocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an axonocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 496 (Cycle #538)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of sarcomerocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of sarcomerocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transnatriumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and sarcomerocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and sarcomerocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all sarcomerocytoclastologist and sarcomereoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full sarcomerocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an sarcomerocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 497 (Cycle #539)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of myelinocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of myelinocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transstannumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and myelinocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and myelinocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all myelinocytoclastologist and myelinoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full myelinocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an myelinocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 498 (Cycle #540)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of granulosaluteincytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of granulosaluteincytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transhydrargyrumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and granulosaluteincytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and granulosaluteincytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all granulosaluteincytoclastologist and granulosaluteinoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full granulosaluteincytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an granulosaluteincytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 499 (Cycle #541)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of thecaluteincytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of thecaluteincytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcuprumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and thecaluteincytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and thecaluteincytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all thecaluteincytoclastologist and thecaluteinoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full thecaluteincytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an thecaluteincytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 500 (Cycle #542)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of oogoniocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of oogoniocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transferrumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and oogoniocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and oogoniocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all oogoniocytoclastologist and oogoniumoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full oogoniocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an oogoniocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 501 (Cycle #543)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of spermatogoniocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of spermatogoniocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transplumbumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and spermatogoniocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and spermatogoniocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all spermatogoniocytoclastologist and spermatogoniumoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full spermatogoniocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an spermatogoniocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 502 (Cycle #544)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of gonadocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of gonadocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transargentumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and gonadocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and gonadocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all gonadocytoclastologist and gonadocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full gonadocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an gonadocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 503 (Cycle #545)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of pituicytocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of pituicytocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transaurumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and pituicytocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and pituicytocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all pituicytocytoclastologist and pituicyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full pituicytocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an pituicytocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 504 (Cycle #546)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of follicularstellarcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of follicularstellarcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transquintessenceation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and follicularstellarcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and follicularstellarcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all follicularstellarcytoclastologist and follicularstellateoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full follicularstellarcytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an follicularstellarcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 505 (Cycle #547)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of oxyphilcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of oxyphilcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transphlogistonation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and oxyphilcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and oxyphilcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all oxyphilcytoclastologist and oxyphiloblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full oxyphilcytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an oxyphilcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 506 (Cycle #548)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of parafollicularcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of parafollicularcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transetheration altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and parafollicularcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and parafollicularcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all parafollicularcytoclastologist and parafollicularoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full parafollicularcytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an parafollicularcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 507 (Cycle #549)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of chromaffincytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of chromaffincytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transredmatteration altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and chromaffincytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and chromaffincytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all chromaffincytoclastologist and chromaffinoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full chromaffincytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an chromaffincytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 508 (Cycle #550)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of lactotropicytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of lactotropicytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transantimatteration altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and lactotropicytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and lactotropicytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all lactotropicytoclastologist and lactotropicoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full lactotropicytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an lactotropicytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 509 (Cycle #551)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of thyrotropicytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of thyrotropicytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transdarkmatteration altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and thyrotropicytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and thyrotropicytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all thyrotropicytoclastologist and thyrotropicoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full thyrotropicytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an thyrotropicytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 510 (Cycle #552)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of gonadotropicytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of gonadotropicytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transgravitonation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and gonadotropicytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and gonadotropicytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all gonadotropicytoclastologist and gonadotropicoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full gonadotropicytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an gonadotropicytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 511 (Cycle #553)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of corticotropicytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of corticotropicytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transtachyonation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and corticotropicytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and corticotropicytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all corticotropicytoclastologist and corticotropicoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full corticotropicytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an corticotropicytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 512 (Cycle #554)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of somatotropicytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of somatotropicytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transchronotonation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and somatotropicytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and somatotropicytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all somatotropicytoclastologist and somatotropicoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full somatotropicytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an somatotropicytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 513 (Cycle #555)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of maculadensacytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of maculadensacytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transaerogelation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and maculadensacytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and maculadensacytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all maculadensacytoclastologist and maculadensaoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full maculadensacytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an maculadensacytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 514 (Cycle #556)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of juxtaglomerularcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of juxtaglomerularcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcarbyneation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and juxtaglomerularcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and juxtaglomerularcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all juxtaglomerularcytoclastologist and juxtaglomerularoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full juxtaglomerularcytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an juxtaglomerularcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 515 (Cycle #557)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of mesangialcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of mesangialcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transgrapheneation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and mesangialcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and mesangialcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all mesangialcytoclastologist and mesangialoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full mesangialcytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an mesangialcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 516 (Cycle #558)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of foveolarcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of foveolarcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transnaniteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and foveolarcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and foveolarcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all foveolarcytoclastologist and foveolaroblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full foveolarcytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an foveolarcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 517 (Cycle #559)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of chiefcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of chiefcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transphrikation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and chiefcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and chiefcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all chiefcytoclastologist and chiefoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full chiefcytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an chiefcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 518 (Cycle #560)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of parietalcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of parietalcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcortosisation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and parietalcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and parietalcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all parietalcytoclastologist and parietaloblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full parietalcytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an parietalcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 519 (Cycle #561)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of panethcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of panethcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcarboniteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and panethcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and panethcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all panethcytoclastologist and panethoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full panethcytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an panethcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 520 (Cycle #562)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of langerhanscytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of langerhanscytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transquadraniumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and langerhanscytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and langerhanscytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all langerhanscytoclastologist and langerhansoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full langerhanscytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an langerhanscytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 521 (Cycle #563)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of merkelcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of merkelcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transplasteelation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and merkelcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and merkelcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all merkelcytoclastologist and merkeloblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full merkelcytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an merkelcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 522 (Cycle #564)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of thecacytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of thecacytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transdurasteelation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and thecacytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and thecacytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all thecacytoclastologist and thecaoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full thecacytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an thecacytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 523 (Cycle #565)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of luteincytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of luteincytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transtiberiumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and luteincytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and luteincytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all luteincytoclastologist and luteinoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full luteincytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an luteincytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 524 (Cycle #566)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of granulosacytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of granulosacytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transkryptoniteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and granulosacytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and granulosacytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all granulosacytoclastologist and granulosaoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full granulosacytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an granulosacytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 525 (Cycle #567)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of leydigcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of leydigcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcorbomiteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and leydigcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and leydigcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all leydigcytoclastologist and leydigoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full leydigcytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an leydigcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 526 (Cycle #568)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of sertolicytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of sertolicytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual translatinumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and sertolicytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and sertolicytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all sertolicytoclastologist and sertolioblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full sertolicytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an sertolicytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 527 (Cycle #569)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of kupffercytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of kupffercytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transduraniumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and kupffercytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and kupffercytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all kupffercytoclastologist and kupfferoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full kupffercytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an kupffercytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 528 (Cycle #570)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of histioblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of histioblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transtritaniumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and histioblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and histioblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all histioblastocytoclastologist and histioblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full histioblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an histioblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 529 (Cycle #571)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of metamyelocytocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of metamyelocytocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transdilithiumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and metamyelocytocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and metamyelocytocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all metamyelocytocytoclastologist and metamyelocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full metamyelocytocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an metamyelocytocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 530 (Cycle #572)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of promyelocytocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of promyelocytocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transneutroniumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and promyelocytocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and promyelocytocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all promyelocytocytoclastologist and promyelocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full promyelocytocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an promyelocytocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 531 (Cycle #573)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of megakaryoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of megakaryoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transtriniumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and megakaryoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and megakaryoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all megakaryoblastocytoclastologist and megakaryoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full megakaryoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an megakaryoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 532 (Cycle #574)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of normoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of normoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transnaquadahation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and normoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and normoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all normoblastocytoclastologist and normoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full normoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an normoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 533 (Cycle #575)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of cytotrophoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of cytotrophoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transruniteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and cytotrophoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and cytotrophoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all cytotrophoblastocytoclastologist and cytotrophoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full cytotrophoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an cytotrophoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 534 (Cycle #576)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of syncytiotrophoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of syncytiotrophoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transunobtainiumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and syncytiotrophoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and syncytiotrophoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all syncytiotrophoblastocytoclastologist and syncytiotrophoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full syncytiotrophoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an syncytiotrophoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 535 (Cycle #577)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of oligodendroblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of oligodendroblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transbeskaration altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and oligodendroblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and oligodendroblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all oligodendroblastocytoclastologist and oligodendroblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full oligodendroblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an oligodendroblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 536 (Cycle #578)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of astroblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of astroblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transadamantiumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and astroblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and astroblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all astroblastocytoclastologist and astroblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full astroblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an astroblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 537 (Cycle #579)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of spongioblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of spongioblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transvibraniumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and spongioblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and spongioblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all spongioblastocytoclastologist and spongioblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full spongioblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an spongioblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 538 (Cycle #580)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of ependymoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of ependymoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transgalinstanation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and ependymoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and ependymoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all ependymoblastocytoclastologist and ependymoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full ependymoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an ependymoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 539 (Cycle #581)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of neurogliocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of neurogliocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transvitalliumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and neurogliocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and neurogliocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all neurogliocytoclastologist and neurogliaoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full neurogliocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an neurogliocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 540 (Cycle #582)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of oocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of oocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transelinvacation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and oocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and oocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all oocytoclastologist and oocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full oocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an oocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 541 (Cycle #583)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of spermatocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of spermatocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transinconelation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and spermatocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and spermatocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all spermatocytoclastologist and spermatocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full spermatocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an spermatocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 542 (Cycle #584)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of chondroclastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of chondroclastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transhastelloyation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and chondroclastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and chondroclastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all chondroclastocytoclastologist and chondroclastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full chondroclastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an chondroclastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 543 (Cycle #585)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of osteoclastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of osteoclastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmonelation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and osteoclastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and osteoclastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all osteoclastocytoclastologist and osteoclastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full osteoclastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an osteoclastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 544 (Cycle #586)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of cementocytocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of cementocytocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transconstantanation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and cementocytocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and cementocytocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all cementocytocytoclastologist and cementocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full cementocytocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an cementocytocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 545 (Cycle #587)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of cementoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of cementoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmagnaliumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and cementoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and cementoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all cementoblastocytoclastologist and cementoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full cementoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an cementoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 546 (Cycle #588)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of ameloblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of ameloblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transduralumination altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and ameloblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and ameloblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all ameloblastocytoclastologist and ameloblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full ameloblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an ameloblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 547 (Cycle #589)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of odontoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of odontoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transstelliteation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and odontoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and odontoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all odontoblastocytoclastologist and odontoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full odontoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an odontoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 548 (Cycle #590)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of tenoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of tenoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transalinicoation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and tenoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and tenoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all tenoblastocytoclastologist and tenoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full tenoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an tenoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 549 (Cycle #591)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of tenocytocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of tenocytocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transnichromeation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and tenocytocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and tenocytocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all tenocytocytoclastologist and tenocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full tenocytocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an tenocytocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 550 (Cycle #592)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of keratocytocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of keratocytocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transinvaration altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and keratocytocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and keratocytocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all keratocytocytoclastologist and keratocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full keratocytocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an keratocytocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 551 (Cycle #593)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of epithelialcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of epithelialcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsolderation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and epithelialcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and epithelialcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all epithelialcytoclastologist and epithelialoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full epithelialcytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an epithelialcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 552 (Cycle #594)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of endothelialcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of endothelialcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transamalgamation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and endothelialcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and endothelialcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all endothelialcytoclastologist and endothelialoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full endothelialcytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an endothelialcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 553 (Cycle #595)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of mesothelialcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of mesothelialcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transpewteration altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and mesothelialcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and mesothelialcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all mesothelialcytoclastologist and mesothelialoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full mesothelialcytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an mesothelialcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 554 (Cycle #596)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of pericytocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of pericytocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transbrassation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and pericytocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and pericytocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all pericytocytoclastologist and pericyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full pericytocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an pericytocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 555 (Cycle #597)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of myofibroblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of myofibroblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transbronzeation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and myofibroblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and myofibroblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all myofibroblastocytoclastologist and myofibroblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full myofibroblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an myofibroblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 556 (Cycle #598)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of plasmacytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of plasmacytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsteelation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and plasmacytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and plasmacytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all plasmacytoclastologist and plasmacyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full plasmacytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an plasmacytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 557 (Cycle #599)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of somatocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of somatocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transelectrumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and somatocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and somatocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all somatocytoclastologist and somatocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full somatocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an somatocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 558 (Cycle #600)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of mastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of mastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transorichalcumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and mastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and mastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all mastocytoclastologist and mastocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full mastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an mastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 559 (Cycle #601)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of histiocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of histiocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transadamantation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and histiocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and histiocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all histiocytoclastologist and histiocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full histiocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an histiocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 560 (Cycle #602)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of lipocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of lipocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmithrilation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and lipocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and lipocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all lipocytoclastologist and lipocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full lipocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an lipocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 561 (Cycle #603)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of nephroblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of nephroblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transtritiumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and nephroblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and nephroblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all nephroblastocytoclastologist and nephroblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full nephroblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an nephroblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 562 (Cycle #604)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of splenoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of splenoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transdeuteriumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and splenoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and splenoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all splenoblastocytoclastologist and splenoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full splenoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an splenoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 563 (Cycle #605)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of thymocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of thymocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transoganessonation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and thymocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and thymocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all thymocytoclastologist and thymocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full thymocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an thymocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 564 (Cycle #606)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of pinealocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of pinealocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transtennessineation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and pinealocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and pinealocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all pinealocytoclastologist and pinealocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full pinealocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an pinealocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 565 (Cycle #607)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of neuroendocrinocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of neuroendocrinocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual translivermoriumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and neuroendocrinocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and neuroendocrinocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all neuroendocrinocytoclastologist and neuroendocrineoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full neuroendocrinocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an neuroendocrinocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 566 (Cycle #608)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of myelocytocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of myelocytocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmoscoviumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and myelocytocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and myelocytocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all myelocytocytoclastologist and myelocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full myelocytocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an myelocytocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 567 (Cycle #609)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of keratinoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of keratinoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transfleroviumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and keratinoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and keratinoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all keratinoblastocytoclastologist and keratinoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full keratinoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an keratinoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 568 (Cycle #610)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of melanoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of melanoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transnihoniumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and melanoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and melanoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all melanoblastocytoclastologist and melanoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full melanoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an melanoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 569 (Cycle #611)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of reticulocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of reticulocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcoperniciumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and reticulocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and reticulocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all reticulocytoclastologist and reticulocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full reticulocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an reticulocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 570 (Cycle #612)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of gobletcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of gobletcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transroentgeniumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and gobletcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and gobletcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all gobletcytoclastologist and gobletoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full gobletcytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an gobletcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 571 (Cycle #613)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of glialcytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of glialcytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transdarmstadtiumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and glialcytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and glialcytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all glialcytoclastologist and gliaoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full glialcytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an glialcytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 572 (Cycle #614)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of satellitecytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of satellitecytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmeitneriumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and satellitecytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and satellitecytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all satellitecytoclastologist and satelliteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full satellitecytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an satellitecytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 573 (Cycle #615)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of ependymocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of ependymocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transhassiumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and ependymocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and ependymocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all ependymocytoclastologist and ependymaloblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full ependymocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an ependymocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 574 (Cycle #616)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of schwannocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of schwannocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transbohriumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and schwannocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and schwannocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all schwannocytoclastologist and schwannoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full schwannocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an schwannocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 575 (Cycle #617)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of purkinjocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of purkinjocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transseaborgiumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and purkinjocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and purkinjocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all purkinjocytoclastologist and purkinjeoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full purkinjocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an purkinjocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 576 (Cycle #618)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of megakaryocytocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of megakaryocytocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transdubniumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and megakaryocytocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and megakaryocytocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all megakaryocytocytoclastologist and megakaryocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full megakaryocytocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an megakaryocytocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 577 (Cycle #619)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of erythroblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of erythroblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transrutherfordiumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and erythroblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and erythroblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all erythroblastocytoclastologist and erythroblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full erythroblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an erythroblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 578 (Cycle #620)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of monoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of monoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual translawrenciumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and monoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and monoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all monoblastocytoclastologist and monoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full monoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an monoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 579 (Cycle #621)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of lymphoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of lymphoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transnobeliumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and lymphoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and lymphoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all lymphoblastocytoclastologist and lymphoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full lymphoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an lymphoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 580 (Cycle #622)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of enteroblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of enteroblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmendeleviumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and enteroblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and enteroblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all enteroblastocytoclastologist and enteroblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full enteroblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an enteroblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 581 (Cycle #623)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of cardiomyocytocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of cardiomyocytocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transfermiumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and cardiomyocytocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and cardiomyocytocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all cardiomyocytocytoclastologist and cardiomyocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full cardiomyocytocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an cardiomyocytocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 582 (Cycle #624)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of podocytocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of podocytocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transeinsteiniumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and podocytocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and podocytocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all podocytocytoclastologist and podocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full podocytocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an podocytocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 583 (Cycle #625)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of epitheliocytocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of epitheliocytocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcaliforniumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and epitheliocytocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and epitheliocytocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all epitheliocytocytoclastologist and epitheliocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full epitheliocytocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an epitheliocytocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 584 (Cycle #626)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of fibroblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of fibroblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transberkeliumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and fibroblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and fibroblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all fibroblastocytoclastologist and fibroblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full fibroblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an fibroblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 585 (Cycle #627)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of myoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of myoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcuriumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and myoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and myoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all myoblastocytoclastologist and myoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full myoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an myoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 586 (Cycle #628)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of chondroblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of chondroblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transamericiumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and chondroblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and chondroblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all chondroblastocytoclastologist and chondroblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full chondroblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an chondroblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 587 (Cycle #629)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of osteoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of osteoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transplutoniumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and osteoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and osteoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all osteoblastocytoclastologist and osteoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full osteoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an osteoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 588 (Cycle #630)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of neuroblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of neuroblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transneptuniumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and neuroblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and neuroblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all neuroblastocytoclastologist and neuroblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full neuroblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an neuroblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 589 (Cycle #631)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of hepatoblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of hepatoblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transuraniumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and hepatoblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and hepatoblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all hepatoblastocytoclastologist and hepatoblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full hepatoblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an hepatoblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 590 (Cycle #632)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of neuronocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of neuronocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transprotactiniumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and neuronocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and neuronocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all neuronocytoclastologist and neuronoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full neuronocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an neuronocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 591 (Cycle #633)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of dendritocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of dendritocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transthoriumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and dendritocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and dendritocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all dendritocytoclastologist and dendriteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full dendritocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an dendritocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 592 (Cycle #634)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of macrophagocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of macrophagocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transactiniumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and macrophagocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and macrophagocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all macrophagocytoclastologist and macrophageoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full macrophagocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an macrophagocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 593 (Cycle #635)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of adipocytocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of adipocytocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transradiumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and adipocytocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and adipocytocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all adipocytocytoclastologist and adipocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full adipocytocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an adipocytocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 594 (Cycle #636)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of microgliocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of microgliocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transfranciumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and microgliocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and microgliocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all microgliocytoclastologist and microgliaoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full microgliocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an microgliocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 595 (Cycle #637)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of oligodendrocytocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of oligodendrocytocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transradonation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and oligodendrocytocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and oligodendrocytocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all oligodendrocytocytoclastologist and oligodendrocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full oligodendrocytocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an oligodendrocytocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 596 (Cycle #638)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of astrocytocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of astrocytocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transpoloniumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and astrocytocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and astrocytocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all astrocytocytoclastologist and astrocyteoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full astrocytocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an astrocytocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 597 (Cycle #639)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of myeloblastocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of myeloblastocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transbismuthation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and myeloblastocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and myeloblastocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all myeloblastocytoclastologist and myeloblastoblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full myeloblastocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an myeloblastocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 598 (Cycle #640)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of keratinocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of keratinocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transthalliumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and keratinocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and keratinocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all keratinocytoclastologist and keratinooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full keratinocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an keratinocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 599 (Cycle #641)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of melanocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of melanocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transiridiumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and melanocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and melanocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all melanocytoclastologist and melanooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full melanocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an melanocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 600 (Cycle #642)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of enterocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of enterocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transosmiumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and enterocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and enterocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all enterocytoclastologist and enterooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full enterocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an enterocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });
});
