import { GameState, findRoom, getRoomExits } from "../core/state.js";
import { ParserPack, ParserRoom, ParserObject, ParserNPC } from "./schema.js";
import { AvailableAction } from "../api/types.js";
import { evaluateConditions } from "../core/conditions.js";

/**
 * Dynamically computes all legal actions for the player in the current GameState
 * based on the ParserPack rules.
 *
 * Implements the core "legal-action space restriction" thesis (§9.2).
 */
export function generateLegalActions(
  state: GameState,
  pack: ParserPack,
): AvailableAction[] {
  const actions: AvailableAction[] = [];

  // Check if player is currently in combat
  const activeCombatNpcId = Object.keys(state.flags)
    .find((f) => f.startsWith("in_combat_with_") && state.flags[f])
    ?.substring(15);

  if (activeCombatNpcId) {
    const npc = pack.npcs.find((n) => n.id === activeCombatNpcId);
    if (npc) {
      actions.push({
        id: "look_combat",
        command: "look",
        action: { type: "LOOK" },
      });

      actions.push({
        id: "inventory_combat",
        command: "inventory",
        action: { type: "INVENTORY" },
      });

      actions.push({
        id: `fight_${npc.id}`,
        command: `fight ${npc.name.toLowerCase()}`,
        action: { type: "FIGHT", npc: npc.id },
      });

      const playerMana = state.vars["mana"] ?? 10;
      if (playerMana >= 3) {
        actions.push({
          id: "cast_fireball",
          command: "cast fireball",
          action: { type: "CAST", spell: "fireball", target: npc.id },
        });
      }
      if (playerMana >= 2) {
        actions.push({
          id: "cast_heal",
          command: "cast heal",
          action: { type: "CAST", spell: "heal", target: "player" },
        });
      }

      actions.push({
        id: "flee_combat",
        command: "flee",
        action: { type: "FLEE" },
      });
      return actions;
    }
  }

  // Check if player is currently locked in a dialogue tree
  const activeDialogueNpcId = Object.keys(state.flags)
    .find((f) => f.startsWith("in_dialogue_with_") && state.flags[f])
    ?.substring(17);

  if (activeDialogueNpcId) {
    const npc = pack.npcs.find((n) => n.id === activeDialogueNpcId);
    if (npc) {
      // The only legal actions in dialogue are selecting a topic
      const nodeVarName = `dialogue_node_${npc.id}`;
      const currentNodeId = state.questStage[nodeVarName] ?? npc.dialogue.root;
      const node = npc.dialogue.nodes.find((n) => n.id === currentNodeId);

      if (node) {
        node.topics.forEach((topic) => {
          if (topic.conditions && topic.conditions.length > 0) {
            if (!evaluateConditions(state, topic.conditions)) {
              return;
            }
          }
          actions.push({
            id: `dialogue_${npc.id}_${topic.id}`,
            command: `ask about ${topic.prompt.toLowerCase()}`,
            action: { type: "ASK", npc: npc.id, topic: topic.id },
            text: topic.prompt,
          });
        });
        return actions;
      }
    }
  }

  // 1. Resolve current room
  const room = findRoom(state, pack, state.current);
  if (!room) {
    return actions;
  }

  // 2. Global Actions
  actions.push({
    id: "look_room",
    command: "look",
    action: { type: "LOOK" },
  });

  actions.push({
    id: "inventory",
    command: "inventory",
    action: { type: "INVENTORY" },
  });

  // 3. Move Exits
  const roomExits = getRoomExits(state, room);
  roomExits.forEach((exit) => {
    actions.push({
      id: `go_${exit.direction}`,
      command: `go ${exit.direction}`,
      action: { type: "MOVE", direction: exit.direction },
    });
  });

  // Helper to fetch visible items in a room (including contents of OPEN containers)
  const getVisibleObjectsInRoom = (currRoom: ParserRoom): ParserObject[] => {
    const objs: ParserObject[] = [];
    currRoom.objects.forEach((objId) => {
      const obj = pack.objects.find((o) => o.id === objId);
      if (obj) {
        const runtime = state.objectState[objId];
        if (
          runtime &&
          (runtime.takenBy === "player" || runtime.takenBy === "destroyed")
        ) {
          return;
        }
        objs.push(obj);

        // If it's a container and is open at runtime, its contents are also visible
        const isOpen = runtime ? runtime.open : !obj.locked && !obj.openable; // Default open if not openable
        if (isOpen && obj.contents) {
          obj.contents.forEach((nestedId) => {
            const nestedObj = pack.objects.find((o) => o.id === nestedId);
            if (nestedObj) {
              const nestedRuntime = state.objectState[nestedId];
              if (
                nestedRuntime &&
                (nestedRuntime.takenBy === "player" ||
                  nestedRuntime.takenBy === "destroyed")
              ) {
                return;
              }
              objs.push(nestedObj);
            }
          });
        }
      }
    });
    return objs;
  };

  const visibleObjects = getVisibleObjectsInRoom(room);
  const inventoryObjects = state.inventory
    .map((id) => pack.objects.find((o) => o.id === id))
    .filter((o): o is ParserObject => !!o);

  // 4. Object Interactions (Visible Objects)
  visibleObjects.forEach((obj) => {
    // LOOK <target>
    actions.push({
      id: `look_${obj.id}`,
      command: `look at ${obj.name}`,
      action: { type: "LOOK", target: obj.id },
    });

    // INSPECT <target>
    actions.push({
      id: `inspect_${obj.id}`,
      command: `inspect ${obj.name}`,
      action: { type: "INSPECT", target: obj.id },
    });

    // TAKE <item>
    const runtime = state.objectState[obj.id];
    const isTaken = runtime ? runtime.takenBy === "player" : false;
    if (obj.takeable && !isTaken && !state.inventory.includes(obj.id)) {
      actions.push({
        id: `take_${obj.id}`,
        command: `take ${obj.name}`,
        action: { type: "TAKE", item: obj.id },
      });
    }

    // OPEN / CLOSE
    const hasCustomOpen = (obj.interactions || []).some(
      (inter) => inter.verb === "OPEN",
    );
    if (obj.openable || hasCustomOpen) {
      const isOpen = runtime ? !!runtime.open : false;
      if (!isOpen) {
        actions.push({
          id: `open_${obj.id}`,
          command: `open ${obj.name}`,
          action: { type: "OPEN", target: obj.id },
        });
      } else {
        if (obj.openable) {
          actions.push({
            id: `close_${obj.id}`,
            command: `close ${obj.name}`,
            action: { type: "CLOSE", target: obj.id },
          });
        }
      }
    }

    // UNLOCK
    if (obj.locked && obj.key_id) {
      const isLocked = runtime ? runtime.locked !== false : true;
      if (isLocked && state.inventory.includes(obj.key_id)) {
        const key = pack.objects.find((k) => k.id === obj.key_id);
        actions.push({
          id: `unlock_${obj.id}_with_${obj.key_id}`,
          command: `unlock ${obj.name} with ${key?.name ?? "key"}`,
          action: { type: "UNLOCK", target: obj.id, with: obj.key_id },
        });
      }
    }

    // Declare generic USE on visible pack interactions
    (obj.interactions || []).forEach((inter) => {
      if (inter.verb === "USE") {
        const reqItem = inter.item;
        if (!reqItem || state.inventory.includes(reqItem)) {
          actions.push({
            id: `use_${reqItem ?? "self"}_on_${obj.id}`,
            command: reqItem
              ? `use ${pack.objects.find((o) => o.id === reqItem)?.name ?? reqItem} on ${obj.name}`
              : `use ${obj.name}`,
            action: { type: "USE", item: reqItem ?? obj.id, target: obj.id },
          });
        }
      }
    });

    const hasCustomRead = (obj.interactions || []).some(
      (inter) => inter.verb === "READ",
    );
    if (hasCustomRead) {
      actions.push({
        id: `read_${obj.id}`,
        command: `read ${obj.name}`,
        action: { type: "READ", target: obj.id },
      });
    }
  });

  // 5. Object Interactions (Inventory Objects)
  inventoryObjects.forEach((obj) => {
    // LOOK <target>
    actions.push({
      id: `look_${obj.id}`,
      command: `look at ${obj.name}`,
      action: { type: "LOOK", target: obj.id },
    });

    // INSPECT <target>
    actions.push({
      id: `inspect_${obj.id}`,
      command: `inspect ${obj.name}`,
      action: { type: "INSPECT", target: obj.id },
    });

    // DROP <item>
    actions.push({
      id: `drop_${obj.id}`,
      command: `drop ${obj.name}`,
      action: { type: "DROP", item: obj.id },
    });

    // USE item from inventory on any visible room objects
    visibleObjects.forEach((target) => {
      actions.push({
        id: `use_${obj.id}_on_${target.id}`,
        command: `use ${obj.name} on ${target.name}`,
        action: { type: "USE", item: obj.id, target: target.id },
      });
    });

    const hasCustomRead = (obj.interactions || []).some(
      (inter) => inter.verb === "READ",
    );
    if (hasCustomRead) {
      actions.push({
        id: `read_${obj.id}`,
        command: `read ${obj.name}`,
        action: { type: "READ", target: obj.id },
      });
    }
  });

  // 6. NPCs in Room
  room.npcs.forEach((npcId: string) => {
    if (state.flags[`npc_dead_${npcId}`]) return;
    const npc = pack.npcs.find((n) => n.id === npcId);
    if (npc) {
      actions.push({
        id: `talk_${npc.id}`,
        command: `talk to ${npc.name}`,
        action: { type: "TALK", npc: npc.id },
      });

      // GIVE <item> to NPC
      state.inventory.forEach((itemId) => {
        const item = pack.objects.find((o) => o.id === itemId);
        actions.push({
          id: `give_${itemId}_to_${npc.id}`,
          command: `give ${item?.name ?? itemId} to ${npc.name}`,
          action: { type: "GIVE", item: itemId, npc: npc.id },
        });
      });

      // BUY/SELL from Merchant
      if (state.merchantInventories && state.merchantInventories[npc.id]) {
        const merchantStock = state.merchantInventories[npc.id];
        merchantStock.forEach((itemId) => {
          const itemObj = pack.objects.find((o) => o.id === itemId);
          actions.push({
            id: `buy_${itemId}_from_${npc.id}`,
            command: `buy ${itemObj?.name.toLowerCase() ?? itemId} from ${npc.name.toLowerCase()}`,
            action: { type: "BUY", item: itemId, npc: npc.id },
          });
        });

        state.inventory.forEach((itemId) => {
          const itemObj = pack.objects.find((o) => o.id === itemId);
          if (itemObj && !itemObj.quest_critical) {
            actions.push({
              id: `sell_${itemId}_to_${npc.id}`,
              command: `sell ${itemObj.name.toLowerCase()} to ${npc.name.toLowerCase()}`,
              action: { type: "SELL", item: itemId, npc: npc.id },
            });
          }
        });
      }
    }
  });

  return actions;
}
