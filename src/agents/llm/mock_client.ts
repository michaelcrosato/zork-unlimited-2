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
          {
            scene: "entrance",
            detail: "Player enters the crypt and sees a giant brass gear.",
          },
          {
            scene: "gear_room",
            detail: "Player must grease the gears or pull the master lever.",
          },
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
                  {
                    add_journal:
                      "You found a brass key tucked in the gear tooth.",
                  },
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
          {
            id: "ending_victory",
            title: "Victory!",
            text: "You solved the crypt puzzle.",
          },
          { id: "ending_crushed", title: "Death!", text: "You were crushed." },
        ],
      };
      return mockPack as unknown as T;
    }

    if (request.role === "playtester") {
      const input = request.input as {
        persona?: string;
        mode: "cyoa" | "parser";
        room?: string;
        inventory?: string[];
        available_actions: { id: string; command: string }[];
        flags?: Record<string, boolean>;
        vars?: Record<string, number>;
        visited?: Record<string, boolean>;
        step?: number;
      };
      const choices = input.available_actions;
      const persona = input.persona ?? "mainline";

      if (!choices || choices.length === 0) {
        throw new Error("Mock playtester called with 0 choices available.");
      }

      let chosenId = choices[0].id;
      let reason = `Chosen by playtester under the '${persona}' persona.`;

      const hasAction = (id: string) => choices.some((c) => c.id === id);
      const currentRoom = input.room ?? "";
      const inv = input.inventory ?? [];
      const flags = input.flags ?? {};
      const vars = input.vars ?? {};
      const visited = input.visited ?? {};
      const stepNum = input.step ?? 0;

      // 1. Prioritize Hoarder behavior if persona is hoarder and take action is present
      if (persona === "hoarder") {
        const takeAction = choices.find((c) => c.id.startsWith("take_"));
        if (takeAction) {
          return {
            chosen_action_id: takeAction.id,
            reason: `Hoarder prioritizes collecting item: ${takeAction.command}`,
            expected_result: "Take the item into inventory",
          } as unknown as T;
        }
      }

      // 2. Playtester Persona Routing Logic
      if (persona === "speedrunner" || persona === "mainline" || persona === "hoarder") {
        // --- Speedrunner / Mainline / Hoarder Route ---
        if (currentRoom === "castle_gates") {
          if (flags["gates_locked"]) chosenId = "go_west";
          else chosenId = "go_north";
        } else if (currentRoom === "castle_wall") {
          if (flags["wall_climb_success"]) chosenId = "go_up";
          else chosenId = "use_self_on_stone_wall";
        } else if (currentRoom === "battlements") {
          chosenId = "go_down";
        } else if (currentRoom === "castle_courtyard") {
          if (hasAction("talk_goblin_guard")) chosenId = "talk_goblin_guard";
          else if (hasAction("fight_goblin_guard")) chosenId = "fight_goblin_guard";
          else if ((vars.intelligence ?? 12) <= 12) chosenId = "go_west"; // Go to library
          else if (!inv.includes("broadsword")) chosenId = "go_east"; // Go to armory
          else chosenId = "go_north"; // Dungeons
        } else if (currentRoom === "library") {
          if (hasAction("take_spell_scroll")) chosenId = "take_spell_scroll";
          else if ((vars.intelligence ?? 12) <= 12 && hasAction("read_spell_scroll")) {
            chosenId = "read_spell_scroll";
          } else chosenId = "go_east";
        } else if (currentRoom === "armory") {
          if (hasAction("take_broadsword")) chosenId = "take_broadsword";
          else chosenId = "go_west";
        } else if (currentRoom === "dungeons") {
          if (hasAction("talk_shadow_knight")) chosenId = "talk_shadow_knight";
          else if (hasAction("cast_fireball")) chosenId = "cast_fireball";
          else if (hasAction("fight_shadow_knight")) chosenId = "fight_shadow_knight";
          else chosenId = "go_north";
        } else if (currentRoom === "treasury") {
          if (flags["chest_unlocked"]) {
            if (flags["chest_opened"]) {
              if (hasAction("take_royal_crown")) chosenId = "take_royal_crown";
              else chosenId = "go_east";
            } else chosenId = "open_treasury_chest";
          } else chosenId = "use_self_on_treasury_chest";
        } else if (currentRoom === "throne_room") {
          if (hasAction("talk_king_aldous")) chosenId = "talk_king_aldous";
          else if (hasAction("dialogue_king_aldous_crown")) chosenId = "dialogue_king_aldous_crown";
          else if (hasAction("dialogue_king_aldous_victory")) chosenId = "dialogue_king_aldous_victory";
        }
        // "The Sealed Crypt" (chapel.yaml)
        else if (currentRoom === "forest_path") {
          chosenId = "go_north";
        } else if (currentRoom === "chapel_entrance") {
          chosenId = "go_north";
        } else if (currentRoom === "ruined_chapel") {
          if (!inv.includes("rope") && !flags["rope_attached_to_well"]) {
            chosenId = "go_west";
          } else if (inv.includes("rope") && !flags["rope_attached_to_well"]) {
            chosenId = "use_rope_on_old_well";
          } else if (flags["rope_attached_to_well"] && !inv.includes("brass_key") && !inv.includes("iron_key")) {
            chosenId = "go_down";
          } else {
            chosenId = "go_north";
          }
        } else if (currentRoom === "chapel_garden") {
          if (hasAction("take_rope")) chosenId = "take_rope";
          else chosenId = "go_east";
        } else if (currentRoom === "well_bottom") {
          if (hasAction("take_brass_key")) chosenId = "take_brass_key";
          else chosenId = "go_up";
        } else if (currentRoom === "altar_room") {
          if (flags["crypt_door_locked"] && inv.includes("iron_key") && hasAction("use_iron_key_on_crypt_door")) {
            chosenId = "use_iron_key_on_crypt_door";
          } else if (!flags["crypt_door_locked"]) {
            chosenId = "go_down";
          } else {
            chosenId = "go_west";
          }
        } else if (currentRoom === "sacristy") {
          if (hasAction("unlock_oak_chest_with_brass_key")) chosenId = "unlock_oak_chest_with_brass_key";
          else if (hasAction("open_oak_chest")) chosenId = "open_oak_chest";
          else if (hasAction("take_iron_key")) chosenId = "take_iron_key";
          else chosenId = "go_east";
        } else if (currentRoom === "sealed_crypt") {
          if (flags["sarcophagus_trapped"] && hasAction("use_brass_key_on_sarcophagus")) {
            chosenId = "use_brass_key_on_sarcophagus";
          } else if (!flags["sarcophagus_trapped"] && hasAction("open_sarcophagus")) {
            chosenId = "open_sarcophagus";
          } else if (!flags["portcullis_raised"] && hasAction("use_self_on_portcullis")) {
            chosenId = "use_self_on_portcullis";
          } else {
            chosenId = "go_down";
          }
        }
        // "The Watchtower Road" (watchtower.yaml) CYOA
        else if ((input as any).scene_id === "forest_crossroads") {
          chosenId = "go_east";
        } else if ((input as any).scene_id === "ruined_watchtower") {
          chosenId = "enter_tower";
        } else if ((input as any).scene_id === "watchtower_inside") {
          chosenId = "hide";
        } else {
          const { value: selectedChoice } = PureRand.choose(seed, choices);
          chosenId = selectedChoice.id;
        }
      } else if (persona === "dropper") {
        // --- Dropper Route with Deliberate Drops & Backtracking ---
        if (currentRoom === "castle_gates") {
          if (flags["gates_locked"]) chosenId = "go_west";
          else chosenId = "go_north";
        } else if (currentRoom === "castle_wall") {
          if (flags["wall_climb_success"]) chosenId = "go_up";
          else chosenId = "use_self_on_stone_wall";
        } else if (currentRoom === "battlements") {
          chosenId = "go_down";
        } else if (currentRoom === "castle_courtyard") {
          if (hasAction("talk_goblin_guard")) chosenId = "talk_goblin_guard";
          else if (hasAction("fight_goblin_guard")) chosenId = "fight_goblin_guard";
          else if (inv.includes("broadsword") && !visited["dungeons"]) {
            // Drop broadsword in courtyard!
            chosenId = "drop_broadsword";
            reason = "Dropper drops broadsword in courtyard before entering dungeons";
          } else if (hasAction("take_broadsword")) {
            // Pick it back up
            chosenId = "take_broadsword";
            reason = "Dropper picks up dropped broadsword";
          } else if ((vars.intelligence ?? 12) <= 12) {
            chosenId = "go_west";
          } else if (!inv.includes("broadsword") && !visited["dungeons"]) {
            chosenId = "go_east";
          } else {
            chosenId = "go_north"; // go to dungeons
          }
        } else if (currentRoom === "library") {
          if (hasAction("take_spell_scroll")) chosenId = "take_spell_scroll";
          else if ((vars.intelligence ?? 12) <= 12 && hasAction("read_spell_scroll")) {
            chosenId = "read_spell_scroll";
          } else chosenId = "go_east";
        } else if (currentRoom === "armory") {
          if (hasAction("take_broadsword")) chosenId = "take_broadsword";
          else chosenId = "go_west";
        } else if (currentRoom === "dungeons") {
          if (hasAction("talk_shadow_knight")) chosenId = "talk_shadow_knight";
          else if (hasAction("cast_fireball")) chosenId = "cast_fireball";
          else if (hasAction("fight_shadow_knight")) chosenId = "fight_shadow_knight";
          else if (!inv.includes("broadsword")) {
            // Unarmed! Retreat to courtyard!
            chosenId = "go_south";
            reason = "Dropper retreats to courtyard to find weapon";
          } else {
            chosenId = "go_north";
          }
        } else if (currentRoom === "treasury") {
          if (flags["chest_unlocked"]) {
            if (flags["chest_opened"]) {
              if (inv.includes("royal_crown") && !visited["throne_room"]) {
                chosenId = "drop_royal_crown";
                reason = "Dropper drops crown in treasury before meeting king";
              } else if (hasAction("take_royal_crown")) {
                chosenId = "take_royal_crown";
              } else {
                chosenId = "go_east";
              }
            } else chosenId = "open_treasury_chest";
          } else chosenId = "use_self_on_treasury_chest";
        } else if (currentRoom === "throne_room") {
          if (!inv.includes("royal_crown") && hasAction("talk_king_aldous")) {
            chosenId = "talk_king_aldous";
          } else if (!inv.includes("royal_crown")) {
            // Need the crown! Backtrack to treasury!
            chosenId = "go_west";
            reason = "Dropper backtracks to treasury to get crown";
          } else if (hasAction("dialogue_king_aldous_crown")) {
            chosenId = "dialogue_king_aldous_crown";
          } else if (hasAction("dialogue_king_aldous_victory")) {
            chosenId = "dialogue_king_aldous_victory";
          }
        }
        // "The Sealed Crypt" (chapel.yaml) Dropper path
        else if (currentRoom === "forest_path") {
          chosenId = "go_north";
        } else if (currentRoom === "chapel_entrance") {
          chosenId = "go_north";
        } else if (currentRoom === "ruined_chapel") {
          if (!inv.includes("rope") && !flags["rope_attached_to_well"]) {
            chosenId = "go_west";
          } else if (inv.includes("rope") && !flags["rope_attached_to_well"]) {
            chosenId = "use_rope_on_old_well";
          } else if (flags["rope_attached_to_well"] && !inv.includes("brass_key") && !inv.includes("iron_key")) {
            chosenId = "go_down";
          } else {
            chosenId = "go_north";
          }
        } else if (currentRoom === "chapel_garden") {
          if (hasAction("take_rope")) {
            chosenId = "take_rope";
          } else if (inv.includes("rope") && stepNum < 6) {
            // Drop rope in garden!
            chosenId = "drop_rope";
            reason = "Dropper drops rope in garden clumsily";
          } else {
            chosenId = "go_east";
          }
        } else if (currentRoom === "well_bottom") {
          if (hasAction("take_brass_key")) chosenId = "take_brass_key";
          else chosenId = "go_up";
        } else if (currentRoom === "altar_room") {
          if (flags["crypt_door_locked"] && inv.includes("iron_key") && hasAction("use_iron_key_on_crypt_door")) {
            chosenId = "use_iron_key_on_crypt_door";
          } else if (flags["crypt_door_locked"] && !inv.includes("iron_key")) {
            // Iron key is missing/dropped! Backtrack to sacristy
            chosenId = "go_west";
            reason = "Dropper backtracks to sacristy for iron key";
          } else if (!flags["crypt_door_locked"]) {
            chosenId = "go_down";
          } else {
            chosenId = "go_west";
          }
        } else if (currentRoom === "sacristy") {
          if (hasAction("unlock_oak_chest_with_brass_key")) {
            chosenId = "unlock_oak_chest_with_brass_key";
          } else if (hasAction("open_oak_chest")) {
            chosenId = "open_oak_chest";
          } else if (hasAction("take_iron_key")) {
            chosenId = "take_iron_key";
          } else if (inv.includes("iron_key") && stepNum < 18) {
            // Drop iron key in sacristy!
            chosenId = "drop_iron_key";
            reason = "Dropper drops iron key in sacristy";
          } else {
            chosenId = "go_east";
          }
        } else if (currentRoom === "sealed_crypt") {
          if (flags["sarcophagus_trapped"] && hasAction("use_brass_key_on_sarcophagus")) {
            chosenId = "use_brass_key_on_sarcophagus";
          } else if (!flags["sarcophagus_trapped"] && hasAction("open_sarcophagus")) {
            chosenId = "open_sarcophagus";
          } else if (!flags["portcullis_raised"] && hasAction("use_self_on_portcullis")) {
            chosenId = "use_self_on_portcullis";
          } else {
            chosenId = "go_down";
          }
        } else {
          const { value: selectedChoice } = PureRand.choose(seed, choices);
          chosenId = selectedChoice.id;
        }
      } else if (persona === "explorer") {
        // --- Explorer Route ---
        if (currentRoom === "castle_gates") {
          if (flags["wall_climb_success"]) chosenId = "go_north";
          else chosenId = "go_west";
        } else if (currentRoom === "castle_wall") {
          if (flags["wall_climb_success"]) chosenId = "go_up";
          else chosenId = "use_self_on_stone_wall";
        } else if (currentRoom === "battlements") {
          chosenId = "go_down";
        } else if (currentRoom === "castle_courtyard") {
          if (hasAction("talk_goblin_guard")) chosenId = "talk_goblin_guard";
          else if (hasAction("fight_goblin_guard")) chosenId = "fight_goblin_guard";
          else if ((vars.intelligence ?? 12) <= 12) chosenId = "go_west";
          else if (!inv.includes("broadsword")) chosenId = "go_east";
          else chosenId = "go_north";
        } else if (currentRoom === "library") {
          if (hasAction("take_spell_scroll")) chosenId = "take_spell_scroll";
          else if ((vars.intelligence ?? 12) <= 12 && hasAction("read_spell_scroll")) {
            chosenId = "read_spell_scroll";
          } else chosenId = "go_east";
        } else if (currentRoom === "armory") {
          if (hasAction("take_broadsword")) chosenId = "take_broadsword";
          else chosenId = "go_west";
        } else if (currentRoom === "dungeons") {
          if (hasAction("talk_shadow_knight")) chosenId = "talk_shadow_knight";
          else if (hasAction("cast_fireball")) chosenId = "cast_fireball";
          else if (hasAction("fight_shadow_knight")) chosenId = "fight_shadow_knight";
          else chosenId = "go_north";
        } else if (currentRoom === "treasury") {
          if (flags["chest_unlocked"]) {
            if (flags["chest_opened"]) {
              if (hasAction("take_royal_crown") && !visited["throne_room"]) {
                // Explorer goes to throne room first to talk to King before picking up crown!
                chosenId = "go_east";
              } else if (hasAction("take_royal_crown")) {
                chosenId = "take_royal_crown";
              } else {
                chosenId = "go_east";
              }
            } else chosenId = "open_treasury_chest";
          } else chosenId = "use_self_on_treasury_chest";
        } else if (currentRoom === "throne_room") {
          if (hasAction("talk_king_aldous")) {
            chosenId = "talk_king_aldous";
          } else if (hasAction("dialogue_king_aldous_help")) {
            chosenId = "dialogue_king_aldous_help";
          } else if (hasAction("dialogue_king_aldous_bye")) {
            chosenId = "dialogue_king_aldous_bye";
          } else if (hasAction("dialogue_king_aldous_crown")) {
            chosenId = "dialogue_king_aldous_crown";
          } else if (hasAction("dialogue_king_aldous_victory")) {
            chosenId = "dialogue_king_aldous_victory";
          } else {
            // Back to treasury to take the crown!
            chosenId = "go_west";
          }
        }
        // "The Sealed Crypt" (chapel.yaml) Explorer path
        else if (currentRoom === "forest_path") {
          chosenId = "go_north";
        } else if (currentRoom === "chapel_entrance") {
          if (!visited["chapel_yard"]) chosenId = "go_west";
          else chosenId = "go_north";
        } else if (currentRoom === "chapel_yard") {
          if (hasAction("talk_innkeeper")) {
            chosenId = "talk_innkeeper";
          } else if (hasAction("dialogue_innkeeper_ask_well")) {
            chosenId = "dialogue_innkeeper_ask_well";
          } else if (hasAction("dialogue_innkeeper_ask_crypt")) {
            chosenId = "dialogue_innkeeper_ask_crypt";
          } else if (hasAction("dialogue_innkeeper_leave")) {
            chosenId = "dialogue_innkeeper_leave";
          } else {
            chosenId = "go_east";
          }
        } else if (currentRoom === "ruined_chapel") {
          if (!inv.includes("rope") && !flags["rope_attached_to_well"]) {
            chosenId = "go_west";
          } else if (inv.includes("rope") && !flags["rope_attached_to_well"]) {
            chosenId = "use_rope_on_old_well";
          } else if (flags["rope_attached_to_well"] && !inv.includes("brass_key") && !inv.includes("iron_key")) {
            chosenId = "go_down";
          } else {
            chosenId = "go_north";
          }
        } else if (currentRoom === "chapel_garden") {
          if (hasAction("take_rope")) chosenId = "take_rope";
          else chosenId = "go_east";
        } else if (currentRoom === "well_bottom") {
          if (hasAction("take_brass_key")) chosenId = "take_brass_key";
          else chosenId = "go_up";
        } else if (currentRoom === "altar_room") {
          if (flags["crypt_door_locked"] && inv.includes("iron_key") && hasAction("use_iron_key_on_crypt_door")) {
            chosenId = "use_iron_key_on_crypt_door";
          } else if (!flags["crypt_door_locked"]) {
            chosenId = "go_down";
          } else {
            chosenId = "go_west";
          }
        } else if (currentRoom === "sacristy") {
          if (hasAction("unlock_oak_chest_with_brass_key")) chosenId = "unlock_oak_chest_with_brass_key";
          else if (hasAction("open_oak_chest")) chosenId = "open_oak_chest";
          else if (hasAction("take_iron_key")) chosenId = "take_iron_key";
          else chosenId = "go_east";
        } else if (currentRoom === "sealed_crypt") {
          if (flags["sarcophagus_trapped"] && hasAction("use_brass_key_on_sarcophagus")) {
            chosenId = "use_brass_key_on_sarcophagus";
          } else if (!flags["sarcophagus_trapped"] && hasAction("open_sarcophagus")) {
            chosenId = "open_sarcophagus";
          } else if (!flags["portcullis_raised"] && hasAction("use_self_on_portcullis")) {
            chosenId = "use_self_on_portcullis";
          } else {
            chosenId = "go_down";
          }
        } else {
          const { value: selectedChoice } = PureRand.choose(seed, choices);
          chosenId = selectedChoice.id;
        }
      }

      return {
        chosen_action_id: chosenId,
        reason,
        expected_result: "Progress through the game",
      } as unknown as T;
    }

    if (request.role === "debugger") {
      // Simulate debugging a failed run
      return {
        issue_identified: true,
        diagnosis:
          "The player can jam gears and die too easily, which is an expected path but we want to log it.",
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
