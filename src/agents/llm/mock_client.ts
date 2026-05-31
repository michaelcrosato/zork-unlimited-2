import { LlmClient } from "./client.js";
import { PureRand } from "../../core/rng.js";
import { CYOAPack } from "../../cyoa/schema.js";

/**
 * A fully deterministic Mock LLM client that can simulate the Writer, Adapter,
 * Playtester, and Fixer behaviors without needing live network calls or API keys.
 *
 * Essential for robust unit tests, CI integration, and determinism properties.
 */
export class MockLlmClient implements LlmClient {
  private customMockAdapterResponse?: CYOAPack;

  constructor(customMockAdapterResponse?: CYOAPack) {
    this.customMockAdapterResponse = customMockAdapterResponse;
  }

  async completeJson<T>(request: {
    role: "writer" | "adapter" | "playtester" | "debugger" | "fixer";
    system: string;
    input: unknown;
    schema: unknown;
    seed?: number;
  }): Promise<T> {
    const seed = request.seed ?? 12345;

    if (request.role === "writer") {
      // Simulate raw story drafting
      return {
        title: "Mock Adventure: The Clockwork Crypt",
        premise: "An ancient crypt powered by gears has begun ticking again.",
        beats: [
          { scene: "entrance", detail: "Player enters the crypt and sees a giant brass gear." },
          { scene: "gear_room", detail: "Player must grease the gears or pull the master lever." },
          { scene: "ending_victory", detail: "Crypt is turned off safely." },
          { scene: "ending_crushed", detail: "Gears collapse on the player." },
        ],
        draftText: "This is a raw draft of the clockwork crypt adventure...",
      } as unknown as T;
    }

    if (request.role === "adapter") {
      if (this.customMockAdapterResponse) {
        return this.customMockAdapterResponse as unknown as T;
      }

      // Simulate mapping story beats to schema-valid CYOAPack
      const mockPack: CYOAPack = {
        meta: {
          id: "clockwork_crypt_v1",
          title: "The Clockwork Crypt",
          start: "entrance",
          vars_init: { key_count: 0 },
          flags_init: [],
        },
        scenes: [
          {
            id: "entrance",
            title: "Crypt Entrance",
            text: "A giant brass gear rotates in the center of the dark hall. Two doors lead out.",
            on_enter: [],
            is_ending: false,
            choices: [
              {
                id: "go_gear_room",
                text: "Go through the heavy iron door.",
                conditions: [],
                effects: [],
                next: "gear_room",
              },
              {
                id: "inspect_gear",
                text: "Inspect the giant gear closely.",
                conditions: [{ not_flag: "found_key" }],
                effects: [
                  { set_flag: "found_key" },
                  { inc_var: { name: "key_count", by: 1 } },
                  { add_journal: "You found a brass key tucked in the gear tooth." },
                ],
                next: "entrance",
              },
            ],
          },
          {
            id: "gear_room",
            title: "The Gear Room",
            text: "The sound of ticking is deafening. You see the master control lever.",
            on_enter: [],
            is_ending: false,
            choices: [
              {
                id: "pull_lever_with_key",
                text: "Use the brass key to unlock and pull the lever.",
                conditions: [{ has_flag: "found_key" }],
                effects: [],
                next: "ending_victory",
              },
              {
                id: "jam_gears",
                text: "Try to jam the gears with your bare hands.",
                conditions: [],
                effects: [],
                next: "ending_crushed",
              },
            ],
          },
          {
            id: "ending_victory",
            title: "Crypt Pacified",
            text: "The key fits! You unlock the safety lever and pull it. The ticking stops.",
            on_enter: [{ end_game: "ending_victory" }],
            is_ending: true,
            choices: [],
          },
          {
            id: "ending_crushed",
            title: "Crushed by Machinery",
            text: "You reach into the teeth. They are too powerful and pull you in.",
            on_enter: [{ end_game: "ending_crushed" }],
            is_ending: true,
            choices: [],
          },
        ],
        endings: [
          { id: "ending_victory", title: "Victory!", text: "You solved the crypt puzzle." },
          { id: "ending_crushed", title: "Death!", text: "You were crushed." },
        ],
      };
      return mockPack as unknown as T;
    }

    if (request.role === "playtester") {
      // Simulate playtester choosing a choice ID from the available ones
      const input = request.input as { available_actions: { id: string }[] };
      const choices = input.available_actions;

      if (!choices || choices.length === 0) {
        throw new Error("Mock playtester called with 0 choices available.");
      }

      // Choose deterministically based on seed
      const { value: selectedChoice } = PureRand.choose(seed, choices);
      return {
        chosen_action_id: selectedChoice.id,
        reason: "Chosen deterministically by Mock LLM playtester",
        expected_result: "Progress through the game",
      } as unknown as T;
    }

    if (request.role === "debugger") {
      // Simulate debugging a failed run
      return {
        issue_identified: true,
        diagnosis: "The player can jam gears and die too easily, which is an expected path but we want to log it.",
        severity: "low",
        recommendation: "Provide a warning sign in the Gear Room description.",
      } as unknown as T;
    }

    if (request.role === "fixer") {
      // Simulate applying a content fix
      return {
        fixed: true,
        fix_layer: "content",
        applied_patch: "Add a warning sign to the room text.",
        regression_test_name: "test_gear_room_warning",
      } as unknown as T;
    }

    throw new Error(`Unsupported MockLlmClient role: ${request.role}`);
  }
}
