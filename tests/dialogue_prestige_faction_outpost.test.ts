import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { generateLegalActions } from "../src/parser/legal_actions.js";

describe("Task-F19: Dialogue Prestige, Faction Alignment, and Outpost Overrides", () => {
  const testPackRaw = {
    meta: {
      id: "dialogue_prestige_faction_pack",
      title: "Dialogue Prestige and Faction Test Pack",
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
        npcs: ["commander"],
        exits: [],
      },
    ],
    objects: [],
    npcs: [
      {
        id: "commander",
        name: "Enforcer Commander",
        description: "The commanding officer.",
        dialogue: {
          root: "node_neutral",
          nodes: [
            {
              id: "node_neutral",
              npc_text: "Welcome, citizen. What is your business?",
              topics: [
                {
                  id: "topic_ask_help",
                  prompt: "Ask for assistance",
                  goto: "node_help_refused",
                },
                {
                  id: "topic_special_mission",
                  prompt: "Inquire about elite missions",
                  goto: "node_elite_details",
                  conditions: [
                    {
                      guild_prestige_gte: {
                        guild: "enforcers",
                        value: 100,
                      },
                    },
                  ],
                },
                {
                  id: "topic_exit",
                  prompt: "Say goodbye",
                  end: true,
                },
              ],
            },
            {
              id: "node_hostile_rep",
              npc_text: "State your business, outlaw, or feel the wrath of our blades!",
              topics: [
                {
                  id: "topic_bribe",
                  prompt: "Offer a bribe (50 gold)",
                  goto: "node_bribed",
                  effects: [
                    {
                      dec_var: {
                        name: "gold",
                        by: 50,
                      },
                    },
                  ],
                },
                {
                  id: "topic_exit",
                  prompt: "Back away slowly",
                  end: true,
                },
              ],
            },
            {
              id: "node_friendly_rep",
              npc_text: "Ah, welcome friend! We are always happy to host our allies.",
              topics: [
                {
                  id: "topic_free_supplies",
                  prompt: "Request supplies",
                  goto: "node_supplies_granted",
                  effects: [
                    {
                      inc_var: {
                        name: "gold",
                        by: 50,
                      },
                    },
                  ],
                },
                {
                  id: "topic_exit",
                  prompt: "Say goodbye",
                  end: true,
                },
              ],
            },
            {
              id: "node_outpost_cleared",
              npc_text: "Outstanding work clearing that hostile bandit outpost! You saved many lives.",
              topics: [
                {
                  id: "topic_claim_reward",
                  prompt: "Claim your bounty reward (100 gold)",
                  goto: "node_reward_claimed",
                  effects: [
                    {
                      inc_var: {
                        name: "gold",
                        by: 100,
                      },
                    },
                  ],
                },
                {
                  id: "topic_exit",
                  prompt: "Say goodbye",
                  end: true,
                },
              ],
            },
            {
              id: "node_high_prestige",
              npc_text: "Ah, respect! An elite operative walks among us. Command me, sir.",
              topics: [
                {
                  id: "topic_inspect_troops",
                  prompt: "Inspect the barracks",
                  goto: "node_neutral",
                },
                {
                  id: "topic_exit",
                  prompt: "At ease",
                  end: true,
                },
              ],
            },
            {
              id: "node_help_refused",
              npc_text: "We cannot spare resources for commoners right now.",
              topics: [
                {
                  id: "topic_back",
                  prompt: "Go back",
                  goto: "node_neutral",
                },
              ],
            },
            {
              id: "node_elite_details",
              npc_text: "We need you to infiltrate the deep shadow sanctuary.",
              topics: [
                {
                  id: "topic_back",
                  prompt: "Go back",
                  goto: "node_neutral",
                },
              ],
            },
            {
              id: "node_bribed",
              npc_text: "Very well. Move along, and don't make trouble.",
              topics: [
                {
                  id: "topic_exit",
                  prompt: "Move along",
                  end: true,
                },
              ],
            },
            {
              id: "node_supplies_granted",
              npc_text: "Here are some extra rations and gold from our reserve.",
              topics: [
                {
                  id: "topic_exit",
                  prompt: "Thank him and leave",
                  end: true,
                },
              ],
            },
            {
              id: "node_reward_claimed",
              npc_text: "The bounty has been paid in full.",
              topics: [
                {
                  id: "topic_exit",
                  prompt: "Say goodbye",
                  end: true,
                },
              ],
            },
          ],
          greeting_overrides: [
            {
              node: "node_outpost_cleared",
              conditions: [
                {
                  outpost_cleared: "bandit_camp_outpost",
                },
              ],
            },
            {
              node: "node_high_prestige",
              conditions: [
                {
                  guild_prestige_gte: {
                    guild: "enforcers",
                    value: 200,
                  },
                },
              ],
            },
            {
              node: "node_friendly_rep",
              conditions: [
                {
                  faction_rep_gte: {
                    faction: "guardians",
                    value: 50,
                  },
                },
              ],
            },
            {
              node: "node_hostile_rep",
              conditions: [
                {
                  faction_rep_lte: {
                    faction: "guardians",
                    value: -50,
                  },
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

  it("should default to the neutral greeting node when no overrides apply", () => {
    let state = createInitialState({
      seed: 123,
      start: pack.meta.start_room,
      varsInit: pack.meta.vars_init,
      flagsInit: pack.meta.flags_init,
    });

    const res = step(state, { type: "TALK", npc: "commander" }, pack);
    expect(res.ok).toBe(true);
    expect(res.state.questStage["dialogue_node_commander"]).toBe("node_neutral");

    const legal = generateLegalActions(res.state, pack);
    const commands = legal.map((l) => l.command);
    expect(commands).toContain("ask about ask for assistance");
    expect(commands).not.toContain("ask about inquire about elite missions");
  });

  it("should show prestige gated topics when prestige condition is met", () => {
    let state = createInitialState({
      seed: 123,
      start: pack.meta.start_room,
      varsInit: pack.meta.vars_init,
      flagsInit: pack.meta.flags_init,
    });

    state.guildPrestige = {
      "player-enforcers": 120, // Meets topic_special_mission prestige requirement (100) but not greeting override (200)
    };

    const res = step(state, { type: "TALK", npc: "commander" }, pack);
    expect(res.ok).toBe(true);
    expect(res.state.questStage["dialogue_node_commander"]).toBe("node_neutral");

    const legal = generateLegalActions(res.state, pack);
    const commands = legal.map((l) => l.command);
    expect(commands).toContain("ask about ask for assistance");
    expect(commands).toContain("ask about inquire about elite missions");
  });

  it("should trigger greeting override based on high prestige (guild_prestige_gte)", () => {
    let state = createInitialState({
      seed: 123,
      start: pack.meta.start_room,
      varsInit: pack.meta.vars_init,
      flagsInit: pack.meta.flags_init,
    });

    state.guildPrestige = {
      "player-enforcers": 250, // Exceeds 200 threshold for node_high_prestige greeting override
    };

    const res = step(state, { type: "TALK", npc: "commander" }, pack);
    expect(res.ok).toBe(true);
    expect(res.state.questStage["dialogue_node_commander"]).toBe("node_high_prestige");

    const legal = generateLegalActions(res.state, pack);
    const commands = legal.map((l) => l.command);
    expect(commands).toContain("ask about inspect the barracks");
    expect(commands).toContain("ask about at ease");
  });

  it("should trigger greeting override based on friendly faction reputation (faction_rep_gte)", () => {
    let state = createInitialState({
      seed: 123,
      start: pack.meta.start_room,
      varsInit: pack.meta.vars_init,
      flagsInit: pack.meta.flags_init,
    });

    state.factionRep = {
      guardians: 60, // Exceeds 50 threshold for node_friendly_rep greeting override
    };

    const res = step(state, { type: "TALK", npc: "commander" }, pack);
    expect(res.ok).toBe(true);
    expect(res.state.questStage["dialogue_node_commander"]).toBe("node_friendly_rep");

    const legal = generateLegalActions(res.state, pack);
    const commands = legal.map((l) => l.command);
    expect(commands).toContain("ask about request supplies");
  });

  it("should trigger greeting override based on hostile faction reputation (faction_rep_lte)", () => {
    let state = createInitialState({
      seed: 123,
      start: pack.meta.start_room,
      varsInit: pack.meta.vars_init,
      flagsInit: pack.meta.flags_init,
    });

    state.factionRep = {
      guardians: -55, // Less than -50 threshold for node_hostile_rep greeting override
    };

    const res = step(state, { type: "TALK", npc: "commander" }, pack);
    expect(res.ok).toBe(true);
    expect(res.state.questStage["dialogue_node_commander"]).toBe("node_hostile_rep");

    const legal = generateLegalActions(res.state, pack);
    const commands = legal.map((l) => l.command);
    expect(commands).toContain("ask about offer a bribe (50 gold)");
  });

  it("should trigger greeting override based on cleared hostile outpost (outpost_cleared)", () => {
    let state = createInitialState({
      seed: 123,
      start: pack.meta.start_room,
      varsInit: pack.meta.vars_init,
      flagsInit: pack.meta.flags_init,
    });

    state.turfGuardOutposts = {
      bandit_camp_outpost: {
        roomId: "bandit_camp_outpost",
        syndicateId: "bandits",
        securityLevel: 3,
        timestamp: 10,
        disabled: true, // Outpost is cleared!
      },
    };

    const res = step(state, { type: "TALK", npc: "commander" }, pack);
    expect(res.ok).toBe(true);
    expect(res.state.questStage["dialogue_node_commander"]).toBe("node_outpost_cleared");

    const legal = generateLegalActions(res.state, pack);
    const commands = legal.map((l) => l.command);
    expect(commands).toContain("ask about claim your bounty reward (100 gold)");
  });
});
