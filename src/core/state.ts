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

export const TradeTransactionSchema = z.object({
  step: z.number().int().nonnegative(),
  npcId: z.string(),
  action: z.enum(["buy", "sell", "stock"]),
  item: z.string(),
  gold: z.number().int(),
});

export type TradeTransaction = z.infer<typeof TradeTransactionSchema>;

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
});

export type GameState = z.infer<typeof GameStateSchema>;

export const createInitialState = (options: {
  seed: number;
  start: string;
  varsInit?: Record<string, number>;
  flagsInit?: string[];
  agentsInit?: string[];
  factionRepInit?: Record<string, number>;
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
