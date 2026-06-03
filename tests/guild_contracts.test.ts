import { describe, it, expect } from "vitest";
import { createInitialState, getGuildPrestigeTier, getAgentGuildPrestige } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { evaluateCondition } from "../src/core/conditions.js";
import { applyEffect } from "../src/core/effects.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { parse as parseYaml } from "yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("Agent Guild Contracts and Prestige Systems (AF-14 / Task-F6)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "guild_contracts_test_pack",
      title: "Guild Contracts Test Pack",
      start_room: "guild_hall",
      vars_init: { gold: 100 },
      flags_init: [],
    },
    rooms: [
      {
        id: "guild_hall",
        name: "Guild Hall",
        description: "The headquarters of the Smugglers Guild.",
        objects: [],
        npcs: [],
        exits: [
          {
            direction: "north",
            to: "docks",
            conditions: [],
          },
        ],
      },
      {
        id: "docks",
        name: "City Docks",
        description: "A dark, foggy dock area.",
        objects: [],
        npcs: [],
        exits: [
          {
            direction: "south",
            to: "guild_hall",
            conditions: [],
          },
        ],
      },
    ],
    objects: [
      {
        id: "black_lotus",
        name: "Black Lotus Spice",
        description: "Rare contraband spice.",
        cost: 200,
        takeable: true,
        contraband: true,
      },
    ],
    npcs: [
      {
        id: "enforcer_guard",
        name: "Enforcer Guard",
        description: "A suspicious guard.",
        room: "docks",
        hp: 15,
        max_hp: 15,
        dialogue: {
          root: "start",
          nodes: [
            {
              id: "start",
              npc_text: "State your business.",
            },
          ],
        },
      },
    ],
  });

  it("should initialize prestige to Novice level", () => {
    const state = createInitialState({
      seed: 42,
      start: "guild_hall",
      varsInit: { gold: 100 },
      agentsInit: ["player"],
    });

    expect(getAgentGuildPrestige(state, "player", "smugglers")).toBe(0);
    expect(getGuildPrestigeTier(0)).toBe("Novice");
  });

  it("should support decentralized ACCEPT_GUILD_CONTRACT action and validation", () => {
    let state = createInitialState({
      seed: 42,
      start: "guild_hall",
      varsInit: { gold: 100 },
      agentsInit: ["player"],
    });

    // 1. Accept smuggling contract
    const acceptAction = {
      type: "ACCEPT_GUILD_CONTRACT",
      contractId: "c_smuggle_01",
      guildId: "smugglers",
      contractType: "smuggling" as const,
      target: "black_lotus",
      targetRoom: "docks",
      rewardGold: 300,
      rewardPrestige: 120,
      timestamp: 100,
    };

    const res = multiAgentStep(state, { agentId: "player", action: acceptAction }, mockPack);
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.guildContracts?.["c_smuggle_01"]).toBeDefined();
    const contract = state.guildContracts?.["c_smuggle_01"];
    expect(contract?.status).toBe("active");
    expect(contract?.guildId).toBe("smugglers");
    expect(contract?.target).toBe("black_lotus");
  });

  it("should reject completion if smuggling requirements are not met, and succeed when they are met", () => {
    let state = createInitialState({
      seed: 42,
      start: "guild_hall",
      varsInit: { gold: 100 },
      agentsInit: ["player"],
    });

    // Accept contract
    const acceptRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "ACCEPT_GUILD_CONTRACT",
          contractId: "c_smuggle_02",
          guildId: "smugglers",
          contractType: "smuggling" as const,
          target: "black_lotus",
          targetRoom: "docks",
          rewardGold: 300,
          rewardPrestige: 120,
          timestamp: 100,
        },
      },
      mockPack
    );
    state = acceptRes.state;

    // 1. Try to complete it immediately (no item, wrong room)
    const completeFailRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "COMPLETE_GUILD_CONTRACT",
          contractId: "c_smuggle_02",
          timestamp: 110,
        },
      },
      mockPack
    );
    expect(completeFailRes.ok).toBe(false);
    expect(completeFailRes.rejectionReason).toContain("does not have item");

    // 2. Add item to inventory, but still wrong room
    state.inventory.push("black_lotus");
    const completeFailRes2 = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "COMPLETE_GUILD_CONTRACT",
          contractId: "c_smuggle_02",
          timestamp: 120,
        },
      },
      mockPack
    );
    expect(completeFailRes2.ok).toBe(false);
    expect(completeFailRes2.rejectionReason).toContain("needs to be in docks");

    // 3. Move player to target room and complete
    state.current = "docks";
    const completeSuccessRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "COMPLETE_GUILD_CONTRACT",
          contractId: "c_smuggle_02",
          timestamp: 130,
        },
      },
      mockPack
    );
    expect(completeSuccessRes.ok).toBe(true);
    state = completeSuccessRes.state;

    expect(state.guildContracts?.["c_smuggle_02"]?.status).toBe("completed");
    // Verify item was delivered/removed
    expect(state.inventory).not.toContain("black_lotus");
    // Verify reward gold added (100 initial + 300 reward = 400)
    expect(state.vars["gold"]).toBe(400);
    // Verify prestige added
    expect(getAgentGuildPrestige(state, "player", "smugglers")).toBe(120);
    // Verify prestige tier upgraded to Associate
    expect(getGuildPrestigeTier(120)).toBe("Associate");
  });

  it("should evaluate enforcement contract requirements correctly based on combat victory flag", () => {
    let state = createInitialState({
      seed: 42,
      start: "guild_hall",
      varsInit: { gold: 100 },
      agentsInit: ["player"],
    });

    // Accept contract
    const acceptRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "ACCEPT_GUILD_CONTRACT",
          contractId: "c_enforce_01",
          guildId: "enforcers_guild",
          contractType: "enforcement" as const,
          target: "enforcer_guard",
          rewardGold: 500,
          rewardPrestige: 250,
          timestamp: 100,
        },
      },
      mockPack
    );
    state = acceptRes.state;

    // 1. Try to complete before defeat
    const failRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "COMPLETE_GUILD_CONTRACT",
          contractId: "c_enforce_01",
          timestamp: 110,
        },
      },
      mockPack
    );
    expect(failRes.ok).toBe(false);

    // 2. Set the defeated flag
    state.flags["defeated_enforcer_guard"] = true;
    const successRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "COMPLETE_GUILD_CONTRACT",
          contractId: "c_enforce_01",
          timestamp: 120,
        },
      },
      mockPack
    );
    expect(successRes.ok).toBe(true);
    state = successRes.state;

    expect(state.guildContracts?.["c_enforce_01"]?.status).toBe("completed");
    expect(state.vars["gold"]).toBe(600); // 100 + 500
    expect(getAgentGuildPrestige(state, "player", "enforcers_guild")).toBe(250);
  });

  it("should support pure DSL conditions and effects", () => {
    let state = createInitialState({
      seed: 42,
      start: "guild_hall",
      varsInit: { gold: 100 },
      agentsInit: ["player"],
    });

    // test accept_guild_contract effect
    const acceptEffect = {
      accept_guild_contract: {
        id: "c_smuggle_dsl",
        guild: "smugglers",
        type: "smuggling" as const,
        target: "black_lotus",
        target_room: "docks",
        reward_gold: 200,
        reward_prestige: 150,
      },
    };

    const res1 = applyEffect(state, acceptEffect, mockPack);
    state = res1.state;

    expect(state.guildContracts?.["c_smuggle_dsl"]?.status).toBe("active");

    // test guild_contract_active condition
    expect(evaluateCondition(state, { guild_contract_active: "c_smuggle_dsl" })).toBe(true);
    expect(evaluateCondition(state, { guild_contract_completed: "c_smuggle_dsl" })).toBe(false);

    // test complete_guild_contract effect
    // manually setup requirements (item and room)
    state.inventory.push("black_lotus");
    state.current = "docks";

    const completeEffect = {
      complete_guild_contract: {
        id: "c_smuggle_dsl",
      },
    };

    const res2 = applyEffect(state, completeEffect, mockPack);
    state = res2.state;

    expect(state.guildContracts?.["c_smuggle_dsl"]?.status).toBe("completed");
    expect(state.inventory).not.toContain("black_lotus");
    expect(state.vars["gold"]).toBe(300); // 100 + 200
    expect(getAgentGuildPrestige(state, "player", "smugglers")).toBe(150);

    // test conditions
    expect(evaluateCondition(state, { guild_contract_active: "c_smuggle_dsl" })).toBe(false);
    expect(evaluateCondition(state, { guild_contract_completed: "c_smuggle_dsl" })).toBe(true);
    expect(evaluateCondition(state, { guild_prestige_gte: { guild: "smugglers", value: 100 } })).toBe(true);
    expect(evaluateCondition(state, { guild_prestige_gte: { guild: "smugglers", value: 200 } })).toBe(false);

    // test add_guild_prestige effect
    const addPrestigeEffect = {
      add_guild_prestige: {
        guild: "smugglers",
        value: 200,
      },
    };
    const res3 = applyEffect(state, addPrestigeEffect, mockPack);
    state = res3.state;
    expect(getAgentGuildPrestige(state, "player", "smugglers")).toBe(350); // 150 + 200
    expect(getGuildPrestigeTier(350)).toBe("Operative");
  });

  it("should support smuggling and enforcement contracts in chapel_pack_v1 from chapel.yaml", () => {
    const packPath = resolve(__dirname, "../content/parser/pack/chapel.yaml");
    const packContent = readFileSync(packPath, "utf-8");
    const rawPack = parseYaml(packContent);
    const chapelPack = ParserPackSchema.parse(rawPack);

    let state = createInitialState({
      seed: 42,
      start: "chapel_entrance",
      varsInit: { gold: 100 },
      agentsInit: ["player"],
    });

    // 1. Accept smuggling contract c_smuggle_chalice
    const acceptSmuggleRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "ACCEPT_GUILD_CONTRACT",
          contractId: "c_smuggle_chalice",
          guildId: "shadow_guild",
          contractType: "smuggling",
          target: "ancient_chalice",
          targetRoom: "forest_path",
          rewardGold: 150,
          rewardPrestige: 60,
          timestamp: 100,
        } as any,
      },
      chapelPack
    );
    expect(acceptSmuggleRes.ok).toBe(true);
    state = acceptSmuggleRes.state;

    expect(state.guildContracts?.["c_smuggle_chalice"]?.status).toBe("active");

    // 2. Put chalice in inventory and move to forest_path
    state.inventory.push("ancient_chalice");
    state.current = "forest_path";

    // 3. Complete smuggling contract
    const completeSmuggleRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "COMPLETE_GUILD_CONTRACT",
          contractId: "c_smuggle_chalice",
          timestamp: 110,
        } as any,
      },
      chapelPack
    );
    expect(completeSmuggleRes.ok).toBe(true);
    state = completeSmuggleRes.state;

    expect(state.guildContracts?.["c_smuggle_chalice"]?.status).toBe("completed");
    expect(state.inventory).not.toContain("ancient_chalice");
    expect(state.vars["gold"]).toBe(250); // 100 + 150
    expect(getAgentGuildPrestige(state, "player", "shadow_guild")).toBe(60);

    // 4. Accept enforcement contract c_enforce_ghoul
    const acceptEnforceRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "ACCEPT_GUILD_CONTRACT",
          contractId: "c_enforce_ghoul",
          guildId: "shadow_guild",
          contractType: "enforcement",
          target: "crypt_ghoul",
          rewardGold: 200,
          rewardPrestige: 80,
          timestamp: 120,
        } as any,
      },
      chapelPack
    );
    expect(acceptEnforceRes.ok).toBe(true);
    state = acceptEnforceRes.state;

    // 5. Slay the crypt ghoul (set engine defeated/dead flag)
    state.flags["npc_defeated_crypt_ghoul"] = true;

    // 6. Complete enforcement contract
    const completeEnforceRes = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "COMPLETE_GUILD_CONTRACT",
          contractId: "c_enforce_ghoul",
          timestamp: 130,
        } as any,
      },
      chapelPack
    );
    expect(completeEnforceRes.ok).toBe(true);
    state = completeEnforceRes.state;

    expect(state.guildContracts?.["c_enforce_ghoul"]?.status).toBe("completed");
    expect(state.vars["gold"]).toBe(450); // 250 + 200
    expect(getAgentGuildPrestige(state, "player", "shadow_guild")).toBe(140); // 60 + 80
    expect(getGuildPrestigeTier(140)).toBe("Associate");
  });

  it("should support the full Shadow Vault progression, prestige gates, and boss contracts in chapel.yaml", () => {
    const packPath = resolve(__dirname, "../content/parser/pack/chapel.yaml");
    const packContent = readFileSync(packPath, "utf-8");
    const rawPack = parseYaml(packContent);
    const chapelPack = ParserPackSchema.parse(rawPack);

    let state = createInitialState({
      seed: 42,
      start: "chapel_entrance",
      varsInit: { gold: 100 },
      agentsInit: ["player"],
    });

    // 1. Accept and complete smuggling contract c_smuggle_chalice
    state = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "ACCEPT_GUILD_CONTRACT",
          contractId: "c_smuggle_chalice",
          guildId: "shadow_guild",
          contractType: "smuggling",
          target: "ancient_chalice",
          targetRoom: "forest_path",
          rewardGold: 150,
          rewardPrestige: 60,
          timestamp: 100,
        } as any,
      },
      chapelPack
    ).state;

    state.inventory.push("ancient_chalice");
    state.current = "forest_path";

    state = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "COMPLETE_GUILD_CONTRACT",
          contractId: "c_smuggle_chalice",
          timestamp: 110,
        } as any,
      },
      chapelPack
    ).state;

    // 2. Accept and complete enforcement contract c_enforce_ghoul
    state.current = "chapel_entrance";
    if (state.agents["player"]) state.agents["player"].current = "chapel_entrance";
    state = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "ACCEPT_GUILD_CONTRACT",
          contractId: "c_enforce_ghoul",
          guildId: "shadow_guild",
          contractType: "enforcement",
          target: "crypt_ghoul",
          rewardGold: 200,
          rewardPrestige: 80,
          timestamp: 120,
        } as any,
      },
      chapelPack
    ).state;

    state.flags["npc_defeated_crypt_ghoul"] = true;

    state = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "COMPLETE_GUILD_CONTRACT",
          contractId: "c_enforce_ghoul",
          timestamp: 130,
        } as any,
      },
      chapelPack
    ).state;

    // Check prestige: 140 (Associate)
    expect(getAgentGuildPrestige(state, "player", "shadow_guild")).toBe(140);
    expect(getGuildPrestigeTier(140)).toBe("Associate");

    // 3. Request vault access key from guild_agent (dialogue)
    let res = multiAgentStep(state, { agentId: "player", action: { type: "TALK", npc: "guild_agent" } }, chapelPack);
    expect(res.ok).toBe(true);
    state = res.state;

    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "guild_agent", topic: "shadow_vault_key" } },
      chapelPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.inventory).toContain("shadow_key");

    // Go back to root dialogue options
    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "guild_agent", topic: "back" } },
      chapelPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // Say goodbye to close dialogue
    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "guild_agent", topic: "leave" } },
      chapelPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // 4. Move to altar_room
    state.current = "altar_room";
    if (state.agents["player"]) state.agents["player"].current = "altar_room";

    // Attempting to move east should fail because door is locked
    res = multiAgentStep(state, { agentId: "player", action: { type: "MOVE", direction: "east" } }, chapelPack);
    expect(res.ok).toBe(false); // Locked exit

    // 5. Use shadow_key on shadow_door
    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "USE", item: "shadow_key", target: "shadow_door" } },
      chapelPack
    );
    console.log("USE RESULT:", JSON.stringify(res, null, 2));
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.flags["shadow_vault_unlocked"]).toBe(true);
    expect(state.inventory).not.toContain("shadow_key"); // consumed

    // 6. Enter shadow_vault
    res = multiAgentStep(state, { agentId: "player", action: { type: "MOVE", direction: "east" } }, chapelPack);
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.current).toBe("shadow_vault");

    // 7. Talk to smuggler_boss and accept the premium contract
    res = multiAgentStep(state, { agentId: "player", action: { type: "TALK", npc: "smuggler_boss" } }, chapelPack);
    expect(res.ok).toBe(true);
    state = res.state;

    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "smuggler_boss", topic: "take_diamond_contract" } },
      chapelPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.inventory).toContain("shadow_diamond");
    expect(state.guildContracts?.["c_smuggle_diamond"]?.status).toBe("active");

    // Go back to root dialogue options
    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "smuggler_boss", topic: "back" } },
      chapelPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // Say goodbye to close dialogue
    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "smuggler_boss", topic: "leave" } },
      chapelPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // 8. Carry shadow_diamond to Forest Path
    state.current = "forest_path";
    if (state.agents["player"]) state.agents["player"].current = "forest_path";
    state.visited["forest_path"] = true;
    expect(state.inventory).toContain("shadow_diamond");

    // 9. Go back to Shadow Vault and complete contract
    state.current = "shadow_vault";
    if (state.agents["player"]) state.agents["player"].current = "shadow_vault";
    res = multiAgentStep(state, { agentId: "player", action: { type: "TALK", npc: "smuggler_boss" } }, chapelPack);
    expect(res.ok).toBe(true);
    state = res.state;

    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "smuggler_boss", topic: "turn_in_diamond" } },
      chapelPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.guildContracts?.["c_smuggle_diamond"]?.status).toBe("completed");
    expect(state.inventory).not.toContain("shadow_diamond");
    // Verify rewards: initial gold (100) + chalice reward (150) + ghoul reward (200) + diamond reward (500) = 950 gold
    expect(state.vars["gold"]).toBe(950);
    // Prestige: 140 initial + 150 diamond = 290
    expect(getAgentGuildPrestige(state, "player", "shadow_guild")).toBe(290);

    // 10. Accept premium enforcement contract for inquisitor
    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "smuggler_boss", topic: "back" } },
      chapelPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "smuggler_boss", topic: "take_inquisitor_contract" } },
      chapelPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.guildContracts?.["c_enforce_inquisitor"]?.status).toBe("active");

    // 11. Defeat rogue inquisitor and turn in contract
    state.flags["npc_defeated_rogue_inquisitor"] = true;

    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "smuggler_boss", topic: "back" } },
      chapelPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "smuggler_boss", topic: "turn_in_inquisitor" } },
      chapelPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.guildContracts?.["c_enforce_inquisitor"]?.status).toBe("completed");
    // Verify rewards: 950 gold + 300 reward = 1250 gold
    expect(state.vars["gold"]).toBe(1250);
    // Prestige: 290 + 100 = 390
    expect(getAgentGuildPrestige(state, "player", "shadow_guild")).toBe(390);
  });

  it("should support the Royal Scouts contracts, prestige gates, and badges in heros_quest.yaml", () => {
    const packPath = resolve(__dirname, "../content/parser/pack/heros_quest.yaml");
    const packContent = readFileSync(packPath, "utf-8");
    const rawPack = parseYaml(packContent);
    const herosQuestPack = ParserPackSchema.parse(rawPack);

    let state = createInitialState({
      seed: 42,
      start: "castle_gates",
      varsInit: { gold: 100 },
      agentsInit: ["player"],
    });

    // 1. Talk to royal_scout
    let res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "TALK", npc: "royal_scout" } },
      herosQuestPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // 2. Ask about contracts
    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "royal_scout", topic: "ask_contracts" } },
      herosQuestPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // 3. Accept broadsword smuggling contract
    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "royal_scout", topic: "take_smuggle" } },
      herosQuestPack
    );
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.guildContracts?.["c_smuggle_broadsword"]?.status).toBe("active");

    // 4. Leave dialogue
    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "royal_scout", topic: "back" } },
      herosQuestPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "royal_scout", topic: "leave" } },
      herosQuestPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // 5. Smuggle broadsword: we need broadsword in inventory, and visit castle_wall
    state.inventory.push("broadsword");
    if (state.agents["player"]) {
      state.agents["player"].inventory.push("broadsword");
      state.agents["player"].current = "castle_wall";
    }
    state.current = "castle_wall";
    state.visited["castle_wall"] = true;

    // 6. Go back to castle_gates, talk to royal_scout and turn in
    state.current = "castle_gates";
    if (state.agents["player"]) state.agents["player"].current = "castle_gates";
    res = multiAgentStep(state, { agentId: "player", action: { type: "TALK", npc: "royal_scout" } }, herosQuestPack);
    expect(res.ok).toBe(true);
    state = res.state;

    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "royal_scout", topic: "turn_in_smuggle" } },
      herosQuestPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.guildContracts?.["c_smuggle_broadsword"]?.status).toBe("completed");
    expect(state.inventory).not.toContain("broadsword"); // consumed by turn in
    expect(getAgentGuildPrestige(state, "player", "royal_scouts")).toBe(50);

    // Go back to greet node (so request_badge topic becomes available)
    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "royal_scout", topic: "back" } },
      herosQuestPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // 7. Request Badge since we have 50 prestige
    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "royal_scout", topic: "request_badge" } },
      herosQuestPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.inventory).toContain("scout_badge");

    // 8. Go back to greet, accept and complete enforcement contract to get to 90 prestige
    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "royal_scout", topic: "back" } },
      herosQuestPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "royal_scout", topic: "ask_contracts" } },
      herosQuestPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "royal_scout", topic: "take_enforce" } },
      herosQuestPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.guildContracts?.["c_enforce_goblin"]?.status).toBe("active");

    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "royal_scout", topic: "back" } },
      herosQuestPack
    );
    state = res.state;
    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "royal_scout", topic: "leave" } },
      herosQuestPack
    );
    state = res.state;

    // Slay goblin guard
    state.flags["npc_defeated_goblin_guard"] = true;

    // Talk to scout and turn in
    res = multiAgentStep(state, { agentId: "player", action: { type: "TALK", npc: "royal_scout" } }, herosQuestPack);
    state = res.state;
    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "royal_scout", topic: "turn_in_enforce" } },
      herosQuestPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.guildContracts?.["c_enforce_goblin"]?.status).toBe("completed");
    expect(getAgentGuildPrestige(state, "player", "royal_scouts")).toBe(90);

    // 9. Go back to greet, accept premium Royal Seal contract (requires 80 prestige, we have 90)
    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "royal_scout", topic: "back" } },
      herosQuestPack
    );
    state = res.state;
    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "royal_scout", topic: "ask_contracts" } },
      herosQuestPack
    );
    state = res.state;

    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "royal_scout", topic: "take_seal" } },
      herosQuestPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.guildContracts?.["c_smuggle_royal_seal"]?.status).toBe("active");

    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "royal_scout", topic: "back" } },
      herosQuestPack
    );
    state = res.state;
    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "royal_scout", topic: "leave" } },
      herosQuestPack
    );
    state = res.state;

    // Carry royal_seal to castle_wall
    state.inventory.push("royal_seal");
    if (state.agents["player"]) {
      state.agents["player"].inventory.push("royal_seal");
      state.agents["player"].current = "castle_wall";
    }
    state.current = "castle_wall";
    state.visited["castle_wall"] = true;

    // Go back to castle_gates, talk to royal_scout and turn in
    state.current = "castle_gates";
    if (state.agents["player"]) state.agents["player"].current = "castle_gates";
    res = multiAgentStep(state, { agentId: "player", action: { type: "TALK", npc: "royal_scout" } }, herosQuestPack);
    state = res.state;

    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "royal_scout", topic: "turn_in_seal" } },
      herosQuestPack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.guildContracts?.["c_smuggle_royal_seal"]?.status).toBe("completed");
    expect(state.inventory).not.toContain("royal_seal");
    // Verify rewards: initial (100) + broadsword (100) + goblin (80) + seal (200) = 480 gold
    expect(state.vars["gold"]).toBe(480);
    // Prestige: 90 + 80 = 170
    expect(getAgentGuildPrestige(state, "player", "royal_scouts")).toBe(170);
  });

  it("should support the full Smugglers and Enforcers paths in the new guild_showcase.yaml pack", () => {
    const packPath = resolve(__dirname, "../content/parser/pack/guild_showcase.yaml");
    const packContent = readFileSync(packPath, "utf-8");
    const rawPack = parseYaml(packContent);
    const showcasePack = ParserPackSchema.parse(rawPack);

    // SMUGGLERS PATHWAY
    let state = createInitialState({
      seed: 42,
      start: "crossroads",
      varsInit: { gold: 100 },
      agentsInit: ["player"],
    });

    // 1. Move to smugglers_den and talk to capo
    state.current = "smugglers_den";
    if (state.agents["player"]) state.agents["player"].current = "smugglers_den";

    let res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "TALK", npc: "smuggler_capo" } },
      showcasePack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // Ask about contracts first to go to contract_list
    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "smuggler_capo", topic: "ask_contracts" } },
      showcasePack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    // 2. Accept c_smuggle_cargo
    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "smuggler_capo", topic: "take_smuggle" } },
      showcasePack
    );
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.guildContracts?.["c_smuggle_cargo"]?.status).toBe("active");

    // 3. Move to bandit_hideout, pick up contraband_cargo, move to smugglers_den
    // Close dialogue
    state = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "smuggler_capo", topic: "back" } },
      showcasePack
    ).state;

    // Check that we CANNOT accept/ask about contracts again
    const askAgainRes = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "smuggler_capo", topic: "ask_contracts" } },
      showcasePack
    );
    expect(askAgainRes.ok).toBe(false);

    state = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "smuggler_capo", topic: "leave" } },
      showcasePack
    ).state;

    // 3. Move to bandit_hideout, pick up contraband_cargo, move to smugglers_den
    state.current = "bandit_hideout";
    state.inventory.push("contraband_cargo");
    state.visited["smugglers_den"] = true;
    if (state.agents["player"]) {
      state.agents["player"].inventory.push("contraband_cargo");
      state.agents["player"].current = "smugglers_den";
    }
    state.current = "smugglers_den";

    // 4. Report contract completion
    res = multiAgentStep(state, { agentId: "player", action: { type: "TALK", npc: "smuggler_capo" } }, showcasePack);
    state = res.state;
    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "smuggler_capo", topic: "turn_in_smuggle" } },
      showcasePack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.guildContracts?.["c_smuggle_cargo"]?.status).toBe("completed");
    expect(state.inventory).not.toContain("contraband_cargo");
    expect(getAgentGuildPrestige(state, "player", "smugglers")).toBe(100);

    // Request Smuggler Token
    state = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "smuggler_capo", topic: "back" } },
      showcasePack
    ).state;
    state = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "smuggler_capo", topic: "request_token" } },
      showcasePack
    ).state;
    expect(state.inventory).toContain("smuggler_token");

    // Leave dialogue
    state = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "smuggler_capo", topic: "back" } },
      showcasePack
    ).state;
    state = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "smuggler_capo", topic: "leave" } },
      showcasePack
    ).state;

    // 5. Enter shadow_sanctum (down)
    res = multiAgentStep(state, { agentId: "player", action: { type: "MOVE", direction: "down" } }, showcasePack);
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.current).toBe("shadow_sanctum");

    // 6. Talk to smuggler_boss and accept premium contract c_smuggle_gem
    res = multiAgentStep(state, { agentId: "player", action: { type: "TALK", npc: "smuggler_boss" } }, showcasePack);
    state = res.state;
    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "smuggler_boss", topic: "take_gem_contract" } },
      showcasePack
    );
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.guildContracts?.["c_smuggle_gem"]?.status).toBe("active");

    // Leave dialogue
    state = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "smuggler_boss", topic: "back" } },
      showcasePack
    ).state;
    state = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "smuggler_boss", topic: "leave" } },
      showcasePack
    ).state;

    // 7. Get contraband_gem from bandit_hideout, return to shadow_sanctum
    state.current = "bandit_hideout";
    state.inventory.push("contraband_gem");
    state.visited["shadow_sanctum"] = true;
    if (state.agents["player"]) {
      state.agents["player"].inventory.push("contraband_gem");
      state.agents["player"].current = "shadow_sanctum";
    }
    state.current = "shadow_sanctum";

    // 8. Turn in premium contract
    res = multiAgentStep(state, { agentId: "player", action: { type: "TALK", npc: "smuggler_boss" } }, showcasePack);
    state = res.state;
    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "smuggler_boss", topic: "turn_in_gem" } },
      showcasePack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.guildContracts?.["c_smuggle_gem"]?.status).toBe("completed");
    expect(state.ended).toBe(false);

    // Leave dialogue, go down to vault, and steal treasure to win
    state = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "smuggler_boss", topic: "back" } },
      showcasePack
    ).state;
    state = multiAgentStep(
      state,
      { agentId: "player", action: { type: "ASK", npc: "smuggler_boss", topic: "leave" } },
      showcasePack
    ).state;

    res = multiAgentStep(state, { agentId: "player", action: { type: "MOVE", direction: "down" } }, showcasePack);
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.current).toBe("vault_of_shadows");

    res = multiAgentStep(
      state,
      { agentId: "player", action: { type: "TAKE", item: "smuggler_treasure" } },
      showcasePack
    );
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.ended).toBe(true);
    expect(state.endingId).toBe("ending_smuggler");

    // ENFORCERS PATHWAY
    let estate = createInitialState({
      seed: 42,
      start: "crossroads",
      varsInit: { gold: 100 },
      agentsInit: ["player"],
    });

    estate.current = "enforcers_post";
    if (estate.agents["player"]) estate.agents["player"].current = "enforcers_post";

    // 1. Accept c_enforce_bandit
    res = multiAgentStep(estate, { agentId: "player", action: { type: "TALK", npc: "sheriff" } }, showcasePack);
    estate = res.state;
    // Ask about contracts first to go to contract_list
    res = multiAgentStep(
      estate,
      { agentId: "player", action: { type: "ASK", npc: "sheriff", topic: "ask_contracts" } },
      showcasePack
    );
    expect(res.ok).toBe(true);
    estate = res.state;
    res = multiAgentStep(
      estate,
      { agentId: "player", action: { type: "ASK", npc: "sheriff", topic: "take_enforce" } },
      showcasePack
    );
    expect(res.ok).toBe(true);
    estate = res.state;
    expect(estate.guildContracts?.["c_enforce_bandit"]?.status).toBe("active");

    // Leave dialogue
    estate = multiAgentStep(
      estate,
      { agentId: "player", action: { type: "ASK", npc: "sheriff", topic: "back" } },
      showcasePack
    ).state;
    estate = multiAgentStep(
      estate,
      { agentId: "player", action: { type: "ASK", npc: "sheriff", topic: "leave" } },
      showcasePack
    ).state;

    // 2. Defeat bandit_thug
    estate.flags["npc_defeated_bandit_thug"] = true;

    // 3. Complete contract
    res = multiAgentStep(estate, { agentId: "player", action: { type: "TALK", npc: "sheriff" } }, showcasePack);
    estate = res.state;
    res = multiAgentStep(
      estate,
      { agentId: "player", action: { type: "ASK", npc: "sheriff", topic: "turn_in_enforce" } },
      showcasePack
    );
    expect(res.ok).toBe(true);
    estate = res.state;
    expect(estate.guildContracts?.["c_enforce_bandit"]?.status).toBe("completed");
    expect(getAgentGuildPrestige(estate, "player", "enforcers")).toBe(100);

    // Request Sheriff Badge
    estate = multiAgentStep(
      estate,
      { agentId: "player", action: { type: "ASK", npc: "sheriff", topic: "back" } },
      showcasePack
    ).state;
    estate = multiAgentStep(
      estate,
      { agentId: "player", action: { type: "ASK", npc: "sheriff", topic: "request_badge" } },
      showcasePack
    ).state;
    expect(estate.inventory).toContain("sheriff_badge");

    // Leave dialogue
    estate = multiAgentStep(
      estate,
      { agentId: "player", action: { type: "ASK", npc: "sheriff", topic: "back" } },
      showcasePack
    ).state;
    estate = multiAgentStep(
      estate,
      { agentId: "player", action: { type: "ASK", npc: "sheriff", topic: "leave" } },
      showcasePack
    ).state;

    // 4. Enter high_tower (up)
    res = multiAgentStep(estate, { agentId: "player", action: { type: "MOVE", direction: "up" } }, showcasePack);
    expect(res.ok).toBe(true);
    estate = res.state;
    expect(estate.current).toBe("high_tower");

    // 5. Accept c_enforce_boss
    res = multiAgentStep(
      estate,
      { agentId: "player", action: { type: "TALK", npc: "enforcer_commander" } },
      showcasePack
    );
    estate = res.state;
    res = multiAgentStep(
      estate,
      { agentId: "player", action: { type: "ASK", npc: "enforcer_commander", topic: "take_boss_contract" } },
      showcasePack
    );
    expect(res.ok).toBe(true);
    estate = res.state;
    expect(estate.guildContracts?.["c_enforce_boss"]?.status).toBe("active");

    // Leave dialogue
    estate = multiAgentStep(
      estate,
      { agentId: "player", action: { type: "ASK", npc: "enforcer_commander", topic: "back" } },
      showcasePack
    ).state;
    estate = multiAgentStep(
      estate,
      { agentId: "player", action: { type: "ASK", npc: "enforcer_commander", topic: "leave" } },
      showcasePack
    ).state;

    // 6. Defeat bandit_boss
    estate.flags["npc_defeated_bandit_boss"] = true;

    // 7. Complete contract and win
    res = multiAgentStep(
      estate,
      { agentId: "player", action: { type: "TALK", npc: "enforcer_commander" } },
      showcasePack
    );
    estate = res.state;
    res = multiAgentStep(
      estate,
      { agentId: "player", action: { type: "ASK", npc: "enforcer_commander", topic: "turn_in_boss" } },
      showcasePack
    );
    expect(res.ok).toBe(true);
    estate = res.state;

    expect(estate.guildContracts?.["c_enforce_boss"]?.status).toBe("completed");
    expect(estate.ended).toBe(false);

    // Leave dialogue, go up to commander's vault, and take trophy to win
    estate = multiAgentStep(
      estate,
      { agentId: "player", action: { type: "ASK", npc: "enforcer_commander", topic: "back" } },
      showcasePack
    ).state;
    estate = multiAgentStep(
      estate,
      { agentId: "player", action: { type: "ASK", npc: "enforcer_commander", topic: "leave" } },
      showcasePack
    ).state;

    res = multiAgentStep(estate, { agentId: "player", action: { type: "MOVE", direction: "up" } }, showcasePack);
    expect(res.ok).toBe(true);
    estate = res.state;
    expect(estate.current).toBe("commander_vault");

    res = multiAgentStep(
      estate,
      { agentId: "player", action: { type: "TAKE", item: "enforcer_trophy" } },
      showcasePack
    );
    expect(res.ok).toBe(true);
    estate = res.state;

    expect(estate.ended).toBe(true);
    expect(estate.endingId).toBe("ending_enforcer");
  });
});
