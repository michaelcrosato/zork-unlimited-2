import { GameState, findRoom, getRoomExits } from "./state.js";
import { Action, StepResult } from "../api/types.js";
import { GameEvent } from "./events.js";
import { evaluateConditions } from "./conditions.js";
import { applyEffects } from "./effects.js";
import { computeStateHashShort } from "./hash.js";
import { CYOAPack } from "../cyoa/schema.js";
import { ParserPack, ParserRoom, ParserObject, ParserNPC } from "../parser/schema.js";
import { PureRand } from "./rng.js";
import { calculateTradePrice, checkReputationTrade, getMerchantGold, tickEconomy } from "./economy.js";

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
    cooperativeSyncLog: state.cooperativeSyncLog ? [...state.cooperativeSyncLog] : [],
    merchantInventories: state.merchantInventories ? JSON.parse(JSON.stringify(state.merchantInventories)) : undefined,
    tradeHistory: state.tradeHistory ? [...state.tradeHistory] : undefined,
    merchantGold: state.merchantGold ? { ...state.merchantGold } : undefined,
    merchantLastRestock: state.merchantLastRestock ? { ...state.merchantLastRestock } : undefined,
    npcRep: state.npcRep ? { ...state.npcRep } : undefined,
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

    const effectResult = applyEffects(newState, choice.effects, pack);
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
        const enterResult = applyEffects(newState, nextScene.on_enter, pack);
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
    newState = tickEnvironment(newState, events, pack);
    return { state: newState, events, ok: true };
  }

  // --- PARSER ENGINE REDUCER ---
  const parserPack = pack as ParserPack;
  const currentRoom = findRoom(state, parserPack, state.current);
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

    // If it has been taken by the player, it's only visible if it's currently in their inventory
    const runtimeObj = newState.objectState[id];
    if (runtimeObj) {
      if (runtimeObj.takenBy === "player") {
        return state.inventory.includes(id);
      }
      if (runtimeObj.takenBy === "destroyed") {
        return false;
      }
    }

    if (currentRoom.objects.includes(id)) return true;

    // Check inside open containers in the room
    for (const roomObjId of currentRoom.objects) {
      const roomObj = findObjectInPack(roomObjId);
      if (roomObj && roomObj.container) {
        const runtime = newState.objectState[roomObjId];
        const isOpen = runtime ? runtime.open : !roomObj.locked && !roomObj.openable;
        if (isOpen && roomObj.contents && roomObj.contents.includes(id)) {
          const nestedRuntime = newState.objectState[id];
          if (nestedRuntime && nestedRuntime.takenBy === "player") {
            return state.inventory.includes(id);
          }
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

  // Check if player is currently in combat
  const activeCombatNpcId = Object.keys(newState.flags).find(
    (f) => f.startsWith("in_combat_with_") && newState.flags[f]
  )?.substring(15);

  if (activeCombatNpcId) {
    const allowedInCombat = ["FIGHT", "CAST", "FLEE", "LOOK", "INSPECT", "INVENTORY"];
    if (!allowedInCombat.includes(action.type)) {
      return {
        state,
        events: [{ type: "rejected", reason: `You are in combat! You can only fight, cast, or flee.` }],
        ok: false,
        rejectionReason: `You are in combat!`,
      };
    }

    if (action.type !== "LOOK" && action.type !== "INSPECT" && action.type !== "INVENTORY") {
      const enemy = parserPack.npcs.find((n) => n.id === activeCombatNpcId);
      if (!enemy) {
        newState.flags[`in_combat_with_${activeCombatNpcId}`] = false;
      } else {
        const enemyVarHp = `npc_hp_${enemy.id}`;
        if (newState.vars[enemyVarHp] === undefined) {
          newState.vars[enemyVarHp] = enemy.hp ?? 10;
        }

        let enemyHp = newState.vars[enemyVarHp];
        const enemyMaxHp = enemy.max_hp ?? enemy.hp ?? 10;
        const enemyAttack = enemy.attack ?? 2;
        const enemyDefense = enemy.defense ?? 10;
        const enemyGold = enemy.gold ?? 5;
        const enemyXp = enemy.xp ?? 10;

        let playerHp = newState.vars["hp"] ?? 20;
        const playerMaxHp = newState.vars["max_hp"] ?? 20;
        const playerDex = newState.vars["dexterity"] ?? 10;
        const playerStr = newState.vars["strength"] ?? 10;
        const playerInt = newState.vars["intelligence"] ?? 10;
        let playerMana = newState.vars["mana"] ?? 10;

        let combatLog = "";

        // 1. Resolve Player Action
        if (action.type === "FIGHT") {
          const { value: hitRoll, nextSeed: s1 } = PureRand.nextInt(newState.seed, 1, 20);
          const hitTotal = hitRoll + Math.floor(playerDex / 3);
          newState.seed = s1;

          if (hitRoll === 20 || hitTotal >= enemyDefense) {
            const { value: dmgRoll, nextSeed: s2 } = PureRand.nextInt(newState.seed, 1, 6);
            const dmgTotal = Math.max(1, dmgRoll + Math.floor(playerStr / 3));
            newState.seed = s2;
            enemyHp = Math.max(0, enemyHp - dmgTotal);
            combatLog += `⚔️ You strike the ${enemy.name} for ${dmgTotal} damage! (Enemy HP: ${enemyHp}/${enemyMaxHp})\n`;
          } else {
            combatLog += `🛡️ You swing at the ${enemy.name} but miss! (Rolled ${hitRoll} vs Defense ${enemyDefense})\n`;
          }
        } else if (action.type === "CAST") {
          const spell = (action as any).spell.toLowerCase();
          if (spell === "fireball") {
            if (playerMana < 3) {
              return {
                state,
                events: [{ type: "rejected", reason: "Not enough mana! Fireball costs 3 mana." }],
                ok: false,
                rejectionReason: "Not enough mana.",
              };
            }
            playerMana -= 3;
            const { value: dmgRoll, nextSeed: s1 } = PureRand.nextInt(newState.seed, 4, 10);
            const dmgTotal = dmgRoll + Math.floor(playerInt / 3);
            newState.seed = s1;
            enemyHp = Math.max(0, enemyHp - dmgTotal);
            combatLog += `🔥 You cast Fireball! Searing flames consume the ${enemy.name} for ${dmgTotal} fire damage! (Enemy HP: ${enemyHp}/${enemyMaxHp})\n`;
          } else if (spell === "heal") {
            if (playerMana < 2) {
              return {
                state,
                events: [{ type: "rejected", reason: "Not enough mana! Heal costs 2 mana." }],
                ok: false,
                rejectionReason: "Not enough mana.",
              };
            }
            playerMana -= 2;
            const { value: healRoll, nextSeed: s1 } = PureRand.nextInt(newState.seed, 6, 12);
            newState.seed = s1;
            playerHp = Math.min(playerMaxHp, playerHp + healRoll);
            combatLog += `✨ You cast Heal! Divine light restores ${healRoll} HP. (HP: ${playerHp}/${playerMaxHp})\n`;
          } else {
            return {
              state,
              events: [{ type: "rejected", reason: `Unknown spell: '${(action as any).spell}'.` }],
              ok: false,
              rejectionReason: "Unknown spell.",
            };
          }
        } else if (action.type === "FLEE") {
          const { value: fleeRoll, nextSeed: s1 } = PureRand.nextInt(newState.seed, 1, 20);
          const fleeTotal = fleeRoll + Math.floor(playerDex / 3);
          newState.seed = s1;

          if (fleeTotal >= 12) {
            newState.flags[`in_combat_with_${enemy.id}`] = false;
            events.push({
              type: "narration",
              text: `🏃 With a quick maneuver, you successfully flee from the ${enemy.name}!`,
            });
            newState.vars["hp"] = playerHp;
            newState.vars["mana"] = playerMana;
            newState.step += 1;
            newState = tickEnvironment(newState, events, pack);
            return { state: newState, events, ok: true };
          } else {
            combatLog += `🏃 You try to flee, but the ${enemy.name} blocks your escape!\n`;
          }
        }

        // 2. Resolve Enemy Turn (if enemy survived)
        if (enemyHp > 0) {
          const { value: enemyHitRoll, nextSeed: s3 } = PureRand.nextInt(newState.seed, 1, 20);
          const enemyHitTotal = enemyHitRoll + enemyAttack;
          const playerDefense = 10 + Math.floor(playerDex / 3);
          newState.seed = s3;

          if (enemyHitRoll === 20 || enemyHitTotal >= playerDefense) {
            const { value: enemyDmgRoll, nextSeed: s4 } = PureRand.nextInt(newState.seed, 1, 6);
            newState.seed = s4;
            playerHp = Math.max(0, playerHp - enemyDmgRoll);
            combatLog += `💥 The ${enemy.name} strikes you for ${enemyDmgRoll} damage! (HP: ${playerHp}/${playerMaxHp})\n`;
          } else {
            combatLog += `💨 The ${enemy.name} swings at you but misses!\n`;
          }
        }

        // 3. Resolve combat outcomes
        if (enemyHp <= 0) {
          newState.flags[`in_combat_with_${enemy.id}`] = false;
          newState.flags[`npc_defeated_${enemy.id}`] = true;
          newState.flags[`npc_dead_${enemy.id}`] = true;

          const goldEarned = enemyGold;
          const xpEarned = enemyXp;
          newState.vars["gold"] = (newState.vars["gold"] ?? 0) + goldEarned;
          newState.vars["xp"] = (newState.vars["xp"] ?? 0) + xpEarned;

          combatLog += `🏆 VICTORY! You have defeated the ${enemy.name}! You earn ${goldEarned} gold and ${xpEarned} XP.`;
        }

        if (playerHp <= 0) {
          newState.ended = true;
          newState.endingId = "ending_died_in_combat";
          combatLog += `💀 You have fallen in battle. Game Over.`;
        }

        // Save states back
        newState.vars["hp"] = playerHp;
        newState.vars["mana"] = playerMana;
        newState.vars[enemyVarHp] = enemyHp;

        events.push({
          type: "narration",
          text: combatLog.trim(),
        });

        newState.step += 1;
        newState = tickEconomy(newState, pack);
        newState = tickEnvironment(newState, events, pack);
        return { state: newState, events, ok: true };
      }
    }
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
      const roomExits = getRoomExits(state, currentRoom);
      const exit = roomExits.find((e) => e.direction === action.direction);
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
      const newRoom = findRoom(newState, parserPack, exit.to);
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

      const matchingInter = (obj.interactions || []).find(
        (i) => i.verb === "TAKE" && evaluateConditions(newState, i.conditions)
      );

      if (matchingInter) {
        const effectResult = applyEffects(newState, matchingInter.effects, pack);
        newState = effectResult.state;
        events.push(...effectResult.events);
      } else {
        events.push({
          type: "narration",
          text: `Taken.`,
        });
      }
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
      const matchingInter = (obj.interactions || []).find(
        (i) => i.verb === "OPEN" && evaluateConditions(newState, i.conditions)
      );

      if (matchingInter) {
        // Apply effects
        const effectResult = applyEffects(newState, matchingInter.effects, pack);
        newState = effectResult.state;
        events.push(...effectResult.events);
        break;
      }

      // If there are OPEN interactions but none passed their conditions
      const hasAnyOpenInter = (obj.interactions || []).some((i) => i.verb === "OPEN");
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
      const inter = (obj.interactions || []).find(
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
      const effectResult = applyEffects(newState, inter.effects, pack);
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

      // Apply welcome node effects
      if (welcomeNode && welcomeNode.effects) {
        const effectResult = applyEffects(newState, welcomeNode.effects, pack);
        newState = effectResult.state;
        events.push(...effectResult.events);
      }

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

      // Evaluate topic-level conditions
      if (topic.conditions && topic.conditions.length > 0) {
        const conditionsPassed = evaluateConditions(newState, topic.conditions);
        if (!conditionsPassed) {
          return {
            state,
            events: [{ type: "rejected", reason: `Conditions for topic '${action.topic}' are not met.` }],
            ok: false,
            rejectionReason: `You can't ask about that right now.`,
          };
        }
      }

      // Apply topic-level effects
      if (topic.effects && topic.effects.length > 0) {
        const effectResult = applyEffects(newState, topic.effects, pack);
        newState = effectResult.state;
        events.push(...effectResult.events);
      }

      // Determine next action or transition (evaluate dynamic routing first)
      let nextNodeId = topic.goto;
      let shouldEnd = !!topic.end;

      if (topic.routing && topic.routing.length > 0) {
        for (const route of topic.routing) {
          const conditionsPassed = evaluateConditions(newState, route.conditions ?? []);
          if (conditionsPassed) {
            nextNodeId = route.goto;
            shouldEnd = !!route.end;
            break;
          }
        }
      }

      // Apply transition
      if (shouldEnd) {
        newState.flags[`in_dialogue_with_${npc.id}`] = false;
        events.push({
          type: "narration",
          text: `You say goodbye to ${npc.name}.`,
        });
      } else if (nextNodeId) {
        newState.questStage[nodeVarName] = nextNodeId;
        const nextNode = npc.dialogue.nodes.find((n) => n.id === nextNodeId);
        if (nextNode) {
          // Apply node effects
          const effectResult = applyEffects(newState, nextNode.effects, pack);
          newState = effectResult.state;
          events.push(...effectResult.events);

          events.push({
            type: "dialogue",
            npcId: npc.id,
            nodeId: nextNodeId,
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

    case "GIVE": {
      const npc = parserPack.npcs.find((n) => n.id === action.npc);
      if (!npc || !currentRoom.npcs?.includes(action.npc)) {
        return {
          state,
          events: [{ type: "rejected", reason: `NPC '${action.npc}' is not here.` }],
          ok: false,
          rejectionReason: `You don't see them here.`,
        };
      }

      if (!state.inventory.includes(action.item)) {
        return {
          state,
          events: [{ type: "rejected", reason: `You don't have '${action.item}' in your inventory.` }],
          ok: false,
          rejectionReason: `You don't have that.`,
        };
      }

      const itemObj = findObjectInPack(action.item);
      events.push({
        type: "narration",
        text: `You offer the ${itemObj?.name ?? action.item} to ${npc.name}, but they decline.`,
      });
      break;
    }

    case "BUY": {
      const npc = parserPack.npcs.find((n) => n.id === action.npc);
      if (!npc || !currentRoom.npcs?.includes(action.npc)) {
        return {
          state,
          events: [{ type: "rejected", reason: `NPC '${action.npc}' is not here.` }],
          ok: false,
          rejectionReason: `You don't see them here.`,
        };
      }

      if (!newState.merchantInventories) {
        newState.merchantInventories = {};
      }
      if (!newState.merchantInventories[npc.id]) {
        newState.merchantInventories[npc.id] = [];
      }
      if (!newState.tradeHistory) {
        newState.tradeHistory = [];
      }

      const isStocked = newState.merchantInventories[npc.id].includes(action.item);
      if (!isStocked) {
        return {
          state,
          events: [{ type: "rejected", reason: `The merchant does not have that item in stock.` }],
          ok: false,
          rejectionReason: `They don't have that in stock.`,
        };
      }

      // Check reputation requirement
      const repCheck = checkReputationTrade(newState, npc);
      if (!repCheck.allowed) {
        return {
          state,
          events: [{ type: "rejected", reason: repCheck.reason ?? "Trade not allowed." }],
          ok: false,
          rejectionReason: repCheck.reason ?? "Trade not allowed.",
        };
      }

      const itemObj = findObjectInPack(action.item);
      const baseCost = itemObj?.cost ?? 10;
      const itemCost = calculateTradePrice(newState, npc, itemObj, baseCost, true);
      const playerGold = newState.vars["gold"] ?? 0;

      if (playerGold < itemCost) {
        return {
          state,
          events: [{ type: "rejected", reason: `You don't have enough gold (requires ${itemCost} gold, you have ${playerGold}).` }],
          ok: false,
          rejectionReason: `You don't have enough gold.`,
        };
      }

      // Update Player Gold
      newState.vars["gold"] = playerGold - itemCost;
      
      // Update Merchant Gold
      const mGold = getMerchantGold(newState, npc);
      const maxGold = npc?.gold_limit;
      newState.merchantGold = newState.merchantGold || {};
      const nextMerchantGold = mGold + itemCost;
      newState.merchantGold[npc.id] = maxGold !== undefined ? Math.min(nextMerchantGold, maxGold) : nextMerchantGold;

      if (!newState.inventory.includes(action.item)) {
        newState.inventory.push(action.item);
      }
      newState.merchantInventories[npc.id] = newState.merchantInventories[npc.id].filter((i) => i !== action.item);

      const currentObj = newState.objectState[action.item] ?? {};
      newState.objectState[action.item] = {
        ...currentObj,
        takenBy: "player",
      };

      newState.tradeHistory.push({
        step: newState.step,
        npcId: npc.id,
        action: "buy",
        item: action.item,
        gold: itemCost,
      });

      events.push({
        type: "take",
        item: action.item,
      });
      events.push({
        type: "narration",
        text: `You buy the ${itemObj?.name ?? action.item} from ${npc.name} for ${itemCost} gold.`,
      });
      break;
    }

    case "SELL": {
      const npc = parserPack.npcs.find((n) => n.id === action.npc);
      if (!npc || !currentRoom.npcs?.includes(action.npc)) {
        return {
          state,
          events: [{ type: "rejected", reason: `NPC '${action.npc}' is not here.` }],
          ok: false,
          rejectionReason: `You don't see them here.`,
        };
      }

      if (!state.inventory.includes(action.item)) {
        return {
          state,
          events: [{ type: "rejected", reason: `You don't have '${action.item}' in your inventory.` }],
          ok: false,
          rejectionReason: `You don't have that.`,
        };
      }

      const itemObj = findObjectInPack(action.item);
      if (itemObj?.quest_critical) {
        return {
          state,
          events: [{ type: "rejected", reason: `You cannot sell quest critical items.` }],
          ok: false,
          rejectionReason: `You can't sell that.`,
        };
      }

      if (!newState.merchantInventories) {
        newState.merchantInventories = {};
      }
      if (!newState.merchantInventories[npc.id]) {
        newState.merchantInventories[npc.id] = [];
      }
      if (!newState.tradeHistory) {
        newState.tradeHistory = [];
      }

      // Check reputation requirement
      const repCheck = checkReputationTrade(newState, npc);
      if (!repCheck.allowed) {
        return {
          state,
          events: [{ type: "rejected", reason: repCheck.reason ?? "Trade not allowed." }],
          ok: false,
          rejectionReason: repCheck.reason ?? "Trade not allowed.",
        };
      }

      const baseCost = itemObj?.cost ?? 10;
      const itemPayout = calculateTradePrice(newState, npc, itemObj, baseCost, false);

      // Check Merchant Gold Limit
      const mGold = getMerchantGold(newState, npc);
      if (mGold < itemPayout) {
        return {
          state,
          events: [{ type: "rejected", reason: `The merchant does not have enough gold (has ${mGold} gold, requires ${itemPayout}).` }],
          ok: false,
          rejectionReason: `The merchant does not have enough gold.`,
        };
      }

      newState.inventory = newState.inventory.filter((i) => i !== action.item);
      newState.vars["gold"] = (newState.vars["gold"] ?? 0) + itemPayout;
      
      // Update Merchant Gold
      newState.merchantGold = newState.merchantGold || {};
      newState.merchantGold[npc.id] = Math.max(0, mGold - itemPayout);

      newState.merchantInventories[npc.id] = [...newState.merchantInventories[npc.id], action.item];

      const currentObj = newState.objectState[action.item] ?? {};
      newState.objectState[action.item] = {
        ...currentObj,
        takenBy: "world",
      };

      newState.tradeHistory.push({
        step: newState.step,
        npcId: npc.id,
        action: "sell",
        item: action.item,
        gold: itemPayout,
      });

      events.push({
        type: "drop",
        item: action.item,
      });
      events.push({
        type: "narration",
        text: `You sell the ${itemObj?.name ?? action.item} to ${npc.name} for ${itemPayout} gold.`,
      });
      break;
    }

    case "READ": {
      if (!isObjectVisible(action.target)) {
        return {
          state,
          events: [{ type: "rejected", reason: `You don't see any '${action.target}' here.` }],
          ok: false,
          rejectionReason: `You don't see that here.`,
        };
      }

      const obj = findObjectInPack(action.target);
      if (!obj) {
        return {
          state,
          events: [{ type: "rejected", reason: `You cannot read '${action.target}'.` }],
          ok: false,
          rejectionReason: `You can't read that.`,
        };
      }

      const inter = (obj.interactions || []).find((i) => i.verb === "READ");
      if (inter) {
        const passed = evaluateConditions(newState, inter.conditions);
        if (!passed) {
          return {
            state,
            events: [{ type: "rejected", reason: `You cannot read the '${obj.name}' right now.` }],
            ok: false,
            rejectionReason: `Nothing happens.`,
          };
        }
        const effectResult = applyEffects(newState, inter.effects, pack);
        newState = effectResult.state;
        events.push(...effectResult.events);
      } else {
        events.push({
          type: "narration",
          text: obj.description,
        });
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
  newState = tickEconomy(newState, pack);
  newState = tickEnvironment(newState, events, pack);
  return {
    state: newState,
    events,
    ok: true,
  };
}

/**
 * Deterministically computes the weather and temperature for a given step and seed.
 * 
 * ### Architectural Rationale:
 * 1. **Mathematical Purity & Determinism**:
 *    This function uses `Math.imul` (signed 32-bit integer multiplication) to generate a
 *    stateless, pure-hash pseudo-random value. This ensures 100% deterministic output
 *    for any given seed + step sequence without modifying or consuming the dynamic PRNG
 *    state (`state.seed`). This is critical for perfect state replayability and pathfinding validation.
 * 
 * 2. **Context-Aware Constraints (Weather Pools)**:
 *    The `weatherPool` parameter allows constraining the possible weather types on a
 *    per-room/per-scene basis. If a room defines `weather_pool`, the random selection is
 *    mapped exclusively to elements in that array, ensuring narrative and mechanical consistency
 *    (e.g., indoor rooms having only "clear"/dry weather, or deep dungeons with specialized conditions).
 */
function getWeatherForStep(
  seed: number,
  step: number,
  weatherPool?: string[]
): { weather: string; temperature: string } {
  const defaultWeathers = ["clear", "rain", "fog", "storm"];
  const weathers = (weatherPool && weatherPool.length > 0) ? weatherPool : defaultWeathers;
  const temperatures = ["cold", "mild", "hot"];

  // Compute a deterministic hash of seed + floor(step / 5)
  const interval = Math.floor(step / 5);
  // A simple deterministic PRNG hash that won't consume state.seed
  const h1 = Math.abs(Math.imul(seed ^ interval, 0x6D2B79F5)) | 0;
  const weatherIndex = h1 % weathers.length;

  const h2 = Math.abs(Math.imul(h1 ^ 0x6D2B79F5, 0x6D2B79F5)) | 0;
  const tempIndex = h2 % temperatures.length;

  return {
    weather: weathers[weatherIndex],
    temperature: temperatures[tempIndex],
  };
}

/**
 * Ticks the environment state, handling weather shifts and room-restricted weather pools.
 * 
 * ### Architectural Rationale:
 * 1. **5-Step Interval Ticking**:
 *    To maintain realism and avoid narration clutter, weather shifts occur on a 5-step interval
 *    using the formula `floor(step / 5)`.
 * 
 * 2. **Seamless Per-Room Constraints**:
 *    When the player transitions to a new room/scene with a specialized `weather_pool`,
 *    the current weather may become invalid. This function immediately detects invalid weather states
 *    relative to the new room's `weather_pool` and forces a deterministic transition, emitting
 *    appropriate narrative events to notify the player of the local atmosphere change.
 */
function tickEnvironment(
  state: GameState,
  events: GameEvent[],
  pack?: CYOAPack | ParserPack
): GameState {
  if (!state.environment) {
    state.environment = {
      weather: "clear",
      temperature: "mild",
      lastUpdatedStep: 0,
    };
  }

  // Look up weather pool of the current room or scene
  let weatherPool: string[] | undefined = undefined;
  if (pack) {
    if ("scenes" in pack) {
      const scene = (pack as CYOAPack).scenes.find((s) => s.id === state.current);
      if (scene) {
        weatherPool = scene.weather_pool;
      }
    } else {
      const room = findRoom(state, pack as ParserPack, state.current);
      if (room) {
        weatherPool = room.weather_pool;
      }
    }
  }

  const interval = Math.floor(state.step / 5);
  const lastInterval = Math.floor(state.environment.lastUpdatedStep / 5);

  const isWeatherAllowed = !weatherPool || weatherPool.length === 0 || weatherPool.includes(state.environment.weather);
  const intervalChanged = state.step > 0 && interval !== lastInterval;

  // We tick if the 5-step interval has changed OR if the current weather is not allowed in this room
  if (intervalChanged || !isWeatherAllowed) {
    const { weather: nextWeather, temperature: nextTemp } = getWeatherForStep(state.seed, state.step, weatherPool);

    const oldWeather = state.environment.weather;
    const oldTemp = state.environment.temperature;

    const updatedState = {
      ...state,
      flags: { ...state.flags },
      vars: { ...state.vars },
      inventory: [...state.inventory],
      objectState: { ...state.objectState },
      journal: [...state.journal],
      environment: {
        weather: nextWeather,
        temperature: nextTemp,
        lastUpdatedStep: state.step,
      },
    };

    if (nextWeather !== oldWeather) {
      let msg = "";
      if (nextWeather === "clear") msg = "The sky clears up, letting warm light shine through.";
      else if (nextWeather === "rain") msg = "A steady rain begins to fall, slicking the ground.";
      else if (nextWeather === "fog") msg = "A thick, chilly fog rolls in, obscuring your vision.";
      else if (nextWeather === "storm") msg = "The wind picks up as a violent storm breaks overhead!";
      else {
        msg = `The weather changes, becoming ${nextWeather}.`;
      }

      events.push({
        type: "narration",
        text: `[Environment] ${msg}`,
      });
      updatedState.journal.push(`[Environment] ${msg}`);
    }

    if (nextTemp !== oldTemp && nextWeather === oldWeather) {
      const msg = `The temperature shifts, becoming ${nextTemp}.`;
      events.push({
        type: "narration",
        text: `[Environment] ${msg}`,
      });
      updatedState.journal.push(`[Environment] ${msg}`);
    }

    return updatedState;
  }

  return state;
}
