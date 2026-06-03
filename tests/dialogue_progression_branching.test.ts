import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { generateLegalActions } from "../src/parser/legal_actions.js";

describe("NPC Dialogue Progression Branching (Task-F36)", () => {
  const testPackRaw = {
    meta: {
      id: "dialogue_progression_pack",
      title: "Dialogue Progression and Branching Test Pack",
      start_room: "crossroads",
      vars_init: {
        gold: 100,
      },
      flags_init: [],
    },
    rooms: [
      {
        id: "crossroads",
        name: "Forest Crossroads",
        description: "A crossroads room.",
        npcs: ["guildmaster"],
        exits: [],
      },
    ],
    objects: [],
    npcs: [
      {
        id: "guildmaster",
        name: "Guildmaster Vance",
        description: "The leader of the smugglers.",
        dialogue: {
          root: "node_welcome",
          nodes: [
            {
              id: "node_welcome",
              npc_text: "Who goes there?",
              topics: [
                {
                  id: "topic_ask_job",
                  prompt: "Ask for a job",
                  goto: "node_prestige_check",
                },
                {
                  id: "topic_special_offer",
                  prompt: "Inquire about special smuggler contracts",
                  goto: "node_special_unlocked",
                  conditions: [
                    {
                      faction_prestige_gte: {
                        faction: "smugglers",
                        value: 150,
                      },
                    },
                  ],
                },
                {
                  id: "topic_suspicious",
                  prompt: "Say something suspicious",
                  goto: "node_suspicious_reaction",
                  conditions: [
                    {
                      faction_prestige_lte: {
                        faction: "smugglers",
                        value: -50,
                      },
                    },
                  ],
                },
                {
                  id: "topic_exit",
                  prompt: "Leave",
                  end: true,
                },
              ],
            },
            {
              id: "node_prestige_check",
              npc_text: "We only trust capable smugglers.",
              topics: [
                {
                  id: "topic_check_visted_welcome",
                  prompt: "Remind him we just met",
                  goto: "node_welcome",
                  conditions: [
                    {
                      has_flag: "dialogue_node_visited_guildmaster_node_welcome",
                    },
                  ],
                },
                {
                  id: "topic_already_asked_job",
                  prompt: "Mention we already discussed jobs",
                  goto: "node_prestige_check",
                  conditions: [
                    {
                      has_flag: "dialogue_topic_chosen_guildmaster_topic_ask_job",
                    },
                  ],
                },
                {
                  id: "topic_exit",
                  prompt: "Leave",
                  end: true,
                },
              ],
            },
            {
              id: "node_special_unlocked",
              npc_text: "You've earned our respect. Here's a high-profile target.",
              topics: [
                {
                  id: "topic_exit",
                  prompt: "Leave",
                  end: true,
                },
              ],
            },
            {
              id: "node_suspicious_reaction",
              npc_text: "Keep your nose clean, outlaw.",
              topics: [
                {
                  id: "topic_exit",
                  prompt: "Leave",
                  end: true,
                },
              ],
            },
          ],
        },
      },
    ],
    win_conditions: [],
    endings: [],
  };

  const pack: ParserPack = ParserPackSchema.parse(testPackRaw);

  it("should evaluate faction_prestige_gte by checking the max of guildPrestige and factionRep", () => {
    let state = createInitialState({
      seed: 123,
      start: pack.meta.start_room,
      varsInit: pack.meta.vars_init,
      flagsInit: pack.meta.flags_init,
    });

    // 1. Initial state: prestige is 0. topic_special_offer should not be available.
    let res = step(state, { type: "TALK", npc: "guildmaster" }, pack);
    expect(res.ok).toBe(true);
    let legal = generateLegalActions(res.state, pack);
    let commands = legal.map((l) => l.command);
    expect(commands).not.toContain("ask about inquire about special smuggler contracts");

    // 2. Set guildPrestige to 200 (reputation undefined). topic_special_offer should be unlocked.
    let stateWithGuild = { ...res.state };
    stateWithGuild.guildPrestige = {
      "player-smugglers": 200,
    };
    legal = generateLegalActions(stateWithGuild, pack);
    commands = legal.map((l) => l.command);
    expect(commands).toContain("ask about inquire about special smuggler contracts");

    // 3. Set factionRep to 160 (prestige 0/undefined). topic_special_offer should be unlocked.
    let stateWithRep = { ...res.state };
    stateWithRep.factionRep = {
      smugglers: 160,
    };
    legal = generateLegalActions(stateWithRep, pack);
    commands = legal.map((l) => l.command);
    expect(commands).toContain("ask about inquire about special smuggler contracts");

    // 4. Set both, but one is high and the other is low. Maximum should be used.
    let stateWithBoth = { ...res.state };
    stateWithBoth.guildPrestige = {
      "player-smugglers": 50,
    };
    stateWithBoth.factionRep = {
      smugglers: 180,
    };
    legal = generateLegalActions(stateWithBoth, pack);
    commands = legal.map((l) => l.command);
    expect(commands).toContain("ask about inquire about special smuggler contracts");
  });

  it("should evaluate faction_prestige_lte by checking the max of guildPrestige and factionRep", () => {
    let state = createInitialState({
      seed: 123,
      start: pack.meta.start_room,
      varsInit: pack.meta.vars_init,
      flagsInit: pack.meta.flags_init,
    });

    // 1. Initial state: prestige is 0. Suspicious topic is not available since 0 is not lte -50.
    let res = step(state, { type: "TALK", npc: "guildmaster" }, pack);
    expect(res.ok).toBe(true);
    let legal = generateLegalActions(res.state, pack);
    let commands = legal.map((l) => l.command);
    expect(commands).not.toContain("ask about say something suspicious");

    // 2. Set factionRep to -60. Suspicious topic should unlock.
    let hostileState = { ...res.state };
    hostileState.factionRep = {
      smugglers: -60,
    };
    legal = generateLegalActions(hostileState, pack);
    commands = legal.map((l) => l.command);
    expect(commands).toContain("ask about say something suspicious");
  });

  it("should auto-flag visited dialogue nodes and chosen topics for gating", () => {
    let state = createInitialState({
      seed: 123,
      start: pack.meta.start_room,
      varsInit: pack.meta.vars_init,
      flagsInit: pack.meta.flags_init,
    });

    // Talk to start conversation (triggers node_welcome)
    let res = step(state, { type: "TALK", npc: "guildmaster" }, pack);
    expect(res.ok).toBe(true);
    expect(res.state.flags["dialogue_node_visited_guildmaster_node_welcome"]).toBe(true);

    // Ask about a job (moves to node_prestige_check)
    res = step(res.state, { type: "ASK", npc: "guildmaster", topic: "topic_ask_job" }, pack);
    expect(res.ok).toBe(true);
    expect(res.state.flags["dialogue_topic_chosen_guildmaster_topic_ask_job"]).toBe(true);
    expect(res.state.flags["dialogue_node_visited_guildmaster_node_prestige_check"]).toBe(true);

    // Legal actions should now show topics gated on welcome node visited and topic_ask_job chosen
    const legal = generateLegalActions(res.state, pack);
    const commands = legal.map((l) => l.command);
    expect(commands).toContain("ask about remind him we just met");
    expect(commands).toContain("ask about mention we already discussed jobs");
  });
});
