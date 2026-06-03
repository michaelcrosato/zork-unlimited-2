import { describe, it, expect } from "vitest";
import { validateParserPack } from "../src/validate/parser_validator.js";
import { validateCYOAPack } from "../src/validate/cyoa_validator.js";

describe("Validator Deep Rules Tests", () => {
  describe("validateParserPack duplicate directions and cyclic room reference", () => {
    it("reports an error for duplicate direction definitions in exits", () => {
      const pack = {
        meta: {
          id: "test_duplicate_directions",
          title: "Test Duplicate Directions",
          start_room: "room_a",
          vars_init: {},
          flags_init: [],
        },
        rooms: [
          {
            id: "room_a",
            name: "Room A",
            description: "A room with duplicate exits.",
            objects: [],
            npcs: [],
            exits: [
              { direction: "north", to: "room_b" },
              { direction: "north", to: "room_c" },
            ],
          },
          {
            id: "room_b",
            name: "Room B",
            description: "Another room.",
            objects: [],
            npcs: [],
            exits: [],
          },
          {
            id: "room_c",
            name: "Room C",
            description: "Yet another room.",
            objects: [],
            npcs: [],
            exits: [],
          },
        ],
        objects: [],
        npcs: [],
        win_conditions: [],
        endings: [],
      };

      const report = validateParserPack(pack);
      expect(report.ok).toBe(false);
      const duplicateFinding = report.findings.find((f) => f.code === "DUPLICATE_DIRECTION");
      expect(duplicateFinding).toBeDefined();
      expect(duplicateFinding?.severity).toBe("error");
      expect(duplicateFinding?.message).toContain("has duplicate exit direction definitions for 'north'");
    });

    it("reports a warning for self-referencing cyclic room reference", () => {
      const pack = {
        meta: {
          id: "test_cyclic_room",
          title: "Test Cyclic Room",
          start_room: "room_a",
          vars_init: {},
          flags_init: [],
        },
        rooms: [
          {
            id: "room_a",
            name: "Room A",
            description: "A room pointing to itself.",
            objects: [],
            npcs: [],
            exits: [{ direction: "north", to: "room_a" }],
          },
        ],
        objects: [],
        npcs: [],
        win_conditions: [],
        endings: [],
      };

      const report = validateParserPack(pack);
      const cyclicFinding = report.findings.find((f) => f.code === "CYCLIC_ROOM_REFERENCE");
      expect(cyclicFinding).toBeDefined();
      expect(cyclicFinding?.severity).toBe("warning");
      expect(cyclicFinding?.message).toContain("leads back to itself");
    });
  });

  describe("validateCYOAPack duplicate choice ID and cyclic scene transitions", () => {
    it("reports an error for duplicate choice IDs in a scene", () => {
      const pack = {
        meta: {
          id: "test_duplicate_choices",
          title: "Test Duplicate Choices",
          start: "scene_a",
          vars_init: {},
          flags_init: [],
        },
        scenes: [
          {
            id: "scene_a",
            title: "Scene A",
            text: "A scene with duplicate choices.",
            on_enter: [],
            is_ending: false,
            choices: [
              { id: "choice_1", text: "Go to scene B", next: "scene_b", conditions: [], effects: [] },
              { id: "choice_1", text: "Go to scene C", next: "scene_c", conditions: [], effects: [] },
            ],
          },
          {
            id: "scene_b",
            title: "Scene B",
            text: "Scene B",
            on_enter: [],
            is_ending: true,
            choices: [],
          },
          {
            id: "scene_c",
            title: "Scene C",
            text: "Scene C",
            on_enter: [],
            is_ending: true,
            choices: [],
          },
        ],
        endings: [],
      };

      const report = validateCYOAPack(pack);
      expect(report.ok).toBe(false);
      const duplicateFinding = report.findings.find((f) => f.code === "DUPLICATE_CHOICE_ID");
      expect(duplicateFinding).toBeDefined();
      expect(duplicateFinding?.severity).toBe("error");
      expect(duplicateFinding?.message).toContain("has duplicate choice ID definitions for 'choice_1'");
    });

    it("reports a warning for self-referencing cyclic scene transition in choice", () => {
      const pack = {
        meta: {
          id: "test_cyclic_choice",
          title: "Test Cyclic Choice",
          start: "scene_a",
          vars_init: {},
          flags_init: [],
        },
        scenes: [
          {
            id: "scene_a",
            title: "Scene A",
            text: "Scene A text",
            on_enter: [],
            is_ending: false,
            choices: [{ id: "choice_self", text: "Go to self", next: "scene_a", conditions: [], effects: [] }],
          },
        ],
        endings: [],
      };

      const report = validateCYOAPack(pack);
      const cyclicFinding = report.findings.find(
        (f) => f.code === "CYCLIC_SCENE_REFERENCE" && f.where.includes("choice:choice_self")
      );
      expect(cyclicFinding).toBeDefined();
      expect(cyclicFinding?.severity).toBe("warning");
    });

    it("reports an error for self-referencing on_enter goto transition", () => {
      const pack = {
        meta: {
          id: "test_cyclic_goto",
          title: "Test Cyclic Goto",
          start: "scene_a",
          vars_init: {},
          flags_init: [],
        },
        scenes: [
          {
            id: "scene_a",
            title: "Scene A",
            text: "Scene A text",
            on_enter: [{ goto: "scene_a" }],
            is_ending: false,
            choices: [{ id: "choice_1", text: "Go to ending", next: "ending_1", conditions: [], effects: [] }],
          },
          {
            id: "ending_1",
            title: "Ending 1",
            text: "End game text",
            on_enter: [],
            is_ending: true,
            choices: [],
          },
        ],
        endings: [],
      };

      const report = validateCYOAPack(pack);
      expect(report.ok).toBe(false);
      const cyclicFinding = report.findings.find(
        (f) => f.code === "CYCLIC_SCENE_REFERENCE" && f.where.includes("on_enter")
      );
      expect(cyclicFinding).toBeDefined();
      expect(cyclicFinding?.severity).toBe("error");
      expect(cyclicFinding?.message).toContain("self-referencing on_enter goto transition");
    });

    it("reports an error for multi-hop cyclic on_enter goto transition", () => {
      const pack = {
        meta: {
          id: "test_multi_hop_cyclic_goto",
          title: "Test Multi Hop Cyclic Goto",
          start: "scene_a",
          vars_init: {},
          flags_init: [],
        },
        scenes: [
          {
            id: "scene_a",
            title: "Scene A",
            text: "Scene A text",
            on_enter: [{ goto: "scene_b" }],
            is_ending: false,
            choices: [],
          },
          {
            id: "scene_b",
            title: "Scene B",
            text: "Scene B text",
            on_enter: [{ goto: "scene_a" }],
            is_ending: false,
            choices: [],
          },
        ],
        endings: [],
      };

      const report = validateCYOAPack(pack);
      expect(report.ok).toBe(false);
      const cyclicFinding = report.findings.find(
        (f) => f.code === "CYCLIC_SCENE_REFERENCE" && f.message.includes("Infinite transition loop detected")
      );
      expect(cyclicFinding).toBeDefined();
      expect(cyclicFinding?.severity).toBe("error");
      expect(cyclicFinding?.message).toContain(
        "Infinite transition loop detected in on_enter gotos: scene_a -> scene_b -> scene_a"
      );
    });

    it("reports warnings for duplicate choice target/text definitions and deep cyclic scene transitions", () => {
      const pack = {
        meta: {
          id: "test_deep_cyoa",
          title: "Test Deep CYOA Checks",
          start: "scene_a",
          vars_init: {},
          flags_init: [],
        },
        scenes: [
          {
            id: "scene_a",
            title: "Scene A",
            text: "Scene A text",
            on_enter: [],
            is_ending: false,
            choices: [
              { id: "choice_to_b", text: "Go to B", next: "scene_b", conditions: [], effects: [] },
              { id: "choice_to_b_dup", text: "Go to B", next: "scene_b", conditions: [], effects: [] },
            ],
          },
          {
            id: "scene_b",
            title: "Scene B",
            text: "Scene B text",
            on_enter: [],
            is_ending: false,
            choices: [{ id: "choice_to_c", text: "Go to C", next: "scene_c", conditions: [], effects: [] }],
          },
          {
            id: "scene_c",
            title: "Scene C",
            text: "Scene C text",
            on_enter: [],
            is_ending: false,
            choices: [{ id: "choice_to_a", text: "Go to A", next: "scene_a", conditions: [], effects: [] }],
          },
        ],
        endings: [],
      };

      const report = validateCYOAPack(pack);

      const dupTextFinding = report.findings.find((f) => f.code === "DUPLICATE_CHOICE_TEXT");
      expect(dupTextFinding).toBeDefined();
      expect(dupTextFinding?.severity).toBe("warning");

      const dupTargetFinding = report.findings.find((f) => f.code === "DUPLICATE_CHOICE_TARGET");
      expect(dupTargetFinding).toBeDefined();
      expect(dupTargetFinding?.severity).toBe("warning");

      const cycleFinding = report.findings.find(
        (f) => f.code === "CYCLIC_SCENE_REFERENCE" && f.message.includes("one-way transitions")
      );
      expect(cycleFinding).toBeDefined();
      expect(cycleFinding?.severity).toBe("warning");
      expect(cycleFinding?.message).toContain("scene_a -> scene_b -> scene_c -> scene_a");
    });
  });

  describe("validateParserPack deep cycle detection", () => {
    it("reports warnings for deep cyclic room references via one-way exits", () => {
      const pack = {
        meta: {
          id: "test_deep_parser_cycle",
          title: "Test Deep Parser Cycle",
          start_room: "room_a",
          vars_init: {},
          flags_init: [],
        },
        rooms: [
          {
            id: "room_a",
            name: "Room A",
            description: "Room A",
            objects: [],
            npcs: [],
            exits: [{ direction: "east", to: "room_b" }],
          },
          {
            id: "room_b",
            name: "Room B",
            description: "Room B",
            objects: [],
            npcs: [],
            exits: [{ direction: "south", to: "room_c" }],
          },
          {
            id: "room_c",
            name: "Room C",
            description: "Room C",
            objects: [],
            npcs: [],
            exits: [{ direction: "north", to: "room_a" }],
          },
        ],
        objects: [],
        npcs: [],
        win_conditions: [],
        endings: [],
      };

      const report = validateParserPack(pack);
      const cycleFinding = report.findings.find(
        (f) => f.code === "CYCLIC_ROOM_REFERENCE" && f.message.includes("one-way exits")
      );
      expect(cycleFinding).toBeDefined();
      expect(cycleFinding?.severity).toBe("warning");
      expect(cycleFinding?.message).toContain("room_a -> room_b -> room_c -> room_a");
    });
  });
});
