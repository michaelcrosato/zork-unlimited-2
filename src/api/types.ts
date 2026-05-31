import { GameState } from "../core/state.js";
import { GameEvent } from "../core/events.js";

export type Action =
  // CYOA
  | { type: "CHOOSE"; choiceId: string }
  // Parser (Stage 2+)
  | { type: "LOOK"; target?: string }
  | { type: "MOVE"; direction: string }
  | { type: "TAKE"; item: string }
  | { type: "DROP"; item: string }
  | { type: "OPEN"; target: string }
  | { type: "CLOSE"; target: string }
  | { type: "UNLOCK"; target: string; with: string }
  | { type: "USE"; item: string; target: string }
  | { type: "TALK"; npc: string }
  | { type: "ASK"; npc: string; topic: string }
  | { type: "GIVE"; item: string; npc: string }
  | { type: "READ"; target: string }
  | { type: "INSPECT"; target: string }
  | { type: "INVENTORY" }
  // Hero's Quest RPG (Stage 4)
  | { type: "FIGHT"; npc: string }
  | { type: "CAST"; spell: string; target: string }
  | { type: "FLEE" };

export type StepResult = {
  state: GameState;
  events: GameEvent[];
  ok: boolean;
  rejectionReason?: string;
};

export type AvailableAction = {
  id: string;
  command: string;
  action: Action;
  text?: string; // Optional human choice text (mainly for CYOA)
};

export type CYOAObservation = {
  mode: "cyoa";
  scene_id: string;
  text: string;
  state: {
    flags: string[];
    vars: Record<string, number>;
    inventory: string[];
    journal: string[];
  };
  available_actions: {
    id: string;
    text: string;
  }[];
};

export type ParserObservation = {
  mode: "parser";
  room: string;
  description: string;
  visible_objects: {
    id: string;
    name: string;
  }[];
  exits: {
    direction: string;
    to: string;
  }[];
  inventory: string[];
  available_actions: AvailableAction[];
};

export type Observation = CYOAObservation | ParserObservation;
