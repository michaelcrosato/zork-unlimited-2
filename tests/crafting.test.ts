import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { CYOAPack, CYOAPackSchema } from "../src/cyoa/schema.js";
import { generateLegalActions } from "../src/parser/legal_actions.js";
import { buildObservation } from "../src/api/observation.js";
import { validateParserPack } from "../src/validate/parser_validator.js";
import { validateCYOAPack } from "../src/validate/cyoa_validator.js";

describe("Item Crafting and Inventory Recipes System", () => {
  describe("Schema Validation", () => {
    it("should successfully parse a Parser pack with recipes", () => {
      const packRaw = {
        meta: {
          id: "crafting_pack",
          title: "Crafting Test Pack",
          start_room: "lab",
        },
        rooms: [
          {
            id: "lab",
            name: "Alchemy Lab",
            description: "A dark laboratory filled with beakers.",
            objects: ["flint", "steel", "kindling", "torch"],
            npcs: [],
            exits: [],
          },
        ],
        objects: [
          { id: "flint", name: "flint", description: "A piece of flint." },
          { id: "steel", name: "steel", description: "A piece of steel." },
          { id: "kindling", name: "kindling", description: "Some dry sticks." },
          { id: "torch", name: "lit torch", description: "A burning torch." },
        ],
        recipes: [
          {
            id: "make_torch",
            ingredients: ["flint", "steel", "kindling"],
            result: "torch",
            text: "Strike flint and steel to light kindling",
            success_msg: "You strike sparks onto the kindling, lighting a blazing torch!",
          },
        ],
        win_conditions: [],
        endings: [],
      };

      const parsed = ParserPackSchema.safeParse(packRaw);
      expect(parsed.success).toBe(true);
      expect(parsed.data?.recipes?.length).toBe(1);
      expect(parsed.data?.recipes?.[0].id).toBe("make_torch");
    });

    it("should successfully parse a CYOA pack with recipes", () => {
      const packRaw = {
        meta: {
          id: "cyoa_crafting",
          title: "CYOA Crafting Pack",
          start: "scene_start",
        },
        scenes: [
          {
            id: "scene_start",
            title: "Dark Cave",
            text: "You are in a dark cave.",
            choices: [],
          },
        ],
        recipes: [
          {
            id: "make_key",
            ingredients: ["key_mold", "molten_gold"],
            result: "golden_key",
            text: "Pour molten gold into the key mold",
          },
        ],
        endings: [],
      };

      const parsed = CYOAPackSchema.safeParse(packRaw);
      expect(parsed.success).toBe(true);
      expect(parsed.data?.recipes?.length).toBe(1);
    });
  });

  describe("Parser Mode Crafting Logic", () => {
    const pack: ParserPack = {
      meta: {
        id: "crafting_pack",
        title: "Crafting Test Pack",
        start_room: "lab",
        vars_init: {},
        flags_init: [],
      },
      rooms: [
        {
          id: "lab",
          name: "Alchemy Lab",
          description: "A dark laboratory.",
          objects: [],
          npcs: [],
          exits: [],
        },
      ],
      objects: [
        { id: "flint", name: "piece of flint", aliases: ["flint"], description: "Flint.", takeable: true },
        { id: "steel", name: "piece of steel", aliases: ["steel"], description: "Steel.", takeable: true },
        { id: "torch", name: "lit torch", aliases: ["torch"], description: "Lit torch.", takeable: true },
      ],
      recipes: [
        {
          id: "light_torch",
          ingredients: ["flint", "steel"],
          result: "torch",
          success_msg: "Sparks ignite! You craft a lit torch.",
          effects: [{ set_flag: "has_light" }],
        },
      ],
      win_conditions: [],
      endings: [],
    };

    it("should not generate crafting actions if ingredients are missing", () => {
      const state = createInitialState({ seed: 42, start: "lab" });
      state.inventory = ["flint"]; // missing steel

      const actions = generateLegalActions(state, pack);
      const craftActions = actions.filter((a) => a.action.type === "CRAFT");
      expect(craftActions.length).toBe(0);
    });

    it("should generate crafting actions (combine and use) when ingredients are present", () => {
      const state = createInitialState({ seed: 42, start: "lab" });
      state.inventory = ["flint", "steel"];

      const actions = generateLegalActions(state, pack);
      const craftActions = actions.filter((a) => a.action.type === "CRAFT");

      // We expect: "combine piece of flint and piece of steel", "use piece of flint on piece of steel", "use piece of steel on piece of flint"
      expect(craftActions.length).toBe(3);
      expect(craftActions.some((a) => a.command.includes("combine"))).toBe(true);
      expect(craftActions.some((a) => a.command === "use piece of flint on piece of steel")).toBe(true);
    });

    it("should process CRAFT step, consuming ingredients, adding result, and applying effects", () => {
      const state = createInitialState({ seed: 42, start: "lab" });
      state.inventory = ["flint", "steel", "other_item"];

      const result = step(state, { type: "CRAFT", recipeId: "light_torch" }, pack);
      expect(result.ok).toBe(true);
      expect(result.state.inventory).toContain("torch");
      expect(result.state.inventory).toContain("other_item");
      expect(result.state.inventory).not.toContain("flint");
      expect(result.state.inventory).not.toContain("steel");
      expect(result.state.flags["has_light"]).toBe(true);

      const narration = result.events.find((e) => e.type === "narration");
      expect(narration?.text).toBe("Sparks ignite! You craft a lit torch.");
    });
  });

  describe("CYOA Mode Crafting Logic", () => {
    const pack: CYOAPack = {
      meta: {
        id: "cyoa_crafting",
        title: "CYOA Crafting Pack",
        start: "cave",
        vars_init: {},
        flags_init: [],
      },
      scenes: [
        {
          id: "cave",
          title: "Dark Cave",
          text: "You are in a cave.",
          choices: [
            {
              id: "go_deeper",
              text: "Go deeper into the cave",
              next: "cave_deep",
            },
          ],
        },
        {
          id: "cave_deep",
          title: "Deep Cave",
          text: "It is very deep.",
          choices: [],
        },
      ],
      recipes: [
        {
          id: "craft_key",
          ingredients: ["mold", "gold"],
          result: "key",
          text: "Form a golden key",
          success_msg: "You form a glowing golden key.",
        },
      ],
    };

    it("should append craft choice in buildObservation when ingredients are in inventory", () => {
      const state = createInitialState({ seed: 42, start: "cave" });
      state.inventory = ["mold", "gold"];

      const obs = buildObservation(state, pack);
      expect(obs.mode).toBe("cyoa");
      const cyoaObs = obs as any;
      expect(cyoaObs.available_actions.length).toBe(2);
      expect(cyoaObs.available_actions[1].id).toBe("craft_craft_key");
      expect(cyoaObs.available_actions[1].text).toBe("Form a golden key");
    });

    it("should process craft_ choice, consuming items, adding result, and staying in same scene", () => {
      const state = createInitialState({ seed: 42, start: "cave" });
      state.inventory = ["mold", "gold"];

      const result = step(state, { type: "CHOOSE", choiceId: "craft_craft_key" }, pack);
      expect(result.ok).toBe(true);
      expect(result.state.inventory).toContain("key");
      expect(result.state.inventory).not.toContain("mold");
      expect(result.state.inventory).not.toContain("gold");
      expect(result.state.current).toBe("cave"); // Stays in cave

      const narration = result.events.find((e) => e.type === "narration");
      expect(narration?.text).toBe("You form a glowing golden key.");
    });
  });

  describe("Validation Rules", () => {
    it("should report duplicate recipe IDs and missing object references in Parser validator", () => {
      const packRaw = {
        meta: {
          id: "test",
          title: "Test",
          start_room: "room",
        },
        rooms: [{ id: "room", name: "room", description: "room", exits: [] }],
        objects: [{ id: "item1", name: "item1", description: "item1" }],
        npcs: [],
        recipes: [
          { id: "r1", ingredients: ["item1", "invalid_item"], tools: ["invalid_tool"], result: "item1" },
          { id: "r1", ingredients: ["item1"], result: "invalid_result" },
        ],
        win_conditions: [],
        endings: [],
      };

      const report = validateParserPack(packRaw);
      expect(report.ok).toBe(false);

      const dupId = report.findings.find((f) => f.code === "DUPLICATE_RECIPE_ID");
      expect(dupId).toBeDefined();

      const refErrors = report.findings.filter((f) => f.code === "REFERENCE_ERROR");
      expect(refErrors.length).toBe(3); // invalid_item, invalid_tool, and invalid_result
    });

    it("should report duplicate recipe IDs in CYOA validator", () => {
      const packRaw = {
        meta: { id: "test", title: "test", start: "start" },
        scenes: [{ id: "start", title: "start", text: "start", choices: [{ id: "c1", text: "c1", next: "start" }] }],
        recipes: [
          { id: "r1", ingredients: ["mold"], result: "key" },
          { id: "r1", ingredients: ["gold"], result: "key" },
        ],
      };

      const report = validateCYOAPack(packRaw);
      expect(report.ok).toBe(false);

      const dupId = report.findings.find((f) => f.code === "DUPLICATE_RECIPE_ID");
      expect(dupId).toBeDefined();
    });
  });

  describe("Advanced Crafting Features (AF-16)", () => {
    const pack: ParserPack = {
      meta: {
        id: "advanced_crafting_pack",
        title: "Advanced Crafting Pack",
        start_room: "workshop",
        vars_init: {},
        flags_init: [],
      },
      rooms: [
        {
          id: "workshop",
          name: "Workshop",
          description: "A noisy workshop.",
          objects: [],
          npcs: [],
          exits: [],
        },
      ],
      objects: [
        { id: "iron_ore", name: "iron ore", aliases: ["ore"], description: "Ore.", takeable: true },
        { id: "hammer", name: "smithing hammer", aliases: ["hammer"], description: "Hammer.", takeable: true },
        { id: "iron_ingot", name: "iron ingot", aliases: ["ingot"], description: "Ingot.", takeable: true },
        { id: "coal", name: "coal lump", aliases: ["coal"], description: "Coal.", takeable: true },
      ],
      recipes: [
        {
          id: "smelt_iron",
          ingredients: ["iron_ore"],
          tools: ["hammer"],
          result: "iron_ingot",
          success_msg: "You hammer the hot iron ore into a fine iron ingot.",
          conditions: [{ has_flag: "forge_hot" }],
          failure_msg: "The forge is cold. You cannot smelt the iron without heat.",
        },
      ],
      win_conditions: [],
      endings: [],
    };

    it("should generate crafting actions when ingredients and tools are present, and not consume tools", () => {
      const state = createInitialState({ seed: 42, start: "workshop" });
      state.inventory = ["iron_ore", "hammer"];

      const actions = generateLegalActions(state, pack);
      const craftActions = actions.filter((a) => a.action.type === "CRAFT" && a.action.recipeId === "smelt_iron");

      // Should generate because both ingredient (iron_ore) and tool (hammer) are present
      expect(craftActions.length).toBe(3); // combine, use ore on hammer, use hammer on ore

      // Trigger crafting when forge is hot
      state.flags["forge_hot"] = true;
      const result = step(state, { type: "CRAFT", recipeId: "smelt_iron" }, pack);
      expect(result.ok).toBe(true);
      expect(result.state.inventory).toContain("iron_ingot");
      expect(result.state.inventory).toContain("hammer"); // Tool not consumed!
      expect(result.state.inventory).not.toContain("iron_ore"); // Ingredient consumed!
    });

    it("should check tool requirement", () => {
      const state = createInitialState({ seed: 42, start: "workshop" });
      state.inventory = ["iron_ore"]; // missing tool "hammer"

      const actions = generateLegalActions(state, pack);
      const craftActions = actions.filter((a) => a.action.type === "CRAFT" && a.action.recipeId === "smelt_iron");
      expect(craftActions.length).toBe(0); // missing tool -> no action generated
    });

    it("should output failure message if conditions are not met", () => {
      const state = createInitialState({ seed: 42, start: "workshop" });
      state.inventory = ["iron_ore", "hammer"];
      // forge_hot is false

      const result = step(state, { type: "CRAFT", recipeId: "smelt_iron" }, pack);
      expect(result.ok).toBe(false);
      expect(result.rejectionReason).toBe("The forge is cold. You cannot smelt the iron without heat.");
    });

    it("should generate invalid combination fallback actions and handle them with 'Nothing happens'", () => {
      const state = createInitialState({ seed: 42, start: "workshop" });
      state.inventory = ["coal", "hammer"]; // no recipe exists for this pair

      const actions = generateLegalActions(state, pack);
      const invalidActions = actions.filter(
        (a) => a.action.type === "CRAFT" && a.action.recipeId.startsWith("invalid_")
      );
      expect(invalidActions.length).toBe(4); // 2 use (A on B, B on A) + 2 combine (A and B, B and A)

      const firstInvalid = invalidActions[0].action;
      const result = step(state, firstInvalid, pack);
      expect(result.ok).toBe(true);
      const narration = result.events.find((e) => e.type === "narration");
      expect(narration?.text).toContain("Nothing happens when you try to combine");
    });
  });
});
