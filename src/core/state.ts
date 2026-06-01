import { z } from "zod";

export const ObjectRuntimeSchema = z.object({
  open: z.boolean().optional(),
  locked: z.boolean().optional(),
  contents: z.array(z.string()).optional(),
  takenBy: z.enum(["player", "world", "destroyed"]).optional(),
});

export type ObjectRuntime = z.infer<typeof ObjectRuntimeSchema>;

export const EnvironmentalStateSchema = z.object({
  weather: z.string(),
  temperature: z.string(),
  lastUpdatedStep: z.number().int().nonnegative(),
});

export type EnvironmentalState = z.infer<typeof EnvironmentalStateSchema>;

export const AgentStateSchema = z.object({
  id: z.string(),
  current: z.string(),
  inventory: z.array(z.string()),
});

export type AgentState = z.infer<typeof AgentStateSchema>;

export const TransactionSchema = z.object({
  agentId: z.string(),
  sequenceNumber: z.number().int().nonnegative(),
  action: z.any(),
  stateHashBefore: z.string(),
  stateHashAfter: z.string(),
  timestamp: z.number().int(),
  ok: z.boolean(),
  rejectionReason: z.string().optional(),
  signature: z.string().optional(),
});

export type Transaction = z.infer<typeof TransactionSchema>;

export const LootClaimSchema = z.object({
  claimedBy: z.string(),
  timestamp: z.number().int(),
});

export type LootClaim = z.infer<typeof LootClaimSchema>;

export const TerritoryClaimSchema = z.object({
  claimedBy: z.string(),
  factionId: z.string(),
  timestamp: z.number().int(),
  assistants: z.array(z.string()).optional(),
  allianceDefense: z.number().int().optional(),
});

export type TerritoryClaim = z.infer<typeof TerritoryClaimSchema>;

export const TaxVoteSchema = z.object({
  rate: z.number(),
  timestamp: z.number().int(),
});

export type TaxVote = z.infer<typeof TaxVoteSchema>;

export const AllianceRelationshipSchema = z.enum(["allied", "hostile", "neutral"]);
export type AllianceRelationship = z.infer<typeof AllianceRelationshipSchema>;

export const AllianceVoteSchema = z.object({
  targetState: AllianceRelationshipSchema,
  timestamp: z.number().int(),
});
export type AllianceVote = z.infer<typeof AllianceVoteSchema>;

export const TradeTransactionSchema = z.object({
  step: z.number().int().nonnegative(),
  npcId: z.string(),
  action: z.enum(["buy", "sell", "stock"]),
  item: z.string(),
  gold: z.number().int(),
});

export type TradeTransaction = z.infer<typeof TradeTransactionSchema>;

