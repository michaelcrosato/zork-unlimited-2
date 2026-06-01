import { z } from "zod";
import { ConditionSchema } from "../core/conditions.js";
import { EffectSchema } from "../core/effects.js";

export const ParserExitSchema = z.object({
  direction: z.string(),
  to: z.string(),
  conditions: z.array(ConditionSchema).optional().default([]),
  locked_msg: z.string().optional(),
});

export type ParserExit = z.infer<typeof ParserExitSchema>;

export const ObjectInteractionSchema = z.object({
  verb: z.string(), // e.g. USE, OPEN, CLOSE, UNLOCK, READ, INSPECT
  item: z.string().optional(), // Optional item used on this target
  target: z.string().optional(), // Optional target object ID
  conditions: z.array(ConditionSchema).optional().default([]),
  effects: z.array(EffectSchema).optional().default([]),
});

export type ObjectInteraction = z.infer<typeof ObjectInteractionSchema>;

export const ParserObjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  aliases: z.array(z.string()).default([]),
  description: z.string(),
  takeable: z.boolean().default(false),
  quest_critical: z.boolean().default(false),
  container: z.boolean().default(false),
  openable: z.boolean().default(false),
  locked: z.boolean().default(false),
  key_id: z.string().optional(),
  contents: z.array(z.string()).optional().default([]),
  interactions: z.array(ObjectInteractionSchema).optional().default([]),
  cost: z.number().optional(),
});

export type ParserObject = z.infer<typeof ParserObjectSchema>;

export const DialogueRouteSchema = z.object({
  goto: z.string().optional(),
  end: z.boolean().optional().default(false),
  conditions: z.array(ConditionSchema).optional().default([]),
});

export type DialogueRoute = z.infer<typeof DialogueRouteSchema>;

export const DialogueTopicSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  goto: z.string().optional(),
  end: z.boolean().optional().default(false),
  conditions: z.array(ConditionSchema).optional().default([]),
  effects: z.array(EffectSchema).optional().default([]),
  routing: z.array(DialogueRouteSchema).optional(),
});

export type DialogueTopic = z.infer<typeof DialogueTopicSchema>;

export const DialogueNodeSchema = z.object({
  id: z.string(),
  npc_text: z.string(),
  effects: z.array(EffectSchema).optional().default([]),
  topics: z.array(DialogueTopicSchema).optional().default([]),
});

export type DialogueNode = z.infer<typeof DialogueNodeSchema>;

export const ParserNPCSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  dialogue: z.object({
    root: z.string(),
    nodes: z.array(DialogueNodeSchema),
  }),
  // RPG stats (Stage 4)
  hp: z.number().optional(),
  max_hp: z.number().optional(),
  attack: z.number().optional(),
  defense: z.number().optional(),
  gold: z.number().optional(),
  xp: z.number().optional(),
});

export type ParserNPC = z.infer<typeof ParserNPCSchema>;

export const ParserRoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  objects: z.array(z.string()).default([]), // Object IDs currently in this room
  npcs: z.array(z.string()).optional().default([]), // NPC IDs in this room
  exits: z.array(ParserExitSchema).default([]),
  weather_pool: z.array(z.string()).optional(),
});

export type ParserRoom = z.infer<typeof ParserRoomSchema>;

export const ParserWinConditionSchema = z.object({
  id: z.string(),
  conditions: z.array(ConditionSchema),
  ending: z.string(),
});

export type ParserWinCondition = z.infer<typeof ParserWinConditionSchema>;

export const ParserEndingSchema = z.object({
  id: z.string(),
  title: z.string(),
  text: z.string(),
});

export type ParserEnding = z.infer<typeof ParserEndingSchema>;

export const ProceduralRoomTemplateSchema = z.object({
  id: z.string(),
  name_pool: z.array(z.string()),
  description_pool: z.array(z.string()),
  possible_objects: z.array(z.string()).optional().default([]),
  possible_npcs: z.array(z.string()).optional().default([]),
  exits: z.array(ParserExitSchema).optional().default([]),
  weather_pool: z.array(z.string()).optional(),
});

export type ProceduralRoomTemplate = z.infer<typeof ProceduralRoomTemplateSchema>;

export const ParserPackSchema = z.object({
  meta: z.object({
    id: z.string(),
    title: z.string(),
    start_room: z.string(),
    vars_init: z.record(z.string(), z.number()).optional().default({}),
    flags_init: z.array(z.string()).optional().default([]),
  }),
  rooms: z.array(ParserRoomSchema),
  objects: z.array(ParserObjectSchema).default([]),
  npcs: z.array(ParserNPCSchema).default([]),
  win_conditions: z.array(ParserWinConditionSchema).default([]),
  endings: z.array(ParserEndingSchema).default([]),
  procedural_templates: z.array(ProceduralRoomTemplateSchema).optional(),
  network_templates: z.object({
    arrival: z.string().optional(),
    departure: z.string().optional(),
    sync: z.string().optional(),
  }).optional(),
});

export type ParserPack = z.infer<typeof ParserPackSchema>;
