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
                    add_journal: "You found a brass key tucked in the gear tooth.",
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
      // Intercept the post-game interview to prevent LLM errors during blind playtesting feedback runs
      if (request.input && typeof (request.input as any).playthrough_summary === "string") {
        return {
          q01_fun: "Yes, it was a very engaging and polished experience.",
          q02_best: "The puzzle designs, atmosphere, and dynamic weather systems.",
          q03_worst: "A few parser commands needed slightly more synonym variety.",
          q04_one_change: "Add even more synonym mapping to the parser engine.",
          q05_confused: "No, the clues provided by NPCs and objects were clear.",
          q06_commands: "Movement and item usage commands were smooth.",
          q07_story: "Intriguing world-building and atmospheric descriptions.",
          q08_ending: "The ending felt satisfying and correctly structured.",
          q09_difficulty: "Balanced, providing a good challenge.",
          q10_recommend: "Definitely, it's a solid deterministic adventure engine.",
        } as unknown as T;
      }

      // Intercept blind playtesting (which passes an observation string instead of structured choices)
      if (request.input && typeof (request.input as any).observation === "string") {
        const input = request.input as {
          observation: string;
          step?: number;
          persona?: string;
          rooms_visited?: string[];
          inventory_context?: string;
          mental_map?: string;
        };
        const obs = input.observation;
        let action = "look";
        let reason = "Look around";

        // Helper to extract items from the observation's Inventory line
        const getInventory = (text: string): string => {
          const match = text.match(/Inventory:\s*([^\n]*)/i);
          if (match) return match[1].toLowerCase();
          if (input.mental_map) {
            const mapMatch = input.mental_map.match(/Carried Items:\s*\[\s*([^\]]*)\s*\]/i);
            if (mapMatch) return mapMatch[1].toLowerCase();
          }
          return "";
        };
        const invStr = getInventory(obs);
        const hasShovel = invStr.includes("shovel");
        const hasRopeInInv = invStr.includes("rope") || invStr.includes("coil");
        const hasBrassKey = invStr.includes("brass");
        const hasIronKey = invStr.includes("iron");
        const hasCrown = invStr.includes("crown");

        if (obs.includes("SCENE:")) {
          // CYOA mode!
          if (obs.includes("forest_crossroads")) {
            action = "1";
            reason = "Go east to the watchtower";
          } else if (obs.includes("ruined_watchtower")) {
            action = "1";
            reason = "Enter the watchtower";
          } else if (obs.includes("watchtower_inside")) {
            action = "1";
            reason = "Hide behind the collapsed timbers";
          } else {
            action = "1";
            reason = "Choose first option";
          }
        } else {
          // Parser mode!
          const inDialogueGlobal =
            obs.includes("Available topics:") ||
            obs.includes("Ask about:") ||
            obs.includes("ask about") ||
            obs.includes("Verbs you can try: ask");

          if (inDialogueGlobal) {
            if (obs.toLowerCase().includes("attack him!")) {
              action = "ask about attack him!";
              reason = "Attack the goblin thief";
            } else if (obs.toLowerCase().includes("buy gold ring (30 gold)")) {
              action = "ask about buy gold ring (30 gold)";
              reason = "Buy a gold ring";
            } else if (obs.toLowerCase().includes("buy leather boots (20 gold)")) {
              action = "ask about buy leather boots (20 gold)";
              reason = "Buy leather boots";
            } else if (obs.toLowerCase().includes("buy climbing harness (30 gold)")) {
              action = "ask about buy climbing harness (30 gold)";
              reason = "Buy climbing harness";
            } else if (obs.toLowerCase().includes("buy silver pendant (40 gold)")) {
              action = "ask about buy silver pendant (40 gold)";
              reason = "Buy silver pendant";
            } else if (obs.toLowerCase().includes("buy brass lantern (15 gold)")) {
              action = "ask about buy brass lantern (15 gold)";
              reason = "Buy brass lantern";
            } else if (obs.toLowerCase().includes("buy rusty shovel (15 gold)")) {
              action = "ask about buy rusty shovel (15 gold)";
              reason = "Buy rusty shovel";
            } else if (obs.toLowerCase().includes("sell gold ring (15 gold)")) {
              action = "ask about sell gold ring (15 gold)";
              reason = "Sell gold ring";
            } else if (obs.toLowerCase().includes("sell silver pendant (20 gold)")) {
              action = "ask about sell silver pendant (20 gold)";
              reason = "Sell silver pendant";
            } else if (obs.toLowerCase().includes("sell rusty shovel (10 gold)")) {
              action = "ask about sell rusty shovel (10 gold)";
              reason = "Sell rusty shovel";
            } else if (obs.toLowerCase().includes("ask about available contracts")) {
              action = "ask about ask about available contracts";
              reason = "Ask about available contracts";
            } else if (obs.toLowerCase().includes("accept the smuggling contract")) {
              action = "ask about accept the smuggling contract";
              reason = "Accept the smuggling contract";
            } else if (obs.toLowerCase().includes("accept the enforcement contract")) {
              action = "ask about accept the enforcement contract";
              reason = "Accept the enforcement contract";
            } else if (obs.toLowerCase().includes("report completion of the smuggling contract")) {
              action = "ask about report completion of the smuggling contract";
              reason = "Report completion of the smuggling contract";
            } else if (obs.toLowerCase().includes("report completion of the enforcement contract")) {
              action = "ask about report completion of the enforcement contract";
              reason = "Report completion of the enforcement contract";
            } else if (obs.toLowerCase().includes("check your prestige")) {
              action = "ask about check your prestige";
              reason = "Check prestige";
            } else if (obs.toLowerCase().includes("say goodbye")) {
              action = "ask about say goodbye";
              reason = "End dialogue";
            } else if (obs.toLowerCase().includes("go back")) {
              action = "ask about go back";
              reason = "Go back";
            } else if (obs.toLowerCase().includes("ask about the well")) {
              action = "ask about ask about the well";
              reason = "Inquire about the well";
            } else if (obs.toLowerCase().includes("ask about the crypt trap")) {
              action = "ask about ask about the crypt trap";
              reason = "Inquire about the crypt trap";
            } else if (obs.toLowerCase().includes("i have recovered your royal crown!")) {
              action = "ask about i have recovered your royal crown!";
              reason = "Give crown";
            } else if (obs.toLowerCase().includes("hail the king!")) {
              action = "ask about hail the king!";
              reason = "Victory dialogue";
            } else {
              // Try to parse dynamically
              const topicMatch = obs.match(/-\s*(ask about .+)/i);
              if (topicMatch) {
                action = topicMatch[1].trim().toLowerCase();
                reason = "Select dialogue option";
              } else {
                action = "ask about say goodbye";
                reason = "Say goodbye";
              }
            }
          } else if (
            obs.includes("Forest Crossroads") ||
            obs.includes("Smugglers Den") ||
            obs.includes("Enforcers Outpost") ||
            obs.includes("Bandit Hideout") ||
            obs.includes("Shadow Sanctum") ||
            obs.includes("High Tower") ||
            obs.includes("Vault of Shadows") ||
            obs.includes("Commander's Vault")
          ) {
            const hasCargo =
              invStr.includes("cargo") || invStr.includes("contraband_cargo") || invStr.includes("contraband cargo");
            const hasGem =
              invStr.includes("gem") || invStr.includes("contraband_gem") || invStr.includes("contraband gem");
            const hasToken =
              invStr.includes("token") || invStr.includes("smuggler_token") || invStr.includes("smuggler token");
            const hasBadge =
              invStr.includes("badge") || invStr.includes("sheriff_badge") || invStr.includes("sheriff badge");

            if (obs.includes("ROOM: Forest Crossroads")) {
              if (hasGem || hasCargo || hasToken) {
                action = "go west";
                reason = "Head back to the Smugglers Den";
              } else if (hasBadge) {
                action = "go east";
                reason = "Head back to the Enforcers Outpost";
              } else if (
                input.rooms_visited &&
                (input.rooms_visited.includes("smugglers_den") || input.rooms_visited.includes("Smugglers Den"))
              ) {
                action = "go north";
                reason = "Go to the Bandit Hideout to fetch the cargo/gem or fight the bandit";
              } else {
                action = "go west";
                reason = "Go to the Smugglers Den first";
              }
            } else if (obs.includes("ROOM: Smugglers Den")) {
              const inDialogue =
                obs.includes("Ask about:") ||
                obs.includes("Available topics:") ||
                obs.includes("ask about") ||
                obs.includes("Verbs you can try: ask");
              if (inDialogue) {
                if (hasToken && obs.toLowerCase().includes("say goodbye")) {
                  action = "ask about say goodbye";
                  reason = "Say goodbye";
                } else if (obs.toLowerCase().includes("report completion of the smuggling contract")) {
                  action = "ask about report completion of the smuggling contract";
                  reason = "Turn in smuggling contract";
                } else if (obs.toLowerCase().includes("request smuggler token")) {
                  action = "ask about request smuggler token";
                  reason = "Request Smuggler Token";
                } else if (obs.toLowerCase().includes("accept the smuggling contract")) {
                  action = "ask about accept the smuggling contract";
                  reason = "Accept smuggling contract";
                } else if (obs.toLowerCase().includes("ask about contracts")) {
                  action = "ask about ask about contracts";
                  reason = "Ask about contracts";
                } else if (obs.toLowerCase().includes("say goodbye")) {
                  action = "ask about say goodbye";
                  reason = "Say goodbye";
                } else if (obs.toLowerCase().includes("go back")) {
                  action = "ask about go back";
                  reason = "Go back";
                } else {
                  action = "ask about say goodbye";
                  reason = "Exit dialogue";
                }
              } else {
                if (hasCargo) {
                  action = "talk to smuggler capo";
                  reason = "Deliver the cargo";
                } else if (hasToken) {
                  const hasVisitedSanctum =
                    input.rooms_visited &&
                    (input.rooms_visited.includes("shadow_sanctum") || input.rooms_visited.includes("Shadow Sanctum"));
                  if (hasVisitedSanctum && !hasGem) {
                    action = "go east";
                    reason = "Return to the crossroads to find the gem";
                  } else {
                    action = "go down";
                    reason = "Enter the Shadow Sanctum";
                  }
                } else if (obs.includes("c_smuggle_cargo")) {
                  action = "go east";
                  reason = "Return to the crossroads to get the cargo";
                } else {
                  action = "talk to smuggler capo";
                  reason = "Speak to the capo";
                }
              }
            } else if (obs.includes("ROOM: Bandit Hideout")) {
              if (obs.toLowerCase().includes("contraband cargo") && !hasCargo) {
                action = "take contraband cargo";
                reason = "Collect the contraband cargo";
              } else if (obs.toLowerCase().includes("contraband gem") && !hasGem) {
                action = "take contraband gem";
                reason = "Collect the contraband gem";
              } else {
                action = "go south";
                reason = "Return to crossroads";
              }
            } else if (obs.includes("ROOM: Shadow Sanctum")) {
              const inDialogue =
                obs.includes("Ask about:") ||
                obs.includes("Available topics:") ||
                obs.includes("ask about") ||
                obs.includes("Verbs you can try: ask");
              if (inDialogue) {
                if (!hasGem && obs.toLowerCase().includes("say goodbye")) {
                  action = "ask about say goodbye";
                  reason = "Say goodbye";
                } else if (obs.toLowerCase().includes("report completion of the gem contract")) {
                  action = "ask about report completion of the gem contract";
                  reason = "Deliver the gem";
                } else if (obs.toLowerCase().includes("accept the contraband gem contract")) {
                  action = "ask about accept the contraband gem contract";
                  reason = "Accept gem contract";
                } else if (obs.toLowerCase().includes("say goodbye")) {
                  action = "ask about say goodbye";
                  reason = "Say goodbye";
                } else if (obs.toLowerCase().includes("go back")) {
                  action = "ask about go back";
                  reason = "Go back";
                } else {
                  action = "ask about say goodbye";
                  reason = "Exit dialogue";
                }
              } else {
                if (hasGem) {
                  action = "talk to smuggler boss";
                  reason = "Deliver the gem to the boss";
                } else if (
                  obs.toLowerCase().includes("smugglers: 250") ||
                  obs.toLowerCase().includes("smugglers: 300")
                ) {
                  action = "go down";
                  reason = "Enter the Vault of Shadows";
                } else if (
                  input.rooms_visited &&
                  (input.rooms_visited.includes("shadow_sanctum") || input.rooms_visited.includes("Shadow Sanctum"))
                ) {
                  action = "go up";
                  reason = "Leave the sanctum to find the gem";
                } else {
                  action = "talk to smuggler boss";
                  reason = "Introduce yourself to the boss";
                }
              }
            } else if (obs.includes("ROOM: Vault of Shadows")) {
              if (obs.toLowerCase().includes("smuggler treasure") && !invStr.includes("treasure")) {
                action = "take smuggler treasure";
                reason = "Collect the smuggler treasure";
              } else {
                action = "go up";
                reason = "Go up";
              }
            } else if (obs.includes("ROOM: Enforcers Outpost")) {
              const inDialogue =
                obs.includes("Ask about:") ||
                obs.includes("Available topics:") ||
                obs.includes("ask about") ||
                obs.includes("Verbs you can try: ask");
              if (inDialogue) {
                if (hasBadge && obs.toLowerCase().includes("say goodbye")) {
                  action = "ask about say goodbye";
                  reason = "Say goodbye";
                } else if (obs.toLowerCase().includes("report completion of the enforcement contract")) {
                  action = "ask about report completion of the enforcement contract";
                  reason = "Turn in enforcement contract";
                } else if (obs.toLowerCase().includes("request sheriff badge")) {
                  action = "ask about request sheriff badge";
                  reason = "Request Sheriff Badge";
                } else if (obs.toLowerCase().includes("accept the enforcement contract")) {
                  action = "ask about accept the enforcement contract";
                  reason = "Accept enforcement contract";
                } else if (obs.toLowerCase().includes("ask about contracts")) {
                  action = "ask about ask about contracts";
                  reason = "Ask about contracts";
                } else if (obs.toLowerCase().includes("say goodbye")) {
                  action = "ask about say goodbye";
                  reason = "Say goodbye";
                } else if (obs.toLowerCase().includes("go back")) {
                  action = "ask about go back";
                  reason = "Go back";
                } else {
                  action = "ask about say goodbye";
                  reason = "Exit dialogue";
                }
              } else {
                if (hasBadge) {
                  action = "go up";
                  reason = "Go up to High Tower";
                } else {
                  action = "talk to sheriff";
                  reason = "Talk to the sheriff";
                }
              }
            } else if (obs.includes("ROOM: High Tower")) {
              const inDialogue =
                obs.includes("Ask about:") ||
                obs.includes("Available topics:") ||
                obs.includes("ask about") ||
                obs.includes("Verbs you can try: ask");
              if (inDialogue) {
                if (obs.toLowerCase().includes("report defeat of the bandit boss")) {
                  action = "ask about report defeat of the bandit boss";
                  reason = "Turn in boss contract";
                } else if (obs.toLowerCase().includes("accept the bandit boss contract")) {
                  action = "ask about accept the bandit boss contract";
                  reason = "Accept boss contract";
                } else if (obs.toLowerCase().includes("say goodbye")) {
                  action = "ask about say goodbye";
                  reason = "Say goodbye";
                } else if (obs.toLowerCase().includes("go back")) {
                  action = "ask about go back";
                  reason = "Go back";
                } else {
                  action = "ask about say goodbye";
                  reason = "Exit dialogue";
                }
              } else {
                action = "talk to enforcer commander";
                reason = "Talk to the commander";
              }
            } else if (obs.includes("ROOM: Commander's Vault")) {
              if (obs.toLowerCase().includes("enforcer trophy") && !invStr.includes("trophy")) {
                action = "take enforcer trophy";
                reason = "Collect the enforcer trophy";
              } else {
                action = "go down";
                reason = "Go down";
              }
            }
          }
          // 2. chapel_pack_v1 (The Sealed Crypt)
          else if (
            obs.includes("Forest Path") ||
            obs.includes("Ruined Chapel") ||
            obs.includes("altar_room") ||
            obs.includes("Bottom of the Well") ||
            obs.includes("Overgrown Garden") ||
            obs.includes("Sacristy") ||
            obs.includes("Sealed Crypt") ||
            obs.includes("chapel") ||
            obs.includes("well") ||
            obs.includes("crypt") ||
            obs.includes("altar")
          ) {
            if (obs.includes("Forest Path")) {
              action = "go north";
              reason = "Move toward the chapel entrance";
            } else if (obs.includes("Chapel Entrance")) {
              action = "go north";
              reason = "Enter the ruined chapel";
            } else if (obs.includes("Overgrown Garden")) {
              if (obs.includes("coil of rope") && !hasRopeInInv) {
                action = "take coil of rope";
                reason = "Collect the coil of rope";
              } else {
                action = "go east";
                reason = "Return to the chapel";
              }
            } else if (obs.includes("Bottom of the Well")) {
              if (obs.includes("brass key") && !hasBrassKey) {
                action = "take brass key";
                reason = "Retrieve the brass key";
              } else {
                action = "go up";
                reason = "Climb out of the well";
              }
            } else if (obs.includes("Ruined Chapel")) {
              const hasVisitedGarden = input.rooms_visited && input.rooms_visited.includes("Overgrown Garden");
              const isRopeAttached = obs.includes("tie the rope securely") || obs.includes("drop it down the well");

              if (hasRopeInInv && !isRopeAttached) {
                action = "use coil of rope on old well";
                reason = "Tie the rope to the well to climb down";
              } else if (!hasVisitedGarden) {
                action = "go west";
                reason = "Go to the garden to find rope";
              } else if (!hasBrassKey && !hasIronKey) {
                action = "go down";
                reason = "Climb down the well to find the key";
              } else {
                action = "go north";
                reason = "Go to the altar room";
              }
            } else if (obs.includes("Altar Room")) {
              const hasVisitedSacristy = input.rooms_visited && input.rooms_visited.includes("The Sacristy");
              const isCryptUnlocked = obs.includes("lock turns") || obs.includes("heavy iron key into the door");

              if (hasIronKey && !isCryptUnlocked) {
                action = "use iron key on iron crypt door";
                reason = "Unlock the crypt door";
              } else if (!hasVisitedSacristy) {
                action = "go west";
                reason = "Go to the sacristy to search for a key";
              } else {
                action = "go down";
                reason = "Enter the sealed crypt";
              }
            } else if (obs.includes("Sacristy") || obs.includes("vestry")) {
              const isChestOpen = obs.includes("iron key") || hasIronKey;
              const chestLocked = obs.toLowerCase().includes("locked") || obs.toLowerCase().includes("chest is locked");

              if (obs.includes("iron key") && !hasIronKey) {
                action = "take iron key";
                reason = "Pick up the iron key";
              } else if (isChestOpen) {
                action = "go east";
                reason = "Return to the altar room";
              } else if (chestLocked && hasBrassKey) {
                action = "unlock banded oak chest with brass key";
                reason = "Unlock the oak chest";
              } else {
                action = "open banded oak chest";
                reason = "Open the oak chest";
              }
            } else if (obs.includes("Sealed Crypt") || obs.includes("crypt")) {
              if (obs.includes("blocks the archway")) {
                action = "use iron portcullis";
                reason = "Pull the lever to raise the portcullis";
              } else {
                action = "go down";
                reason = "Enter the ancient catacombs";
              }
            }
          }
          // 1.5 multiplayer_forest_pack (The Cooperative Ruins)
          else if (
            (obs.includes("Sunlit Clearing") &&
              (obs.includes("ruins") || obs.includes("vault") || obs.includes("cage"))) ||
            obs.includes("Control Temple") ||
            obs.includes("Chamber of Gold") ||
            obs.includes("cooperative_ruins") ||
            obs.includes("multiplayer_forest_pack") ||
            obs.includes("The Cooperative Ruins")
          ) {
            const hasTreasure =
              invStr.includes("treasure") || invStr.includes("ancient treasure") || invStr.includes("ancient_treasure");
            const hasKey = invStr.includes("key") || invStr.includes("vault key") || invStr.includes("vault_key");

            if (obs.includes("Sunlit Clearing")) {
              if (hasTreasure) {
                action = "look";
                reason = "Wait for game to end";
              } else if (hasKey) {
                if (obs.toLowerCase().includes("slides into the floor") || obs.toLowerCase().includes("rumble")) {
                  action = "go east";
                  reason = "Enter the Chamber of Gold";
                } else {
                  action = "use vault key on vault door";
                  reason = "Unlock the vault door";
                }
              } else if (obs.toLowerCase().includes("vault key") || obs.toLowerCase().includes("vault_key")) {
                action = "take vault key";
                reason = "Take the vault key";
              } else {
                const visitedControl =
                  input.rooms_visited &&
                  (input.rooms_visited.includes("Control Temple") || input.rooms_visited.includes("control_room"));
                if (visitedControl) {
                  if (
                    obs.toLowerCase().includes("iron cage is open") ||
                    obs.toLowerCase().includes("cage: open") ||
                    obs.toLowerCase().includes("cage is open") ||
                    obs.toLowerCase().includes("vault key") ||
                    obs.toLowerCase().includes("vault_key")
                  ) {
                    action = "take vault key";
                    reason = "Retrieve the vault key";
                  } else {
                    action = "open iron cage";
                    reason = "Open the unlocked cage";
                  }
                } else {
                  action = "go west";
                  reason = "Go to the Control Temple to pull the lever";
                }
              }
            } else if (obs.includes("Control Temple")) {
              if (
                obs.toLowerCase().includes("click") ||
                obs.toLowerCase().includes("unlocked") ||
                obs.toLowerCase().includes("distance")
              ) {
                action = "go east";
                reason = "Return to the clearing";
              } else {
                action = "use stone lever";
                reason = "Pull the lever to unlock the cage";
              }
            } else if (obs.includes("Chamber of Gold")) {
              if (obs.toLowerCase().includes("ancient treasure") && !hasTreasure) {
                action = "take ancient treasure";
                reason = "Collect the ancient treasure";
              } else {
                action = "go west";
                reason = "Return to the clearing";
              }
            }
          }
          // 2. unlimited_forest_pack (The Procedural Forest)
          else if (
            obs.includes("Clearing") ||
            obs.includes("Deep Forest") ||
            obs.includes("Cliffside") ||
            obs.includes("Glade") ||
            obs.includes("forest") ||
            obs.includes("mound") ||
            obs.includes("shovel")
          ) {
            if (obs.includes("Clearing")) {
              const hasDug = obs.toLowerCase().includes("obvious exits:") && obs.toLowerCase().includes("east");
              if (hasDug) {
                action = "go east";
                reason = "Enter the hidden glade";
              } else if (hasShovel) {
                action = "use rusty shovel on earthen mound";
                reason = "Dig into the earthen mound";
              } else {
                action = "take rusty shovel";
                reason = "Pick up the rusty shovel";
              }
            } else if (obs.includes("Deep Forest")) {
              action = "go east";
              reason = "Return to the clearing";
            } else if (obs.includes("Cliffside")) {
              action = "go down";
              reason = "Climb down to the clearing";
            } else {
              action = "go east";
              reason = "Proceed east";
            }
          }
          // 3. heros_quest_v1 (Hero's Quest)
          else if (
            obs.includes("Gates") ||
            obs.includes("Wall") ||
            obs.includes("Battlements") ||
            obs.includes("Courtyard") ||
            obs.includes("Armory") ||
            obs.includes("Library") ||
            obs.includes("Dungeons") ||
            obs.includes("Treasury") ||
            obs.includes("Throne") ||
            obs.includes("goblin") ||
            obs.includes("knight") ||
            obs.includes("king")
          ) {
            if (obs.includes("Castle Gates")) {
              action = "go west";
              reason = "Go to the climbable castle wall";
            } else if (obs.includes("Castle Wall")) {
              if (obs.includes("too steep") || obs.includes("must successfully climb")) {
                action = "use stone wall";
                reason = "Attempt to climb the stone wall";
              } else {
                action = "go up";
                reason = "Scale up to the battlements";
              }
            } else if (obs.includes("Castle Battlements")) {
              action = "go down";
              reason = "Stairway to the courtyard";
            } else if (obs.includes("Castle Courtyard")) {
              const guardDead =
                obs.toLowerCase().includes("npc_dead_goblin_guard") ||
                obs.includes("VICTORY!") ||
                !obs.includes("Goblin Guard") ||
                (input.rooms_visited &&
                  (input.rooms_visited.includes("The Grand Library") ||
                    input.rooms_visited.includes("The Castle Armory") ||
                    input.rooms_visited.includes("The Castle Dungeons") ||
                    input.rooms_visited.includes("library") ||
                    input.rooms_visited.includes("armory") ||
                    input.rooms_visited.includes("dungeons")));

              const hasReadScroll =
                input.rooms_visited &&
                (input.rooms_visited.includes("The Grand Library") || input.rooms_visited.includes("library"));
              const hasTakenSword = invStr.includes("broadsword") || invStr.includes("sword");

              if (!guardDead) {
                action = "talk to goblin guard";
                reason = "Confront the goblin guard";
              } else if (!hasReadScroll) {
                action = "go west";
                reason = "Go to the library first";
              } else if (!hasTakenSword) {
                action = "go east";
                reason = "Go to the armory to find a weapon";
              } else {
                action = "go north";
                reason = "Proceed to the dungeons";
              }
            } else if (obs.includes("Armory")) {
              const isSwordPresent = obs.includes("You see here:") && obs.includes("steel broadsword");
              if (isSwordPresent) {
                action = "take steel broadsword";
                reason = "Take the broadsword";
              } else {
                action = "go west";
                reason = "Return to the courtyard";
              }
            } else if (obs.includes("Library")) {
              const isScrollPresent = obs.includes("You see here:") && obs.includes("spell scroll");
              if (isScrollPresent) {
                action = "take spell scroll";
                reason = "Collect the spell scroll";
              } else if (invStr.includes("scroll")) {
                action = "read spell scroll";
                reason = "Read the spell scroll to increase intelligence";
              } else {
                action = "go east";
                reason = "Return to the courtyard";
              }
            } else if (obs.includes("Dungeons")) {
              const knightDead =
                obs.toLowerCase().includes("npc_dead_shadow_knight") ||
                obs.includes("VICTORY!") ||
                !obs.includes("Shadow Knight") ||
                (input.rooms_visited &&
                  (input.rooms_visited.includes("The Royal Treasury") ||
                    input.rooms_visited.includes("The Throne Room") ||
                    input.rooms_visited.includes("treasury") ||
                    input.rooms_visited.includes("throne_room")));
              if (!knightDead) {
                action = "talk to shadow knight";
                reason = "Confront the shadow knight";
              } else {
                action = "go north";
                reason = "Enter the treasury";
              }
            } else if (obs.includes("Treasury")) {
              const chestUnlocked =
                (obs.includes("LOCKPICKING") && obs.includes("SUCCESS!")) ||
                obs.toLowerCase().includes("chest_unlocked") ||
                obs.includes("iron-bound chest: open") ||
                !obs.includes("locked");
              const chestOpened =
                obs.toLowerCase().includes("chest_opened") ||
                obs.toLowerCase().includes("royal_crown") ||
                obs.toLowerCase().includes("royal crown") ||
                hasCrown;

              if (hasCrown) {
                action = "go east";
                reason = "Enter the throne room";
              } else if (chestOpened) {
                action = "take royal crown";
                reason = "Collect the royal crown";
              } else if (chestUnlocked) {
                action = "open iron-bound chest";
                reason = "Open the unlocked chest";
              } else {
                action = "use iron-bound chest";
                reason = "Pick the lock of the chest";
              }
            } else if (obs.includes("Throne Room")) {
              const kingdomRestored = obs.toLowerCase().includes("kingdom_restored");
              const inDialogue = obs.includes("ask about");

              if (!inDialogue) {
                action = "talk to king aldous";
                reason = "Speak with the weary king";
              } else if (kingdomRestored) {
                action = "ask about hail the king!";
                reason = "Hail the king for victory!";
              } else if (hasCrown) {
                action = "ask about i have recovered your royal crown!";
                reason = "Return the crown to the king";
              } else {
                action = "ask about goodbye, sire.";
                reason = "Say goodbye";
              }
            }
          }

          // Combat mode fallback!
          const inCombat =
            !obs.includes("VICTORY!") &&
            (obs.includes("You are in combat!") ||
              obs.toLowerCase().includes("fight, cast, or flee") ||
              obs.toLowerCase().includes("fight, cast, flee") ||
              obs.toLowerCase().includes("prepare to fight") ||
              obs.toLowerCase().includes("bleed in the shadows") ||
              (obs.toLowerCase().includes("rolled") && obs.toLowerCase().includes("hp:")) ||
              obs.toLowerCase().includes("strike the") ||
              obs.toLowerCase().includes("swings at you"));

          if (inCombat) {
            const enemy = obs.includes("Goblin Guard")
              ? "goblin guard"
              : obs.includes("Shadow Knight")
                ? "shadow knight"
                : obs.toLowerCase().includes("bandit thug")
                  ? "bandit thug"
                  : obs.toLowerCase().includes("bandit boss")
                    ? "bandit boss"
                    : "";
            action = enemy ? `fight ${enemy}` : "fight";
            reason = "Attack the enemy";
          }

          // Dialogue topics handling
          if (
            action === "look" &&
            (obs.includes("Available topics:") ||
              obs.includes("Ask about:") ||
              obs.includes("ask about") ||
              obs.includes("Verbs you can try: ask"))
          ) {
            if (obs.toLowerCase().includes("ask about the well")) {
              action = "ask about ask about the well";
              reason = "Inquire about the well";
            } else if (obs.toLowerCase().includes("ask about the crypt trap")) {
              action = "ask about ask about the crypt trap";
              reason = "Inquire about the crypt trap";
            } else if (obs.toLowerCase().includes("say goodbye")) {
              action = "ask about say goodbye";
              reason = "End dialogue";
            } else if (obs.toLowerCase().includes("i have recovered your royal crown!")) {
              action = "ask about i have recovered your royal crown!";
              reason = "Give crown";
            } else if (obs.toLowerCase().includes("hail the king!")) {
              action = "ask about hail the king!";
              reason = "Victory dialogue";
            } else {
              const topicMatch = obs.match(/-\s*(ask about .+)/i);
              if (topicMatch) {
                action = topicMatch[1].trim().toLowerCase();
                reason = "Select dialogue option";
              } else {
                action = "ask about say goodbye";
                reason = "Say goodbye";
              }
            }
          }
        }

        return {
          action,
          reason,
          want_to_quit: false,
        } as unknown as T;
      }

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

      // Unlimited Forest structured playtester logic
      if (
        currentRoom === "clearing" ||
        currentRoom === "deep_forest" ||
        currentRoom === "cliffside" ||
        currentRoom === "hidden_glade"
      ) {
        const isCoopRuins = currentRoom === "clearing" && (hasAction("open_cage") || hasAction("take_vault_key") || hasAction("use_vault_key_on_vault_door") || choices.some(c => c.id.includes("cage") || c.id.includes("vault")));
        if (!isCoopRuins) {
          if (currentRoom === "clearing") {
            if (hasAction("go_east")) {
              chosenId = "go_east";
            } else if (hasAction("use_shovel_on_mound")) {
              chosenId = "use_shovel_on_mound";
            } else if (hasAction("take_shovel")) {
              chosenId = "take_shovel";
            } else {
              chosenId = choices[0].id;
            }
          } else if (currentRoom === "deep_forest") {
            chosenId = "go_east";
          } else if (currentRoom === "cliffside") {
            chosenId = "go_down";
          } else {
            chosenId = choices[0].id;
          }

          return {
            chosen_action_id: chosenId,
            reason: `Chosen by playtester under the '${persona}' persona for unlimited forest.`,
            expected_result: "Progress through the game",
          } as unknown as T;
        }
      }

      // Guild Contracts Showcase (guild_showcase.yaml) structured playtester logic
      if (
        currentRoom === "crossroads" ||
        currentRoom === "smugglers_den" ||
        currentRoom === "bandit_hideout" ||
        currentRoom === "shadow_sanctum" ||
        currentRoom === "vault_of_shadows" ||
        currentRoom === "enforcers_post" ||
        currentRoom === "high_tower" ||
        currentRoom === "commander_vault"
      ) {
        if (currentRoom === "crossroads") {
          if (inv.includes("contraband_gem") || inv.includes("contraband_cargo") || inv.includes("smuggler_token")) {
            chosenId = "go_west";
          } else if (visited["smugglers_den"]) {
            chosenId = "go_north";
          } else {
            chosenId = "go_west";
          }
        } else if (currentRoom === "smugglers_den") {
          if (hasAction("dialogue_smuggler_capo_turn_in_smuggle")) {
            chosenId = "dialogue_smuggler_capo_turn_in_smuggle";
          } else if (hasAction("dialogue_smuggler_capo_request_token")) {
            chosenId = "dialogue_smuggler_capo_request_token";
          } else if (hasAction("dialogue_smuggler_capo_take_smuggle")) {
            chosenId = "dialogue_smuggler_capo_take_smuggle";
          } else if (inv.includes("smuggler_token") && hasAction("dialogue_smuggler_capo_leave")) {
            chosenId = "dialogue_smuggler_capo_leave";
          } else if (hasAction("dialogue_smuggler_capo_ask_contracts")) {
            chosenId = "dialogue_smuggler_capo_ask_contracts";
          } else if (hasAction("dialogue_smuggler_capo_leave")) {
            chosenId = "dialogue_smuggler_capo_leave";
          } else if (hasAction("dialogue_smuggler_capo_back")) {
            chosenId = "dialogue_smuggler_capo_back";
          } else if (inv.includes("smuggler_token")) {
            if (hasAction("go_down") && (!visited["shadow_sanctum"] || inv.includes("contraband_gem"))) {
              chosenId = "go_down";
            } else {
              chosenId = "go_east";
            }
          } else if (inv.includes("contraband_cargo")) {
            chosenId = "talk_smuggler_capo";
          } else if (visited["smugglers_den"]) {
            chosenId = "go_east";
          } else {
            chosenId = "talk_smuggler_capo";
          }
        } else if (currentRoom === "bandit_hideout") {
          if (hasAction("take_contraband_cargo")) {
            chosenId = "take_contraband_cargo";
          } else if (hasAction("take_contraband_gem")) {
            chosenId = "take_contraband_gem";
          } else {
            chosenId = "go_south";
          }
        } else if (currentRoom === "shadow_sanctum") {
          if (hasAction("dialogue_smuggler_boss_turn_in_gem")) {
            chosenId = "dialogue_smuggler_boss_turn_in_gem";
          } else if (hasAction("dialogue_smuggler_boss_take_gem_contract")) {
            chosenId = "dialogue_smuggler_boss_take_gem_contract";
          } else if (hasAction("dialogue_smuggler_boss_leave")) {
            chosenId = "dialogue_smuggler_boss_leave";
          } else if (hasAction("dialogue_smuggler_boss_back")) {
            chosenId = "dialogue_smuggler_boss_back";
          } else if (inv.includes("contraband_gem")) {
            chosenId = "talk_smuggler_boss";
          } else if (hasAction("go_down")) {
            chosenId = "go_down";
          } else {
            chosenId = "go_up";
          }
        } else if (currentRoom === "vault_of_shadows") {
          if (hasAction("take_smuggler_treasure")) {
            chosenId = "take_smuggler_treasure";
          } else {
            chosenId = "go_up";
          }
        } else if (currentRoom === "enforcers_post") {
          if (hasAction("dialogue_sheriff_turn_in_enforce")) {
            chosenId = "dialogue_sheriff_turn_in_enforce";
          } else if (hasAction("dialogue_sheriff_request_badge")) {
            chosenId = "dialogue_sheriff_request_badge";
          } else if (hasAction("dialogue_sheriff_take_enforce")) {
            chosenId = "dialogue_sheriff_take_enforce";
          } else if (hasAction("dialogue_sheriff_leave")) {
            chosenId = "dialogue_sheriff_leave";
          } else if (hasAction("dialogue_sheriff_back")) {
            chosenId = "dialogue_sheriff_back";
          } else if (hasAction("dialogue_sheriff_ask_contracts")) {
            chosenId = "dialogue_sheriff_ask_contracts";
          } else if (hasAction("talk_sheriff")) {
            chosenId = "talk_sheriff";
          } else if (hasAction("go_up")) {
            chosenId = "go_up";
          } else {
            chosenId = "go_west";
          }
        } else if (currentRoom === "high_tower") {
          if (hasAction("dialogue_enforcer_commander_turn_in_boss")) {
            chosenId = "dialogue_enforcer_commander_turn_in_boss";
          } else if (hasAction("dialogue_enforcer_commander_take_boss_contract")) {
            chosenId = "dialogue_enforcer_commander_take_boss_contract";
          } else if (hasAction("dialogue_enforcer_commander_leave")) {
            chosenId = "dialogue_enforcer_commander_leave";
          } else if (hasAction("dialogue_enforcer_commander_back")) {
            chosenId = "dialogue_enforcer_commander_back";
          } else if (hasAction("talk_enforcer_commander")) {
            chosenId = "talk_enforcer_commander";
          } else if (hasAction("go_up")) {
            chosenId = "go_up";
          } else {
            chosenId = "go_down";
          }
        } else if (currentRoom === "commander_vault") {
          if (hasAction("take_enforcer_trophy")) {
            chosenId = "take_enforcer_trophy";
          } else {
            chosenId = "go_down";
          }
        } else if (currentRoom === "clearing" || currentRoom === "control_room" || currentRoom === "treasure_chamber") {
          if (currentRoom === "clearing") {
            if (hasAction("take_vault_key")) {
              chosenId = "take_vault_key";
            } else if (hasAction("use_vault_key_on_vault_door")) {
              chosenId = "use_vault_key_on_vault_door";
            } else if (hasAction("open_cage")) {
              chosenId = "open_cage";
            } else if (inv.includes("vault_key") && hasAction("go_east")) {
              chosenId = "go_east";
            } else if (visited["control_room"]) {
              if (hasAction("open_cage")) {
                chosenId = "open_cage";
              } else {
                chosenId = "go_west";
              }
            } else {
              chosenId = "go_west";
            }
          } else if (currentRoom === "control_room") {
            if (hasAction("use_self_on_lever")) {
              chosenId = "use_self_on_lever";
            } else {
              chosenId = "go_east";
            }
          } else if (currentRoom === "treasure_chamber") {
            if (hasAction("take_treasure")) {
              chosenId = "take_treasure";
            } else {
              chosenId = "go_west";
            }
          }
        } else {
          const { value: selectedChoice } = PureRand.choose(seed, choices);
          chosenId = selectedChoice.id;
        }

        return {
          chosen_action_id: chosenId,
          reason,
          expected_result: "Progress through the game",
        } as unknown as T;
      }

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
          else if ((vars.intelligence ?? 12) <= 12)
            chosenId = "go_west"; // Go to library
          else if (!inv.includes("broadsword"))
            chosenId = "go_east"; // Go to armory
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
            chosenId = "go_north"; // Unarmed dropper goes north to dungeons first
          } else if (!inv.includes("broadsword") && visited["dungeons"]) {
            chosenId = "go_east"; // Backtrack to armory to pick up dropped broadsword
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
              if (hasAction("take_royal_crown")) {
                chosenId = "take_royal_crown";
              } else {
                chosenId = "go_east";
              }
            } else chosenId = "open_treasury_chest";
          } else chosenId = "use_self_on_treasury_chest";
        } else if (currentRoom === "throne_room") {
          if (hasAction("dialogue_king_aldous_crown")) {
            chosenId = "dialogue_king_aldous_crown";
          } else if (hasAction("dialogue_king_aldous_victory")) {
            chosenId = "dialogue_king_aldous_victory";
          } else if (hasAction("dialogue_king_aldous_help")) {
            chosenId = "dialogue_king_aldous_help";
          } else if (hasAction("dialogue_king_aldous_bye")) {
            chosenId = "dialogue_king_aldous_bye";
          } else if (
            hasAction("talk_king_aldous") &&
            (inv.includes("royal_crown") || (!inv.includes("royal_crown") && stepNum < 28))
          ) {
            chosenId = "talk_king_aldous";
          } else if (!inv.includes("royal_crown")) {
            // Need the crown! Backtrack to treasury!
            chosenId = "go_west";
            reason = "Dropper backtracks to treasury to get crown";
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
          chosenId = "go_west";
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
          if (hasAction("dialogue_king_aldous_crown")) {
            chosenId = "dialogue_king_aldous_crown";
          } else if (hasAction("dialogue_king_aldous_victory")) {
            chosenId = "dialogue_king_aldous_victory";
          } else if (hasAction("talk_king_aldous") && (inv.includes("royal_crown") || stepNum < 30)) {
            chosenId = "talk_king_aldous";
          } else if (hasAction("dialogue_king_aldous_help")) {
            chosenId = "dialogue_king_aldous_help";
          } else if (hasAction("dialogue_king_aldous_bye")) {
            chosenId = "dialogue_king_aldous_bye";
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
          if (hasAction("talk_innkeeper") && !flags["heard_well_clue"]) {
            chosenId = "talk_innkeeper";
          } else if (hasAction("dialogue_innkeeper_ask_well") && !flags["heard_well_clue"]) {
            chosenId = "dialogue_innkeeper_ask_well";
          } else if (hasAction("dialogue_innkeeper_ask_crypt") && !flags["heard_crypt_clue"]) {
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
      const input = request.input as any;
      if (input && input.option_1) {
        return {
          option_1_scores: {
            effectiveness: 9,
            efficiency: 8,
            exploration: 7,
          },
          option_2_scores: {
            effectiveness: 10,
            efficiency: 9,
            exploration: 9,
          },
          rationale: "Option 2 explored dialogues and items more comprehensively.",
        } as unknown as T;
      }

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
