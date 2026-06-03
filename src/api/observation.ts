import { GameState, findRoom, getRoomExits } from "../core/state.js";
import { CYOAPack } from "../cyoa/schema.js";
import { ParserPack } from "../parser/schema.js";
import { isCyoaPack } from "../core/pack.js";
import { CYOAObservation, ParserObservation, Observation } from "./types.js";
import { evaluateConditions } from "../core/conditions.js";
import { generateLegalActions } from "../parser/legal_actions.js";

function isOutdoorRoom(roomId: string): boolean {
  const idLower = roomId.toLowerCase();
  return (
    idLower.includes("forest") ||
    idLower.includes("garden") ||
    idLower.includes("entrance") ||
    idLower.includes("yard") ||
    idLower.includes("clearing") ||
    idLower.includes("road") ||
    idLower.includes("path") ||
    idLower.includes("outside") ||
    idLower.includes("exterior") ||
    idLower.includes("glade") ||
    idLower.includes("courtyard") ||
    idLower.includes("cliff") ||
    idLower.includes("mountains")
  );
}

const WEATHER_EFFECTS: Record<string, string> = {
  clear: "The sky overhead is clear.",
  rain: "Rain is falling steadily from the gray sky.",
  fog: "A damp, cold fog clings to the surroundings, reducing visibility.",
  storm: "A violent storm rages, with howling winds and flashing lightning.",
};

/**
 * Returns a purely deterministic sensory/atmospheric narration based on room type,
 * seed, and step count. Maintains strict byte-identity and Zork-style vibe.
 */
function getSensoryFlavor(roomId: string, seed: number, step: number): string {
  const sensoryData: Record<string, string[]> = {
    forest: [
      "A cold breeze rustles the dry pine needles overhead.",
      "The distant hoot of an owl echoes through the darkening woods.",
      "Mist clings low to the damp earth, smelling of rich loam.",
      "A sense of quiet watchfulness hangs heavily in the air.",
    ],
    crypt: [
      "A faint smell of incense and damp stonework lingers in the shadows.",
      "Your footsteps kick up tiny clouds of ancient, silent dust.",
      "Dust motes dance lazily in the thin shafts of pale light.",
      "The heavy, chilly silence of the deep earth presses against your ears.",
    ],
    castle: [
      "The stones here feel intensely cold, radiating an ancient chill.",
      "Echoes of long-forgotten footsteps seem to whisper from the masonry.",
      "The drafty corridors carry the faint, metallic scent of iron and rust.",
      "A low draft makes the shadows dance flickeringly along the walls.",
    ],
  };

  let category = "castle";
  const idLower = roomId.toLowerCase();
  if (idLower.includes("forest") || idLower.includes("garden") || idLower.includes("entrance")) {
    category = "forest";
  } else if (
    idLower.includes("chapel") ||
    idLower.includes("crypt") ||
    idLower.includes("sacristy") ||
    idLower.includes("altar") ||
    idLower.includes("well") ||
    idLower.includes("catacombs") ||
    idLower.includes("yard")
  ) {
    category = "crypt";
  }

  const pool = sensoryData[category];
  const charSum = roomId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = Math.abs(seed + step + charSum) % pool.length;
  return pool[index];
}

/**
 * Compiles a structured, schema-valid Observation for the AI playtester based
 * on the current GameState and either a CYOAPack or a ParserPack.
 */
export function buildObservation(state: GameState, pack: CYOAPack | ParserPack): Observation {
  // Check if pack is CYOA
  if (isCyoaPack(pack)) {
    const cyoaPack = pack as CYOAPack;
    const currentScene = cyoaPack.scenes.find((s) => s.id === state.current);
    if (!currentScene) {
      throw new Error(`Current scene '${state.current}' not found in CYOA pack.`);
    }

    const availableChoices = currentScene.choices.filter((choice) => evaluateConditions(state, choice.conditions));

    let sensoryFlavor = getSensoryFlavor(currentScene.id, state.seed, state.step);
    if (state.environment && isOutdoorRoom(currentScene.id)) {
      const wEffect = WEATHER_EFFECTS[state.environment.weather];
      if (wEffect) {
        sensoryFlavor = `${sensoryFlavor} ${wEffect}`;
      }
    }
    const text = `${currentScene.text} ${sensoryFlavor}`;

    const choices = availableChoices.map((c) => ({
      id: c.id,
      text: c.text,
    }));

    if ((cyoaPack as any).recipes) {
      for (const recipe of (cyoaPack as any).recipes) {
        const hasAllIngredients = recipe.ingredients.every((ing: string) => state.inventory.includes(ing));
        if (hasAllIngredients && evaluateConditions(state, recipe.conditions ?? [])) {
          const ingredientNames = recipe.ingredients
            .map((ingId: string) => {
              return ingId.replace(/_/g, " ");
            })
            .join(" and ");
          const resultName = recipe.result.replace(/_/g, " ");
          choices.push({
            id: `craft_${recipe.id}`,
            text: recipe.text ?? `Combine ${ingredientNames} to make ${resultName}`,
          });
        }
      }
    }

    return {
      mode: "cyoa",
      scene_id: state.current,
      text,
      state: {
        flags: Object.keys(state.flags).filter((f) => state.flags[f]),
        vars: { ...state.vars },
        inventory: [...state.inventory],
        journal: [...state.journal],
      },
      available_actions: choices,
    } as CYOAObservation;
  }

  // Otherwise, it is a ParserPack
  const parserPack = pack as ParserPack;
  const room = findRoom(state, parserPack, state.current);
  if (!room) {
    throw new Error(`Current room '${state.current}' not found in parser pack.`);
  }

  // Compile visible objects (including contents of OPEN containers in the room)
  const visibleObjects: { id: string; name: string }[] = [];
  room.objects.forEach((objId: string) => {
    const obj = parserPack.objects.find((o) => o.id === objId);
    if (obj) {
      const runtime = state.objectState[obj.id];
      if (runtime && (runtime.takenBy === "player" || runtime.takenBy === "destroyed")) {
        return;
      }
      visibleObjects.push({ id: obj.id, name: obj.name });

      const isOpen = runtime ? runtime.open : !obj.locked && !obj.openable;
      if (isOpen && obj.contents) {
        obj.contents.forEach((nestedId) => {
          const nestedObj = parserPack.objects.find((o) => o.id === nestedId);
          if (nestedObj) {
            const nestedRuntime = state.objectState[nestedId];
            if (nestedRuntime && (nestedRuntime.takenBy === "player" || nestedRuntime.takenBy === "destroyed")) {
              return;
            }
            visibleObjects.push({ id: nestedObj.id, name: nestedObj.name });
          }
        });
      }
    }
  });

  // Compile exits
  const exitsList = getRoomExits(state, room).map((exit) => ({
    direction: exit.direction,
    to: exit.to,
  }));

  // Compile available legal actions
  const legalActions = generateLegalActions(state, parserPack);

  let sensoryFlavor = getSensoryFlavor(room.id, state.seed, state.step);
  if (state.environment && isOutdoorRoom(room.id)) {
    const wEffect = WEATHER_EFFECTS[state.environment.weather];
    if (wEffect) {
      sensoryFlavor = `${sensoryFlavor} ${wEffect}`;
    }
  }
  const description = `${room.description} ${sensoryFlavor}`;

  return {
    mode: "parser",
    room: room.id,
    description,
    visible_objects: visibleObjects,
    exits: exitsList,
    inventory: [...state.inventory],
    available_actions: legalActions,
  } as ParserObservation;
}
