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
        mapCommand("navigate one's vector of keratinocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of keratinocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcalciumation altar", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an keratinocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 370 (Cycle #412)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of melanocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of melanocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transpotassiumation altar", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an melanocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 371 (Cycle #413)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of enterocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of enterocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsiliconation altar", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an enterocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 372 (Cycle #414)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of pneumocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of pneumocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transaluminumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and pneumocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and pneumocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all pneumocytoclastologist and pneumooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full pneumocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an pneumocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 373 (Cycle #415)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of cardiocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of cardiocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmagnesiumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and cardiocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and cardiocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all cardiocytoclastologist and cardiooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full cardiocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an cardiocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 374 (Cycle #416)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of nephrocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of nephrocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsodiumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and nephrocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and nephrocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all nephrocytoclastologist and nephrooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full nephrocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an nephrocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 375 (Cycle #417)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of splenocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of splenocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transboronation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and splenocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and splenocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all splenocytoclastologist and splenooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full splenocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an splenocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 376 (Cycle #418)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of hepatocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of hepatocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transberylliumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and hepatocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and hepatocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all hepatocytoclastologist and hepatooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full hepatocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an hepatocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 377 (Cycle #419)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of myocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of myocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual translithiumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and myocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and myocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all myocytoclastologist and myooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full myocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an myocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 378 (Cycle #420)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of fibrocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of fibrocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transheliumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and fibrocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and fibrocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all fibrocytoclastologist and fibrooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full fibrocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an fibrocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 379 (Cycle #421)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of chondrocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of chondrocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transhydrogenation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and chondrocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and chondrocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all chondrocytoclastologist and chondrooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full chondrocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an chondrocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 380 (Cycle #422)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of osteocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of osteocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transoxygenation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and osteocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and osteocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all osteocytoclastologist and osteooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full osteocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an osteocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 381 (Cycle #423)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of thrombocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of thrombocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcarbonation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and thrombocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and thrombocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all thrombocytoclastologist and thrombooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full thrombocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an thrombocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 382 (Cycle #424)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of erythrocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of erythrocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transnitrogenation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and erythrocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and erythrocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all erythrocytoclastologist and erythrooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full erythrocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an erythrocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 383 (Cycle #425)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of eosinophilocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of eosinophilocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transphosphoration altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and eosinophilocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and eosinophilocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all eosinophilocytoclastologist and eosinophilooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full eosinophilocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an eosinophilocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 384 (Cycle #426)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of neutrophilocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of neutrophilocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsulfuration altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and neutrophilocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and neutrophilocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all neutrophilocytoclastologist and neutrophilooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full neutrophilocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an neutrophilocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 385 (Cycle #427)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of monocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of monocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transfluorination altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and monocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and monocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all monocytoclastologist and monooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full monocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an monocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 386 (Cycle #428)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of lymphocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of lymphocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transchlorination altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and lymphocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and lymphocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all lymphocytoclastologist and lymphooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full lymphocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an lymphocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 387 (Cycle #429)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of synoviocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of synoviocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transbromination altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and synoviocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and synoviocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all synoviocytoclastologist and synoviooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full synoviocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an synoviocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 388 (Cycle #430)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of basophilocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of basophilocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transiodination altar", actions).action).toEqual({
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

  describe("Phase 389 (Cycle #431)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of keratinocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of keratinocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transastatination altar", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an keratinocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 390 (Cycle #432)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of melanocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of melanocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcalciumation altar", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an melanocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 391 (Cycle #433)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of enterocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of enterocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transpotassiumation altar", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an enterocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 392 (Cycle #434)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of pneumocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of pneumocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsiliconation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and pneumocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and pneumocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all pneumocytoclastologist and pneumooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full pneumocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an pneumocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 393 (Cycle #435)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of cardiocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of cardiocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transaluminumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and cardiocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and cardiocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all cardiocytoclastologist and cardiooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full cardiocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an cardiocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 394 (Cycle #436)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of nephrocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of nephrocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmagnesiumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and nephrocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and nephrocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all nephrocytoclastologist and nephrooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full nephrocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an nephrocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 395 (Cycle #437)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of splenocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of splenocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsodiumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and splenocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and splenocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all splenocytoclastologist and splenooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full splenocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an splenocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 396 (Cycle #438)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of hepatocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of hepatocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transboronation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and hepatocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and hepatocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all hepatocytoclastologist and hepatooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full hepatocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an hepatocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 397 (Cycle #439)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of myocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of myocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transberylliumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and myocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and myocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all myocytoclastologist and myooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full myocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an myocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 398 (Cycle #440)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of fibrocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of fibrocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual translithiumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and fibrocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and fibrocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all fibrocytoclastologist and fibrooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full fibrocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an fibrocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 399 (Cycle #441)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of chondrocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of chondrocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transheliumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and chondrocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and chondrocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all chondrocytoclastologist and chondrooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full chondrocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an chondrocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 400 (Cycle #442)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of osteocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of osteocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transhydrogenation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and osteocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and osteocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all osteocytoclastologist and osteooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full osteocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an osteocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 401 (Cycle #443)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of thrombocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of thrombocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transoxygenation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and thrombocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and thrombocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all thrombocytoclastologist and thrombooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full thrombocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an thrombocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 402 (Cycle #444)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of erythrocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of erythrocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcarbonation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and erythrocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and erythrocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all erythrocytoclastologist and erythrooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full erythrocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an erythrocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 403 (Cycle #445)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of eosinophilocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of eosinophilocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transnitrogenation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and eosinophilocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and eosinophilocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all eosinophilocytoclastologist and eosinophilooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full eosinophilocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an eosinophilocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 404 (Cycle #446)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of neutrophilocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of neutrophilocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transphosphoration altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and neutrophilocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and neutrophilocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all neutrophilocytoclastologist and neutrophilooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full neutrophilocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an neutrophilocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 405 (Cycle #447)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of monocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of monocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsulfuration altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and monocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and monocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all monocytoclastologist and monooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full monocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an monocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 406 (Cycle #448)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of lymphocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of lymphocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transfluorination altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and lymphocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and lymphocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all lymphocytoclastologist and lymphooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full lymphocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an lymphocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 407 (Cycle #449)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of synoviocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of synoviocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transchlorination altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and synoviocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and synoviocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all synoviocytoclastologist and synoviooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full synoviocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an synoviocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 408 (Cycle #450)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of basophilocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of basophilocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transbromination altar", actions).action).toEqual({
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

  describe("Phase 409 (Cycle #451)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of keratinocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of keratinocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transiodination altar", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an keratinocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 410 (Cycle #452)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of melanocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of melanocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transastatination altar", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an melanocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 411 (Cycle #453)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of enterocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of enterocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcalciumation altar", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an enterocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 412 (Cycle #454)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of pneumocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of pneumocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transpotassiumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and pneumocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and pneumocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all pneumocytoclastologist and pneumooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full pneumocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an pneumocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 413 (Cycle #455)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of cardiocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of cardiocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsiliconation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and cardiocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and cardiocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all cardiocytoclastologist and cardiooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full cardiocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an cardiocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 414 (Cycle #456)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of nephrocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of nephrocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transaluminumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and nephrocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and nephrocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all nephrocytoclastologist and nephrooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full nephrocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an nephrocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 415 (Cycle #457)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of splenocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of splenocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmagnesiumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and splenocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and splenocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all splenocytoclastologist and splenooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full splenocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an splenocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 416 (Cycle #458)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of hepatocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of hepatocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsodiumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and hepatocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and hepatocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all hepatocytoclastologist and hepatooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full hepatocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an hepatocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 417 (Cycle #459)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of myocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of myocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transboronation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and myocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and myocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all myocytoclastologist and myooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full myocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an myocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 418 (Cycle #460)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of fibrocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of fibrocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transberylliumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and fibrocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and fibrocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all fibrocytoclastologist and fibrooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full fibrocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an fibrocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 419 (Cycle #461)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of chondrocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of chondrocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual translithiumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and chondrocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and chondrocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all chondrocytoclastologist and chondrooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full chondrocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an chondrocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 420 (Cycle #462)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of osteocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of osteocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transheliumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and osteocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and osteocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all osteocytoclastologist and osteooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full osteocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an osteocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 421 (Cycle #463)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of thrombocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of thrombocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transhydrogenation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and thrombocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and thrombocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all thrombocytoclastologist and thrombooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full thrombocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an thrombocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 422 (Cycle #464)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of erythrocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of erythrocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transoxygenation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and erythrocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and erythrocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all erythrocytoclastologist and erythrooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full erythrocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an erythrocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 423 (Cycle #465)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of eosinophilocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of eosinophilocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcarbonation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and eosinophilocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and eosinophilocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all eosinophilocytoclastologist and eosinophilooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full eosinophilocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an eosinophilocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 424 (Cycle #466)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of neutrophilocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of neutrophilocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transnitrogenation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and neutrophilocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and neutrophilocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all neutrophilocytoclastologist and neutrophilooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full neutrophilocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an neutrophilocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 425 (Cycle #467)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of monocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of monocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transphosphoration altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and monocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and monocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all monocytoclastologist and monooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full monocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an monocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 426 (Cycle #468)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of lymphocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of lymphocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsulfuration altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and lymphocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and lymphocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all lymphocytoclastologist and lymphooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full lymphocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an lymphocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 427 (Cycle #469)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of synoviocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of synoviocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transfluorination altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and synoviocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and synoviocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all synoviocytoclastologist and synoviooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full synoviocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an synoviocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 428 (Cycle #470)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of basophilocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of basophilocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transchlorination altar", actions).action).toEqual({
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

  describe("Phase 429 (Cycle #471)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of keratinocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of keratinocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transbromination altar", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an keratinocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 430 (Cycle #472)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of melanocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of melanocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transiodination altar", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an melanocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 431 (Cycle #473)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of enterocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of enterocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transastatination altar", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an enterocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 432 (Cycle #474)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of pneumocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of pneumocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcalciumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and pneumocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and pneumocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all pneumocytoclastologist and pneumooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full pneumocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an pneumocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 433 (Cycle #475)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of cardiocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of cardiocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transpotassiumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and cardiocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and cardiocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all cardiocytoclastologist and cardiooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full cardiocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an cardiocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 434 (Cycle #476)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of nephrocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of nephrocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsiliconation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and nephrocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and nephrocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all nephrocytoclastologist and nephrooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full nephrocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an nephrocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 435 (Cycle #477)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of splenocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of splenocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transaluminumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and splenocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and splenocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all splenocytoclastologist and splenooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full splenocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an splenocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 436 (Cycle #478)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of hepatocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of hepatocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transmagnesiumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and hepatocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and hepatocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all hepatocytoclastologist and hepatooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full hepatocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an hepatocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 437 (Cycle #479)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of myocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of myocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsodiumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and myocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and myocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all myocytoclastologist and myooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full myocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an myocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 438 (Cycle #480)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of fibrocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of fibrocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transboronation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and fibrocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and fibrocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all fibrocytoclastologist and fibrooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full fibrocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an fibrocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 439 (Cycle #481)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of chondrocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of chondrocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transberylliumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and chondrocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and chondrocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all chondrocytoclastologist and chondrooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full chondrocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an chondrocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 440 (Cycle #482)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of osteocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of osteocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual translithiumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and osteocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and osteocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all osteocytoclastologist and osteooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full osteocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an osteocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 441 (Cycle #483)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of thrombocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of thrombocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transheliumation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and thrombocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and thrombocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all thrombocytoclastologist and thrombooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full thrombocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an thrombocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 442 (Cycle #484)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of erythrocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of erythrocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transhydrogenation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and erythrocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and erythrocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all erythrocytoclastologist and erythrooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full erythrocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an erythrocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 443 (Cycle #485)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of eosinophilocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of eosinophilocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transoxygenation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and eosinophilocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and eosinophilocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all eosinophilocytoclastologist and eosinophilooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full eosinophilocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an eosinophilocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 444 (Cycle #486)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of neutrophilocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of neutrophilocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transcarbonation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and neutrophilocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and neutrophilocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all neutrophilocytoclastologist and neutrophilooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full neutrophilocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an neutrophilocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 445 (Cycle #487)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of monocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of monocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transnitrogenation altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and monocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and monocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all monocytoclastologist and monooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full monocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an monocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 446 (Cycle #488)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of lymphocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of lymphocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transphosphoration altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and lymphocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and lymphocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all lymphocytoclastologist and lymphooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full lymphocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an lymphocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 447 (Cycle #489)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of synoviocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of synoviocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transsulfuration altar", actions).action).toEqual({
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
      expect(mapCommand("force completely and synoviocytoclastorheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and synoviocytoclastorheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all synoviocytoclastologist and synoviooblastoclastologist security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full synoviocytoclastokinetic deployment of lockpick", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an synoviocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 448 (Cycle #490)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of basophilocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of basophilocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transfluorination altar", actions).action).toEqual({
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

  describe("Phase 449 (Cycle #491)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of keratinocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of keratinocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transchlorination altar", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an keratinocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });

  describe("Phase 450 (Cycle #492)", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of melanocytoclastopoiesis towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of melanocytoclastopoiesis in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual transbromination altar", actions).action).toEqual({
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
      expect(mapCommand("initiate a/an melanocytoclastopathological face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });
});