export const TradeRouteSchema = z.object({
  id: z.string(),
  factionId: z.string(),
  rooms: z.array(z.string()),
  definedBy: z.string(),
  taxShare: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type TradeRoute = z.infer<typeof TradeRouteSchema>;

export const TradeRouteVoteSchema = z.object({
  taxShare: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type TradeRouteVote = z.infer<typeof TradeRouteVoteSchema>;

export const TariffVoteSchema = z.object({
  rate: z.number().int().nonnegative(),
  timestamp: z.number().int(),
});
export type TariffVote = z.infer<typeof TariffVoteSchema>;

export const MerchantLicensingSchema = z.object({
  factionId: z.string(),
  licenseCost: z.number().int().nonnegative(),
  tariffRate: z.number().int().nonnegative(),
  definedBy: z.string(),
  timestamp: z.number().int(),
});
export type MerchantLicensing = z.infer<typeof MerchantLicensingSchema>;

export const GameStateSchema = z.object({
  // identity / determinism
  seed: z.number().int(),
  step: z.number().int().nonnegative(),

  // location
  current: z.string(), // scene_id (CYOA) or room_id (parser)
  visited: z.record(z.string(), z.boolean()),

  // world state
  flags: z.record(z.string(), z.boolean()),
  vars: z.record(z.string(), z.number()),
  inventory: z.array(z.string()),
  objectState: z.record(z.string(), ObjectRuntimeSchema),
  proceduralRooms: z.array(z.any()).optional(),

  // narrative
  journal: z.array(z.string()),
  questStage: z.record(z.string(), z.string()), // questId -> current stage id (Stage 3+)

  // termination
  ended: z.boolean(),
  endingId: z.string().nullable(),

  // environmental state fields
  environment: EnvironmentalStateSchema.optional(),

  // multi-agent synchronization and telemetry
  agents: z.record(z.string(), AgentStateSchema).optional(),
  transactionJournal: z.array(TransactionSchema).optional(),
  stateHistory: z.array(z.any()).optional(),
  vectorClock: z.record(z.string(), z.number()).optional(),
  lootClaims: z.record(z.string(), LootClaimSchema).optional(),
  cooperativeSyncLog: z.array(z.string()).optional(),

  // merchant and economy system
  merchantInventories: z.record(z.string(), z.array(z.string())).optional(),
  tradeHistory: z.array(TradeTransactionSchema).optional(),
  merchantGold: z.record(z.string(), z.number()).optional(),
  merchantLastRestock: z.record(z.string(), z.number()).optional(),
  npcRep: z.record(z.string(), z.number()).optional(),
  factionRep: z.record(z.string(), z.number()).optional(),
  territoryClaims: z.record(z.string(), TerritoryClaimSchema).optional(),
  territoryControl: z.record(z.string(), z.string()).optional(),
  territoryAssists: z.record(z.string(), z.record(z.string(), z.array(z.string()))).optional(),
  taxPolicy: z.record(z.string(), z.number()).optional(),
  taxVotes: z.record(z.string(), z.record(z.string(), TaxVoteSchema)).optional(),
  alliances: z.record(z.string(), z.record(z.string(), AllianceRelationshipSchema)).optional(),
  allianceVotes: z.record(z.string(), z.record(z.string(), AllianceVoteSchema)).optional(),
  
  // decentralized trade routes and tolls
  tradeRoutes: z.record(z.string(), TradeRouteSchema).optional(),
  tradeRouteVotes: z.record(z.string(), z.record(z.string(), TradeRouteVoteSchema)).optional(),
  tradeRoutePolicies: z.record(z.string(), z.number()).optional(),

  // decentralized merchant trade licensing and tariffs
  merchantLicenses: z.record(z.string(), z.array(z.string())).optional(),
  merchantLicensings: z.record(z.string(), MerchantLicensingSchema).optional(),
  tariffVotes: z.record(z.string(), z.record(z.string(), TariffVoteSchema)).optional(),
  tariffPolicy: z.record(z.string(), z.number()).optional(),
});

export type GameState = z.infer<typeof GameStateSchema>;

export const createInitialState = (options: {
  seed: number;
  start: string;
  varsInit?: Record<string, number>;
  flagsInit?: string[];
  agentsInit?: string[];
  factionRepInit?: Record<string, number>;
  territoryControlInit?: Record<string, string>;
}): GameState => {
  const flags: Record<string, boolean> = {};
  if (options.flagsInit) {
    for (const flag of options.flagsInit) {
      flags[flag] = true;
    }
  }

  const agents: Record<string, AgentState> = {};
  if (options.agentsInit) {
    for (const agentId of options.agentsInit) {
      agents[agentId] = {
        id: agentId,
        current: options.start,
        inventory: [],
      };
    }
  }

  return {
    seed: options.seed,
    step: 0,
    current: options.start,
    visited: { [options.start]: true },
    flags,
    vars: options.varsInit ?? {},
    inventory: [],
    objectState: {},
    proceduralRooms: [],
    journal: [],
    questStage: {},
    ended: false,
    endingId: null,
    environment: {
      weather: "clear",
      temperature: "mild",
      lastUpdatedStep: 0,
    },
    agents: options.agentsInit ? agents : undefined,
    transactionJournal: [],
    stateHistory: [],
    vectorClock: options.agentsInit ? Object.fromEntries(options.agentsInit.map((id) => [id, 0])) : {},
    lootClaims: {},
    cooperativeSyncLog: [],
    merchantInventories: {},
    tradeHistory: [],
    merchantGold: {},
    merchantLastRestock: {},
    npcRep: {},
    factionRep: options.factionRepInit ?? {},
    territoryClaims: {},
    territoryControl: options.territoryControlInit ?? {},
    territoryAssists: {},
    taxPolicy: {},
    taxVotes: {},
    alliances: {},
    allianceVotes: {},
    tradeRoutes: {},
    tradeRouteVotes: {},
    tradeRoutePolicies: {},
  };
};

export function getFactionRepInit(pack: any): Record<string, number> | undefined {
  if (!pack || !pack.factions) return undefined;
  const init: Record<string, number> = {};
  for (const f of pack.factions) {
    init[f.id] = f.initial_rep ?? 0;
  }
  return init;
}

export function getTerritoryControlInit(pack: any): Record<string, string> | undefined {
  if (!pack || !pack.rooms) return undefined;
  const init: Record<string, string> = {};
  for (const r of pack.rooms) {
    if (r.faction) {
      init[r.id] = r.faction;
    }
  }
  return init;
}

export function reconcileTerritories(state: GameState, pack: any): GameState {
  if (!state.territoryClaims) return state;

  const newState = {
    ...state,
    territoryControl: { ...(state.territoryControl || {}) },
  };

  for (const [roomId, claim] of Object.entries(newState.territoryClaims || {})) {
    newState.territoryControl[roomId] = claim.factionId;
  }

  return newState;
}

export function reconcileTaxPolicies(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    taxPolicy: { ...(state.taxPolicy || {}) },
  };

  if (!newState.taxVotes) {
    newState.taxVotes = {};
  }

  for (const [factionId, votes] of Object.entries(newState.taxVotes)) {
    const counts: Record<number, number> = {};
    for (const vote of Object.values(votes)) {
      counts[vote.rate] = (counts[vote.rate] ?? 0) + 1;
    }

    let maxCount = 0;
    let consensusRate = 0;

    const uniqueRates = Object.keys(counts).map(Number).sort((a, b) => b - a);
    for (const rate of uniqueRates) {
      const count = counts[rate];
      if (count > maxCount) {
        maxCount = count;
        consensusRate = rate;
      }
    }

    newState.taxPolicy[factionId] = consensusRate;
  }

  return newState;
}

export function reconcileLootClaims(state: GameState, pack: any): GameState {
  if (!state.lootClaims) return state;

  const newState = {
    ...state,
    inventory: [...state.inventory],
    objectState: JSON.parse(JSON.stringify(state.objectState || {})),
    agents: state.agents ? JSON.parse(JSON.stringify(state.agents)) : undefined,
  };

  for (const [key, claim] of Object.entries(newState.lootClaims || {})) {
    const [chestId, itemId] = key.split(":");
    const winnerId = claim.claimedBy;

    // 1. Initialize chest in objectState from pack if not yet present
    if (!newState.objectState[chestId] && pack && pack.objects) {
      const packObj = pack.objects.find((o: any) => o.id === chestId);
      if (packObj) {
        newState.objectState[chestId] = {
          open: packObj.open,
          locked: packObj.locked,
          contents: packObj.contents ? [...packObj.contents] : [],
        };
      }
    }

    // 2. Remove from chest contents if chest exists
    const chestRuntime = newState.objectState[chestId];
    if (chestRuntime && chestRuntime.contents) {
      chestRuntime.contents = chestRuntime.contents.filter((item: string) => item !== itemId);
    }

    // 3. Update agents' inventories
    if (newState.agents) {
      for (const agentId of Object.keys(newState.agents)) {
        const agent = newState.agents[agentId];
        if (agentId === winnerId) {
          if (!agent.inventory.includes(itemId)) {
            agent.inventory.push(itemId);
          }
        } else {
          agent.inventory = agent.inventory.filter((item: string) => item !== itemId);
        }
      }
    }

    // Also update the global player inventory if the winner is the current player
    if (winnerId === newState.current) {
      if (!newState.inventory.includes(itemId)) {
        newState.inventory.push(itemId);
      }
    } else {
      newState.inventory = newState.inventory.filter((item: string) => item !== itemId);
    }

    // Mark the item's runtime takenBy status
    const itemRuntime = newState.objectState[itemId] ?? {};
    itemRuntime.takenBy = "player";
    newState.objectState[itemId] = itemRuntime;
  }

  return newState;
}

export function findRoom(state: GameState, pack: any, roomId: string): any | undefined {
  if (state.proceduralRooms) {
    const procRoom = state.proceduralRooms.find((r: any) => r.id === roomId);
    if (procRoom) return procRoom;
  }
  if (pack && pack.rooms) {
    return pack.rooms.find((r: any) => r.id === roomId);
  }
  return undefined;
}

export function getRoomExits(state: GameState, currentRoom: any): any[] {
  const exits = [...(currentRoom.exits || [])];
  const prefix = `procedural_exit_${currentRoom.id}_`;
  Object.keys(state.flags).forEach((flag) => {
    if (flag.startsWith(prefix) && state.flags[flag]) {
      const rest = flag.substring(prefix.length);
      const parts = rest.split("_to_");
      if (parts.length === 2) {
        const direction = parts[0];
        const to = parts[1];
        if (!exits.some((e) => e.direction === direction)) {
          exits.push({
            direction,
            to,
            conditions: []
          });
        }
      }
    }
  });
  return exits;
}

export function reconcileAlliances(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    alliances: { ...(state.alliances || {}) },
  };

  if (!newState.allianceVotes) {
    newState.allianceVotes = {};
  }

  // Clear and rebuild alliances from scratch to ensure consistency
  newState.alliances = {};

  for (const [pairKey, votes] of Object.entries(newState.allianceVotes)) {
    const parts = pairKey.split(":");
    if (parts.length !== 2) continue;
    const [factionA, factionB] = parts;

    const counts: Record<string, number> = { allied: 0, hostile: 0, neutral: 0 };
    for (const vote of Object.values(votes)) {
      counts[vote.targetState] = (counts[vote.targetState] ?? 0) + 1;
    }

    let maxCount = -1;
    let consensusState: "allied" | "hostile" | "neutral" = "neutral";

    // Decisive deterministic tie-breaking majority consensus arbitration rule:
    // Sort states priority: "allied" > "hostile" > "neutral"
    const statesPriority: ("allied" | "hostile" | "neutral")[] = ["allied", "hostile", "neutral"];
    for (const s of statesPriority) {
      const count = counts[s] ?? 0;
      if (count > maxCount) {
        maxCount = count;
        consensusState = s;
      }
    }

    // Set symmetrically
    if (!newState.alliances[factionA]) {
      newState.alliances[factionA] = {};
    }
    newState.alliances[factionA][factionB] = consensusState;

    if (!newState.alliances[factionB]) {
      newState.alliances[factionB] = {};
    }
    newState.alliances[factionB][factionA] = consensusState;
  }

  return newState;
}

export function reconcileTradeRoutes(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    tradeRoutePolicies: { ...(state.tradeRoutePolicies || {}) },
  };

  if (!newState.tradeRouteVotes) {
    newState.tradeRouteVotes = {};
  }

  for (const [routeId, votes] of Object.entries(newState.tradeRouteVotes)) {
    const counts: Record<number, number> = {};
    for (const vote of Object.values(votes)) {
      counts[vote.taxShare] = (counts[vote.taxShare] ?? 0) + 1;
    }

    let maxCount = 0;
    let consensusRate = 0;

    // Decisive deterministic tie-breaking majority consensus arbitration rule:
    // Sort rates descending to prefer higher rates.
    const uniqueRates = Object.keys(counts).map(Number).sort((a, b) => b - a);
    for (const rate of uniqueRates) {
      const count = counts[rate];
      if (count > maxCount) {
        maxCount = count;
        consensusRate = rate;
      }
    }

    newState.tradeRoutePolicies[routeId] = consensusRate;
  }

  return newState;
}

export function reconcileTariffPolicies(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    tariffPolicy: { ...(state.tariffPolicy || {}) },
  };

  if (!newState.tariffVotes) {
    newState.tariffVotes = {};
  }

  for (const [factionId, votes] of Object.entries(newState.tariffVotes)) {
    const counts: Record<number, number> = {};
    for (const vote of Object.values(votes)) {
      counts[vote.rate] = (counts[vote.rate] ?? 0) + 1;
    }

    let maxCount = 0;
    let consensusRate = 0;

    // Decisive deterministic tie-breaking majority consensus arbitration rule:
    // Sort rates descending to prefer higher rates.
    const uniqueRates = Object.keys(counts).map(Number).sort((a, b) => b - a);
    for (const rate of uniqueRates) {
      const count = counts[rate];
      if (count > maxCount) {
        maxCount = count;
        consensusRate = rate;
      }
    }

    newState.tariffPolicy[factionId] = consensusRate;
  }

  return newState;
}

