import { z } from "zod";

export const ObjectRuntimeSchema = z.object({
  open: z.boolean().optional(),
  locked: z.boolean().optional(),
  contents: z.array(z.string()).optional(),
  takenBy: z.enum(["player", "world", "destroyed"]).optional(),
});

export type ObjectRuntime = z.infer<typeof ObjectRuntimeSchema>;

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
});

export type GameState = z.infer<typeof GameStateSchema>;

export const createInitialState = (options: {
  seed: number;
  start: string;
  varsInit?: Record<string, number>;
  flagsInit?: string[];
}): GameState => {
  const flags: Record<string, boolean> = {};
  if (options.flagsInit) {
    for (const flag of options.flagsInit) {
      flags[flag] = true;
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
  };
};

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
