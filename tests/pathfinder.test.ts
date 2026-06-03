import { describe, it, expect } from "vitest";
import { checkCYOASoftlocks } from "../src/validate/cyoa_validator.js";
import { checkParserSoftlocks } from "../src/validate/parser_validator.js";
import { CYOAPack } from "../src/cyoa/schema.js";
import { ParserPack } from "../src/parser/schema.js";

describe("Graph Pathfinding & Soft-lock Validator Tests", () => {
  describe("CYOA Pathfinder Checks", () => {
    it("should flag an unsolvable CYOA game (no path to ending)", () => {
      const brokenCyoaPack: CYOAPack = {
        meta: {
          id: "broken_cyoa",
          title: "Broken CYOA",
          start: "scene_start",
        },
        scenes: [
          {
            id: "scene_start",
            title: "Start Scene",
            text: "Welcome to a dead-end.",
            is_ending: false,
            on_enter: [],
            choices: [
              {
                id: "choice_to_nowhere",
                text: "Go to loop scene",
                conditions: [],
                effects: [],
                next: "scene_loop",
              },
            ],
          },
          {
            id: "scene_loop",
            title: "Loop Scene",
            text: "You are stuck in a loop.",
            is_ending: false,
            on_enter: [],
            choices: [
              {
                id: "choice_loop_self",
                text: "Stay here",
                conditions: [],
                effects: [],
                next: "scene_loop",
              },
            ],
          },
        ],
        endings: [
          {
            id: "ending_victory",
            title: "Victory",
            text: "You won!",
          },
        ],
      };

      const findings = checkCYOASoftlocks(brokenCyoaPack);
      const unsolvable = findings.find((f) => f.code === "UNSOLVABLE_GAME");
      expect(unsolvable).toBeDefined();
      expect(unsolvable?.severity).toBe("error");
    });

    it("should flag a CYOA game with reachable soft-lock scenes", () => {
      const softlockedCyoaPack: CYOAPack = {
        meta: {
          id: "softlocked_cyoa",
          title: "Softlocked CYOA",
          start: "scene_start",
        },
        scenes: [
          {
            id: "scene_start",
            title: "Start Scene",
            text: "You can go to victory or a trap.",
            is_ending: false,
            on_enter: [],
            choices: [
              {
                id: "choice_win",
                text: "Go to win",
                conditions: [],
                effects: [],
                next: "scene_win",
              },
              {
                id: "choice_trap",
                text: "Go to trap",
                conditions: [],
                effects: [],
                next: "scene_trap",
              },
            ],
          },
          {
            id: "scene_win",
            title: "Winning Scene",
            text: "Nearly there.",
            is_ending: false,
            on_enter: [],
            choices: [
              {
                id: "choice_claim_win",
                text: "Claim win",
                conditions: [],
                effects: [],
                next: "ending_victory",
              },
            ],
          },
          {
            id: "scene_trap",
            title: "Trap Scene",
            text: "You are trapped.",
            is_ending: false,
            on_enter: [],
            choices: [], // dead end
          },
        ],
        endings: [
          {
            id: "ending_victory",
            title: "Victory",
            text: "You won!",
          },
        ],
      };

      const findings = checkCYOASoftlocks(softlockedCyoaPack);
      const softlock = findings.find((f) => f.code === "SOFTLOCK_DETECTED");
      expect(softlock).toBeDefined();
      expect(softlock?.severity).toBe("warning");
    });
  });

  describe("Parser Pathfinder Checks", () => {
    it("should flag an unsolvable Parser game", () => {
      const brokenParserPack: ParserPack = {
        meta: {
          id: "broken_parser",
          title: "Broken Parser",
          start_room: "room_start",
          vars_init: {},
          flags_init: [],
        },
        rooms: [
          {
            id: "room_start",
            name: "Start Room",
            description: "A dark starting room with no exits.",
            objects: [],
            npcs: [],
            exits: [],
          },
        ],
        objects: [],
        npcs: [],
        win_conditions: [
          {
            id: "win_cond",
            ending: "ending_victory",
            conditions: [
              {
                has_flag: "never_set_flag",
              },
            ],
          },
        ],
        endings: [
          {
            id: "ending_victory",
            title: "Victory",
            text: "You won!",
          },
        ],
      };

      const findings = checkParserSoftlocks(brokenParserPack);
      const unsolvable = findings.find((f) => f.code === "UNSOLVABLE_GAME");
      expect(unsolvable).toBeDefined();
      expect(unsolvable?.severity).toBe("error");
    });

    it("should flag unreachable win conditions and unobtainable items", () => {
      const packWithUnreachable: ParserPack = {
        meta: {
          id: "unreachable_parser",
          title: "Unreachable Parser",
          start_room: "room_start",
          vars_init: {},
          flags_init: [],
        },
        rooms: [
          {
            id: "room_start",
            name: "Start Room",
            description: "Room where you win instantly.",
            objects: ["unobtainable_sword"],
            npcs: [],
            exits: [],
          },
        ],
        objects: [
          {
            id: "unobtainable_sword",
            name: "heavy sword",
            aliases: ["sword"],
            description: "A legendary sword you cannot take.",
            takeable: false,
            quest_critical: false,
            container: false,
            openable: false,
            locked: false,
            contents: [],
            interactions: [],
          },
          {
            id: "never_reachable_key",
            name: "magic key",
            aliases: ["key"],
            description: "A key that is not in any room.",
            takeable: true,
            quest_critical: false,
            container: false,
            openable: false,
            locked: false,
            contents: [],
            interactions: [],
          },
        ],
        npcs: [],
        win_conditions: [
          {
            id: "instant_win",
            ending: "ending_victory",
            conditions: [], // always true
          },
          {
            id: "impossible_win",
            ending: "ending_secret",
            conditions: [
              {
                has_flag: "never_seen_flag",
              },
            ],
          },
        ],
        endings: [
          {
            id: "ending_victory",
            title: "Victory",
            text: "You won!",
          },
          {
            id: "ending_secret",
            title: "Secret Victory",
            text: "You won secretly!",
          },
        ],
      };

      const findings = checkParserSoftlocks(packWithUnreachable);
      const unobtainable = findings.find((f) => f.code === "UNOBTAINABLE_OBJECT");
      expect(unobtainable).toBeDefined();
      expect(unobtainable?.message).toContain("never_reachable_key");

      const unreachableWin = findings.find((f) => f.code === "UNREACHABLE_WIN_CONDITION");
      expect(unreachableWin).toBeDefined();
      expect(unreachableWin?.message).toContain("ending_secret");
    });

    it("should solve a multi-agent cooperative trading scenario deterministically", () => {
      const coopPack: ParserPack = {
        meta: {
          id: "coop_trading_puzzle",
          title: "Cooperative Trading Puzzle",
          start_room: "room_a",
          vars_init: {},
          flags_init: [],
        },
        rooms: [
          {
            id: "room_a",
            name: "Room A",
            description: "A small trading chamber.",
            objects: ["key_a"],
            npcs: [],
            exits: [{ direction: "east", to: "room_b", conditions: [{ has_flag: "coop_trade_done" }] }],
          },
          {
            id: "room_b",
            name: "Room B",
            description: "Victory chamber.",
            objects: [],
            npcs: [],
            exits: [],
          },
        ],
        objects: [
          {
            id: "key_a",
            name: "key a",
            description: "A shiny key.",
            takeable: true,
          },
        ],
        npcs: [],
        win_conditions: [
          {
            id: "both_win",
            ending: "ending_victory",
            conditions: [{ has_flag: "coop_trade_done" }],
          },
        ],
        endings: [
          {
            id: "ending_victory",
            title: "Victory",
            text: "Cooperative trade completed successfully!",
          },
        ],
      };

      // When checking softlocks with two agents, it should solve successfully without errors/warnings.
      const findings = checkParserSoftlocks(coopPack, ["agent_a", "agent_b"]);
      const unsolvable = findings.find((f) => f.code === "UNSOLVABLE_GAME");
      expect(unsolvable).toBeUndefined();

      // If we run it without any agents, it is unsolvable (as a single player cannot be in two places/inventories at once).
      const singleFindings = checkParserSoftlocks(coopPack);
      const singleUnsolvable = singleFindings.find((f) => f.code === "UNSOLVABLE_GAME");
      expect(singleUnsolvable).toBeDefined();
    });
  });
});
