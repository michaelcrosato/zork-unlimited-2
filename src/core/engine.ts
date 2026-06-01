import { GameState, findRoom, getRoomExits, cloneMerchantInventories } from "./state.js";
import { Action, StepResult } from "../api/types.js";
import { GameEvent } from "./events.js";
import { evaluateConditions } from "./conditions.js";
import { applyEffects } from "./effects.js";
import { computeStateHashShort } from "./hash.js";
import { CYOAPack } from "../cyoa/schema.js";
import { ParserPack, ParserRoom, ParserObject, ParserNPC } from "../parser/schema.js";
import { PureRand } from "./rng.js";
import { calculateTradePrice, checkReputationTrade, getMerchantGold, tickEconomy, getFactionForNpc, getMerchantTradeCaps, getContrabandInInventory } from "./economy.js";

/**
 * Pure engine step transition function.
 * Supports both CYOA and Parser game types dynamically based on content pack shape.
 */
export function step(
  state: GameState,
  action: Action,
  pack: CYOAPack | ParserPack,
  agentId: string = "player"
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
    merchantInventories: cloneMerchantInventories(state.merchantInventories),
    tradeHistory: state.tradeHistory ? [...state.tradeHistory] : undefined,
    merchantGold: state.merchantGold ? { ...state.merchantGold } : undefined,
    merchantLastRestock: state.merchantLastRestock ? { ...state.merchantLastRestock } : undefined,
    merchantLastUpdated: state.merchantLastUpdated ? { ...state.merchantLastUpdated } : undefined,
    npcRep: state.npcRep ? { ...state.npcRep } : undefined,
    factionRep: state.factionRep ? { ...state.factionRep } : undefined,
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
      let enemy = parserPack.npcs.find((n) => n.id === activeCombatNpcId);
      if (!enemy && newState.enforcers?.[activeCombatNpcId]) {
        enemy = newState.enforcers[activeCombatNpcId] as any;
      }
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

          if (newState.enforcers?.[enemy.id]) {
            newState.enforcers[enemy.id] = {
              ...newState.enforcers[enemy.id],
              status: "defeated",
              timestamp: newState.step,
            };
            const targetId = newState.enforcers[enemy.id].targetId;
            if (targetId && newState.bounties?.[targetId]?.active) {
              const reward = newState.bounties[targetId].amount;
              newState.vars["gold"] = (newState.vars["gold"] ?? 0) + reward;
              newState.bounties[targetId] = {
                ...newState.bounties[targetId],
                active: false,
                timestamp: newState.step,
              };
              combatLog += `\n💰 Bounty claimed! You earn an additional ${reward} gold for resolving the bounty on ${targetId}.`;
            }
          }
        }

        if (playerHp <= 0) {
          let fallbackSafehouse: any = null;
          if (newState.safehouses) {
            for (const safehouse of Object.values(newState.safehouses)) {
              const syndicate = newState.syndicates?.[safehouse.syndicateId];
              if (syndicate && syndicate.members.includes("player")) {
                fallbackSafehouse = safehouse;
                break;
              }
            }
          }

          if (fallbackSafehouse) {
            newState.current = fallbackSafehouse.roomId;
            playerHp = newState.vars["max_hp"] ?? 20;
            playerMana = newState.vars["max_mana"] ?? 10;

            for (const flag of Object.keys(newState.flags)) {
              if (flag.startsWith("in_combat_with_")) {
                newState.flags[flag] = false;
              }
            }

            newState.ended = false;
            newState.endingId = null;
            combatLog += `\n🛡️ You were defeated, but you managed to escape and fallback to your syndicate safehouse in ${fallbackSafehouse.roomId}! Your health has been fully restored.`;
          } else {
            newState.ended = true;
            newState.endingId = "ending_died_in_combat";
            combatLog += `💀 You have fallen in battle. Game Over.`;
          }
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
        newState = tickEnforcers(newState, events, pack);
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

      // Territory-based exit traversal constraints & faction tax mechanics
      const destRoomId = exit.to;
      const factionId = state.territoryControl?.[destRoomId];

      // Check if player is carrying contraband
      const contrabandItems = getContrabandInInventory(state, pack);
      const carriesContraband = contrabandItems.length > 0;

      // Pre-calculate Tax
      let calculatedTax = 0;
      if (factionId) {
        const rep = state.factionRep?.[factionId] ?? 0;
        let tax = 0;
        if (rep < 0) {
          tax = 10;
        } else if (rep < 10) {
          tax = 2;
        }

        const rateMultiplier = state.taxPolicy?.[factionId];
        if (rateMultiplier !== undefined) {
          tax = tax * rateMultiplier;
        }

        // Apply alliance scaling if alliances exist
        let hasAlliedAlliance = false;
        let hasHostileAlliance = false;

        if (state.alliances && state.factionRep) {
          for (const [otherFactionId, otherRep] of Object.entries(state.factionRep)) {
            if (otherFactionId !== factionId && otherRep >= 10) {
              const relation = state.alliances[factionId]?.[otherFactionId];
              if (relation === "allied") {
                hasAlliedAlliance = true;
              } else if (relation === "hostile") {
                hasHostileAlliance = true;
              }
            }
          }
        }

        if (hasAlliedAlliance) {
          tax = 0; // Allied factions pay no travel tax
        } else if (hasHostileAlliance) {
          tax = tax * 2; // Hostile factions pay double tax
        }
        calculatedTax = tax;
      }

      // Pre-calculate Syndicate Extortion Toll (AF-45)
      let calculatedExtortionToll = 0;
      const controllingSyndicateId = state.syndicateTurf?.[destRoomId];
      let syndicateName = "";
      if (controllingSyndicateId) {
        const syndicate = state.syndicates?.[controllingSyndicateId];
        if (syndicate) {
          syndicateName = syndicate.name;
          const isMember = syndicate.members.includes(agentId);
          if (!isMember) {
            const dominance = syndicate.dominance ?? 50;
            calculatedExtortionToll = Math.floor(15 * (dominance / 50));
          }
        }
      }

      // Pre-calculate Trade Route locking and tolls
      let maxToll = 0;
      let lockingRouteId: string | null = null;
      let tollingRouteId: string | null = null;
      let hostileRouteFactionId: string | null = null;

      if (state.tradeRoutes) {
        for (const [routeId, route] of Object.entries(state.tradeRoutes)) {
          if (route.rooms.includes(destRoomId)) {
            const rFactionId = route.factionId;
            const rep = state.factionRep?.[rFactionId] ?? 0;

            // Check if faction is hostile
            let isHostile = rep < 0;
            if (!isHostile && state.alliances && state.factionRep) {
              for (const [otherFactionId, otherRep] of Object.entries(state.factionRep)) {
                if (otherFactionId !== rFactionId && otherRep >= 10) {
                  if (state.alliances[rFactionId]?.[otherFactionId] === "hostile") {
                    isHostile = true;
                    break;
                  }
                }
              }
            }

            // Allied factions pay no tolls
            let isAllied = rep >= 10;
            if (!isAllied && state.alliances && state.factionRep) {
              for (const [otherFactionId, otherRep] of Object.entries(state.factionRep)) {
                if (otherFactionId !== rFactionId && otherRep >= 10) {
                  if (state.alliances[rFactionId]?.[otherFactionId] === "allied") {
                    isAllied = true;
                    break;
                  }
                }
              }
            }

            if (isHostile && !isAllied) {
              hostileRouteFactionId = rFactionId;
              const toll = state.tradeRoutePolicies?.[routeId] ?? route.taxShare ?? 5;
              
              if (rep <= -10) {
                lockingRouteId = routeId;
              }
              if (toll > maxToll) {
                maxToll = toll;
                tollingRouteId = routeId;
              }
            }
          }
        }
      }

      // Avoid local tax tolls, border travel taxes, route tolls, locking, and extortion tolls when moving to own syndicate safehouse
      const destSafehouse = state.safehouses?.[destRoomId];
      const agentSyndicate = state.syndicates
        ? Object.values(state.syndicates).find(s => s.members.includes(agentId))
        : undefined;
      if (destSafehouse && agentSyndicate && destSafehouse.syndicateId === agentSyndicate.id) {
        calculatedTax = 0;
        calculatedExtortionToll = 0;
        maxToll = 0;
        lockingRouteId = null;
      }

      const isHostileBorder = (calculatedTax > 0) || (maxToll > 0) || (lockingRouteId !== null);
      let isSmugglingBypassed = false;

      if (carriesContraband && isHostileBorder) {
        // Trigger smuggling check!
        const { value: roll, nextSeed } = PureRand.next(newState.seed);
        newState.seed = nextSeed;

        let detectionChance = 0.4; // 40% base
        if (state.vars["smuggling"]) {
          detectionChance -= state.vars["smuggling"] * 0.05;
        }
        if (state.vars["smuggling_skill"]) {
          detectionChance -= state.vars["smuggling_skill"] * 0.05;
        }
        if (state.flags["smuggler_cloak"] || state.flags["smuggling_cloak"]) {
          detectionChance -= 0.15;
        }
        detectionChance = Math.max(0.05, Math.min(0.95, detectionChance));

        if (roll < detectionChance) {
          // Caught!
          const borderFactionId = factionId || hostileRouteFactionId;
          
          const hasInsurance = newState.smugglingInsurance?.["player"]?.active === true;
          const factionBribe = borderFactionId ? newState.bribes?.[borderFactionId] : undefined;
          const hasBribe = factionBribe && factionBribe.amount > 0;

          if (hasInsurance) {
            // Avoid confiscation and fines!
            if (newState.smugglingInsurance?.["player"]) {
              newState.smugglingInsurance["player"] = {
                ...newState.smugglingInsurance["player"],
                active: false,
                timestamp: newState.step,
              };
            }
            events.push({
              type: "narration",
              text: `👮 Caught smuggling at the border! However, your Cartel Smuggling Insurance covers the incident. The border patrol lets you pass and your contraband is safe.`,
            });
            isSmugglingBypassed = true;
          } else if (hasBribe) {
            // Avoid confiscation and fines!
            events.push({
              type: "narration",
              text: `👮 Caught smuggling! However, you paid a bribe of ${factionBribe.amount} gold to faction ${borderFactionId || "border patrol"}. The guards wink and let you pass with your contraband.`,
            });
            isSmugglingBypassed = true;
          } else {
            // Confiscate contraband
            newState.inventory = newState.inventory.filter(itemId => !contrabandItems.includes(itemId));
            
            // Faction reputation penalty
            if (borderFactionId) {
              newState.factionRep = newState.factionRep || {};
              const currentRep = newState.factionRep[borderFactionId] ?? 0;
              newState.factionRep[borderFactionId] = currentRep - 15;
            }

            // Gold fine based on confiscated value
            let contrabandValue = 0;
            if (pack && (pack as any).objects) {
              for (const itemId of contrabandItems) {
                const obj = (pack as any).objects.find((o: any) => o.id === itemId);
                contrabandValue += obj?.cost ?? 10;
              }
            }
            const fine = Math.round(contrabandValue * 1.5) || 50;
            const currentGold = newState.vars["gold"] ?? 0;
            newState.vars["gold"] = Math.max(0, currentGold - fine);

            return {
              state: newState,
              events: [{
                type: "rejected",
                reason: `You were caught by the border patrol smuggling contraband (${contrabandItems.join(", ")})! The contraband was confiscated, you were fined ${fine} gold, and your reputation with faction ${borderFactionId || "border patrol"} was reduced. You were turned back.`
              } as any],
              ok: false,
              rejectionReason: `Caught smuggling contraband at the border.`,
            };
          }
        } else {
          // Success!
          isSmugglingBypassed = true;
          events.push({
            type: "narration",
            text: `You successfully smuggled contraband across the border into ${destRoomId} without paying faction taxes or tolls.`
          });
        }
      }

      if (!isSmugglingBypassed) {
        if (calculatedTax > 0 && factionId) {
          const playerGold = state.vars["gold"] ?? 0;
          if (playerGold < calculatedTax) {
            return {
              state,
              events: [{ type: "rejected", reason: `You cannot enter ${exit.to} without paying a faction tax of ${calculatedTax} gold (you have ${playerGold}).` }],
              ok: false,
              rejectionReason: `You cannot afford the faction tax of ${calculatedTax} gold to enter this territory.`,
            };
          }
          // Deduct gold
          newState.vars["gold"] = playerGold - calculatedTax;
          events.push({
            type: "narration",
            text: `Paid ${calculatedTax} gold in faction tax to enter ${factionId} territory.`,
          });
        }

        if (lockingRouteId) {
          return {
            state,
            events: [{ type: "rejected", reason: `Hostile trade route ${lockingRouteId} is locked to you due to extreme hostility.` }],
            ok: false,
            rejectionReason: `Hostile trade route ${lockingRouteId} is locked to you due to extreme hostility.`,
          };
        }

        if (maxToll > 0) {
          const currentGold = newState.vars["gold"] ?? state.vars["gold"] ?? 0;
          if (currentGold < maxToll) {
            return {
              state,
              events: [{ type: "rejected", reason: `You cannot cross trade route ${tollingRouteId} without paying a toll of ${maxToll} gold (you have ${currentGold}).` }],
              ok: false,
              rejectionReason: `You cannot afford the trade route toll of ${maxToll} gold to cross this trade route.`,
            };
          }
          newState.vars["gold"] = currentGold - maxToll;
          events.push({
            type: "narration",
            text: `Paid ${maxToll} gold toll to cross hostile trade route ${tollingRouteId} (${hostileRouteFactionId} faction).`,
          });
        }

        if (calculatedExtortionToll > 0 && controllingSyndicateId) {
          const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
          const currentGold = newState.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
          if (currentGold < calculatedExtortionToll) {
            return {
              state,
              events: [{ type: "rejected", reason: `You cannot enter ${exit.to} without paying a syndicate extortion toll of ${calculatedExtortionToll} gold (you have ${currentGold}).` }],
              ok: false,
              rejectionReason: `You cannot afford the syndicate extortion toll of ${calculatedExtortionToll} gold to enter this turf.`,
            };
          }
          // Deduct from agent
          newState.vars[goldKey] = currentGold - calculatedExtortionToll;

          // Distribute among syndicate members
          const syndicate = state.syndicates?.[controllingSyndicateId];
          const members = syndicate?.members ?? [];
          const memberShare = members.length > 0 ? Math.floor(calculatedExtortionToll / members.length) : 0;
          if (memberShare > 0) {
            for (const member of members) {
              const memberGoldKey = member === "player" ? "gold" : `gold_${member}`;
              newState.vars[memberGoldKey] = (newState.vars[memberGoldKey] ?? 0) + memberShare;
            }
          }

          newState.vars["totalExtortionGoldCollected"] = (newState.vars["totalExtortionGoldCollected"] ?? 0) + calculatedExtortionToll;

          newState.journal.push(`[Syndicate] Extorted ${calculatedExtortionToll} gold from ${agentId} entering turf ${destRoomId}. Distributed ${memberShare} gold to each member.`);
          events.push({
            type: "narration",
            text: `Paid ${calculatedExtortionToll} gold in syndicate extortion toll to enter ${destRoomId} (controlled by ${syndicateName}).`,
          });
        }
      }

      // Contraband Checkpoint & Automatic Bribe Extortion Check (AF-54, AF-55)
      if (controllingSyndicateId && carriesContraband) {
        const isHostileTurf = !newState.syndicates?.[controllingSyndicateId]?.members.includes(agentId);
        const checkpoint = newState.turfCheckpoints?.[destRoomId];
        if (isHostileTurf && checkpoint && checkpoint.active) {
          const syndicate = newState.syndicates?.[controllingSyndicateId];
          const syndicateRep = newState.factionRep?.[controllingSyndicateId] ?? 0;
          const waiverThreshold = syndicate?.turfWaiverThreshold !== undefined ? syndicate.turfWaiverThreshold : 50;

          if (syndicateRep >= waiverThreshold) {
            newState.journal.push(`[Syndicate] Agent ${agentId} passed ${controllingSyndicateId} checkpoint at ${destRoomId} carrying contraband. Bribe waived due to high reputation (${syndicateRep} >= ${waiverThreshold}).`);
            events.push({
              type: "narration",
              text: `Your high reputation with ${syndicateName} waives the contraband checkpoint bribe toll. You pass freely.`,
            });
          } else {
            const isHatedEnemy = syndicateRep <= -50;
            const bribeCost = syndicate?.turfBribeCost ?? 0;
            let finalBribeCost = bribeCost;
            if (!isHatedEnemy && syndicateRep < 0) {
              finalBribeCost = bribeCost * 2;
            }

            const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
            const currentGold = newState.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

            if (!isHatedEnemy && finalBribeCost > 0 && currentGold >= finalBribeCost) {
              // Pay bribe toll and pass
              newState.vars[goldKey] = currentGold - finalBribeCost;

              // Distribute among syndicate members
              const members = syndicate?.members ?? [];
              const memberShare = members.length > 0 ? Math.floor(finalBribeCost / members.length) : 0;
              if (memberShare > 0) {
                for (const member of members) {
                  const memberGoldKey = member === "player" ? "gold" : `gold_${member}`;
                  newState.vars[memberGoldKey] = (newState.vars[memberGoldKey] ?? 0) + memberShare;
                }
              }

              const bribeMsg = finalBribeCost !== bribeCost ? `double bribe toll of ${finalBribeCost} gold` : `bribe toll of ${bribeCost} gold`;
              newState.journal.push(`[Syndicate] Agent ${agentId} paid ${bribeMsg} to ${controllingSyndicateId} checkpoint at ${destRoomId}. Distributed ${memberShare} gold to each member.`);
              events.push({
                type: "narration",
                text: `Paid ${finalBribeCost} gold in syndicate bribe toll to pass contraband checkpoint in ${destRoomId} (controlled by ${syndicateName}).`,
              });
            } else {
              // Trigger enforcer skirmish / ambush!
              const enforcerId = `turf_enforcer_${controllingSyndicateId}`;
              const repPenalty = Math.abs(Math.min(0, syndicateRep));
              const scaledHp = 30 + repPenalty;
              const scaledDefense = 12 + Math.floor(repPenalty / 5);

              newState.enforcers = {
                ...(newState.enforcers || {}),
                [enforcerId]: {
                  id: enforcerId,
                  name: `${syndicate?.name || "Syndicate"} Enforcer`,
                  factionId: controllingSyndicateId,
                  currentRoom: destRoomId,
                  status: "idle",
                  isBountyHunter: false,
                  timestamp: newState.step,
                  hp: scaledHp,
                  max_hp: scaledHp,
                  attack: 4,
                  defense: scaledDefense,
                  gold: 50,
                  xp: 40,
                }
              };
              newState.flags[`in_combat_with_${enforcerId}`] = true;
              newState.vars[`npc_hp_${enforcerId}`] = scaledHp;

              if (isHatedEnemy) {
                newState.journal.push(`[Syndicate] Hated enemy Agent ${agentId} intercepted at ${controllingSyndicateId} checkpoint in ${destRoomId} carrying contraband. Pre-emptive ambush triggered!`);
                events.push({
                  type: "narration",
                  text: `💥 Pre-emptive Ambush! As a hated enemy, the ${syndicate?.name || "Syndicate"} Enforcer immediately attacks you at the checkpoint!`,
                });
              } else {
                newState.journal.push(`[Syndicate] Agent ${agentId} intercepted at ${controllingSyndicateId} checkpoint in ${destRoomId} carrying contraband. Skirmish triggered!`);
                events.push({
                  type: "narration",
                  text: `💥 Intercepted at Crime Syndicate checkpoint! ${syndicate?.name || "Syndicate"} Enforcer detects your contraband and attacks!`,
                });
              }
            }
          }
        }
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

      // Check faction trade limits and caps (AF-36)
      const npcFactionId = getFactionForNpc(newState, npc.id, parserPack);
      if (npcFactionId) {
        const prevTrades = newState.tradeHistory?.filter(t => 
          getFactionForNpc(newState, t.npcId, parserPack) === npcFactionId &&
          (t.action === "buy" || t.action === "sell")
        ) ?? [];
        const totalGoldVolume = prevTrades.reduce((sum, t) => sum + t.gold, 0);
        const caps = getMerchantTradeCaps(newState, npcFactionId);

        console.log("ENGINE DIAGNOSTIC BUY CAPS:", {
          npcId: npc.id,
          npcFactionId,
          prevTradesLength: prevTrades.length,
          prevTrades: JSON.stringify(prevTrades),
          caps,
          factionRep: JSON.stringify(newState.factionRep)
        });

        if (prevTrades.length >= caps.maxTransactions) {
          return {
            state,
            events: [{ type: "rejected", reason: `Trade limit reached for faction ${npcFactionId}. Maximum transactions: ${caps.maxTransactions}.` }],
            ok: false,
            rejectionReason: `Trade limit reached.`,
          };
        }

        if (totalGoldVolume + itemCost > caps.maxGoldVolume) {
          return {
            state,
            events: [{ type: "rejected", reason: `Trade volume limit reached for faction ${npcFactionId}. Maximum gold volume: ${caps.maxGoldVolume} (current: ${totalGoldVolume}, attempted: ${itemCost}).` }],
            ok: false,
            rejectionReason: `Trade volume limit reached.`,
          };
        }
      }

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
      
      newState.merchantLastUpdated = newState.merchantLastUpdated || {};
      newState.merchantLastUpdated[npc.id] = newState.step;

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

    case "SELL_BLACK_MARKET": {
      const act = action as any;
      const roomId = act.roomId ?? state.current;
      const itemId = act.itemId;

      if (!roomId) {
        return {
          state,
          events: [{ type: "rejected", reason: "Room ID is required to sell to the black market." }],
          ok: false,
          rejectionReason: "Room ID is required.",
        };
      }

      if (!itemId) {
        return {
          state,
          events: [{ type: "rejected", reason: "Item ID is required to sell to the black market." }],
          ok: false,
          rejectionReason: "Item ID is required.",
        };
      }

      const safehouse = state.safehouses?.[roomId];
      if (!safehouse) {
        return {
          state,
          events: [{ type: "rejected", reason: `No safehouse exists in room ${roomId}.` }],
          ok: false,
          rejectionReason: `No safehouse exists here.`,
        };
      }

      const syndicate = state.syndicates?.[safehouse.syndicateId];
      if (!syndicate || !syndicate.members.includes(agentId)) {
        return {
          state,
          events: [{ type: "rejected", reason: `Agent ${agentId} is not a member of the syndicate owning the safehouse in ${roomId}.` }],
          ok: false,
          rejectionReason: `Unauthorized to trade at this safehouse.`,
        };
      }

      // Check if agent has item in inventory
      if (!state.inventory.includes(itemId)) {
        return {
          state,
          events: [{ type: "rejected", reason: `You don't have '${itemId}' in your inventory.` }],
          ok: false,
          rejectionReason: `You don't have that.`,
        };
      }

      const itemObj = findObjectInPack(itemId);
      if (itemObj?.quest_critical) {
        return {
          state,
          events: [{ type: "rejected", reason: `You cannot sell quest critical items.` }],
          ok: false,
          rejectionReason: `You can't sell that.`,
        };
      }

      // Ensure the item is contraband
      const isPackContraband = itemObj?.contraband === true;
      const isBlacklisted = state.contrabandBlacklist?.[itemId]?.blacklisted === true;
      if (!isPackContraband && !isBlacklisted) {
        return {
          state,
          events: [{ type: "rejected", reason: `Only contraband items can be sold to the black market.` }],
          ok: false,
          rejectionReason: `Only contraband items can be sold here.`,
        };
      }

      const baseCost = itemObj?.cost ?? 10;
      // Mock NPC using agentId to ensure isAlliedSyndicateMember is true in calculateTradePrice
      const mockNpc = { id: agentId };
      const itemPayout = calculateTradePrice(newState, mockNpc, itemObj, baseCost, false, agentId, parserPack);

      // Deduct item from inventory and credit gold
      newState.inventory = newState.inventory.filter((i) => i !== itemId);
      
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      newState.vars[goldKey] = (newState.vars[goldKey] ?? 0) + itemPayout;

      // Update black market inventory
      const blackMarkets = { ...(state.blackMarkets || {}) };
      if (!blackMarkets[roomId]) {
        blackMarkets[roomId] = {
          id: `black_market_${roomId}`,
          roomId,
          syndicateId: safehouse.syndicateId,
          inventory: [],
          timestamp: act.timestamp ?? Date.now(),
        };
      }
      blackMarkets[roomId] = {
        ...blackMarkets[roomId],
        inventory: [...blackMarkets[roomId].inventory, itemId],
        timestamp: act.timestamp ?? Date.now(),
      };
      newState.blackMarkets = blackMarkets;

      // Update object state
      const currentObj = newState.objectState[itemId] ?? {};
      newState.objectState[itemId] = {
        ...currentObj,
        takenBy: "world",
      };

      if (!newState.journal) newState.journal = [];
      newState.journal.push(`[Syndicate] Agent ${agentId} sold contraband ${itemId} to the black market in safehouse ${roomId} for ${itemPayout} gold.`);

      events.push({
        type: "narration",
        text: `You sell the contraband ${itemObj?.name ?? itemId} to the syndicate black market in the safehouse for ${itemPayout} gold (avoiding all tolls and tariffs).`,
      });

      events.push({
        type: "black_market_sold",
        agentId,
        roomId,
        itemId,
        price: itemPayout,
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

      // Check faction trade limits and caps (AF-36)
      const npcFactionId = getFactionForNpc(newState, npc.id, parserPack);
      if (npcFactionId) {
        const prevTrades = newState.tradeHistory?.filter(t => 
          getFactionForNpc(newState, t.npcId, parserPack) === npcFactionId &&
          (t.action === "buy" || t.action === "sell")
        ) ?? [];
        const totalGoldVolume = prevTrades.reduce((sum, t) => sum + t.gold, 0);
        const caps = getMerchantTradeCaps(newState, npcFactionId);

        if (prevTrades.length >= caps.maxTransactions) {
          return {
            state,
            events: [{ type: "rejected", reason: `Trade limit reached for faction ${npcFactionId}. Maximum transactions: ${caps.maxTransactions}.` }],
            ok: false,
            rejectionReason: `Trade limit reached.`,
          };
        }

        if (totalGoldVolume + itemPayout > caps.maxGoldVolume) {
          return {
            state,
            events: [{ type: "rejected", reason: `Trade volume limit reached for faction ${npcFactionId}. Maximum gold volume: ${caps.maxGoldVolume} (current: ${totalGoldVolume}, attempted: ${itemPayout}).` }],
            ok: false,
            rejectionReason: `Trade volume limit reached.`,
          };
        }
      }

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
      
      newState.merchantLastUpdated = newState.merchantLastUpdated || {};
      newState.merchantLastUpdated[npc.id] = newState.step;

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
  newState = tickEnforcers(newState, events, pack);
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
 * Ticks the production status of all contraband production labs.
 * Triggers enforcement raids using pure mulberry32 PRNG.
 */
export function tickProductionLabs(
  state: GameState,
  events: GameEvent[],
  pack?: CYOAPack | ParserPack
): GameState {
  let newState = { ...state };

  // Decay syndicate bribes by 10 per step, deactivating when <= 0
  const updatedBribes = { ...(newState.syndicateBribes || {}) };
  let bribesChanged = false;
  for (const [roomId, bribe] of Object.entries(updatedBribes)) {
    if (bribe.active) {
      const newAmount = Math.max(0, bribe.amount - 10);
      updatedBribes[roomId] = {
        ...bribe,
        amount: newAmount,
        active: newAmount > 0,
      };
      bribesChanged = true;
    }
  }
  if (bribesChanged) {
    newState.syndicateBribes = updatedBribes;
  }

  // Decay enforcement heat globally by 1 per step (or 3 if there is an active bribe in the room)
  const updatedHeat = { ...(newState.enforcementHeat || {}) };
  let heatChanged = false;
  for (const [roomId, entry] of Object.entries(updatedHeat)) {
    if (entry.heat > 0) {
      const activeBribe = newState.syndicateBribes?.[roomId]?.active;
      const decayAmount = activeBribe ? 3 : 1;
      updatedHeat[roomId] = {
        ...entry,
        heat: Math.max(0, entry.heat - decayAmount),
      };
      heatChanged = true;
    }
  }

  if (!state.productionLabs || Object.keys(state.productionLabs).length === 0) {
    if (heatChanged) {
      newState.enforcementHeat = updatedHeat;
    }
    return newState;
  }

  const updatedLabs = { ...newState.productionLabs };
  let stateChanged = false;
  let currentSeed = newState.seed;

  for (const [roomId, lab] of Object.entries(updatedLabs)) {
    const updatedLab = { ...lab };
    let labChanged = false;

    // Check if the cooldown interval has passed since the last production step
    if (newState.step - updatedLab.lastProducedStep >= updatedLab.cooldownSteps) {
      // Periodic production
      const productionAmount = updatedLab.level;
      const newStored = Math.min(updatedLab.capacity, updatedLab.storedContraband + productionAmount);

      if (newStored !== updatedLab.storedContraband) {
        updatedLab.storedContraband = newStored;
        updatedLab.lastProducedStep = newState.step;
        labChanged = true;
        stateChanged = true;

        events.push({
          type: "narration",
          text: `[Syndicate] Contraband production lab in ${roomId} produced ${productionAmount} units. Stored: ${newStored}/${updatedLab.capacity}.`,
        } as any);
        if (!newState.journal) newState.journal = [];
        newState.journal.push(`[Syndicate] Lab in ${roomId} produced ${productionAmount} units.`);

        // Increase enforcement heat in the room due to production activity
        // (If there's an active bribe, the heat increase is halved)
        const oldHeat = updatedHeat[roomId]?.heat ?? 0;
        const activeBribe = newState.syndicateBribes?.[roomId]?.active;
        const heatInc = activeBribe ? Math.floor(productionAmount) : (productionAmount * 2);
        updatedHeat[roomId] = {
          roomId,
          heat: oldHeat + heatInc,
          timestamp: newState.step,
        };
        heatChanged = true;
      }

      // Check for an enforcement raid using deterministic Mulberry32
      const { value: raidRoll, nextSeed } = PureRand.nextInt(currentSeed, 1, 100);
      currentSeed = nextSeed;

      if (raidRoll <= 20) {
        // Check if there is an active deflection policy in the room
        const activeDeflection = newState.deflectionPolicies?.[roomId]?.active;
        if (activeDeflection) {
          // Raid deflected! Consume the policy.
          const updatedDeflection = { ...(newState.deflectionPolicies || {}) };
          updatedDeflection[roomId] = {
            ...updatedDeflection[roomId],
            active: false,
            timestamp: newState.step,
          };
          newState.deflectionPolicies = updatedDeflection;

          events.push({
            type: "narration",
            text: `[Syndicate] An enforcer raid on the lab in ${roomId} was successfully deflected by the active deflection policy!`,
          } as any);
          if (!newState.journal) newState.journal = [];
          newState.journal.push(`[Syndicate] Lab raid deflected in ${roomId} by active deflection policy.`);
        } else {
          // Raid occurs!
          events.push({
            type: "narration",
            text: `[Syndicate] Enforcement agents have tracked down and raided the contraband lab in ${roomId}!`,
          } as any);

          const { value: raidStrength, nextSeed: nextSeed2 } = PureRand.nextInt(currentSeed, 1, 50);
          currentSeed = nextSeed2;

          const outpost = newState.turfGuardOutposts?.[roomId];
          const guards = newState.turfGuards?.[roomId]?.count ?? 0;
          const defenseScore = (updatedLab.defense ?? 0) + updatedLab.level * 10 + (guards * 15) + (outpost ? outpost.securityLevel * 25 : 0);

          // Increase enforcement heat in the room due to active raid
          const oldHeat = updatedHeat[roomId]?.heat ?? 0;
          updatedHeat[roomId] = {
            roomId,
            heat: oldHeat + 10,
            timestamp: newState.step,
          };
          heatChanged = true;

          if (defenseScore >= raidStrength) {
            // Raid successfully defended!
            events.push({
              type: "narration",
              text: outpost
                ? `[Syndicate] Syndicate defenders, ${guards} hired turf guards, and Defense Outpost successfully repelled the enforcement raid at ${roomId} (Defense: ${defenseScore} vs Raid: ${raidStrength})!`
                : (guards > 0
                  ? `[Syndicate] Syndicate defenders and ${guards} hired turf guards successfully repelled the enforcement raid at ${roomId} (Defense: ${defenseScore} vs Raid: ${raidStrength})!`
                  : `[Syndicate] Syndicate defenders successfully repelled the enforcement raid at ${roomId} (Defense: ${defenseScore} vs Raid: ${raidStrength})!`),
            } as any);
          } else {
            // Raid succeeded! Confiscate all stored contraband and damage the facility (downgrade level)
            const confiscated = updatedLab.storedContraband;
            updatedLab.storedContraband = 0;
            const oldLevel = updatedLab.level;
            updatedLab.level = Math.max(1, updatedLab.level - 1);
            labChanged = true;
            stateChanged = true;

            events.push({
              type: "narration",
              text: `[Syndicate] The raid succeeded! Enforcement agents confiscated ${confiscated} units of contraband and damaged the facility (Level: ${oldLevel} -> ${updatedLab.level})!`,
            } as any);
          }
        }
      }
    }

    if (labChanged) {
      updatedLabs[roomId] = updatedLab;
    }
  }

  if (stateChanged) {
    newState.productionLabs = updatedLabs;
    newState.seed = currentSeed;
  }

  if (heatChanged) {
    newState.enforcementHeat = updatedHeat;
  }

  return newState;
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
  let newState = tickProductionLabs(state, events, pack);

  if (!newState.environment) {
    newState.environment = {
      weather: "clear",
      temperature: "mild",
      lastUpdatedStep: 0,
    };
  }

  // Look up weather pool of the current room or scene
  let weatherPool: string[] | undefined = undefined;
  if (pack) {
    if ("scenes" in pack) {
      const scene = (pack as CYOAPack).scenes.find((s) => s.id === newState.current);
      if (scene) {
        weatherPool = scene.weather_pool;
      }
    } else {
      const room = findRoom(newState, pack as ParserPack, newState.current);
      if (room) {
        weatherPool = room.weather_pool;
      }
    }
  }

  const interval = Math.floor(newState.step / 5);
  const lastInterval = Math.floor(newState.environment.lastUpdatedStep / 5);

  const isWeatherAllowed = !weatherPool || weatherPool.length === 0 || weatherPool.includes(newState.environment.weather);
  const intervalChanged = newState.step > 0 && interval !== lastInterval;

  // We tick if the 5-step interval has changed OR if the current weather is not allowed in this room
  if (intervalChanged || !isWeatherAllowed) {
    const { weather: nextWeather, temperature: nextTemp } = getWeatherForStep(newState.seed, newState.step, weatherPool);

    const oldWeather = newState.environment.weather;
    const oldTemp = newState.environment.temperature;

    const updatedState = {
      ...newState,
      flags: { ...newState.flags },
      vars: { ...newState.vars },
      inventory: [...newState.inventory],
      objectState: { ...newState.objectState },
      journal: [...newState.journal],
      environment: {
        weather: nextWeather,
        temperature: nextTemp,
        lastUpdatedStep: newState.step,
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

  return newState;
}

function tickEnforcers(
  state: GameState,
  events: GameEvent[],
  pack?: CYOAPack | ParserPack
): GameState {
  if (!pack || !("rooms" in pack) || !state.enforcers || Object.keys(state.enforcers).length === 0) {
    return state;
  }

  const parserPack = pack as ParserPack;
  let newState = { ...state };
  if (newState.enforcers) {
    newState.enforcers = { ...newState.enforcers };
  }
  if (newState.vars) {
    newState.vars = { ...newState.vars };
  }
  if (newState.flags) {
    newState.flags = { ...newState.flags };
  }

  // Helper BFS room-to-room pathfinder
  const findNextRoom = (fromRoom: string, toRoom: string): string | null => {
    if (fromRoom === toRoom) return null;
    const queue: string[][] = [[fromRoom]];
    const visited = new Set<string>([fromRoom]);

    const getExits = (roomId: string) => {
      const r = parserPack.rooms.find(x => x.id === roomId);
      const exits: string[] = [];
      if (r?.exits) {
        for (const e of r.exits) {
          exits.push(e.to);
        }
      }
      if (newState.proceduralRooms) {
        const pr = newState.proceduralRooms.find((x: any) => x.id === roomId);
        if (pr?.exits) {
          for (const e of pr.exits) {
            exits.push(e.to);
          }
        }
      }
      return exits;
    };

    while (queue.length > 0) {
      const path = queue.shift()!;
      const current = path[path.length - 1];
      if (current === toRoom) {
        return path[1] ?? null;
      }
      for (const neighbor of getExits(current)) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }
    return null;
  };

  for (const [id, enforcer] of Object.entries(newState.enforcers ?? {})) {
    if (enforcer.status === "defeated") continue;

    // 1. Smuggling Bounty Hunters (Pursuit Mechanism)
    if (enforcer.isBountyHunter) {
      if (enforcer.status === "pursuing" && enforcer.targetId) {
        let targetRoom: string | undefined = undefined;
        if (enforcer.targetId === "player") {
          targetRoom = newState.current;
        } else if (newState.agents?.[enforcer.targetId]) {
          targetRoom = newState.agents[enforcer.targetId].current;
        }

        if (targetRoom) {
          if (enforcer.currentRoom !== targetRoom) {
            const nextRoom = findNextRoom(enforcer.currentRoom, targetRoom);
            if (nextRoom) {
              enforcer.currentRoom = nextRoom;
              enforcer.timestamp = newState.step;
              events.push({
                type: "narration",
                text: `[Enforcement] Smuggling Bounty Hunter ${enforcer.name} is pursuing target ${enforcer.targetId} and has moved to ${nextRoom}.`
              } as any);
            }
          }

          if (enforcer.currentRoom === targetRoom) {
            if (enforcer.targetId === "player") {
              const activeCombat = Object.keys(newState.flags).some(
                (f) => f.startsWith("in_combat_with_") && newState.flags[f]
              );
              if (!activeCombat && !newState.ended) {
                const hasInsurance = newState.smugglingInsurance?.["player"]?.active === true;
                const enforcerBribe = newState.bribes?.[enforcer.id];
                const hasBribe = enforcerBribe && enforcerBribe.amount > 0;

                if (hasInsurance) {
                  if (newState.smugglingInsurance?.["player"]) {
                    newState.smugglingInsurance["player"] = {
                      ...newState.smugglingInsurance["player"],
                      active: false,
                      timestamp: newState.step,
                    };
                  }
                  events.push({
                    type: "narration",
                    text: `🛡️ Bounty Hunter ${enforcer.name} corners you in ${enforcer.currentRoom}, but your Cartel Smuggling Insurance covers your bounty! They stand down.`
                  } as any);
                } else if (hasBribe) {
                  events.push({
                    type: "narration",
                    text: `🛡️ Bounty Hunter ${enforcer.name} corners you in ${enforcer.currentRoom}, but accepts your bribe of ${enforcerBribe.amount} gold and stands down.`
                  } as any);
                } else {
                  events.push({
                    type: "narration",
                    text: `💥 Ambush! Smuggling Bounty Hunter ${enforcer.name} corners you in ${enforcer.currentRoom} for your active bounty!`
                  } as any);
                  newState.flags[`in_combat_with_${enforcer.id}`] = true;
                  newState.vars[`npc_hp_${enforcer.id}`] = enforcer.hp ?? 20;
                }
              }
            } else {
              const { value: fightRoll, nextSeed } = PureRand.nextInt(newState.seed, 1, 100);
              newState.seed = nextSeed;
              if (fightRoll > 50) {
                enforcer.status = "defeated";
                enforcer.timestamp = newState.step;
                events.push({
                  type: "narration",
                  text: `🛡️ Agent ${enforcer.targetId} was ambushed by Bounty Hunter ${enforcer.name} in ${enforcer.currentRoom} but successfully defeated them!`
                } as any);
                
                if (newState.bounties?.[enforcer.targetId]) {
                  newState.bounties[enforcer.targetId] = {
                    ...newState.bounties[enforcer.targetId],
                    active: false,
                    timestamp: newState.step,
                  };
                }
              } else {
                events.push({
                  type: "narration",
                  text: `💥 Agent ${enforcer.targetId} was ambushed by Bounty Hunter ${enforcer.name} in ${enforcer.currentRoom} and was defeated!`
                } as any);
                enforcer.status = "idle";
                enforcer.timestamp = newState.step;

                // Check if there is an active safehouse for this agent's syndicate
                let agentFallback: any = null;
                if (newState.safehouses) {
                  for (const safehouse of Object.values(newState.safehouses)) {
                    const syndicate = newState.syndicates?.[safehouse.syndicateId];
                    if (syndicate && syndicate.members.includes(enforcer.targetId)) {
                      agentFallback = safehouse;
                      break;
                    }
                  }
                }
                if (agentFallback) {
                  if (newState.agents?.[enforcer.targetId]) {
                    const agents = { ...newState.agents };
                    agents[enforcer.targetId] = {
                      ...agents[enforcer.targetId],
                      current: agentFallback.roomId,
                    };
                    newState.agents = agents;
                    events.push({
                      type: "narration",
                      text: `🛡️ Agent ${enforcer.targetId} fell back to their syndicate safehouse in ${agentFallback.roomId}.`
                    } as any);
                  }
                }
              }
            }
          }
        }
      }
    }
    // 2. Faction Enforcement Agents (Static checkpoint check)
    else {
      if (newState.current === enforcer.currentRoom) {
        const contraband = getContrabandInInventory(newState, parserPack);
        if (contraband.length > 0) {
          const activeCombat = Object.keys(newState.flags).some(
            (f) => f.startsWith("in_combat_with_") && newState.flags[f]
          );
          if (!activeCombat && !newState.ended) {
            const factionId = enforcer.factionId ?? "rangers";
            const rep = newState.factionRep?.[factionId] ?? 0;

            const hasInsurance = newState.smugglingInsurance?.["player"]?.active === true;
            const enforcerBribe = newState.bribes?.[enforcer.id];
            const factionBribe = enforcer.factionId ? newState.bribes?.[enforcer.factionId] : undefined;
            const hasBribe = (enforcerBribe && enforcerBribe.amount > 0) || (factionBribe && factionBribe.amount > 0);
            const bribeAmount = (enforcerBribe?.amount ?? 0) || (factionBribe?.amount ?? 0);

            if (hasInsurance) {
              if (newState.smugglingInsurance?.["player"]) {
                newState.smugglingInsurance["player"] = {
                  ...newState.smugglingInsurance["player"],
                  active: false,
                  timestamp: newState.step,
                };
              }
              events.push({
                type: "narration",
                text: `👮 Enforcement Agent ${enforcer.name} stops you, but your Cartel Smuggling Insurance covers the contraband (${contraband.join(", ")}). They let you pass safely.`
              } as any);
            } else if (hasBribe) {
              events.push({
                type: "narration",
                text: `👮 Enforcement Agent ${enforcer.name} stops you, but recognizes your bribe of ${bribeAmount} gold and lets you pass with your contraband (${contraband.join(", ")}).`
              } as any);
            } else if (rep >= 10) {
              events.push({
                type: "narration",
                text: `👮 Enforcement Agent ${enforcer.name} stops you, but recognizes your allied standing with ${factionId} and lets you pass with a warning.`
              } as any);
            } else if (rep < 0) {
              events.push({
                type: "narration",
                text: `💥 Ambush! Enforcement Agent ${enforcer.name} detects contraband (${contraband.join(", ")}) in your inventory and attacks due to your hostile standing with ${factionId}!`
              } as any);
              newState.flags[`in_combat_with_${enforcer.id}`] = true;
              newState.vars[`npc_hp_${enforcer.id}`] = enforcer.hp ?? 20;
            } else {
              const inventoryFilter = newState.inventory.filter(itemId => !contraband.includes(itemId));
              let val = 0;
              for (const itemId of contraband) {
                const obj = parserPack.objects?.find((o: any) => o.id === itemId);
                val += obj?.cost ?? 10;
              }
              const fine = Math.round(val * 1.0) || 20;
              newState.inventory = inventoryFilter;
              newState.vars["gold"] = Math.max(0, (newState.vars["gold"] ?? 0) - fine);
              
              events.push({
                type: "narration",
                text: `👮 Enforcement Agent ${enforcer.name} stops you and confiscates your contraband (${contraband.join(", ")}). You are fined ${fine} gold.`
              } as any);
            }
          }
        }
      }
    }
  }

  return newState;
}
