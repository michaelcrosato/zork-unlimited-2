import { GameState } from "./state.js";
import { Action, StepResult } from "../api/types.js";
import { GameEvent } from "./events.js";
import { evaluateConditions } from "./conditions.js";
import { applyEffects } from "./effects.js";
import { computeStateHashShort } from "./hash.js";
import { CYOAPack } from "../cyoa/schema.js";
import { ParserPack, ParserRoom, ParserObject, ParserNPC } from "../parser/schema.js";

/**
 * Pure engine step transition function.
 * Supports both CYOA and Parser game types dynamically based on content pack shape.
 */
export function step(
  state: GameState,
  action: Action,
  pack: CYOAPack | ParserPack
): StepResult {
  // If the game has already ended, reject all actions
  if (state.ended) {
    return {
      state,
      events: [{ type: "rejected", reason: "Game has already ended." }],
      ok: false,
      rejectionReason: "Game has already ended.",
    };
  }

  // Clone state to ensure pure changes
  let newState: GameState = {
    ...state,
    flags: { ...state.flags },
    vars: { ...state.vars },
    inventory: [...state.inventory],
    objectState: { ...state.objectState },
    journal: [...state.journal],
    visited: { ...state.visited },
    questStage: { ...state.questStage },
  };

  const events: GameEvent[] = [];

  // Check if pack is CYOA
  if ("scenes" in pack) {
    const cyoaPack = pack as CYOAPack;

    if (action.type !== "CHOOSE") {
      return {
        state,
        events: [{ type: "rejected", reason: `Action type '${action.type}' is not supported in CYOA mode.` }],
        ok: false,
        rejectionReason: `Action type '${action.type}' is not supported.`,
      };
    }

    const choiceId = action.choiceId;
    const currentScene = cyoaPack.scenes.find((s) => s.id === state.current);
    if (!currentScene) {
      return {
        state,
        events: [{ type: "rejected", reason: `Current scene '${state.current}' not found in content pack.` }],
        ok: false,
        rejectionReason: `Current scene '${state.current}' not found.`,
      };
    }

    if (currentScene.is_ending) {
      return {
        state,
        events: [{ type: "rejected", reason: "Cannot make a choice in an ending scene." }],
        ok: false,
        rejectionReason: "Cannot make a choice in an ending scene.",
      };
    }

    const choice = currentScene.choices.find((c) => c.id === choiceId);
    if (!choice) {
      return {
        state,
        events: [{ type: "rejected", reason: `Choice '${choiceId}' is not valid in scene '${state.current}'.` }],
        ok: false,
        rejectionReason: `Choice '${choiceId}' is not valid in this scene.`,
      };
    }

    const conditionsPassed = evaluateConditions(newState, choice.conditions);
    if (!conditionsPassed) {
      return {
        state,
        events: [{ type: "rejected", reason: `Conditions for choice '${choiceId}' are not met.` }],
        ok: false,
        rejectionReason: "Conditions for this choice are not met.",
      };
    }

    const effectResult = applyEffects(newState, choice.effects);
    newState = effectResult.state;
    events.push(...effectResult.events);

    const nextSceneId = choice.next || state.current;
    if (nextSceneId !== state.current) {
      newState.current = nextSceneId;
      newState.visited[nextSceneId] = true;
      events.push({
        type: "state_change",
        effect: "goto",
        value: nextSceneId,
      });

      const nextScene = cyoaPack.scenes.find((s) => s.id === nextSceneId);
      if (nextScene) {
        const enterResult = applyEffects(newState, nextScene.on_enter);
        newState = enterResult.state;
        events.push(...enterResult.events);

        if (nextScene.is_ending) {
          newState.ended = true;
          newState.endingId = nextSceneId;
          const endingMeta = cyoaPack.endings?.find((e) => e.id === nextSceneId);
          events.push({
            type: "ending",
            endingId: nextSceneId,
            title: endingMeta?.title ?? nextScene.title,
            text: endingMeta?.text ?? nextScene.text,
          });
        }
      }
    }

    newState.step += 1;
    return { state: newState, events, ok: true };
  }

  // --- PARSER ENGINE REDUCER ---
  const parserPack = pack as ParserPack;
  const currentRoom = parserPack.rooms.find((r) => r.id === state.current);
  if (!currentRoom) {
    return {
      state,
      events: [{ type: "rejected", reason: `Current room '${state.current}' not found.` }],
      ok: false,
      rejectionReason: `Current room '${state.current}' not found.`,
    };
  }

  const findObjectInPack = (id: string): ParserObject | undefined =>
    parserPack.objects.find((o) => o.id === id);

  // Helper to verify if an object is currently visible in the current room or inventory
  const isObjectVisible = (id: string): boolean => {
    if (state.inventory.includes(id)) return true;
    if (currentRoom.objects.includes(id)) return true;

    // Check inside open containers in the room
    for (const roomObjId of currentRoom.objects) {
      const roomObj = findObjectInPack(roomObjId);
      if (roomObj && roomObj.container) {
        const runtime = newState.objectState[roomObjId];
        const isOpen = runtime ? runtime.open : !roomObj.locked && !roomObj.openable;
        if (isOpen && roomObj.contents && roomObj.contents.includes(id)) {
          return true;
        }
      }
    }
    return false;
  };

  // Check if locked in active dialogue tree
  const activeDialogueNpcId = Object.keys(state.flags).find(
    (f) => f.startsWith("in_dialogue_with_") && state.flags[f]
  )?.substring(17);

  if (activeDialogueNpcId && action.type !== "ASK") {
    return {
      state,
      events: [{ type: "rejected", reason: `You are in a conversation. You must select a dialogue topic.` }],
      ok: false,
      rejectionReason: `You are in a conversation with the NPC.`,
    };
  }

  // Action Switch Resolvers
  switch (action.type) {
    case "LOOK": {
      if (!action.target) {
        // Look around room
        events.push({
          type: "narration",
          text: currentRoom.description,
        });
      } else {
        // Look at specific target object
        if (!isObjectVisible(action.target)) {
          return {
            state,
            events: [{ type: "rejected", reason: `You don't see any '${action.target}' here.` }],
            ok: false,
            rejectionReason: `You don't see that here.`,
          };
        }
        const obj = findObjectInPack(action.target);
        events.push({
          type: "narration",
          text: obj ? obj.description : `It is a ${action.target}.`,
        });
      }
      break;
    }

    case "INSPECT": {
      if (!isObjectVisible(action.target)) {
        return {
          state,
          events: [{ type: "rejected", reason: `You don't see '${action.target}' here.` }],
          ok: false,
          rejectionReason: `You don't see that here.`,
        };
      }
      const obj = findObjectInPack(action.target);
      events.push({
        type: "narration",
        text: obj ? obj.description : `You see nothing unusual about the ${action.target}.`,
      });
      break;
    }

    case "INVENTORY": {
      const itemsList = state.inventory
        .map((id) => findObjectInPack(id)?.name ?? id)
        .join(", ");
      events.push({
        type: "narration",
        text: state.inventory.length > 0 ? `You are carrying: ${itemsList}.` : "You are empty-handed.",
      });
      break;
    }

    case "MOVE": {
      const exit = currentRoom.exits.find((e) => e.direction === action.direction);
      if (!exit) {
        return {
          state,
          events: [{ type: "rejected", reason: `You cannot go '${action.direction}' from here.` }],
          ok: false,
          rejectionReason: `You cannot go that way.`,
        };
      }

      // Check exit conditions
      const passed = evaluateConditions(newState, exit.conditions);
      if (!passed) {
        return {
          state,
          events: [{ type: "rejected", reason: exit.locked_msg ?? "That path is locked." }],
          ok: false,
          rejectionReason: exit.locked_msg ?? "That path is locked.",
        };
      }

      newState.current = exit.to;
      newState.visited[exit.to] = true;
      events.push({
        type: "move",
        from: currentRoom.id,
        to: exit.to,
        direction: action.direction,
      });

      // Apply enter effects of the new room if found
      const newRoom = parserPack.rooms.find((r) => r.id === exit.to);
      if (newRoom) {
        events.push({
          type: "narration",
          text: newRoom.description,
        });
      }
      break;
    }

    case "TAKE": {
      const obj = findObjectInPack(action.item);
      if (!obj || !isObjectVisible(action.item) || !obj.takeable) {
        return {
          state,
          events: [{ type: "rejected", reason: `You cannot take '${action.item}'.` }],
          ok: false,
          rejectionReason: `You can't take that.`,
        };
      }

      if (state.inventory.includes(action.item)) {
        return {
          state,
          events: [{ type: "rejected", reason: `You already have '${action.item}'.` }],
          ok: false,
          rejectionReason: `You already have that.`,
        };
      }

      // If it is inside a container, remove it from that container's contents
      for (const roomObjId of currentRoom.objects) {
        const roomObj = findObjectInPack(roomObjId);
        if (roomObj && roomObj.container && roomObj.contents?.includes(action.item)) {
          const containerRuntime = newState.objectState[roomObjId] ?? { ...roomObj };
          containerRuntime.contents = containerRuntime.contents?.filter((c) => c !== action.item);
          newState.objectState[roomObjId] = containerRuntime;
        }
      }

      newState.inventory.push(action.item);
      newState.objectState[action.item] = {
        ...newState.objectState[action.item],
        takenBy: "player",
      };

      events.push({
        type: "take",
        item: action.item,
      });
      events.push({
        type: "narration",
        text: `Taken.`,
      });
      break;
    }

    case "DROP": {
      if (!state.inventory.includes(action.item)) {
        return {
          state,
          events: [{ type: "rejected", reason: `You do not have '${action.item}' in your inventory.` }],
          ok: false,
          rejectionReason: `You don't have that.`,
        };
      }

      newState.inventory = newState.inventory.filter((i) => i !== action.item);
      newState.objectState[action.item] = {
        ...newState.objectState[action.item],
        takenBy: "world",
      };

      // Register the item in the current room's objects list in GameState
      // In Stage 2, room objects are simply kept in state.objectState or tracked
      events.push({
        type: "drop",
        item: action.item,
      });
      events.push({
        type: "narration",
        text: `Dropped.`,
      });
      break;
    }

    case "OPEN": {
      const obj = findObjectInPack(action.target);
      if (!obj || !isObjectVisible(action.target)) {
        return {
          state,
          events: [{ type: "rejected", reason: `You don't see any '${action.target}' here.` }],
          ok: false,
          rejectionReason: `You don't see that here.`,
        };
      }

      // Check if custom OPEN interaction exists whose conditions pass
      const matchingInter = obj.interactions.find(
        (i) => i.verb === "OPEN" && evaluateConditions(newState, i.conditions)
      );

      if (matchingInter) {
        // Apply effects
        const effectResult = applyEffects(newState, matchingInter.effects);
        newState = effectResult.state;
        events.push(...effectResult.events);
        break;
      }

      // If there are OPEN interactions but none passed their conditions
      const hasAnyOpenInter = obj.interactions.some((i) => i.verb === "OPEN");
      if (hasAnyOpenInter) {
        return {
          state,
          events: [{ type: "rejected", reason: `Conditions for opening '${action.target}' are not met.` }],
          ok: false,
          rejectionReason: `Nothing happens.`,
        };
      }

      // Fall back to default openable container logic
      if (!obj.openable) {
        return {
          state,
          events: [{ type: "rejected", reason: `You cannot open '${action.target}'.` }],
          ok: false,
          rejectionReason: `You can't open that.`,
        };
      }

      const runtime = newState.objectState[action.target] ?? {};
      const isLocked = runtime.locked !== undefined ? runtime.locked : obj.locked;
      if (isLocked) {
        return {
          state,
          events: [{ type: "rejected", reason: `'${action.target}' is locked.` }],
          ok: false,
          rejectionReason: `It is locked.`,
        };
      }

      newState.objectState[action.target] = {
        ...runtime,
        open: true,
      };

      events.push({ type: "open_object", objectId: action.target });
      events.push({ type: "narration", text: `You open the ${obj.name}.` });
      break;
    }

    case "CLOSE": {
      const obj = findObjectInPack(action.target);
      if (!obj || !isObjectVisible(action.target) || !obj.openable) {
        return {
          state,
          events: [{ type: "rejected", reason: `You cannot close '${action.target}'.` }],
          ok: false,
          rejectionReason: `You can't close that.`,
        };
      }

      const runtime = newState.objectState[action.target] ?? {};
      newState.objectState[action.target] = {
        ...runtime,
        open: false,
      };

      events.push({ type: "state_change", effect: "close_object", flag: action.target });
      events.push({ type: "narration", text: `You close the ${obj.name}.` });
      break;
    }

    case "UNLOCK": {
      const obj = findObjectInPack(action.target);
      if (!obj || !isObjectVisible(action.target) || !obj.locked) {
        return {
          state,
          events: [{ type: "rejected", reason: `You cannot unlock '${action.target}'.` }],
          ok: false,
          rejectionReason: `You can't unlock that.`,
        };
      }

      if (!state.inventory.includes(action.with) || action.with !== obj.key_id) {
        return {
          state,
          events: [{ type: "rejected", reason: `That key doesn't fit.` }],
          ok: false,
          rejectionReason: `That key doesn't fit.`,
        };
      }

      const runtime = newState.objectState[action.target] ?? {};
      newState.objectState[action.target] = {
        ...runtime,
        locked: false,
      };

      events.push({ type: "state_change", effect: "unlock_object", flag: action.target });
      events.push({ type: "narration", text: `You unlock the ${obj.name} with the ${findObjectInPack(action.with)?.name}.` });
      break;
    }

    case "USE": {
      const obj = findObjectInPack(action.target);
      if (!obj || !isObjectVisible(action.target)) {
        return {
          state,
          events: [{ type: "rejected", reason: `You don't see any '${action.target}' here.` }],
          ok: false,
          rejectionReason: `You don't see that here.`,
        };
      }

      // Check if custom USE interaction exists
      const inter = obj.interactions.find(
        (i) => i.verb === "USE" && (i.item === undefined || i.item === action.item)
      );

      if (!inter) {
        return {
          state,
          events: [{ type: "rejected", reason: `Using '${action.item}' on '${action.target}' does nothing.` }],
          ok: false,
          rejectionReason: `Using that on ${obj.name} does nothing.`,
        };
      }

      // Evaluate conditions
      const passed = evaluateConditions(newState, inter.conditions);
      if (!passed) {
        return {
          state,
          events: [{ type: "rejected", reason: `Conditions for using '${action.item}' on '${action.target}' are not met.` }],
          ok: false,
          rejectionReason: `Nothing happens.`,
        };
      }

      // Apply effects
      const effectResult = applyEffects(newState, inter.effects);
      newState = effectResult.state;
      events.push(...effectResult.events);
      break;
    }

    case "TALK": {
      const npc = parserPack.npcs.find((n) => n.id === action.npc);
      if (!npc || !currentRoom.npcs?.includes(action.npc)) {
        return {
          state,
          events: [{ type: "rejected", reason: `NPC '${action.npc}' is not in this room.` }],
          ok: false,
          rejectionReason: `You don't see them here.`,
        };
      }

      // Set dialogue active state
      newState.flags[`in_dialogue_with_${npc.id}`] = true;
      const rootNodeVar = `dialogue_node_${npc.id}`;
      newState.questStage[rootNodeVar] = npc.dialogue.root;

      const welcomeNode = npc.dialogue.nodes.find((n) => n.id === npc.dialogue.root);

      events.push({
        type: "dialogue",
        npcId: npc.id,
        nodeId: npc.dialogue.root,
        text: welcomeNode?.npc_text ?? `You speak to ${npc.name}.`,
      });
      events.push({
        type: "narration",
        text: welcomeNode?.npc_text ?? `You speak to ${npc.name}.`,
      });
      break;
    }

    case "ASK": {
      const npc = parserPack.npcs.find((n) => n.id === action.npc);
      if (!npc) {
        return {
          state,
          events: [{ type: "rejected", reason: `NPC '${action.npc}' not found.` }],
          ok: false,
          rejectionReason: `Nobody is here.`,
        };
      }

      const nodeVarName = `dialogue_node_${npc.id}`;
      const currentNodeId = state.questStage[nodeVarName] ?? npc.dialogue.root;
      const currentNode = npc.dialogue.nodes.find((n) => n.id === currentNodeId);

      const topic = currentNode?.topics.find((t) => t.id === action.topic);
      if (!topic) {
        return {
          state,
          events: [{ type: "rejected", reason: `Topic '${action.topic}' is not valid right now.` }],
          ok: false,
          rejectionReason: `You can't ask about that right now.`,
        };
      }

      // Apply transition
      if (topic.end) {
        newState.flags[`in_dialogue_with_${npc.id}`] = false;
        events.push({
          type: "narration",
          text: `You say goodbye to ${npc.name}.`,
        });
      } else if (topic.goto) {
        newState.questStage[nodeVarName] = topic.goto;
        const nextNode = npc.dialogue.nodes.find((n) => n.id === topic.goto);
        if (nextNode) {
          // Apply node effects
          const effectResult = applyEffects(newState, nextNode.effects);
          newState = effectResult.state;
          events.push(...effectResult.events);

          events.push({
            type: "dialogue",
            npcId: npc.id,
            nodeId: topic.goto,
            text: nextNode.npc_text,
          });
          events.push({
            type: "narration",
            text: nextNode.npc_text,
          });
        }
      }
      break;
    }

    default:
      return {
        state,
        events: [{ type: "rejected", reason: `Action type '${action.type}' is not supported in parser mode.` }],
        ok: false,
        rejectionReason: `Action type '${action.type}' is not supported.`,
      };
  }

  // Check Win Conditions after every step
  for (const winCond of parserPack.win_conditions) {
    const passed = evaluateConditions(newState, winCond.conditions);
    if (passed) {
      newState.ended = true;
      newState.endingId = winCond.ending;

      const endingMeta = parserPack.endings?.find((e) => e.id === winCond.ending);
      events.push({
        type: "ending",
        endingId: winCond.ending,
        title: endingMeta?.title ?? "Victory",
        text: endingMeta?.text ?? "You have won!",
      });
      break; // Stop at first win condition met
    }
  }

  newState.step += 1;
  return {
    state: newState,
    events,
    ok: true,
  };
}
