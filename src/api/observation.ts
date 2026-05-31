import { GameState } from "../core/state.js";
import { CYOAPack } from "../cyoa/schema.js";
import { ParserPack } from "../parser/schema.js";
import { CYOAObservation, ParserObservation, Observation } from "./types.js";
import { evaluateConditions } from "../core/conditions.js";
import { generateLegalActions } from "../parser/legal_actions.js";

/**
 * Compiles a structured, schema-valid Observation for the AI playtester based
 * on the current GameState and either a CYOAPack or a ParserPack.
 */
export function buildObservation(
  state: GameState,
  pack: CYOAPack | ParserPack,
): Observation {
  // Check if pack is CYOA
  if ("scenes" in pack) {
    const cyoaPack = pack as CYOAPack;
    const currentScene = cyoaPack.scenes.find((s) => s.id === state.current);
    if (!currentScene) {
      throw new Error(
        `Current scene '${state.current}' not found in CYOA pack.`,
      );
    }

    const availableChoices = currentScene.choices.filter((choice) =>
      evaluateConditions(state, choice.conditions),
    );

    return {
      mode: "cyoa",
      scene_id: state.current,
      text: currentScene.text,
      state: {
        flags: Object.keys(state.flags).filter((f) => state.flags[f]),
        vars: { ...state.vars },
        inventory: [...state.inventory],
        journal: [...state.journal],
      },
      available_actions: availableChoices.map((c) => ({
        id: c.id,
        text: c.text,
      })),
    } as CYOAObservation;
  }

  // Otherwise, it is a ParserPack
  const parserPack = pack as ParserPack;
  const room = parserPack.rooms.find((r) => r.id === state.current);
  if (!room) {
    throw new Error(
      `Current room '${state.current}' not found in parser pack.`,
    );
  }

  // Compile visible objects (including contents of OPEN containers in the room)
  const visibleObjects: { id: string; name: string }[] = [];
  room.objects.forEach((objId) => {
    const obj = parserPack.objects.find((o) => o.id === objId);
    if (obj) {
      const runtime = state.objectState[obj.id];
      if (
        runtime &&
        (runtime.takenBy === "player" || runtime.takenBy === "destroyed")
      ) {
        return;
      }
      visibleObjects.push({ id: obj.id, name: obj.name });

      const isOpen = runtime ? runtime.open : !obj.locked && !obj.openable;
      if (isOpen && obj.contents) {
        obj.contents.forEach((nestedId) => {
          const nestedObj = parserPack.objects.find((o) => o.id === nestedId);
          if (nestedObj) {
            const nestedRuntime = state.objectState[nestedId];
            if (
              nestedRuntime &&
              (nestedRuntime.takenBy === "player" ||
                nestedRuntime.takenBy === "destroyed")
            ) {
              return;
            }
            visibleObjects.push({ id: nestedObj.id, name: nestedObj.name });
          }
        });
      }
    }
  });

  // Compile exits
  const exitsList = room.exits.map((exit) => ({
    direction: exit.direction,
    to: exit.to,
  }));

  // Compile available legal actions
  const legalActions = generateLegalActions(state, parserPack);

  return {
    mode: "parser",
    room: room.id,
    description: room.description,
    visible_objects: visibleObjects,
    exits: exitsList,
    inventory: [...state.inventory],
    available_actions: legalActions,
  } as ParserObservation;
}
