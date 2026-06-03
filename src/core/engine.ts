import {
  GameState,
  findRoom,
  getRoomExits,
  cloneMerchantInventories,
  getEnforcerDefundingRate,
  getBondPricePerShare,
  SovereignBondLendingPool,
} from "./state.js";
import { Action, StepResult } from "../api/types.js";
import { GameEvent } from "./events.js";
import { evaluateConditions } from "./conditions.js";
import { applyEffects } from "./effects.js";
import { CYOAPack } from "../cyoa/schema.js";
import { ParserPack, ParserObject, ParserRoom } from "../parser/schema.js";
import { isCyoaPack } from "./pack.js";
import { PureRand } from "./rng.js";
import {
  calculateTradePrice,
  checkReputationTrade,
  getMerchantGold,
  tickEconomy,
  getFactionForNpc,
  getMerchantTradeCaps,
  getContrabandInInventory,
  getCounterfeitExchangeRate,
  isRivalFaction,
  getPlayerAlignedFactions,
} from "./economy.js";

export function isRoomIlluminated(state: GameState, room: ParserRoom, pack: ParserPack): boolean {
  if (!room.dark) return true;
  const playerInventory = state.inventory || [];
  for (const itemId of playerInventory) {
    const obj = pack.objects.find((o) => o.id === itemId);
    if (obj && obj.light_source) {
      const runtime = state.objectState?.[itemId];
      if (runtime && runtime.lit) {
        return true;
      }
    }
  }
  return false;
}

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

  // Cosmetic randomness that doesn't modify the state's seed used for game mechanics
  const cosmeticRand = (salt: number, max: number): number => {
    const { value } = PureRand.nextInt(newState.seed + (newState.step || 0) + salt, 0, max);
    return value;
  };

  // Check if pack is CYOA
  if (isCyoaPack(pack)) {
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

    if (choiceId.startsWith("craft_")) {
      const recipeId = choiceId.substring(6);
      const recipe = (cyoaPack as any).recipes?.find((r: any) => r.id === recipeId);
      if (!recipe) {
        return {
          state,
          events: [{ type: "rejected", reason: `Recipe '${recipeId}' not found.` }],
          ok: false,
          rejectionReason: `Recipe not found.`,
        };
      }

      // Check conditions
      if (recipe.conditions && recipe.conditions.length > 0) {
        if (!evaluateConditions(newState, recipe.conditions)) {
          const failMsg = recipe.failure_msg ?? `Conditions for this recipe are not met.`;
          return {
            state,
            events: [{ type: "rejected", reason: failMsg }],
            ok: false,
            rejectionReason: failMsg,
          };
        }
      }

      // Check ingredients & tools in inventory
      const tempInv = [...newState.inventory];
      const missingIngredients: string[] = [];
      recipe.ingredients.forEach((ing: string) => {
        const idx = tempInv.indexOf(ing);
        if (idx !== -1) {
          tempInv.splice(idx, 1);
        } else {
          missingIngredients.push(ing);
        }
      });

      const missingTools: string[] = [];
      const tools = recipe.tools || [];
      tools.forEach((tool: string) => {
        const idx = tempInv.indexOf(tool);
        if (idx !== -1) {
          // tool is present
        } else {
          missingTools.push(tool);
        }
      });

      const missing = [...missingIngredients, ...missingTools];
      if (missing.length > 0) {
        return {
          state,
          events: [{ type: "rejected", reason: `You are missing: ${missing.join(", ")}.` }],
          ok: false,
          rejectionReason: `Missing ingredients/tools.`,
        };
      }

      // Consume ingredients
      recipe.ingredients.forEach((ing: string) => {
        const idx = newState.inventory.indexOf(ing);
        if (idx !== -1) {
          newState.inventory.splice(idx, 1);
        }
      });

      // Add result
      newState.inventory.push(recipe.result);

      // Apply effects
      if (recipe.effects && recipe.effects.length > 0) {
        const effectResult = applyEffects(newState, recipe.effects, pack);
        newState = effectResult.state;
        events.push(...effectResult.events);
      }

      // Narration
      const successText = recipe.success_msg ?? `You combined the items to craft ${recipe.result}.`;
      events.push({
        type: "narration",
        text: successText,
      });

      newState.step += 1;
      newState = tickEnvironment(newState, events, pack);
      return { state: newState, events, ok: true };
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

  const findObjectInPack = (id: string): ParserObject | undefined => parserPack.objects.find((o) => o.id === id);

  // Helper to verify if an object is currently visible in the current room or inventory
  const isObjectVisible = (id: string): boolean => {
    if (id.startsWith("scenery:")) {
      const parts = id.split(":");
      const sRoomId = parts[1];
      const sKey = parts[2];
      if (sRoomId !== state.current) return false;
      if (!isRoomIlluminated(newState, currentRoom, parserPack)) return false;
      return !!(currentRoom.scenery && currentRoom.scenery[sKey]);
    }

    if (state.inventory.includes(id)) return true;

    if (!isRoomIlluminated(newState, currentRoom, parserPack)) {
      return false;
    }

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
  const activeDialogueNpcId = Object.keys(state.flags)
    .find((f) => f.startsWith("in_dialogue_with_") && state.flags[f])
    ?.substring(17);

  if (activeDialogueNpcId && action.type !== "ASK") {
    return {
      state,
      events: [{ type: "rejected", reason: `You are in a conversation. You must select a dialogue topic.` }],
      ok: false,
      rejectionReason: `You are in a conversation with the NPC.`,
    };
  }

  // Check if player is currently in combat
  const activeCombatNpcId = Object.keys(newState.flags)
    .find((f) => f.startsWith("in_combat_with_") && newState.flags[f])
    ?.substring(15);

  if (activeCombatNpcId) {
    const allowedInCombat = ["FIGHT", "CAST", "FLEE", "LOOK", "INSPECT", "INVENTORY", "USE"];
    if (!allowedInCombat.includes(action.type)) {
      return {
        state,
        events: [{ type: "rejected", reason: `You are in combat! You can only fight, cast, use items, or flee.` }],
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
        let enemyMaxHp = enemy.max_hp ?? enemy.hp ?? 10;
        let enemyAttack = enemy.attack ?? 2;

        // Lower enforcer agency HP/attack stats dynamically during combat!
        if (enemy && ("isBountyHunter" in enemy || newState.enforcers?.[enemy.id] !== undefined)) {
          const defundingRate = getEnforcerDefundingRate(newState, "player");
          if (defundingRate > 0) {
            enemyMaxHp = Math.max(1, Math.round(enemyMaxHp * (1 - defundingRate)));
            enemyAttack = Math.max(1, Math.round(enemyAttack * (1 - defundingRate)));
            if (enemyHp > enemyMaxHp) {
              enemyHp = enemyMaxHp;
              newState.vars[enemyVarHp] = enemyHp;
            }
          }
        }

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

        // Weather interactions with combat and status effects
        const weather = newState.environment?.weather?.toLowerCase();
        const temperature = newState.environment?.temperature?.toLowerCase();

        // Extinguish burning in rain/storm
        if (weather === "rain" || weather === "storm" || weather === "acid_rain") {
          if ((newState.vars["player_burning"] ?? 0) > 0) {
            newState.vars["player_burning"] = 0;
            const extTemplates = [
              `🌧️ The rain extinguishes your burning flames!\n`,
              `🌧️ The downpour douses your burning flames!\n`,
              `🌧️ The falling rain snuffs out your flames!\n`,
              `🌧️ Hissing steam rises as the heavy rain douses your burning flames!\n`,
              `🌧️ Cool droplets pour down, extinguishing the fire burning on you!\n`,
            ];
            const rollExt = cosmeticRand(101, extTemplates.length - 1);
            combatLog += extTemplates[rollExt];
          }
          if ((newState.vars[`npc_burning_${enemy.id}`] ?? 0) > 0) {
            newState.vars[`npc_burning_${enemy.id}`] = 0;
            const extTemplates = [
              `🌧️ The rain extinguishes the ${enemy.name}'s burning flames!\n`,
              `🌧️ The downpour douses the ${enemy.name}'s burning flames!\n`,
              `🌧️ The falling rain snuffs out the ${enemy.name}'s flames!\n`,
              `🌧️ Cool rain douses the fire on the ${enemy.name} with a loud hiss!\n`,
              `🌧️ Torrential downpour washes over the ${enemy.name}, extinguishing their flames!\n`,
            ];
            const rollExt = cosmeticRand(102, extTemplates.length - 1);
            combatLog += extTemplates[rollExt];
          }
        }

        // Apply weather status effects
        if (weather === "acid_rain") {
          if ((newState.vars["player_poisoned"] ?? 0) === 0) {
            newState.vars["player_poisoned"] = 2;
            const poisonTemplates = [
              `🤢 The acidic rain poisons you!\n`,
              `🤢 Acid rain burns your skin, meaning the acidic rain poisons you!\n`,
              `🤢 Corrosive droplets fall; the acidic rain poisons you!\n`,
              `🤢 Acrid, stinging vapors from the acid rain poison your system!\n`,
              `🤢 Green, toxic droplets of acid rain burn into your flesh, meaning the acidic rain poisons you!\n`,
              `🤢 Corrosive acid rain eats through your garments; the acidic rain poisons you!\n`,
              `🤢 Stinging yellow fog rises from the wet ground, meaning the acidic rain poisons you!\n`,
              `🤢 The atmospheric toxins in the acid rain saturate your skin, meaning the acidic rain poisons you!\n`,
            ];
            const rollP = cosmeticRand(103, poisonTemplates.length - 1);
            combatLog += poisonTemplates[rollP];
          }
          if ((newState.vars[`npc_poisoned_${enemy.id}`] ?? 0) === 0) {
            newState.vars[`npc_poisoned_${enemy.id}`] = 2;
            const poisonTemplates = [
              `🤢 The acidic rain poisons the ${enemy.name}!\n`,
              `🤢 Acid rain burns the ${enemy.name}, poisoning them!\n`,
              `🤢 Corrosive droplets of acid rain poison the ${enemy.name}!\n`,
              `🤢 The toxic precipitation burns and poisons the ${enemy.name}!\n`,
              `🤢 Noxious acid rain seeps into the ${enemy.name}'s wounds, poisoning them!\n`,
              `🤢 Acid rain sizzles on the ${enemy.name}'s hide, poisoning them!\n`,
              `🤢 Corrosive drops seep into the joints of the ${enemy.name}, poisoning them!\n`,
              `🤢 Stinging vapor from the acid rain causes the ${enemy.name} to choke, poisoning them!\n`,
            ];
            const rollP = cosmeticRand(104, poisonTemplates.length - 1);
            combatLog += poisonTemplates[rollP];
          }
        }

        if (weather === "blizzard" || temperature === "freezing") {
          const { value: rollPlayer, nextSeed: ns1 } = PureRand.nextInt(newState.seed, 1, 100);
          newState.seed = ns1;
          if (rollPlayer <= 25 && (newState.vars["player_stunned"] ?? 0) === 0) {
            newState.vars["player_stunned"] = 1;
            const freezeTemplates = [
              `❄️ The freezing cold freezes you, stunning you!\n`,
              `❄️ Bitter frost freezes you in place, stunning you!\n`,
              `❄️ The icy winds numb your joints, stunning you!\n`,
              `❄️ A layer of frost locks your muscles, leaving you stunned and shivering!\n`,
              `❄️ The freezing blizzard winds stun you with a blast of blinding ice!\n`,
              `❄️ Frostbite paralyzes your fingers in the biting blizzard, stunning you!\n`,
              `❄️ Extreme sub-zero temperatures stiffen your muscles, stunning you!\n`,
              `❄️ Glacial gusts sweep over you and leave you shivering and stunned!\n`,
            ];
            const rollF = cosmeticRand(105, freezeTemplates.length - 1);
            combatLog += freezeTemplates[rollF];
          }
          const { value: rollEnemy, nextSeed: ns2 } = PureRand.nextInt(newState.seed, 1, 100);
          newState.seed = ns2;
          if (rollEnemy <= 25 && (newState.vars[`npc_stunned_${enemy.id}`] ?? 0) === 0) {
            newState.vars[`npc_stunned_${enemy.id}`] = 1;
            const freezeTemplates = [
              `❄️ The freezing cold freezes the ${enemy.name}, stunning them!\n`,
              `❄️ Bitter frost freezes the ${enemy.name} in place, stunning them!\n`,
              `❄️ The icy winds numb the ${enemy.name}'s joints, stunning them!\n`,
              `❄️ Frost encases the ${enemy.name}, stunning them under the freezing wind!\n`,
              `❄️ The ${enemy.name} is coated in a sheet of ice, stunning them completely!\n`,
              `❄️ Frostbite paralyzes the ${enemy.name}'s limbs, stunning them!\n`,
              `❄️ Bitter cold stiffens the ${enemy.name}'s joints, stunning them under the freezing wind!\n`,
              `❄️ A freezing gust locks the ${enemy.name} in place, stunning them completely!\n`,
            ];
            const rollF = cosmeticRand(106, freezeTemplates.length - 1);
            combatLog += freezeTemplates[rollF];
          }
        }

        if (weather === "heatwave" || temperature === "scorching") {
          const { value: rollPlayer, nextSeed: ns1 } = PureRand.nextInt(newState.seed, 1, 100);
          newState.seed = ns1;
          if (rollPlayer <= 25 && (newState.vars["player_burning"] ?? 0) === 0) {
            newState.vars["player_burning"] = 2;
            const heatTemplates = [
              `🔥 The scorching heat sets you on fire!\n`,
              `🔥 Searing air ignites your clothes, setting you on fire!\n`,
              `🔥 Extreme heat sets you ablaze!\n`,
              `🔥 The blistering temperature sparks a fire, setting you ablaze!\n`,
              `🔥 Hot winds ignite your gear, leaving you burning!\n`,
              `🔥 Blistering waves of heat singe your hair and set you on fire!\n`,
              `🔥 The dry, scorching atmosphere causes your clothes to catch fire, setting you ablaze!\n`,
              `🔥 Intense thermal radiation ignites your outer layers, leaving you burning!\n`,
            ];
            const rollH = cosmeticRand(107, heatTemplates.length - 1);
            combatLog += heatTemplates[rollH];
          }
          const { value: rollEnemy, nextSeed: ns2 } = PureRand.nextInt(newState.seed, 1, 100);
          newState.seed = ns2;
          if (rollEnemy <= 25 && (newState.vars[`npc_burning_${enemy.id}`] ?? 0) === 0) {
            newState.vars[`npc_burning_${enemy.id}`] = 2;
            const heatTemplates = [
              `🔥 The scorching heat sets the ${enemy.name} on fire!\n`,
              `🔥 Searing air ignites the ${enemy.name}, setting them on fire!\n`,
              `🔥 Extreme heat sets the ${enemy.name} ablaze!\n`,
              `🔥 The intense scorching temperature sets the ${enemy.name} ablaze!\n`,
              `🔥 Thermal currents ignite the dry skin of the ${enemy.name}, setting them burning!\n`,
              `🔥 Blistering heat waves singe the ${enemy.name} and set them on fire!\n`,
              `🔥 The dry, scorching atmosphere causes the ${enemy.name} to ignite, setting them ablaze!\n`,
              `🔥 Searing thermal radiation ignites the ${enemy.name}, leaving them burning!\n`,
            ];
            const rollH = cosmeticRand(108, heatTemplates.length - 1);
            combatLog += heatTemplates[rollH];
          }
        }

        // 1. Resolve Player Action
        const playerStunned = (newState.vars["player_stunned"] ?? 0) > 0;
        if (playerStunned) {
          combatLog += `⚡ You are stunned and cannot act this turn!\n`;
          newState.vars["player_stunned"] = Math.max(0, (newState.vars["player_stunned"] ?? 0) - 1);
          if (newState.vars["player_stunned"] === 0) {
            const recTemplates = [
              `⚡ Your head clears and the paralysis lifts; you can move again.`,
              `⚡ The shocking numbness leaves your limbs; your movement is restored.`,
              `⚡ You regain control of your muscles as the stun effect wears off.`,
              `⚡ The ringing in your ears fades and your focus returns.`,
            ];
            const recRoll = cosmeticRand(179, recTemplates.length - 1);
            combatLog += `${recTemplates[recRoll]}\n`;
          }
        } else {
          if (action.type === "FIGHT") {
            const { value: hitRoll, nextSeed: s1 } = PureRand.nextInt(newState.seed, 1, 20);
            const hitTotal = hitRoll + Math.floor(playerDex / 3);
            newState.seed = s1;

            // Detect weapon in player's inventory
            const playerInventory = newState.inventory || [];
            let weaponName = "fists";
            let weaponType = "unarmed";
            if (
              playerInventory.includes("broadsword") ||
              playerInventory.includes("sword") ||
              playerInventory.includes("steel_broadsword")
            ) {
              weaponName = "sword";
              weaponType = "sword";
            } else if (playerInventory.includes("dagger") || playerInventory.includes("knife")) {
              weaponName = "dagger";
              weaponType = "dagger";
            } else if (playerInventory.includes("club") || playerInventory.includes("cudgel")) {
              weaponName = "club";
              weaponType = "club";
            } else if (playerInventory.includes("staff")) {
              weaponName = "staff";
              weaponType = "staff";
            } else if (playerInventory.includes("axe") || playerInventory.includes("hatchet")) {
              weaponName = "axe";
              weaponType = "axe";
            } else if (playerInventory.includes("spear") || playerInventory.includes("lance")) {
              weaponName = "spear";
              weaponType = "spear";
            } else if (playerInventory.includes("hammer") || playerInventory.includes("maul")) {
              weaponName = "hammer";
              weaponType = "hammer";
            }

            if (hitRoll === 20 || hitTotal >= enemyDefense) {
              const { value: dmgRoll, nextSeed: s2 } = PureRand.nextInt(newState.seed, 1, 6);
              let dmgTotal = Math.max(1, dmgRoll + Math.floor(playerStr / 3));
              newState.seed = s2;

              // Apply physical resistance/weakness
              let modifierMsg = "";
              const enemyResists = (enemy as any).resistances || [];
              const enemyWeak = (enemy as any).weaknesses || [];
              const resistsPhysical = enemyResists.some((r: string) => r.toLowerCase() === "physical");
              const weakPhysical = enemyWeak.some((w: string) => w.toLowerCase() === "physical");
              if (resistsPhysical) {
                dmgTotal = Math.max(1, Math.round(dmgTotal * 0.5));
                const resFlavor = [
                  " (Resisted! The blow is partially deflected by their resilient form!)",
                  " (Resisted! The attack lands, but the enemy's tough hide resists the physical impact!)",
                  " (Resisted! Your weapon fails to bite deeply into their armor.)",
                ];
                modifierMsg = resFlavor[cosmeticRand(150, resFlavor.length - 1)];
              } else if (weakPhysical) {
                dmgTotal = Math.round(dmgTotal * 1.5);
                const weakFlavor = [
                  " (Vulnerable! You find a glaring weakness in their defense!)",
                  " (Vulnerable! A devastating strike that bypasses their guard!)",
                  " (Vulnerable! The blow lands with crushing force on a soft spot!)",
                ];
                modifierMsg = weakFlavor[cosmeticRand(151, weakFlavor.length - 1)];
              }

              enemyHp = Math.max(0, enemyHp - dmgTotal);

              // Check target status and append extra narration
              let targetStatusMsg = "";
              const enemyBurning = (newState.vars[`npc_burning_${enemy.id}`] ?? 0) > 0;
              const enemyPoisoned = (newState.vars[`npc_poisoned_${enemy.id}`] ?? 0) > 0;
              const enemyStunned = (newState.vars[`npc_stunned_${enemy.id}`] ?? 0) > 0;

              if (enemyBurning || enemyPoisoned || enemyStunned) {
                const statusDetails: string[] = [];

                const burnWeaponFlavor: Record<string, string[]> = {
                  sword: [
                    "slicing through the flames engulfing them",
                    "your blade catching fire as you slash their burning form",
                    "sending a spray of burning embers as you cut them",
                    "carving a glowing arc of heat through the fire engulfing them",
                  ],
                  dagger: [
                    "plunging your heated dagger deep into their flaming skin",
                    "sliding your blade between the burning tongues of fire consuming them",
                    "twisting your dagger in their blazing form as heat radiates from the grip",
                    "slicing through the flames engulfing them",
                  ],
                  club: [
                    "striking their blazing body, sending sparks flying in all directions",
                    "fanning the fire engulfing them with your heavy blow",
                    "battering their scorched frame as flames lick your weapon",
                    "smashing their burning armor, sending glowing embers scattering",
                  ],
                  staff: [
                    "spinning your staff to redirect the embers flying off their flaming body",
                    "striking their scorched shoulders, the tip of your staff smoking from the heat",
                    "battering their scorched frame as flames lick your weapon",
                  ],
                  axe: [
                    "hacking into their burning shoulders, sending a shower of burning splinters flying",
                    "cleaving their blazing torso, the axe blade reflecting the fire",
                    "sending a spray of burning embers as you cut them",
                  ],
                  spear: [
                    "thrusting your spearhead through the fire, skewering their blazing flesh",
                    "jabbing at their flaming body, the spear tip glowing red-hot from the impact",
                    "your blade catching fire as you slash their burning form",
                  ],
                  hammer: [
                    "bringing your warhammer down on their flaming body, sending a spray of fire everywhere",
                    "crushing their scorched chest, sparks erupting from the impact site",
                    "striking their blazing body, sending sparks flying in all directions",
                  ],
                  unarmed: [
                    "punching their burning form, ignoring the searing heat of the flames",
                    "kicking their blazing torso, sparks scattering from your boots",
                    "battering their scorched frame as flames lick your weapon",
                    "striking their blazing body, sending sparks flying in all directions",
                    "fanning the fire engulfing them with your heavy blow",
                  ],
                };

                const poisonWeaponFlavor: Record<string, string[]> = {
                  sword: [
                    "causing a spray of toxic green blood to splatter from their slashed veins",
                    "releasing a hiss of noxious poison gas from their opened wounds",
                    "cutting deep as toxic fluids ooze from their green-stained flesh",
                    "cleaving through their venomous hide, coating your blade in green acid",
                  ],
                  dagger: [
                    "puncturing their poison-glands, causing green venom to squirt onto the floor",
                    "slipping your blade into their toxic boils and releasing sickening gas",
                    "stabbing deep into their green-veined flesh as toxic ooze bubbles out",
                    "causing a spray of toxic green blood to splatter from their slashed veins",
                  ],
                  club: [
                    "crushing their toxic boils, releasing a cloud of poisonous spores",
                    "releasing a splash of acidic slime with your heavy impact",
                    "battering their body, causing them to pool up green bile",
                    "shattering their toxic pustules with a wet, sickening crunch",
                  ],
                  staff: [
                    "poking their swollen venom sacs, spraying corrosive fluid over the floor",
                    "vaulting and cracking your staff down onto their toxic, bubbling skin",
                    "battering their body, causing them to cough up a pool of green bile",
                  ],
                  axe: [
                    "hewing their green-veined limbs, unleashing a foul-smelling toxic spray",
                    "cleaving their poison-sacks, releasing a choking cloud of toxic miasma",
                    "cutting deep as toxic fluids ooze from their green-stained flesh",
                  ],
                  spear: [
                    "skewering their toxic heart, letting noxious green fluid run down the haft",
                    "jabbing a poison boil, releasing a hiss of toxic steam",
                    "releasing a hiss of noxious poison gas from their opened wounds",
                  ],
                  hammer: [
                    "pulverizing their poison boils, releasing a massive spray of acidic bile",
                    "crushing their toxic hide, causing noxious fumes to burst from the impact",
                    "releasing a splash of acidic slime with your heavy impact",
                  ],
                  unarmed: [
                    "striking their toxic skin, dodging the splash of acidic slime",
                    "sweeping their legs, slamming their diseased body onto the floor",
                    "crushing their toxic boils, releasing a cloud of poisonous spores",
                    "releasing a splash of acidic slime with your heavy impact",
                    "battering their body, causing them to cough up a pool of green bile",
                  ],
                };

                const stunWeaponFlavor: Record<string, string[]> = {
                  sword: [
                    "chipping away at the frozen shell around them",
                    "slicing through the icy crust to bite deep into their helpless, numb flesh",
                    "taking advantage of their paralyzed state to execute a precise strike",
                    "shaving off frost shards as your blade slides through their frozen armor",
                  ],
                  dagger: [
                    "slipping your thin blade into the hairline fractures of the ice encasing them",
                    "thrusting your dagger into a vulnerable gap in their frozen, rigid defenses",
                    "taking advantage of their paralyzed state to execute a precise strike",
                    "chipping away at the frozen shell around them",
                  ],
                  club: [
                    "shattering the outer ice crust with a resonant crunch",
                    "smashing the frost encasing them into a shower of crystalline shards",
                    "delivering a bone-shattering strike while they are completely frozen and defenseless",
                    "pulverizing the sheet of ice encasing them, cracking their rigid form",
                  ],
                  staff: [
                    "cracking the ice encasing them with a swift, defensive spin of your staff",
                    "prodding the weak points in their frozen carapace, fracturing the frost",
                    "delivering a bone-shattering strike while they are completely frozen and defenseless",
                  ],
                  axe: [
                    "chopping through the sheet of ice encasing them with wood-splitting strength",
                    "hacking deep into their rigid, frozen limbs while they stand helpless",
                    "slicing through the icy crust to bite deep into their helpless, numb flesh",
                  ],
                  spear: [
                    "driving your spearhead directly through a crack in the frost encasing them",
                    "piercing their frozen, rigid defenses with a high-velocity thrust",
                    "taking advantage of their paralyzed state to execute a precise strike",
                  ],
                  hammer: [
                    "crushing the ice encasing them into fine snow with a thunderous blow",
                    "smashing their frozen defenses into a shower of sharp icicles",
                    "delivering a bone-shattering strike while they are completely frozen and defenseless",
                  ],
                  unarmed: [
                    "punching the ice encasing them, cracking the frost with raw force",
                    "shattering the frost layer on their shoulder with a swift elbow strike",
                    "shattering the outer ice crust with a resonant crunch",
                    "smashing the frost encasing them into a shower of crystalline shards",
                    "delivering a bone-shattering strike while they are completely frozen and defenseless",
                  ],
                };

                if (enemyBurning) {
                  const templates = burnWeaponFlavor[weaponType] || burnWeaponFlavor.unarmed;
                  statusDetails.push(templates[cosmeticRand(160, templates.length - 1)]);
                }
                if (enemyPoisoned) {
                  const templates = poisonWeaponFlavor[weaponType] || poisonWeaponFlavor.unarmed;
                  statusDetails.push(templates[cosmeticRand(161, templates.length - 1)]);
                }
                if (enemyStunned) {
                  const templates = stunWeaponFlavor[weaponType] || stunWeaponFlavor.unarmed;
                  statusDetails.push(templates[cosmeticRand(162, templates.length - 1)]);
                }
                targetStatusMsg = ` (striking and ${statusDetails.join(" and ")})`;
              }

              const hitTemplates: Record<string, string[]> = {
                sword: [
                  `⚔️ You slash the ${enemy.name} with your gleaming sword, dealing ${dmgTotal} damage!`,
                  `⚔️ You drive your blade into the ${enemy.name} for ${dmgTotal} damage!`,
                  `⚔️ A swift sword strike cuts the ${enemy.name} for ${dmgTotal} damage!`,
                  `⚔️ Your sword flashes in a wide arc, slicing the ${enemy.name} for ${dmgTotal} damage!`,
                  `⚔️ You execute a perfect thrust with your sword, piercing the ${enemy.name} for ${dmgTotal} damage!`,
                  `⚔️ You parry the ${enemy.name}'s guard and deliver a savage riposte, dealing ${dmgTotal} damage!`,
                  `⚔️ Your sword bites deep into the ${enemy.name} with a clean, metallic ring, dealing ${dmgTotal} damage!`,
                  `⚔️ With double-handed momentum, you cleave your sword down upon the ${enemy.name} for ${dmgTotal} damage!`,
                  `⚔️ You spin and strike, your blade tracing a deadly silver trail across the ${enemy.name} for ${dmgTotal} damage!`,
                ],
                dagger: [
                  `🗡️ You lunge and stab the ${enemy.name} with your dagger for ${dmgTotal} damage!`,
                  `🗡️ A quick slice from your dagger deals ${dmgTotal} damage to the ${enemy.name}!`,
                  `🗡️ You slip past their guard and plant your dagger in the ${enemy.name} for ${dmgTotal} damage!`,
                  `🗡️ A flurry of quick dagger cuts leaves the ${enemy.name} bleeding, dealing ${dmgTotal} damage!`,
                  `🗡️ You execute a lightning-fast feint, burying your dagger in the ${enemy.name} for ${dmgTotal} damage!`,
                  `🗡️ Piercing a joint in their armor, your dagger slides deep into the ${enemy.name} for ${dmgTotal} damage!`,
                  `🗡️ You twist the dagger in your grip, carving a jagged wound on the ${enemy.name} for ${dmgTotal} damage!`,
                  `🗡️ A swift, underhanded strike with your dagger punches through the ${enemy.name}'s defenses for ${dmgTotal} damage!`,
                ],
                club: [
                  `🏏 You bring your heavy club crashing down on the ${enemy.name} for ${dmgTotal} damage!`,
                  `🏏 A blunt force swing from your club bashes the ${enemy.name} for ${dmgTotal} damage!`,
                  `🏏 You deliver a bone-shattering blow with your club, dealing ${dmgTotal} damage to the ${enemy.name}!`,
                  `🏏 You swing your club in a brutal overhead arc, smashing the ${enemy.name} for ${dmgTotal} damage!`,
                  `🏏 You deliver a crushing blow to the ${enemy.name}'s shoulder, dealing ${dmgTotal} damage!`,
                  `🏏 The sheer impact of your heavy club rattling the bones of the ${enemy.name} deals ${dmgTotal} damage!`,
                  `🏏 You swing the club in a wild, sweeping motion, knocking the ${enemy.name} back for ${dmgTotal} damage!`,
                  `🏏 A thunderous side-swing of your club caves in the defenses of the ${enemy.name} for ${dmgTotal} damage!`,
                ],
                staff: [
                  `🦯 You spin your staff, cracking the ${enemy.name} on the side for ${dmgTotal} damage!`,
                  `🦯 You thrust your staff forward, striking the ${enemy.name} for ${dmgTotal} damage!`,
                  `🦯 You sweep the staff low, hitting the ${enemy.name} off-balance for ${dmgTotal} damage!`,
                  `🦯 A double-ended staff strike hits the ${enemy.name} twice in quick succession for ${dmgTotal} damage!`,
                  `🦯 You vault forward on your staff, kicking the ${enemy.name} and striking them on the rebound for ${dmgTotal} damage!`,
                  `🦯 The heavy tip of your staff cracks against the ${enemy.name}'s skull, dealing ${dmgTotal} damage!`,
                  `🦯 You unleash a rapid series of polearm jabs, battering the ${enemy.name} for ${dmgTotal} damage!`,
                  `🦯 Spinning the staff defensively, you suddenly drive the butt-end into the ${enemy.name} for ${dmgTotal} damage!`,
                ],
                axe: [
                  `🪓 You chop your axe into the ${enemy.name}, cleaving them for ${dmgTotal} damage!`,
                  `🪓 A savage axe swing bites into the ${enemy.name} for ${dmgTotal} damage!`,
                  `🪓 You embed the heavy axe head deep into the ${enemy.name} for ${dmgTotal} damage!`,
                  `🪓 A wide, sweeping axe cut cleaves the air and strikes the ${enemy.name} for ${dmgTotal} damage!`,
                  `🪓 You swing the axe with terrifying velocity, splitting the armor of the ${enemy.name} for ${dmgTotal} damage!`,
                  `🪓 The bearded blade of your axe hooks the ${enemy.name}'s shield and slices deep, dealing ${dmgTotal} damage!`,
                  `🪓 You deliver a brutal hack to the ${enemy.name}'s vitals, dealing ${dmgTotal} damage!`,
                  `🪓 In a fury of wood-splitting strength, you drive your axe into the ${enemy.name} for ${dmgTotal} damage!`,
                ],
                spear: [
                  `🔱 You thrust your spear forward, piercing the ${enemy.name} for ${dmgTotal} damage!`,
                  `🔱 A long-range spear poke punctures the ${enemy.name} for ${dmgTotal} damage!`,
                  `🔱 You jab the tip of your spear into the ${enemy.name}'s weak point, dealing ${dmgTotal} damage!`,
                  `🔱 With a quick lunge, your spear bites into the ${enemy.name} for ${dmgTotal} damage!`,
                  `🔱 You execute a triple-jab sequence, your spearhead flashing as it punctures the ${enemy.name} for ${dmgTotal} damage!`,
                  `🔱 You use the spear's superior reach to pierce the ${enemy.name}'s flank, dealing ${dmgTotal} damage!`,
                  `🔱 A precise thrust at the neck of the ${enemy.name} hits with pinpoint accuracy for ${dmgTotal} damage!`,
                  `🔱 You spin the spear, striking the ${enemy.name} with the haft before piercing them for ${dmgTotal} damage!`,
                ],
                hammer: [
                  `🔨 You swing your heavy hammer, crushing the ${enemy.name} for ${dmgTotal} damage!`,
                  `🔨 A thunderous hammer blow smashes the ${enemy.name} for ${dmgTotal} damage!`,
                  `🔨 You crack the heavy hammer against the ${enemy.name}'s armor, dealing ${dmgTotal} crushing damage!`,
                  `🔨 An earth-shaking hammer swing hits the ${enemy.name} full force for ${dmgTotal} damage!`,
                  `🔨 The heavy steel head of your hammer crushes the ${enemy.name}'s defenses for ${dmgTotal} damage!`,
                  `🔨 You swing the massive hammer in a devastating upward scoop, hitting the ${enemy.name} for ${dmgTotal} damage!`,
                  `🔨 The impact of your warhammer sends a resonant shockwave through the ${enemy.name} for ${dmgTotal} damage!`,
                  `🔨 You bring the hammer down like a descending meteor, denting the armor of the ${enemy.name} for ${dmgTotal} damage!`,
                ],
                unarmed: [
                  `👊 You punch the ${enemy.name} square in the chest, dealing ${dmgTotal} damage!`,
                  `👊 You deliver a firm kick to the ${enemy.name} for ${dmgTotal} damage!`,
                  `👊 You strike the ${enemy.name} for ${dmgTotal} damage!`,
                  `👊 You throw a powerful hook, striking the ${enemy.name} for ${dmgTotal} damage!`,
                  `👊 You grapple the ${enemy.name} and throw them to the ground, dealing ${dmgTotal} damage!`,
                  `👊 You land a devastating three-punch combo on the ${enemy.name}, dealing ${dmgTotal} damage!`,
                  `👊 You sweep the leg of the ${enemy.name}, slamming them onto the hard floor for ${dmgTotal} damage!`,
                  `👊 You drive your elbow into the ${enemy.name}'s guard, cracking it and dealing ${dmgTotal} damage!`,
                  `👊 A swift palm-strike to the chest of the ${enemy.name} forces the breath from their lungs for ${dmgTotal} damage!`,
                ],
              };
              const templates = hitTemplates[weaponType] || hitTemplates.unarmed;
              const narrativeRoll = cosmeticRand(109, templates.length - 1);
              let selectedNarrative = templates[narrativeRoll];
              if (hitRoll === 20) {
                selectedNarrative = `🔥 CRITICAL HIT! ` + selectedNarrative;
              }
              combatLog += `${selectedNarrative}${targetStatusMsg}${modifierMsg} (Enemy HP: ${enemyHp}/${enemyMaxHp})\n`;
            } else {
              const missTemplates = [
                `🛡️ You swing your ${weaponName} at the ${enemy.name} but miss! (Rolled ${hitRoll} vs Defense ${enemyDefense})`,
                `🛡️ You strike with your ${weaponName} but the ${enemy.name} deftly dodges! (Rolled ${hitRoll} vs Defense ${enemyDefense})`,
                `🛡️ Your ${weaponName} blow scrapes harmlessly off the ${enemy.name}'s defense! (Rolled ${hitRoll} vs Defense ${enemyDefense})`,
                `🛡️ You lunge at the ${enemy.name} but lose your footing, missing completely! (Rolled ${hitRoll} vs Defense ${enemyDefense})`,
              ];
              const missRoll = cosmeticRand(110, missTemplates.length - 1);
              combatLog += `${missTemplates[missRoll]}\n`;
            }
          } else if (action.type === "CAST") {
            const spell = (action as any).spell.toLowerCase();
            const enemyResists = (enemy as any).resistances || [];
            const enemyWeak = (enemy as any).weaknesses || [];

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
              let dmgTotal = dmgRoll + Math.floor(playerInt / 3);
              newState.seed = s1;

              // Weather effects
              if (weather === "heatwave" || temperature === "scorching") {
                dmgTotal += 3;
                const heatTemplates = [
                  `☀️ The extreme heat intensifies your fireball!`,
                  `☀️ Blistering hot air supercharges the magical flames of your fireball!`,
                  `☀️ The scorching environment feeds the blast, causing it to explode with extra force!`,
                  `☀️ Thermal energy from the heatwave combines with your fire magic, intensifying the blast!`,
                ];
                const heatRoll = cosmeticRand(171, heatTemplates.length - 1);
                combatLog += `${heatTemplates[heatRoll]}\n`;
              } else if (weather === "rain" || weather === "storm" || weather === "acid_rain") {
                dmgTotal = Math.max(1, dmgTotal - 3);
                const rainTemplates = [
                  `🌧️ The rain weakens your fireball!`,
                  `🌧️ Falling rain dampens the flames, reducing the explosion's intensity!`,
                  `🌧️ The wet downpour chokes the fire magic, weakening your fireball!`,
                  `🌧️ Precipitation sizzles against the fireball, dampening its damage!`,
                ];
                const rainRoll = cosmeticRand(172, rainTemplates.length - 1);
                combatLog += `${rainTemplates[rainRoll]}\n`;
              }

              // Apply fire resistance/weakness
              let modifierMsg = "";
              const resistsFire = enemyResists.some((r: string) => r.toLowerCase() === "fire");
              const weakFire = enemyWeak.some((w: string) => w.toLowerCase() === "fire");
              if (resistsFire) {
                dmgTotal = Math.max(1, Math.round(dmgTotal * 0.5));
                const resFlavor = [
                  " (Resisted! The flames wash harmlessly over their heat-resistant form.)",
                  " (Resisted! Searing heat barely singes their fireproof skin.)",
                  " (Resisted! Searing embers bounce off their flame-resistant armor.)",
                ];
                modifierMsg = resFlavor[cosmeticRand(152, resFlavor.length - 1)];
              } else if (weakFire) {
                dmgTotal = Math.round(dmgTotal * 1.5);
                const weakFlavor = [
                  " (Vulnerable! The target's flammable nature causes the fireball to explode violently!)",
                  " (Vulnerable! Searing heat melts through their defenses!)",
                  " (Vulnerable! Searing flames consume their vulnerable form!)",
                ];
                modifierMsg = weakFlavor[cosmeticRand(153, weakFlavor.length - 1)];
              }

              enemyHp = Math.max(0, enemyHp - dmgTotal);

              const fbTemplates = [
                `🔥 You cast Fireball! Searing flames consume the ${enemy.name} for ${dmgTotal} fire damage!`,
                `🔥 A blazing orb of fire erupts from your hands, engulfing the ${enemy.name} for ${dmgTotal} fire damage!`,
                `🔥 Searing heat washes over the ${enemy.name} as your Fireball explodes, dealing ${dmgTotal} fire damage!`,
                `🔥 Searing tongues of fire lick the ${enemy.name} as your Fireball explodes, dealing ${dmgTotal} fire damage!`,
                `🔥 You launch a high-velocity fire orb, scorch-burning the ${enemy.name} for ${dmgTotal} fire damage!`,
                `🔥 You conjure a blazing vortex of fire that spirals around the ${enemy.name}, dealing ${dmgTotal} fire damage!`,
                `🔥 A column of white-hot fire erupts beneath the ${enemy.name}, scorched-burning them for ${dmgTotal} fire damage!`,
                `🔥 You hurl an explosive blast of raw elemental fire, blasting the ${enemy.name} for ${dmgTotal} fire damage!`,
                `🔥 Searing tongues of magical heat envelop the ${enemy.name}, reducing their defense and dealing ${dmgTotal} fire damage!`,
              ];
              const fbRoll = cosmeticRand(111, fbTemplates.length - 1);
              combatLog += `${fbTemplates[fbRoll]}${modifierMsg} (Enemy HP: ${enemyHp}/${enemyMaxHp})\n`;

              // Apply burning status
              if (!resistsFire && weather !== "rain" && weather !== "storm" && weather !== "acid_rain") {
                newState.vars[`npc_burning_${enemy.id}`] = 2;
                const burnTemplates = [
                  `🔥 The ${enemy.name} catches fire and begins burning!`,
                  `🔥 Searing embers stick to the ${enemy.name}, setting them ablaze!`,
                  `🔥 Flames wrap around the ${enemy.name}, igniting their skin!`,
                  `🔥 Searing flames engulf the ${enemy.name}, who begins burning intensely!`,
                  `🔥 Superheated air ignites the ${enemy.name}'s outer layers, setting them ablaze!`,
                  `🔥 A sudden combustion turns the ${enemy.name} into a walking bonfire!`,
                  `🔥 The magical heat triggers an elemental reaction, igniting the ${enemy.name} instantly!`,
                  `🔥 Searing tongues of fire consume the ${enemy.name}, setting them burning!`,
                ];
                const bRoll = cosmeticRand(112, burnTemplates.length - 1);
                combatLog += `${burnTemplates[bRoll]}\n`;
              }
            } else if (spell === "freeze") {
              if (playerMana < 2) {
                return {
                  state,
                  events: [{ type: "rejected", reason: "Not enough mana! Freeze costs 2 mana." }],
                  ok: false,
                  rejectionReason: "Not enough mana.",
                };
              }
              playerMana -= 2;
              const { value: dmgRoll, nextSeed: s1 } = PureRand.nextInt(newState.seed, 3, 8);
              let dmgTotal = dmgRoll + Math.floor(playerInt / 3);
              newState.seed = s1;

              // Weather effects
              if (weather === "blizzard" || temperature === "freezing") {
                dmgTotal += 3;
                const coldTemplates = [
                  `❄️ The freezing cold intensifies your freeze spell!`,
                  `❄️ Biting glacial winds crystallize the freeze spell instantly, intensifying the cold!`,
                  `❄️ The freezing temperature amplifies the frost, causing it to freeze deeper!`,
                  `❄️ Sub-zero blizzard air supercharges your ice magic, boosting the damage!`,
                ];
                const coldRoll = cosmeticRand(173, coldTemplates.length - 1);
                combatLog += `${coldTemplates[coldRoll]}\n`;
              } else if (weather === "heatwave" || temperature === "scorching") {
                dmgTotal = Math.max(1, dmgTotal - 3);
                const heatTemplates = [
                  `☀️ The intense heat melts the ice, weakening your freeze spell!`,
                  `☀️ Blistering air dissolves the frost shards mid-flight, weakening your freeze spell!`,
                  `☀️ Scorching temperatures counteract the freezing magic, reducing the ice damage!`,
                  `☀️ The scorching atmosphere melts the frost, dampening the freeze spell!`,
                ];
                const heatRoll = cosmeticRand(174, heatTemplates.length - 1);
                combatLog += `${heatTemplates[heatRoll]}\n`;
              }

              // Apply cold/ice resistance/weakness
              let modifierMsg = "";
              const resistsCold = enemyResists.some(
                (r: string) => r.toLowerCase() === "cold" || r.toLowerCase() === "ice"
              );
              const weakCold = enemyWeak.some((w: string) => w.toLowerCase() === "cold" || w.toLowerCase() === "ice");
              if (resistsCold) {
                dmgTotal = Math.max(1, Math.round(dmgTotal * 0.5));
                const resFlavor = [
                  " (Resisted! The freezing blast is shrugged off by their icy nature.)",
                  " (Resisted! Frost shards shatter harmlessly against their frozen skin.)",
                  " (Resisted! Cold winds fail to penetrate their frost-resistant armor.)",
                ];
                modifierMsg = resFlavor[cosmeticRand(154, resFlavor.length - 1)];
              } else if (weakCold) {
                dmgTotal = Math.round(dmgTotal * 1.5);
                const weakFlavor = [
                  " (Vulnerable! The freezing cold shatters their brittle armor!)",
                  " (Vulnerable! A chilling frost freezes their warm blood, dealing massive damage!)",
                  " (Vulnerable! Chilling blizzard winds freeze them to the core!)",
                ];
                modifierMsg = weakFlavor[cosmeticRand(155, weakFlavor.length - 1)];
              }

              enemyHp = Math.max(0, enemyHp - dmgTotal);

              const freezeTemplates = [
                `❄️ You cast Freeze! A blast of frost shards strikes the ${enemy.name} for ${dmgTotal} cold damage!`,
                `❄️ A chilling blizzard bursts from your fingertips, freezing the ${enemy.name} for ${dmgTotal} cold damage!`,
                `❄️ Frost encrusts the ${enemy.name} as your ice spell strikes, dealing ${dmgTotal} cold damage!`,
                `❄️ A freezing wave of cryogenic energy washes over the ${enemy.name} for ${dmgTotal} cold damage!`,
                `❄️ You project a beam of absolute zero frost, freezing the ${enemy.name} for ${dmgTotal} cold damage!`,
                `❄️ You weave an aura of absolute zero cold around the ${enemy.name}, dealing ${dmgTotal} cold damage!`,
                `❄️ Shards of razor-sharp glacier ice pierce the ${enemy.name} from all sides, dealing ${dmgTotal} cold damage!`,
                `❄️ A blast of chilling wind snaps the ambient moisture into icicles that pelt the ${enemy.name} for ${dmgTotal} cold damage!`,
                `❄️ You freeze the very air around the ${enemy.name}, leaving them shivering and dealing ${dmgTotal} cold damage!`,
              ];
              const frRoll = cosmeticRand(113, freezeTemplates.length - 1);
              combatLog += `${freezeTemplates[frRoll]}${modifierMsg} (Enemy HP: ${enemyHp}/${enemyMaxHp})\n`;

              // Apply stun status
              const cannotStun = resistsCold || weather === "heatwave" || temperature === "scorching";
              if (!cannotStun) {
                const stunDuration = weather === "blizzard" || temperature === "freezing" ? 2 : 1;
                newState.vars[`npc_stunned_${enemy.id}`] = stunDuration;
                const freezeStunTemplates = [
                  `❄️ The ice encases the ${enemy.name}, stunning them for ${stunDuration} turn(s)!`,
                  `❄️ A thick layer of frost paralyzes the ${enemy.name}, rendering them unable to move for ${stunDuration} turn(s)!`,
                  `❄️ Encased in solid ice, the ${enemy.name} is completely immobilized for ${stunDuration} turn(s)!`,
                  `❄️ Frost crystals lock the joints of the ${enemy.name}, paralyzing them for ${stunDuration} turn(s)!`,
                  `❄️ Frozen stiff, the ${enemy.name} stands completely rigid and cannot move for ${stunDuration} turn(s)!`,
                  `❄️ A flash-freeze covers the ${enemy.name} in glacial ice, stunning them for ${stunDuration} turn(s)!`,
                  `❄️ Sub-zero temperature locks the muscles of the ${enemy.name}, stunning them for ${stunDuration} turn(s)!`,
                  `❄️ The biting cold numbs the ${enemy.name} into total immobility for ${stunDuration} turn(s)!`,
                ];
                const fsRoll = cosmeticRand(114, freezeStunTemplates.length - 1);
                combatLog += `${freezeStunTemplates[fsRoll]}\n`;
              }
            } else if (spell === "lightning") {
              if (playerMana < 3) {
                return {
                  state,
                  events: [{ type: "rejected", reason: "Not enough mana! Lightning costs 3 mana." }],
                  ok: false,
                  rejectionReason: "Not enough mana.",
                };
              }
              playerMana -= 3;
              const { value: dmgRoll, nextSeed: s1 } = PureRand.nextInt(newState.seed, 5, 12);
              let dmgTotal = dmgRoll + Math.floor(playerInt / 3);
              newState.seed = s1;

              // Weather conducts electricity
              let weatherStun = false;
              if (weather === "rain" || weather === "storm" || weather === "acid_rain") {
                dmgTotal += 4;
                weatherStun = true;
                const condTemplates = [
                  `🌧️ The wet environment conducts electricity, intensifying the bolt!`,
                  `🌧️ Rainwater channels the electric current, causing the bolt to arc violently!`,
                  `🌧️ The downpour conducts the electrical charge, supercharging the lightning strike!`,
                  `🌧️ Water droplets conduct the static electricity, amplifying the electrical shock!`,
                ];
                const condRoll = cosmeticRand(170, condTemplates.length - 1);
                combatLog += `${condTemplates[condRoll]}\n`;
              }

              // Apply lightning/electric resistance/weakness
              let modifierMsg = "";
              const resistsLightning = enemyResists.some(
                (r: string) => r.toLowerCase() === "lightning" || r.toLowerCase() === "electric"
              );
              const weakLightning = enemyWeak.some(
                (w: string) => w.toLowerCase() === "lightning" || w.toLowerCase() === "electric"
              );
              if (resistsLightning) {
                dmgTotal = Math.max(1, Math.round(dmgTotal * 0.5));
                const resFlavor = [
                  " (Resisted! Electrical arcs dissipate harmlessly through their grounded body.)",
                  " (Resisted! The lightning strike barely shocks their insulated form.)",
                  " (Resisted! Spark-searing electricity is absorbed by their lightning-resistant shield.)",
                ];
                modifierMsg = resFlavor[cosmeticRand(156, resFlavor.length - 1)];
              } else if (weakLightning) {
                dmgTotal = Math.round(dmgTotal * 1.5);
                const weakFlavor = [
                  " (Vulnerable! The electric current surges violently through their conductive shell!)",
                  " (Vulnerable! A blinding fork of lightning strikes a highly sensitive spot!)",
                  " (Vulnerable! Blinding voltage ravages their electronic/metallic structure!)",
                ];
                modifierMsg = weakFlavor[cosmeticRand(157, weakFlavor.length - 1)];
              }

              enemyHp = Math.max(0, enemyHp - dmgTotal);

              const lightningTemplates = [
                `⚡ You cast Lightning! A crackling bolt shocks the ${enemy.name} for ${dmgTotal} lightning damage!`,
                `⚡ A blinding fork of lightning arcs from the sky, zapping the ${enemy.name} for ${dmgTotal} lightning damage!`,
                `⚡ Crackling electrical arcs jump to the ${enemy.name}, shock-searing them for ${dmgTotal} lightning damage!`,
                `⚡ A high-voltage discharge arcs directly into the ${enemy.name} for ${dmgTotal} lightning damage!`,
                `⚡ Blinding electric bolts crackle through the room, shocking the ${enemy.name} for ${dmgTotal} lightning damage!`,
                `⚡ You project a continuous stream of electrical discharges, shock-searing the ${enemy.name} for ${dmgTotal} lightning damage!`,
                `⚡ A crackling web of static electricity envelops the ${enemy.name}, dealing ${dmgTotal} lightning damage!`,
                `⚡ You summon a bolt of pure plasma that deafeningly strikes the ${enemy.name} for ${dmgTotal} lightning damage!`,
                `⚡ Electric charge builds up on the ${enemy.name}'s armor and discharges violently, dealing ${dmgTotal} lightning damage!`,
              ];
              const ltRoll = cosmeticRand(115, lightningTemplates.length - 1);
              combatLog += `${lightningTemplates[ltRoll]}${modifierMsg} (Enemy HP: ${enemyHp}/${enemyMaxHp})\n`;

              // Apply stun if conducted by wet weather
              if (weatherStun && !resistsLightning) {
                newState.vars[`npc_stunned_${enemy.id}`] = 1;
                const ltStunTemplates = [
                  `⚡ The electrical shock stuns the ${enemy.name}!`,
                  `⚡ Electricity spasms through the ${enemy.name}'s muscles, which stuns the ${enemy.name}!`,
                  `⚡ The intense voltage stuns the ${enemy.name} and leaves them convulsing!`,
                  `⚡ The electrical currents paralyze the ${enemy.name}'s central nervous system, stunning them!`,
                  `⚡ The blinding voltage temporarily shocks the ${enemy.name} into immobility!`,
                  `⚡ Electrical arcs surge through the wet skin of the ${enemy.name}, stunning them!`,
                  `⚡ A high-voltage feedback loop locks the ${enemy.name}'s motor controls, stunning them!`,
                  `⚡ The target is enveloped in blinding sparks and stands stunned from the electrical overload!`,
                ];
                const ltsRoll = cosmeticRand(116, ltStunTemplates.length - 1);
                combatLog += `${ltStunTemplates[ltsRoll]}\n`;
              }
            } else if (spell === "poison") {
              if (playerMana < 2) {
                return {
                  state,
                  events: [{ type: "rejected", reason: "Not enough mana! Poison costs 2 mana." }],
                  ok: false,
                  rejectionReason: "Not enough mana.",
                };
              }
              playerMana -= 2;
              const { value: dmgRoll, nextSeed: s1 } = PureRand.nextInt(newState.seed, 2, 5);
              let dmgTotal = dmgRoll + Math.floor(playerInt / 3);
              newState.seed = s1;

              // Apply poison resistance/weakness
              let modifierMsg = "";
              const resistsPoison = enemyResists.some((r: string) => r.toLowerCase() === "poison");
              const weakPoison = enemyWeak.some((w: string) => w.toLowerCase() === "poison");
              if (resistsPoison) {
                dmgTotal = Math.max(1, Math.round(dmgTotal * 0.5));
                const resFlavor = [
                  " (Resisted! The toxic vapors are easily filtered out by their immune system.)",
                  " (Resisted! Poisonous fumes fail to penetrate their toxic-resistant skin.)",
                  " (Resisted! The toxic spell has little effect on their venom-resistant body.)",
                ];
                modifierMsg = resFlavor[cosmeticRand(158, resFlavor.length - 1)];
              } else if (weakPoison) {
                dmgTotal = Math.round(dmgTotal * 1.5);
                const weakFlavor = [
                  " (Vulnerable! Searing poison rapidly spreads through their weak immune system!)",
                  " (Vulnerable! Noxious green fumes melt through their biological defenses!)",
                  " (Vulnerable! The choking vapor reacts violently with their internal chemistry!)",
                ];
                modifierMsg = weakFlavor[cosmeticRand(159, weakFlavor.length - 1)];
              }

              enemyHp = Math.max(0, enemyHp - dmgTotal);

              const poisonTemplates = [
                `🤢 You cast Poison! A cloud of toxic gas chokes the ${enemy.name} for ${dmgTotal} poison damage!`,
                `🤢 Noxious green fumes envelope the ${enemy.name}, corroding them for ${dmgTotal} poison damage!`,
                `🤢 A choking vapor fills the air around the ${enemy.name}, dealing ${dmgTotal} poison damage!`,
                `🤢 You spray a stream of venomous acid, melting the ${enemy.name} for ${dmgTotal} poison damage!`,
                `🤢 A green miasma envelops the ${enemy.name}, corroding them for ${dmgTotal} poison damage!`,
                `🤢 You summon a cloud of acidic spores that cling to the ${enemy.name}, dealing ${dmgTotal} poison damage!`,
                `🤢 You splash the ${enemy.name} with a corrosive toxic slime, dealing ${dmgTotal} poison damage!`,
                `🤢 A dense, choking cloud of venomous mist envelops the ${enemy.name}, dealing ${dmgTotal} poison damage!`,
                `🤢 Toxins seep into the pores of the ${enemy.name}, corroding their flesh and dealing ${dmgTotal} poison damage!`,
              ];
              const psRoll = cosmeticRand(117, poisonTemplates.length - 1);
              combatLog += `${poisonTemplates[psRoll]}${modifierMsg} (Enemy HP: ${enemyHp}/${enemyMaxHp})\n`;

              // Apply poisoned status
              if (!resistsPoison) {
                newState.vars[`npc_poisoned_${enemy.id}`] = 3;
                const poisonStatusTemplates = [
                  `🤢 The ${enemy.name} is poisoned by the toxic spell!`,
                  `🤢 Poison seeps into the ${enemy.name}'s bloodstream, sickening them!`,
                  `🤢 The ${enemy.name} turns pale green as poison takes hold!`,
                  `🤢 Searing toxins enter the ${enemy.name}'s veins, poisoning them!`,
                  `🤢 The ${enemy.name} gasps for breath as toxic poison begins taking hold!`,
                  `🤢 Choking vapors enter the ${enemy.name}'s lungs, poisoning them!`,
                  `🤢 Toxic fluid is absorbed by the ${enemy.name}, poisoning them from within!`,
                  `🤢 A venomous reaction courses through the ${enemy.name}, leaving them severely poisoned!`,
                ];
                const pssRoll = cosmeticRand(118, poisonStatusTemplates.length - 1);
                combatLog += `${poisonStatusTemplates[pssRoll]}\n`;
              }
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

              const healTemplates = [
                `✨ You cast Heal! Divine light restores ${healRoll} HP. (HP: ${playerHp}/${playerMaxHp})`,
                `✨ You cast Heal! Warm magic mends your wounds, restoring ${healRoll} HP. (HP: ${playerHp}/${playerMaxHp})`,
                `✨ You cast Heal! A soothing aura wraps around you, recovering ${healRoll} HP. (HP: ${playerHp}/${playerMaxHp})`,
                `✨ Soothing green light washes over you, restoring ${healRoll} HP. (HP: ${playerHp}/${playerMaxHp})`,
                `✨ Celestial energy mends your flesh, restoring ${healRoll} HP. (HP: ${playerHp}/${playerMaxHp})`,
              ];
              const hRoll = cosmeticRand(119, healTemplates.length - 1);
              combatLog += `${healTemplates[hRoll]}\n`;
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
              // Clean up NPC status effects
              delete newState.vars[`npc_hp_${enemy.id}`];
              delete newState.vars[`npc_poisoned_${enemy.id}`];
              delete newState.vars[`npc_stunned_${enemy.id}`];
              delete newState.vars[`npc_burning_${enemy.id}`];
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
          } else if (action.type === "USE") {
            const obj = findObjectInPack(action.item);
            if (!obj || !isObjectVisible(action.item)) {
              return {
                state,
                events: [{ type: "rejected", reason: `You don't have '${action.item}' to use.` }],
                ok: false,
                rejectionReason: `You don't have that item.`,
              };
            }
            const inter = (obj.interactions || []).find(
              (i) => i.verb === "USE" && (i.item === undefined || i.item === action.item)
            );
            if (!inter) {
              combatLog += `🎒 You use ${obj.name}, but nothing happens.\n`;
            } else {
              const passed = evaluateConditions(newState, inter.conditions);
              if (!passed) {
                combatLog += `🎒 You try to use ${obj.name}, but conditions are not met.\n`;
              } else {
                const effectResult = applyEffects(newState, inter.effects, pack);
                newState = effectResult.state;
                for (const ev of effectResult.events) {
                  if (ev.type === "narration") {
                    combatLog += `${ev.text}\n`;
                  }
                }
                playerHp = newState.vars["hp"] ?? 20;
                playerMana = newState.vars["mana"] ?? 10;
              }
            }
          }
        }

        // 2. Resolve Enemy Turn (if enemy survived and player didn't flee)
        if (enemyHp > 0) {
          const enemyStunned = (newState.vars[`npc_stunned_${enemy.id}`] ?? 0) > 0;
          if (enemyStunned) {
            combatLog += `⚡ The ${enemy.name} is stunned and cannot act this turn!\n`;
            newState.vars[`npc_stunned_${enemy.id}`] = Math.max(0, (newState.vars[`npc_stunned_${enemy.id}`] ?? 0) - 1);
            if (newState.vars[`npc_stunned_${enemy.id}`] === 0) {
              const recTemplates = [
                `⚡ The frost/shock wearing off, the ${enemy.name} shakes their head and readies their guard.`,
                `⚡ The ${enemy.name} recovers from the stun, flexing their limbs.`,
                `⚡ The paralysis lifts from the ${enemy.name}, allowing them to move freely again.`,
                `⚡ The ${enemy.name} breaks free from the stunning effect and prepares to strike.`,
              ];
              const recRoll = cosmeticRand(180, recTemplates.length - 1);
              combatLog += `${recTemplates[recRoll]}\n`;
            }
          } else {
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
        }

        // Apply Poison / Burning ticks at the end of the turn
        if (playerHp > 0) {
          const poisonDur = newState.vars["player_poisoned"] ?? 0;
          if (poisonDur > 0) {
            playerHp = Math.max(0, playerHp - 2);
            const tickTemplates = [
              `🤢 Poison deals 2 damage to you! (HP: ${playerHp}/${playerMaxHp})\n`,
              `🤢 Toxins burn in your veins. Poison deals 2 damage to you! (HP: ${playerHp}/${playerMaxHp})\n`,
              `🤢 You suffer 2 poison damage from toxic buildup. Poison deals 2 damage to you! (HP: ${playerHp}/${playerMaxHp})\n`,
              `🤢 The poison in your veins continues to burn, dealing 2 damage! (HP: ${playerHp}/${playerMaxHp})\n`,
              `🤢 Toxins course through your body. Poison deals 2 damage to you! (HP: ${playerHp}/${playerMaxHp})\n`,
            ];
            const rollTick = cosmeticRand(120, tickTemplates.length - 1);
            combatLog += tickTemplates[rollTick];
            newState.vars["player_poisoned"] = poisonDur - 1;
            if (newState.vars["player_poisoned"] === 0) {
              const recTemplates = [
                `🤢 The poison in your veins finally runs its course. You feel the toxins dissipate.`,
                `🤢 Your body filters out the remaining toxins. The poison has worn off.`,
                `🤢 The sickening fever breaks as the poison finally leaves your system.`,
                `🤢 You take a deep breath as the toxic burning in your blood subsides.`,
              ];
              const recRoll = cosmeticRand(175, recTemplates.length - 1);
              combatLog += `${recTemplates[recRoll]}\n`;
            }
          }
        }
        if (playerHp > 0) {
          const burningDur = newState.vars["player_burning"] ?? 0;
          if (burningDur > 0) {
            playerHp = Math.max(0, playerHp - 3);
            const tickTemplates = [
              `🔥 Burning deals 3 damage to you! (HP: ${playerHp}/${playerMaxHp})\n`,
              `🔥 Searing embers singe your flesh. Burning deals 3 damage to you! (HP: ${playerHp}/${playerMaxHp})\n`,
              `🔥 You take 3 fire damage as flames consume you. Burning deals 3 damage to you! (HP: ${playerHp}/${playerMaxHp})\n`,
              `🔥 Searing flames continue to char your flesh, dealing 3 damage! (HP: ${playerHp}/${playerMaxHp})\n`,
              `🔥 Searing embers burn you. Burning deals 3 damage to you! (HP: ${playerHp}/${playerMaxHp})\n`,
            ];
            const rollTick = cosmeticRand(121, tickTemplates.length - 1);
            combatLog += tickTemplates[rollTick];
            newState.vars["player_burning"] = burningDur - 1;
            if (newState.vars["player_burning"] === 0) {
              const recTemplates = [
                `🔥 The flames engulfing you flicker out, leaving only smoldering ashes.`,
                `🔥 The fire consuming you finally dies down to a slow smolder and goes out.`,
                `🔥 You pat out the last of the stubborn embers. The burning stops.`,
                `🔥 The magical fire burns itself out, leaving you scorched but no longer ablaze.`,
              ];
              const recRoll = cosmeticRand(176, recTemplates.length - 1);
              combatLog += `${recTemplates[recRoll]}\n`;
            }
          }
        }

        if (enemyHp > 0) {
          const enemyPoisonDur = newState.vars[`npc_poisoned_${enemy.id}`] ?? 0;
          if (enemyPoisonDur > 0) {
            enemyHp = Math.max(0, enemyHp - 2);
            const tickTemplates = [
              `🤢 Poison deals 2 damage to the ${enemy.name}! (Enemy HP: ${enemyHp}/${enemyMaxHp})\n`,
              `🤢 Toxins eat away at the ${enemy.name}. Poison deals 2 damage to the ${enemy.name}! (Enemy HP: ${enemyHp}/${enemyMaxHp})\n`,
              `🤢 The ${enemy.name} writhes in pain. Poison deals 2 damage to the ${enemy.name}! (Enemy HP: ${enemyHp}/${enemyMaxHp})\n`,
              `🤢 Searing poison continues to weaken the ${enemy.name}! Poison deals 2 damage to the ${enemy.name}! (Enemy HP: ${enemyHp}/${enemyMaxHp})\n`,
              `🤢 The ${enemy.name} shudders under the effect of toxins. Poison deals 2 damage to the ${enemy.name}! (Enemy HP: ${enemyHp}/${enemyMaxHp})\n`,
            ];
            const rollTick = cosmeticRand(122, tickTemplates.length - 1);
            combatLog += tickTemplates[rollTick];
            newState.vars[`npc_poisoned_${enemy.id}`] = enemyPoisonDur - 1;
            if (newState.vars[`npc_poisoned_${enemy.id}`] === 0) {
              const recTemplates = [
                `🤢 The green tint fades from the ${enemy.name}'s skin as the poison runs its course.`,
                `🤢 The ${enemy.name} gasps as the venom in their system finally dissipates.`,
                `🤢 The toxic fever breaks, and the ${enemy.name} seems to recover from the poison.`,
                `🤢 The sickly green color drains from the ${enemy.name}'s face as the poison wears off.`,
              ];
              const recRoll = cosmeticRand(177, recTemplates.length - 1);
              combatLog += `${recTemplates[recRoll]}\n`;
            }
          }
        }
        if (enemyHp > 0) {
          const enemyBurningDur = newState.vars[`npc_burning_${enemy.id}`] ?? 0;
          if (enemyBurningDur > 0) {
            enemyHp = Math.max(0, enemyHp - 3);
            const tickTemplates = [
              `🔥 Burning deals 3 damage to the ${enemy.name}! (Enemy HP: ${enemyHp}/${enemyMaxHp})\n`,
              `🔥 Searing flames consume the ${enemy.name}. Burning deals 3 damage to the ${enemy.name}! (Enemy HP: ${enemyHp}/${enemyMaxHp})\n`,
              `🔥 The ${enemy.name} is scorched as they burn. Burning deals 3 damage to the ${enemy.name}! (Enemy HP: ${enemyHp}/${enemyMaxHp})\n`,
              `🔥 Searing flames continue to consume the ${enemy.name}, dealing 3 damage! (Enemy HP: ${enemyHp}/${enemyMaxHp})\n`,
              `🔥 Flames flare up around the ${enemy.name}. Burning deals 3 damage to the ${enemy.name}! (Enemy HP: ${enemyHp}/${enemyMaxHp})\n`,
            ];
            const rollTick = cosmeticRand(123, tickTemplates.length - 1);
            combatLog += tickTemplates[rollTick];
            newState.vars[`npc_burning_${enemy.id}`] = enemyBurningDur - 1;
            if (newState.vars[`npc_burning_${enemy.id}`] === 0) {
              const recTemplates = [
                `🔥 The fire on the ${enemy.name} dies down, leaving charred skin and smoke.`,
                `🔥 The flames engulfing the ${enemy.name} finally flicker out and dissipate.`,
                `🔥 The ${enemy.name} rolls on the ground, successfully extinguishing the flames.`,
                `🔥 The fire burns out, leaving the ${enemy.name} scorched and smoldering.`,
              ];
              const recRoll = cosmeticRand(178, recTemplates.length - 1);
              combatLog += `${recTemplates[recRoll]}\n`;
            }
          }
        }

        // 3. Resolve combat outcomes
        if (enemyHp <= 0) {
          newState.flags[`in_combat_with_${enemy.id}`] = false;
          newState.flags[`npc_defeated_${enemy.id}`] = true;
          newState.flags[`npc_dead_${enemy.id}`] = true;

          // Clean up NPC status effects
          delete newState.vars[`npc_hp_${enemy.id}`];
          delete newState.vars[`npc_poisoned_${enemy.id}`];
          delete newState.vars[`npc_stunned_${enemy.id}`];
          delete newState.vars[`npc_burning_${enemy.id}`];

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
            if (enemy.id.startsWith("outpost_guard_")) {
              const rId = enemy.id.substring(14);
              if (newState.turfGuardOutposts?.[rId]) {
                const outpost = newState.turfGuardOutposts[rId];
                newState.turfGuardOutposts[rId] = {
                  ...outpost,
                  disabled: true,
                  timestamp: newState.step,
                };
                if (!newState.journal) newState.journal = [];
                newState.journal.push(`[Outpost] Outpost guard defeated! Outpost in room ${rId} has been disabled.`);
                combatLog += `\n🛡️ Outpost disabled! The outpost in this room is now disabled.`;

                // Attacking and defeating an outpost guard triggers dynamic alliance shift and war declarations
                const factionId = outpost.syndicateId;
                if (factionId) {
                  newState.factionRep = newState.factionRep || {};
                  const currentRep = newState.factionRep[factionId] ?? 0;
                  newState.factionRep[factionId] = currentRep - 30;
                  newState.journal.push(
                    `[Reputation] Your reputation with ${factionId} decreased by 30 to ${newState.factionRep[factionId]} due to outpost attack.`
                  );

                  // Shift alliance relationships for player-aligned factions
                  const alliances = newState.alliances ? JSON.parse(JSON.stringify(newState.alliances)) : {};
                  const factionWars = newState.factionWars ? JSON.parse(JSON.stringify(newState.factionWars)) : {};

                  if (newState.guildPrestige) {
                    for (const [guildKey, prestige] of Object.entries(newState.guildPrestige)) {
                      if (prestige >= 50 && guildKey.startsWith("player-")) {
                        const guildName = guildKey.substring(7);
                        if (guildName !== factionId) {
                          if (!alliances[factionId]) alliances[factionId] = {};
                          alliances[factionId][guildName] = "hostile";
                          if (!alliances[guildName]) alliances[guildName] = {};
                          alliances[guildName][factionId] = "hostile";

                          if (!factionWars[factionId]) factionWars[factionId] = {};
                          factionWars[factionId][guildName] = true;
                          if (!factionWars[guildName]) factionWars[guildName] = {};
                          factionWars[guildName][factionId] = true;

                          newState.journal.push(
                            `[War] War declared between ${factionId} and ${guildName} due to outpost attack in room ${rId}!`
                          );
                          combatLog += `\n🚨 War declared! Faction ${factionId} has declared war on your guild ${guildName}.`;
                        }
                      }
                    }
                  }
                  newState.alliances = alliances;
                  newState.factionWars = factionWars;
                }
              }
            }
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
            if (newState.bounties?.[enemy.id]?.active) {
              const reward = newState.bounties[enemy.id].amount;
              newState.vars["gold"] = (newState.vars["gold"] ?? 0) + reward;
              newState.bounties[enemy.id] = {
                ...newState.bounties[enemy.id],
                active: false,
                timestamp: newState.step,
              };
              combatLog += `\n💰 Cooperative Bounty claimed! You earn an additional ${reward} gold for hunting down and defeating the enforcer ${enemy.id}.`;
            }
          }
        }

        if (playerHp <= 0) {
          // Clean up NPC status effects
          delete newState.vars[`npc_hp_${enemy.id}`];
          delete newState.vars[`npc_poisoned_${enemy.id}`];
          delete newState.vars[`npc_stunned_${enemy.id}`];
          delete newState.vars[`npc_burning_${enemy.id}`];

          // Clean up player status effects
          newState.vars["player_poisoned"] = 0;
          newState.vars["player_stunned"] = 0;
          newState.vars["player_burning"] = 0;

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
    case "CHANGE_WEATHER": {
      const currentEnv = newState.environment || {
        weather: "clear",
        temperature: "mild",
        wind: "calm",
        lastUpdatedStep: newState.step,
      };
      newState.environment = {
        ...currentEnv,
        weather: action.weather ?? currentEnv.weather,
        temperature: action.temperature ?? currentEnv.temperature,
        wind: action.wind ?? currentEnv.wind ?? "calm",
        lastUpdatedStep: newState.step,
      };
      const text = `Weather manually changed: weather is now ${newState.environment.weather}, temperature is ${newState.environment.temperature}, wind is ${newState.environment.wind}.`;
      events.push({ type: "narration", text });
      newState.journal.push(`[Environment] ${text}`);
      break;
    }

    case "LOOK": {
      if (!action.target) {
        // Look around room
        const illuminated = isRoomIlluminated(newState, currentRoom, parserPack);
        events.push({
          type: "narration",
          text: illuminated ? currentRoom.description : "It is pitch black. You are likely to be eaten by a grue.",
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
        if (action.target.startsWith("scenery:")) {
          const parts = action.target.split(":");
          const sKey = parts[2];
          events.push({
            type: "narration",
            text: currentRoom.scenery?.[sKey] ?? `It is a ${sKey}.`,
          });
        } else {
          const obj = findObjectInPack(action.target);
          events.push({
            type: "narration",
            text: obj ? obj.description : `It is a ${action.target}.`,
          });
        }
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
      if (action.target.startsWith("scenery:")) {
        const parts = action.target.split(":");
        const sKey = parts[2];
        events.push({
          type: "narration",
          text: currentRoom.scenery?.[sKey] ?? `You see nothing unusual about the ${sKey}.`,
        });
      } else {
        const obj = findObjectInPack(action.target);
        events.push({
          type: "narration",
          text: obj ? obj.description : `You see nothing unusual about the ${action.target}.`,
        });
      }
      break;
    }

    case "INVENTORY": {
      const itemsList = state.inventory.map((id) => findObjectInPack(id)?.name ?? id).join(", ");
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

      // Weather traversal check (AF-164)
      const isOutdoorRoomLocal = (roomId: string): boolean => {
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
      };
      const isDestOutdoor = isOutdoorRoomLocal(exit.to);
      const isCurrentOutdoor = isOutdoorRoomLocal(state.current);
      const hasHeavyCloakInPack = parserPack.objects?.some((o) => o.id === "heavy_cloak");
      if (hasHeavyCloakInPack && (isDestOutdoor || isCurrentOutdoor) && newState.environment) {
        const weather = newState.environment.weather;
        const wind = newState.environment.wind ?? "calm";
        if (weather === "storm" && wind === "tempest" && !newState.inventory.includes("heavy_cloak")) {
          return {
            state,
            events: [
              {
                type: "rejected",
                reason:
                  "The violent tempest and raging storm block your way! You need a heavy_cloak to traverse outdoor areas under such conditions.",
              },
            ],
            ok: false,
            rejectionReason: "Blocked by extreme storm weather conditions.",
          };
        }
      }

      // Territory-based exit traversal constraints & faction tax mechanics
      const destRoomId = exit.to;
      const isHiddenPassageUsed = Object.values(state.hiddenPassages || {}).some(
        (hp) =>
          (hp.fromRoomId === currentRoom.id && hp.toRoomId === destRoomId) ||
          (hp.fromRoomId === destRoomId && hp.toRoomId === currentRoom.id)
      );
      const isTunnelUsed = Object.values(state.contrabandTunnels || {}).some(
        (tunnel) =>
          (tunnel.fromRoomId === currentRoom.id && tunnel.toRoomId === destRoomId) ||
          (tunnel.fromRoomId === destRoomId && tunnel.toRoomId === currentRoom.id)
      );
      const factionId = isHiddenPassageUsed || isTunnelUsed ? undefined : state.territoryControl?.[destRoomId];

      // Check if player is carrying contraband
      const contrabandItems = getContrabandInInventory(state, pack);
      const carriesContraband = isHiddenPassageUsed || isTunnelUsed ? false : contrabandItems.length > 0;

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

        // Shadow alliance scaling (AF-79)
        let hasAlliedShadowAlliance = false;
        let hasHostileShadowAlliance = false;
        if (state.shadowAlliances) {
          const agentSyndicates = Object.values(state.syndicates || {}).filter((s) => s.members.includes(agentId));
          for (const s of agentSyndicates) {
            const relation = state.shadowAlliances[s.id]?.[factionId];
            if (relation === "allied") {
              hasAlliedShadowAlliance = true;
            } else if (relation === "hostile") {
              hasHostileShadowAlliance = true;
            }
          }
        }

        if (hasAlliedShadowAlliance) {
          tax = 0; // Waive taxes in allied shadow territories
        } else if (hasHostileShadowAlliance) {
          tax = tax * 2; // Double-tax hostile faction regions
        }

        // Faction War scaling (AF-71)
        const agentSyndicates = Object.values(state.syndicates || {}).filter((s) => s.members.includes(agentId));
        const isAtWarWithFaction =
          factionId && agentSyndicates.some((s) => state.factionWars?.[s.id]?.[factionId] === true);
        if (isAtWarWithFaction) {
          tax = tax * 4; // Factions at war charge 4x travel tax
        }

        // Cooperative Sovereignty Bond Tax Exemption (AF-138)
        let totalCoopDiscount = 0;
        if (state.cooperativeSovereigntyBondProposals && factionId) {
          const agentSyndicates = Object.values(state.syndicates || {}).filter((s) => s.members.includes(agentId));
          for (const s of agentSyndicates) {
            for (const bond of Object.values(state.cooperativeSovereigntyBondProposals)) {
              if (bond.status === "Active" && bond.resolved && bond.factionId === factionId) {
                const contrib = bond.contributions[s.id] || 0;
                const totalContributed = Object.values(bond.contributions).reduce((sum, v) => sum + v, 0);
                if (totalContributed > 0 && contrib > 0) {
                  const ratio = contrib / totalContributed;
                  totalCoopDiscount += ratio;
                }
              }
            }
          }
        }
        if (totalCoopDiscount > 0) {
          tax = Math.floor(tax * Math.max(0, 1 - totalCoopDiscount));
        }

        // Apply covert cell and propaganda discounts! (AF-73)
        const activeSyndicate = agentSyndicates[0];
        if (activeSyndicate) {
          const localCell = state.covertCells?.[destRoomId];
          const propKey = `${destRoomId}_${activeSyndicate.id}`;
          const localPropaganda = state.propagandaCampaigns?.[propKey];

          let discount = 0.0;
          if (localCell && localCell.syndicateId === activeSyndicate.id) {
            discount += 0.25 * localCell.cellLevel;
          }
          if (localPropaganda) {
            discount += 0.15 * localPropaganda.level;
          }
          tax = Math.floor(tax * Math.max(0, 1 - discount));
        }

        calculatedTax = tax;
      }

      // Pre-calculate Syndicate Extortion Toll (AF-45)
      let calculatedExtortionToll = 0;
      const controllingSyndicateId =
        isHiddenPassageUsed || isTunnelUsed ? undefined : state.syndicateTurf?.[destRoomId];
      let syndicateName = "";
      if (controllingSyndicateId) {
        const syndicate = state.syndicates?.[controllingSyndicateId];
        if (syndicate) {
          syndicateName = syndicate.name;
          const isMember = syndicate.members.includes(agentId);
          if (!isMember) {
            const dominance = syndicate.dominance ?? 50;
            calculatedExtortionToll = Math.floor(15 * (dominance / 50));

            // Apply covert cell and propaganda discounts! (AF-73)
            const agentSyndicates = Object.values(state.syndicates || {}).filter((s) => s.members.includes(agentId));
            const activeSyndicate = agentSyndicates[0];
            if (activeSyndicate) {
              const localCell = state.covertCells?.[destRoomId];
              const propKey = `${destRoomId}_${activeSyndicate.id}`;
              const localPropaganda = state.propagandaCampaigns?.[propKey];

              let discount = 0.0;
              if (localCell && localCell.syndicateId === activeSyndicate.id) {
                discount += 0.25 * localCell.cellLevel;
              }
              if (localPropaganda) {
                discount += 0.15 * localPropaganda.level;
              }
              calculatedExtortionToll = Math.floor(calculatedExtortionToll * Math.max(0, 1 - discount));
            }
          }
        }
      }

      // Pre-calculate and pay Contraband Tunnel Toll (AF-84)
      if (isTunnelUsed) {
        const activeTunnel = Object.values(state.contrabandTunnels || {}).find(
          (tunnel) =>
            (tunnel.fromRoomId === currentRoom.id && tunnel.toRoomId === destRoomId) ||
            (tunnel.fromRoomId === destRoomId && tunnel.toRoomId === currentRoom.id)
        );
        if (activeTunnel) {
          const isTunnelSyndicateMember = state.syndicates?.[activeTunnel.syndicateId]?.members.includes(agentId);
          if (!isTunnelSyndicateMember) {
            const tunnelTollPolicy = state.tunnelTolls?.[activeTunnel.id];
            const tunnelToll = tunnelTollPolicy ? tunnelTollPolicy.tollAmount : 0;
            if (tunnelToll > 0) {
              const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
              const currentGold = newState.vars[goldKey] ?? (agentId === "player" ? 0 : 100);
              if (currentGold < tunnelToll) {
                return {
                  state,
                  events: [
                    {
                      type: "rejected",
                      reason: `You cannot traverse tunnel ${activeTunnel.id} without paying a toll of ${tunnelToll} gold (you have ${currentGold}).`,
                    },
                  ],
                  ok: false,
                  rejectionReason: `You cannot afford the tunnel toll of ${tunnelToll} gold to cross this tunnel.`,
                };
              }
              // Deduct gold
              newState.vars[goldKey] = currentGold - tunnelToll;

              // Distribute among syndicate members
              const syndicate = state.syndicates?.[activeTunnel.syndicateId];
              const members = syndicate?.members ?? [];
              const memberShare = members.length > 0 ? Math.floor(tunnelToll / members.length) : 0;
              if (memberShare > 0) {
                for (const member of members) {
                  const memberGoldKey = member === "player" ? "gold" : `gold_${member}`;
                  newState.vars[memberGoldKey] = (newState.vars[memberGoldKey] ?? 0) + memberShare;
                }
              }
              newState.journal.push(
                `[Underground Railroad] Agent ${agentId} paid tunnel toll of ${tunnelToll} gold for tunnel ${activeTunnel.id} owned by syndicate ${activeTunnel.syndicateId}. Distributed ${memberShare} gold to each member.`
              );
              events.push({
                type: "narration",
                text: `Paid ${tunnelToll} gold in tunnel toll to traverse safe passage (owned by syndicate ${syndicate?.name || activeTunnel.syndicateId}).`,
              });
            }
          }
        }
      }

      // Pre-calculate Trade Route locking and tolls
      let maxToll = 0;
      let lockingRouteId: string | null = null;
      let tollingRouteId: string | null = null;
      let hostileRouteFactionId: string | null = null;

      if (!isHiddenPassageUsed && !isTunnelUsed && state.tradeRoutes) {
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
              let toll = state.tradeRoutePolicies?.[routeId] ?? route.taxShare ?? 5;

              // Check for Smuggler Guild CBA override for this route
              let hasCbaOverride = false;
              let cbaToll = toll;
              if (state.smugglerGuilds && state.smugglerGuildCbas) {
                for (const guildId of Object.keys(state.smugglerGuilds)) {
                  const guild = state.smugglerGuilds[guildId];
                  const isMember =
                    guild.members.includes(agentId) ||
                    state.smugglerGuildMemberships?.[agentId]?.includes(guildId) ||
                    guild.definedBy === agentId;

                  if (isMember) {
                    const cbaKey = `${guildId}:${routeId}`;
                    const cba = state.smugglerGuildCbas[cbaKey];
                    if (cba !== undefined) {
                      hasCbaOverride = true;
                      cbaToll = Math.min(cbaToll, cba.agreedToll);
                    }
                  }
                }
              }

              if (hasCbaOverride) {
                toll = cbaToll;
              }

              const agentSynds = Object.values(state.syndicates || {}).filter((s) => s.members.includes(agentId));
              const hasInfiltrator = Object.values(state.treatyInfiltrators || {}).some(
                (inf) => inf.roomId === destRoomId && agentSynds.some((s) => s.id === inf.syndicateId)
              );

              if (rep <= -10 && !hasCbaOverride && !hasInfiltrator) {
                lockingRouteId = routeId;
              }
              // Faction War scaling (AF-71)
              const isRouteFactionAtWar =
                rFactionId && agentSynds.some((s) => state.factionWars?.[s.id]?.[rFactionId] === true);
              if (isRouteFactionAtWar) {
                toll = toll * 4; // Factions at war charge 4x route toll
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
        ? Object.values(state.syndicates).find((s) => s.members.includes(agentId))
        : undefined;
      if (destSafehouse && agentSyndicate && destSafehouse.syndicateId === agentSyndicate.id) {
        calculatedTax = 0;
        calculatedExtortionToll = 0;
        maxToll = 0;
        lockingRouteId = null;
      }

      const isHostileBorder = calculatedTax > 0 || maxToll > 0 || lockingRouteId !== null;
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

          // Check for active interceptor decoy deflection!
          const activeDecoy = Object.values(newState.interceptorDecoys || {}).find(
            (d) => d.syndicateId === agentSyndicate?.id && d.active
          );

          const hasInsurance = newState.smugglingInsurance?.[agentId]?.active === true;
          const factionBribe = borderFactionId ? newState.bribes?.[borderFactionId] : undefined;
          const hasBribe = factionBribe && factionBribe.amount > 0;

          const updatedAgentSynd = agentSyndicate ? newState.syndicates?.[agentSyndicate.id] : undefined;
          const hasWarChestBribe = updatedAgentSynd && (updatedAgentSynd.warChest ?? 0) >= 50;

          if (activeDecoy) {
            activeDecoy.active = false;
            events.push({
              type: "narration",
              text: `👮 Caught smuggling at the border! Fortunately, your syndicate's active Interceptor Decoy ${activeDecoy.id} misled the border patrol, allowing you to pass safely undetected!`,
            });
            isSmugglingBypassed = true;
          } else if (hasInsurance) {
            // Avoid confiscation and fines!
            if (newState.smugglingInsurance?.[agentId]) {
              newState.smugglingInsurance[agentId] = {
                ...newState.smugglingInsurance[agentId],
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
          } else if (hasWarChestBribe && updatedAgentSynd) {
            updatedAgentSynd.warChest = (updatedAgentSynd.warChest ?? 0) - 50;
            events.push({
              type: "narration",
              text: `👮 Caught smuggling at the border! However, a bribe of 50 gold was automatically paid from your syndicate ${updatedAgentSynd.name} war chest. The guards let you pass with your contraband.`,
            });
            isSmugglingBypassed = true;
          } else {
            // Confiscate contraband
            newState.inventory = newState.inventory.filter((itemId) => !contrabandItems.includes(itemId));

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
              events: [
                {
                  type: "rejected",
                  reason: `You were caught by the border patrol smuggling contraband (${contrabandItems.join(", ")})! The contraband was confiscated, you were fined ${fine} gold, and your reputation with faction ${borderFactionId || "border patrol"} was reduced. You were turned back.`,
                } as any,
              ],
              ok: false,
              rejectionReason: `Caught smuggling contraband at the border.`,
            };
          }
        } else {
          // Success!
          isSmugglingBypassed = true;
          events.push({
            type: "narration",
            text: `You successfully smuggled contraband across the border into ${destRoomId} without paying faction taxes or tolls.`,
          });
        }
      }

      if (!isSmugglingBypassed) {
        if (calculatedTax > 0 && factionId) {
          const playerGold = state.vars["gold"] ?? 0;
          if (playerGold < calculatedTax) {
            return {
              state,
              events: [
                {
                  type: "rejected",
                  reason: `You cannot enter ${exit.to} without paying a faction tax of ${calculatedTax} gold (you have ${playerGold}).`,
                },
              ],
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
            events: [
              {
                type: "rejected",
                reason: `Hostile trade route ${lockingRouteId} is locked to you due to extreme hostility.`,
              },
            ],
            ok: false,
            rejectionReason: `Hostile trade route ${lockingRouteId} is locked to you due to extreme hostility.`,
          };
        }

        if (maxToll > 0) {
          const currentGold = newState.vars["gold"] ?? state.vars["gold"] ?? 0;
          if (currentGold < maxToll) {
            return {
              state,
              events: [
                {
                  type: "rejected",
                  reason: `You cannot cross trade route ${tollingRouteId} without paying a toll of ${maxToll} gold (you have ${currentGold}).`,
                },
              ],
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
              events: [
                {
                  type: "rejected",
                  reason: `You cannot enter ${exit.to} without paying a syndicate extortion toll of ${calculatedExtortionToll} gold (you have ${currentGold}).`,
                },
              ],
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

          newState.vars["totalExtortionGoldCollected"] =
            (newState.vars["totalExtortionGoldCollected"] ?? 0) + calculatedExtortionToll;

          newState.journal.push(
            `[Syndicate] Extorted ${calculatedExtortionToll} gold from ${agentId} entering turf ${destRoomId}. Distributed ${memberShare} gold to each member.`
          );
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
            newState.journal.push(
              `[Syndicate] Agent ${agentId} passed ${controllingSyndicateId} checkpoint at ${destRoomId} carrying contraband. Bribe waived due to high reputation (${syndicateRep} >= ${waiverThreshold}).`
            );
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

              const bribeMsg =
                finalBribeCost !== bribeCost
                  ? `double bribe toll of ${finalBribeCost} gold`
                  : `bribe toll of ${bribeCost} gold`;
              newState.journal.push(
                `[Syndicate] Agent ${agentId} paid ${bribeMsg} to ${controllingSyndicateId} checkpoint at ${destRoomId}. Distributed ${memberShare} gold to each member.`
              );
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

              const defundingRate = getEnforcerDefundingRate(newState, agentId);
              const initialHp = defundingRate > 0 ? Math.max(1, Math.round(scaledHp * (1 - defundingRate))) : scaledHp;
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
                  hp: initialHp,
                  max_hp: initialHp,
                  attack: 4,
                  defense: scaledDefense,
                  gold: 50,
                  xp: 40,
                },
              };
              newState.flags[`in_combat_with_${enforcerId}`] = true;
              newState.vars[`npc_hp_${enforcerId}`] = initialHp;

              if (isHatedEnemy) {
                newState.journal.push(
                  `[Syndicate] Hated enemy Agent ${agentId} intercepted at ${controllingSyndicateId} checkpoint in ${destRoomId} carrying contraband. Pre-emptive ambush triggered!`
                );
                events.push({
                  type: "narration",
                  text: `💥 Pre-emptive Ambush! As a hated enemy, the ${syndicate?.name || "Syndicate"} Enforcer immediately attacks you at the checkpoint!`,
                });
              } else {
                newState.journal.push(
                  `[Syndicate] Agent ${agentId} intercepted at ${controllingSyndicateId} checkpoint in ${destRoomId} carrying contraband. Skirmish triggered!`
                );
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

      // Faction Outpost Guard Encounter (AF-56 / Task-F5)
      if (!isHiddenPassageUsed && !isTunnelUsed) {
        const destRoomId = exit.to;
        const outpost = newState.turfGuardOutposts?.[destRoomId];
        if (outpost && !outpost.disabled) {
          const syndicate = newState.syndicates?.[outpost.syndicateId];
          const isMember = syndicate?.members.includes(agentId) ?? false;
          const factionRep = newState.factionRep?.[outpost.syndicateId] ?? 0;
          const isHostile = syndicate ? !isMember : factionRep < 0;

          if (isHostile) {
            const guardId = `outpost_guard_${destRoomId}`;
            const activeCombat = Object.keys(newState.flags).some(
              (f) => f.startsWith("in_combat_with_") && newState.flags[f]
            );
            const isDefeated = newState.flags[`npc_defeated_${guardId}`] === true;

            if (!activeCombat && !isDefeated) {
              const securityLevel = outpost.securityLevel;
              const initialHp = 20 + securityLevel * 10;
              const scaledDefense = 8 + securityLevel * 2;
              const scaledAttack = 2 + securityLevel;

              if (!newState.enforcers) newState.enforcers = {};
              newState.enforcers[guardId] = {
                id: guardId,
                name: syndicate ? `${syndicate.name} Outpost Guard` : `${outpost.syndicateId} Outpost Guard`,
                factionId: outpost.syndicateId,
                currentRoom: destRoomId,
                status: "idle",
                isBountyHunter: false,
                timestamp: newState.step,
                hp: initialHp,
                max_hp: initialHp,
                attack: scaledAttack,
                defense: scaledDefense,
                gold: 20 * securityLevel,
                xp: 25 * securityLevel,
              };

              newState.flags[`in_combat_with_${guardId}`] = true;
              newState.vars[`npc_hp_${guardId}`] = initialHp;

              if (!newState.journal) newState.journal = [];
              newState.journal.push(
                `[Outpost] Hostile outpost in room ${destRoomId} triggered guard encounter for agent ${agentId}!`
              );
              events.push({
                type: "narration",
                text: `🚨 Guard Encounter! A hostile ${
                  syndicate ? syndicate.name : outpost.syndicateId
                } Outpost Guard confronts you at the outpost in ${destRoomId}!`,
              });
            }
          }
        }
      }

      // Apply enter effects of the new room if found
      const newRoom = findRoom(newState, parserPack, exit.to);
      if (isHiddenPassageUsed) {
        events.push({
          type: "narration",
          text: `🤫 You traversed the hidden passage undetected, completely bypassing all border checks, checkpoints, taxes, and tolls!`,
        });
      }
      if (isTunnelUsed) {
        events.push({
          type: "narration",
          text: `🚇 You traversed the contraband tunnel safely, completely bypassing all surface border checks, checkpoints, taxes, and tolls!`,
        });
      }
      if (newRoom) {
        const illuminated = isRoomIlluminated(newState, newRoom, parserPack);
        events.push({
          type: "narration",
          text: illuminated ? newRoom.description : "It is pitch black. You are likely to be eaten by a grue.",
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
      events.push({
        type: "narration",
        text: `You unlock the ${obj.name} with the ${findObjectInPack(action.with)?.name}.`,
      });
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
        if (action.item === action.target && obj.light_source) {
          const runtime = newState.objectState[action.item] ?? {};
          const isCurrentlyLit = !!runtime.lit;
          newState.objectState[action.item] = {
            ...runtime,
            lit: !isCurrentlyLit,
          };
          const msg = !isCurrentlyLit
            ? `You light the ${obj.name}. It casts a bright glow around you.`
            : `You extinguish the ${obj.name}.`;
          events.push({ type: "state_change", effect: "toggle_light", flag: action.item });
          events.push({
            type: "narration",
            text: msg,
          });
          break;
        }

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
          events: [
            { type: "rejected", reason: `Conditions for using '${action.item}' on '${action.target}' are not met.` },
          ],
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
      if (!npc || !currentRoom.npcs?.includes(action.npc) || !isRoomIlluminated(newState, currentRoom, parserPack)) {
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

      let startNodeId = npc.dialogue.root;
      if ((npc.dialogue as any).greeting_overrides && (npc.dialogue as any).greeting_overrides.length > 0) {
        for (const override of (npc.dialogue as any).greeting_overrides) {
          if (evaluateConditions(newState, override.conditions)) {
            startNodeId = override.node;
            break;
          }
        }
      }
      newState.questStage[rootNodeVar] = startNodeId;

      const welcomeNode = npc.dialogue.nodes.find((n) => n.id === startNodeId);

      // Apply welcome node effects
      if (welcomeNode && welcomeNode.effects) {
        const effectResult = applyEffects(newState, welcomeNode.effects, pack);
        newState = effectResult.state;
        events.push(...effectResult.events);
      }

      events.push({
        type: "dialogue",
        npcId: npc.id,
        nodeId: startNodeId,
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

      // Check faction prestige and alliance requirements for dynamic item availability
      const controllingFactionId = newState.territoryControl?.[newState.current];
      const merchantFaction = npc.faction || controllingFactionId;
      let factionPrestige = 0;
      if (merchantFaction) {
        const factionRepVal = newState.factionRep?.[merchantFaction];
        const guildPrestigeVal = newState.guildPrestige?.[`player-${merchantFaction}`];
        if (factionRepVal !== undefined && guildPrestigeVal !== undefined) {
          factionPrestige = Math.max(factionRepVal, guildPrestigeVal);
        } else if (factionRepVal !== undefined) {
          factionPrestige = factionRepVal;
        } else if (guildPrestigeVal !== undefined) {
          factionPrestige = guildPrestigeVal;
        }
      }

      let isAlliedToMerchantFaction = false;
      if (merchantFaction) {
        const playerAligned = getPlayerAlignedFactions(newState, "player");
        for (const pf of playerAligned) {
          if (
            newState.alliances?.[pf]?.[merchantFaction] === "allied" ||
            newState.alliances?.[merchantFaction]?.[pf] === "allied" ||
            newState.syndicateAlliances?.[pf]?.[merchantFaction] === "allied" ||
            newState.syndicateAlliances?.[merchantFaction]?.[pf] === "allied"
          ) {
            isAlliedToMerchantFaction = true;
            break;
          }
        }
      }

      if (itemObj?.required_prestige !== undefined && factionPrestige < itemObj.required_prestige) {
        return {
          state,
          events: [
            {
              type: "rejected",
              reason: `This item requires ${itemObj.required_prestige} faction prestige (current: ${factionPrestige}).`,
            },
          ],
          ok: false,
          rejectionReason: `Requires ${itemObj.required_prestige} faction prestige.`,
        };
      }
      if (itemObj?.required_reputation !== undefined && factionPrestige < itemObj.required_reputation) {
        return {
          state,
          events: [
            {
              type: "rejected",
              reason: `This item requires ${itemObj.required_reputation} faction reputation (current: ${factionPrestige}).`,
            },
          ],
          ok: false,
          rejectionReason: `Requires ${itemObj.required_reputation} faction reputation.`,
        };
      }
      if (itemObj?.required_alliance === true && !isAlliedToMerchantFaction) {
        return {
          state,
          events: [{ type: "rejected", reason: `This item is exclusive to allied factions.` }],
          ok: false,
          rejectionReason: `This item is exclusive to allied factions.`,
        };
      }

      const baseCost = itemObj?.cost ?? 10;
      const itemCost = calculateTradePrice(newState, npc, itemObj, baseCost, true);

      // Check faction trade limits and caps (AF-36)
      const npcFactionId = getFactionForNpc(newState, npc.id, parserPack);
      if (npcFactionId) {
        const prevTrades =
          newState.tradeHistory?.filter(
            (t) =>
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
          factionRep: JSON.stringify(newState.factionRep),
        });

        if (prevTrades.length >= caps.maxTransactions) {
          return {
            state,
            events: [
              {
                type: "rejected",
                reason: `Trade limit reached for faction ${npcFactionId}. Maximum transactions: ${caps.maxTransactions}.`,
              },
            ],
            ok: false,
            rejectionReason: `Trade limit reached.`,
          };
        }

        if (totalGoldVolume + itemCost > caps.maxGoldVolume) {
          return {
            state,
            events: [
              {
                type: "rejected",
                reason: `Trade volume limit reached for faction ${npcFactionId}. Maximum gold volume: ${caps.maxGoldVolume} (current: ${totalGoldVolume}, attempted: ${itemCost}).`,
              },
            ],
            ok: false,
            rejectionReason: `Trade volume limit reached.`,
          };
        }
      }

      const useCounterfeit = (action as any).useCounterfeit ?? false;
      let finalCost = itemCost;
      let isCounterfeitUsed = false;
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const counterfeitGoldKey = agentId === "player" ? "counterfeit_gold" : `counterfeit_gold_${agentId}`;

      if (useCounterfeit) {
        let syndicateId = newState.syndicateTurf?.[newState.current];
        if (!syndicateId && newState.safehouses?.[newState.current]) {
          syndicateId = newState.safehouses[newState.current].syndicateId;
        }
        if (!syndicateId && newState.syndicates) {
          const traderSyndicates = Object.values(newState.syndicates).filter((s) => s.members.includes(agentId));
          if (traderSyndicates.length > 0) {
            syndicateId = traderSyndicates[0].id;
          }
        }

        const exchangeRate = syndicateId ? getCounterfeitExchangeRate(newState, syndicateId, newState.current) : 1.0;

        finalCost = Math.ceil(itemCost / exchangeRate);
        const playerCounterfeit = newState.vars[counterfeitGoldKey] ?? 0;

        if (playerCounterfeit < finalCost) {
          return {
            state,
            events: [
              {
                type: "rejected",
                reason: `You don't have enough counterfeit gold (requires ${finalCost} counterfeit gold, you have ${playerCounterfeit}).`,
              },
            ],
            ok: false,
            rejectionReason: `You don't have enough counterfeit gold.`,
          };
        }

        newState.vars[counterfeitGoldKey] = playerCounterfeit - finalCost;
        isCounterfeitUsed = true;
      } else {
        const playerGold = newState.vars[goldKey] ?? (agentId === "player" ? 0 : 100);

        if (playerGold < itemCost) {
          return {
            state,
            events: [
              {
                type: "rejected",
                reason: `You don't have enough gold (requires ${itemCost} gold, you have ${playerGold}).`,
              },
            ],
            ok: false,
            rejectionReason: `You don't have enough gold.`,
          };
        }

        newState.vars[goldKey] = playerGold - itemCost;

        // Apply active reserve sweep dynamic tariff liquidation (AF-125)
        const traderSyndicates = Object.values(newState.syndicates || {}).filter((s) => s.members.includes(agentId));
        let activeSweepPolicy: any = undefined;
        for (const synd of traderSyndicates) {
          const policy = newState.reserveSweepPolicies?.[synd.id];
          if (policy && policy.active) {
            activeSweepPolicy = policy;
            break;
          }
        }
        if (activeSweepPolicy) {
          const liquidationGold = Math.floor(
            (itemCost * activeSweepPolicy.tariffLiquidationRate) / (1.0 + activeSweepPolicy.tariffLiquidationRate)
          );
          if (liquidationGold > 0) {
            const defaultedBond = Object.values(newState.factionReserveBonds || {}).find(
              (b) => b.syndicateId === activeSweepPolicy.syndicateId && b.status === "Defaulted"
            );
            if (defaultedBond) {
              defaultedBond.remainingRepayment = Math.max(0, defaultedBond.remainingRepayment - liquidationGold);
              if (defaultedBond.remainingRepayment === 0) {
                defaultedBond.status = "Matured";
                activeSweepPolicy.active = false;
              }
              activeSweepPolicy.accumulatedLiquidatedGold += liquidationGold;
              if (!newState.journal) newState.journal = [];
              newState.journal.push(
                `[Tariff Liquidation] Diverted ${liquidationGold} gold from trade transaction to liquidate defaulted bond ${defaultedBond.id} for syndicate ${activeSweepPolicy.syndicateId}.`
              );
              events.push({
                type: "narration",
                text: `💰 [Tariff Liquidation] Diverted ${liquidationGold} gold from transaction to liquidate defaulted bond of syndicate ${activeSweepPolicy.syndicateId}.`,
              } as any);
            }
          }
        }
      }

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
        gold: isCounterfeitUsed ? finalCost : itemCost,
      });

      events.push({
        type: "take",
        item: action.item,
      });
      events.push({
        type: "narration",
        text: isCounterfeitUsed
          ? `You buy the ${itemObj?.name ?? action.item} from ${npc.name} using counterfeit gold (Cost: ${finalCost} counterfeit gold).`
          : `You buy the ${itemObj?.name ?? action.item} from ${npc.name} for ${itemCost} gold.`,
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
      let isAuthorized = syndicate?.members.includes(agentId) || false;
      if (!isAuthorized && state.syndicates) {
        const traderSyndicates = Object.values(state.syndicates).filter((s) => s.members.includes(agentId));
        for (const ts of traderSyndicates) {
          if (
            state.syndicateAlliances?.[ts.id]?.[safehouse.syndicateId] === "allied" ||
            state.syndicateAlliances?.[safehouse.syndicateId]?.[ts.id] === "allied"
          ) {
            isAuthorized = true;
            break;
          }
        }
      }

      if (!isAuthorized) {
        return {
          state,
          events: [
            {
              type: "rejected",
              reason: `Agent ${agentId} is not a member of or allied with the syndicate owning the safehouse in ${roomId}.`,
            },
          ],
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

      const useCounterfeit = (action as any).useCounterfeit ?? false;
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const counterfeitGoldKey = agentId === "player" ? "counterfeit_gold" : `counterfeit_gold_${agentId}`;
      let finalPayout = itemPayout;
      let isCounterfeitUsed = false;

      if (useCounterfeit) {
        const exchangeRate = getCounterfeitExchangeRate(newState, safehouse.syndicateId, roomId);
        finalPayout = Math.floor(itemPayout / exchangeRate);
        newState.vars[counterfeitGoldKey] = (newState.vars[counterfeitGoldKey] ?? 0) + finalPayout;
        isCounterfeitUsed = true;
      } else {
        newState.vars[goldKey] = (newState.vars[goldKey] ?? 0) + itemPayout;
      }

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
      if (isCounterfeitUsed) {
        newState.journal.push(
          `[Syndicate] Agent ${agentId} sold contraband ${itemId} to the black market in safehouse ${roomId} for ${finalPayout} counterfeit gold.`
        );
        events.push({
          type: "narration",
          text: `You sell the contraband ${itemObj?.name ?? itemId} to the syndicate black market in the safehouse for ${finalPayout} counterfeit gold (avoiding all tolls and tariffs).`,
        });
      } else {
        newState.journal.push(
          `[Syndicate] Agent ${agentId} sold contraband ${itemId} to the black market in safehouse ${roomId} for ${itemPayout} gold.`
        );
        events.push({
          type: "narration",
          text: `You sell the contraband ${itemObj?.name ?? itemId} to the syndicate black market in the safehouse for ${itemPayout} gold (avoiding all tolls and tariffs).`,
        });
      }

      events.push({
        type: "black_market_sold",
        agentId,
        roomId,
        itemId,
        price: isCounterfeitUsed ? finalPayout : itemPayout,
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
        const prevTrades =
          newState.tradeHistory?.filter(
            (t) =>
              getFactionForNpc(newState, t.npcId, parserPack) === npcFactionId &&
              (t.action === "buy" || t.action === "sell")
          ) ?? [];
        const totalGoldVolume = prevTrades.reduce((sum, t) => sum + t.gold, 0);
        const caps = getMerchantTradeCaps(newState, npcFactionId);

        if (prevTrades.length >= caps.maxTransactions) {
          return {
            state,
            events: [
              {
                type: "rejected",
                reason: `Trade limit reached for faction ${npcFactionId}. Maximum transactions: ${caps.maxTransactions}.`,
              },
            ],
            ok: false,
            rejectionReason: `Trade limit reached.`,
          };
        }

        if (totalGoldVolume + itemPayout > caps.maxGoldVolume) {
          return {
            state,
            events: [
              {
                type: "rejected",
                reason: `Trade volume limit reached for faction ${npcFactionId}. Maximum gold volume: ${caps.maxGoldVolume} (current: ${totalGoldVolume}, attempted: ${itemPayout}).`,
              },
            ],
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
          events: [
            {
              type: "rejected",
              reason: `The merchant does not have enough gold (has ${mGold} gold, requires ${itemPayout}).`,
            },
          ],
          ok: false,
          rejectionReason: `The merchant does not have enough gold.`,
        };
      }

      newState.inventory = newState.inventory.filter((i) => i !== action.item);

      const useCounterfeit = (action as any).useCounterfeit ?? false;
      const goldKey = agentId === "player" ? "gold" : `gold_${agentId}`;
      const counterfeitGoldKey = agentId === "player" ? "counterfeit_gold" : `counterfeit_gold_${agentId}`;
      let finalPayout = itemPayout;
      let isCounterfeitUsed = false;

      if (useCounterfeit) {
        let syndicateId = newState.syndicateTurf?.[newState.current];
        if (!syndicateId && newState.safehouses?.[newState.current]) {
          syndicateId = newState.safehouses[newState.current].syndicateId;
        }
        if (!syndicateId && newState.syndicates) {
          const traderSyndicates = Object.values(newState.syndicates).filter((s) => s.members.includes(agentId));
          if (traderSyndicates.length > 0) {
            syndicateId = traderSyndicates[0].id;
          }
        }

        const exchangeRate = syndicateId ? getCounterfeitExchangeRate(newState, syndicateId, newState.current) : 1.0;

        finalPayout = Math.floor(itemPayout / exchangeRate);
        newState.vars[counterfeitGoldKey] = (newState.vars[counterfeitGoldKey] ?? 0) + finalPayout;
        isCounterfeitUsed = true;
      } else {
        newState.vars[goldKey] = (newState.vars[goldKey] ?? 0) + itemPayout;

        // Apply active reserve sweep dynamic tariff liquidation (AF-125)
        const traderSyndicates = Object.values(newState.syndicates || {}).filter((s) => s.members.includes(agentId));
        let activeSweepPolicy: any = undefined;
        for (const synd of traderSyndicates) {
          const policy = newState.reserveSweepPolicies?.[synd.id];
          if (policy && policy.active) {
            activeSweepPolicy = policy;
            break;
          }
        }
        if (activeSweepPolicy) {
          const liquidationGold = Math.floor(
            (itemPayout * activeSweepPolicy.tariffLiquidationRate) / (1.0 - activeSweepPolicy.tariffLiquidationRate)
          );
          if (liquidationGold > 0) {
            const defaultedBond = Object.values(newState.factionReserveBonds || {}).find(
              (b) => b.syndicateId === activeSweepPolicy.syndicateId && b.status === "Defaulted"
            );
            if (defaultedBond) {
              defaultedBond.remainingRepayment = Math.max(0, defaultedBond.remainingRepayment - liquidationGold);
              if (defaultedBond.remainingRepayment === 0) {
                defaultedBond.status = "Matured";
                activeSweepPolicy.active = false;
              }
              activeSweepPolicy.accumulatedLiquidatedGold += liquidationGold;
              if (!newState.journal) newState.journal = [];
              newState.journal.push(
                `[Tariff Liquidation] Diverted ${liquidationGold} gold from trade transaction to liquidate defaulted bond ${defaultedBond.id} for syndicate ${activeSweepPolicy.syndicateId}.`
              );
              events.push({
                type: "narration",
                text: `💰 [Tariff Liquidation] Diverted ${liquidationGold} gold from transaction to liquidate defaulted bond of syndicate ${activeSweepPolicy.syndicateId}.`,
              } as any);
            }
          }
        }
      }

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
        gold: isCounterfeitUsed ? finalPayout : itemPayout,
      });

      events.push({
        type: "drop",
        item: action.item,
      });
      events.push({
        type: "narration",
        text: isCounterfeitUsed
          ? `You sell the ${itemObj?.name ?? action.item} to ${npc.name} for ${finalPayout} counterfeit gold.`
          : `You sell the ${itemObj?.name ?? action.item} to ${npc.name} for ${itemPayout} gold.`,
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

    case "CRAFT": {
      if (action.recipeId.startsWith("invalid_")) {
        const parts = action.recipeId.split("_");
        const idA = parts[1];
        const idB = parts[2];
        const objA = findObjectInPack(idA);
        const objB = findObjectInPack(idB);
        const nameA = objA?.name ?? idA;
        const nameB = objB?.name ?? idB;
        events.push({
          type: "narration",
          text: `Nothing happens when you try to combine the ${nameA} and the ${nameB}.`,
        });
        break;
      }

      const recipe = (parserPack as any).recipes?.find((r: any) => r.id === action.recipeId);
      if (!recipe) {
        return {
          state,
          events: [{ type: "rejected", reason: `Recipe '${action.recipeId}' not found.` }],
          ok: false,
          rejectionReason: `Recipe not found.`,
        };
      }

      // Check conditions
      if (recipe.conditions && recipe.conditions.length > 0) {
        if (!evaluateConditions(newState, recipe.conditions)) {
          const failMsg = recipe.failure_msg ?? `Conditions for this recipe are not met.`;
          return {
            state,
            events: [{ type: "rejected", reason: failMsg }],
            ok: false,
            rejectionReason: failMsg,
          };
        }
      }

      // Check ingredients & tools in inventory
      const tempInv = [...newState.inventory];
      const missingIngredients: string[] = [];
      recipe.ingredients.forEach((ing: string) => {
        const idx = tempInv.indexOf(ing);
        if (idx !== -1) {
          tempInv.splice(idx, 1);
        } else {
          missingIngredients.push(ing);
        }
      });

      const missingTools: string[] = [];
      const tools = recipe.tools || [];
      tools.forEach((tool: string) => {
        const idx = tempInv.indexOf(tool);
        if (idx !== -1) {
          // tool is present
        } else {
          missingTools.push(tool);
        }
      });

      const missing = [...missingIngredients, ...missingTools];
      if (missing.length > 0) {
        return {
          state,
          events: [{ type: "rejected", reason: `You are missing: ${missing.join(", ")}.` }],
          ok: false,
          rejectionReason: `Missing ingredients/tools.`,
        };
      }

      // Consume ingredients
      recipe.ingredients.forEach((ing: string) => {
        const idx = newState.inventory.indexOf(ing);
        if (idx !== -1) {
          newState.inventory.splice(idx, 1);
        }
      });

      // Add result
      newState.inventory.push(recipe.result);

      // Apply effects
      if (recipe.effects && recipe.effects.length > 0) {
        const effectResult = applyEffects(newState, recipe.effects, pack);
        newState = effectResult.state;
        events.push(...effectResult.events);
      }

      // Narration
      const resultObj = findObjectInPack(recipe.result);
      const resultName = resultObj?.name ?? recipe.result;
      const successText = recipe.success_msg ?? `You combined the items to craft ${resultName}.`;
      events.push({
        type: "narration",
        text: successText,
      });

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

  if (!newState.ended && currentRoom) {
    if (!isRoomIlluminated(newState, currentRoom, parserPack)) {
      const darkTurns = (newState.vars["dark_turns"] ?? 0) + 1;
      newState.vars["dark_turns"] = darkTurns;
      if (darkTurns >= 2) {
        newState.ended = true;
        newState.endingId = "grue_death";
        events.push({
          type: "narration",
          text: "Suddenly, out of the darkness, a grue pounces and devours you in a single bite!",
        });
        events.push({
          type: "ending",
          endingId: "grue_death",
          title: "Eaten by a Grue",
          text: "You have been eaten by a grue. Your adventure ends here.",
        });
      }
    } else {
      if (newState.vars["dark_turns"] !== undefined) {
        newState.vars["dark_turns"] = 0;
      }
    }
  } else if (newState.ended) {
    if (newState.vars["dark_turns"] !== undefined) {
      newState.vars["dark_turns"] = 0;
    }
  }

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
): { weather: string; temperature: string; wind: string } {
  const defaultWeathers = ["clear", "rain", "fog", "storm"];
  const weathers = weatherPool && weatherPool.length > 0 ? weatherPool : defaultWeathers;
  const temperatures = ["cold", "mild", "hot"];
  const winds = ["calm", "breezy", "gale", "tempest"];

  // Compute a deterministic hash of seed + floor(step / 5)
  const interval = Math.floor(step / 5);
  // A simple deterministic PRNG hash that won't consume state.seed
  const h1 = Math.abs(Math.imul(seed ^ interval, 0x6d2b79f5)) | 0;
  const weatherIndex = h1 % weathers.length;

  const h2 = Math.abs(Math.imul(h1 ^ 0x6d2b79f5, 0x6d2b79f5)) | 0;
  const tempIndex = h2 % temperatures.length;

  const h3 = Math.abs(Math.imul(h2 ^ 0x6d2b79f5, 0x6d2b79f5)) | 0;
  const windIndex = h3 % winds.length;

  return {
    weather: weathers[weatherIndex],
    temperature: temperatures[tempIndex],
    wind: winds[windIndex],
  };
}

/**
 * Ticks the production status of all contraband production labs.
 * Triggers enforcement raids using pure mulberry32 PRNG.
 */
export function tickProductionLabs(state: GameState, events: GameEvent[], pack?: CYOAPack | ParserPack): GameState {
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
      const factionId = newState.territoryControl?.[roomId];
      const hasFactionBribe = factionId && newState.bribes?.[factionId] && newState.bribes[factionId].amount > 0;

      const turfSyndicateId = newState.syndicateTurf?.[roomId];
      const turfSyndicate = turfSyndicateId ? newState.syndicates?.[turfSyndicateId] : undefined;
      const hasTurfWarChest = turfSyndicate && (turfSyndicate.warChest ?? 0) > 0;

      let decayAmount = activeBribe ? 3 : 1;
      if (hasFactionBribe) {
        decayAmount += 2;
      }
      if (hasTurfWarChest) {
        decayAmount += 1;
      }

      updatedHeat[roomId] = {
        ...entry,
        heat: Math.max(0, entry.heat - decayAmount),
      };
      heatChanged = true;
    }
  }

  // Periodic Sovereign Debt / Bond monetization (AF-123)
  if (newState.factionReserveBonds && Object.keys(newState.factionReserveBonds).length > 0) {
    const updatedBonds = { ...newState.factionReserveBonds };
    const updatedSyndicates = { ...(newState.syndicates || {}) };
    const updatedFactionReserves = { ...(newState.factionReservePools || {}) };
    const updatedFactionRep = { ...(newState.factionRep || {}) };
    const updatedSecondaryReserves = newState.secondaryReserves ? { ...newState.secondaryReserves } : {};
    const updatedSecondaryReserveInvestments = newState.secondaryReserveInvestments
      ? JSON.parse(JSON.stringify(newState.secondaryReserveInvestments))
      : {};
    const updatedSweepPolicies = newState.reserveSweepPolicies ? { ...newState.reserveSweepPolicies } : {};

    for (const [bondId, bond] of Object.entries(updatedBonds)) {
      if (bond.status === "Active") {
        const syndicate = updatedSyndicates[bond.syndicateId];
        if (!syndicate) continue;

        // Determine coupon payment amount for this tick
        let payout = bond.couponPayout;
        if (bond.remainingEpochs === 1) {
          // Final payment pays whatever is left to avoid rounding errors
          payout = bond.remainingRepayment;
        }

        const policy = updatedSweepPolicies[bond.syndicateId];
        const sweepMargin = policy?.sweepMargin ?? 500;

        // Check if we need to auto-sweep reserves/investments
        if ((syndicate.warChest ?? 0) < payout || (syndicate.warChest ?? 0) < sweepMargin) {
          // 1. Sweep from secondary reserves
          const reserveEntry = updatedSecondaryReserves[bond.syndicateId];
          if (reserveEntry && reserveEntry.reserveGold > 0) {
            const needed = payout - (syndicate.warChest ?? 0);
            if (needed > 0) {
              const sweepAmount = Math.min(reserveEntry.reserveGold, needed);
              reserveEntry.reserveGold -= sweepAmount;
              syndicate.warChest = (syndicate.warChest ?? 0) + sweepAmount;

              events.push({
                type: "narration",
                text: `🔄 [Automated Sweep] Swept ${sweepAmount} gold from secondary reserves of syndicate ${bond.syndicateId} to cover coupon payout.`,
              } as any);
              if (!newState.journal) newState.journal = [];
              newState.journal.push(
                `[Automated Sweep] Swept ${sweepAmount} gold from secondary reserves of syndicate ${bond.syndicateId}.`
              );
            }
          }

          // 2. Sweep/liquidate from secondary reserve vault investments
          const investments = updatedSecondaryReserveInvestments[bond.syndicateId] || {};
          for (const [vaultId, investment] of Object.entries(investments)) {
            const needed = payout - (syndicate.warChest ?? 0);
            if (needed <= 0) break;
            const investedGold = (investment as any).investedGold ?? 0;
            if (investedGold > 0) {
              const liquidateAmount = Math.min(investedGold, needed);
              (investment as any).investedGold -= liquidateAmount;
              syndicate.warChest = (syndicate.warChest ?? 0) + liquidateAmount;

              events.push({
                type: "narration",
                text: `💰 [Automated Sweep] Liquidated ${liquidateAmount} gold from secondary reserve vault ${vaultId} for syndicate ${bond.syndicateId} to cover coupon payout.`,
              } as any);
              if (!newState.journal) newState.journal = [];
              newState.journal.push(
                `[Automated Sweep] Liquidated ${liquidateAmount} gold from secondary reserve vault ${vaultId} for syndicate ${bond.syndicateId}.`
              );
            }
          }
        }

        if ((syndicate.warChest ?? 0) >= payout) {
          // Amortize debt successfully
          syndicate.warChest = (syndicate.warChest ?? 0) - payout;
          updatedFactionReserves[bond.factionId] = (updatedFactionReserves[bond.factionId] ?? 10000) + payout;

          const remainingRepayment = Math.max(0, bond.remainingRepayment - payout);
          const remainingEpochs = Math.max(0, bond.remainingEpochs - 1);
          const status = remainingEpochs === 0 ? ("Matured" as const) : ("Active" as const);

          updatedBonds[bondId] = {
            ...bond,
            remainingRepayment,
            remainingEpochs,
            status,
          };

          events.push({
            type: "narration",
            text: `🏛️ [Sovereign Debt Monetization] Syndicate ${bond.syndicateId} paid bond coupon of ${payout} gold to faction ${bond.factionId}. Remaining debt: ${remainingRepayment} gold.`,
          } as any);

          if (!newState.journal) newState.journal = [];
          newState.journal.push(
            `[Sovereign Debt Monetization] Syndicate ${bond.syndicateId} paid bond coupon of ${payout} gold to faction ${bond.factionId}.`
          );
        } else {
          // Syndicate default!
          updatedBonds[bondId] = {
            ...bond,
            status: "Defaulted" as const,
          };

          // Deduct reputation standing heavily (-20)
          updatedFactionRep[bond.factionId] = Math.max(0, (updatedFactionRep[bond.factionId] ?? 0) - 20);

          if (policy) {
            policy.active = true;
            policy.timestamp = newState.step;

            events.push({
              type: "narration",
              text: `⚠️ [Reserve Sweep Activated] Syndicate ${bond.syndicateId} has defaulted and entered active reserve sweep liquidation mode at tariff rate ${policy.tariffLiquidationRate * 100}%.`,
            } as any);
            if (!newState.journal) newState.journal = [];
            newState.journal.push(
              `[Reserve Sweep Activated] Active sweep policy enabled for syndicate ${bond.syndicateId} at tariff rate ${policy.tariffLiquidationRate * 100}%.`
            );
          } else {
            events.push({
              type: "narration",
              text: `⚠️ [Sovereign Debt Default] Syndicate ${bond.syndicateId} defaulted on bond coupon payment of ${payout} gold to faction ${bond.factionId}! Reputation standing heavily penalized.`,
            } as any);
          }

          if (!newState.journal) newState.journal = [];
          newState.journal.push(
            `[Sovereign Debt Default] Syndicate ${bond.syndicateId} defaulted on coupon payment of ${payout} gold to faction ${bond.factionId}.`
          );
        }
      }
    }

    newState.factionReserveBonds = updatedBonds;
    newState.syndicates = updatedSyndicates;
    newState.factionReservePools = updatedFactionReserves;
    newState.factionRep = updatedFactionRep;
    newState.secondaryReserves = updatedSecondaryReserves;
    newState.secondaryReserveInvestments = updatedSecondaryReserveInvestments;
    newState.reserveSweepPolicies = updatedSweepPolicies;
  }

  // Automated secondary bond market-maker bids (AF-139)
  if (newState.secondaryBondListings && Object.keys(newState.secondaryBondListings).length > 0) {
    const updatedListings = { ...newState.secondaryBondListings };
    let listingsChanged = false;

    for (const [listingId, listing] of Object.entries(updatedListings)) {
      if (listing.status === "Open") {
        const currentBids = listing.bids ? { ...listing.bids } : {};
        if (!currentBids["market_maker"]) {
          const { value: bidRoll, nextSeed } = PureRand.nextInt(newState.seed, 1, 100);
          newState.seed = nextSeed;

          if (bidRoll <= 50) {
            // Determine bid amount (85% to 105% of askPrice)
            const { value: pct, nextSeed: s2 } = PureRand.nextInt(newState.seed, 85, 105);
            newState.seed = s2;
            const bidAmount = Math.floor(listing.askPrice * (pct / 100));

            currentBids["market_maker"] = {
              bidderSyndicateId: "market_maker",
              bidAmount: Math.max(1, bidAmount),
              timestamp: newState.step,
            };
            listing.bids = currentBids;
            listingsChanged = true;

            events.push({
              type: "narration",
              text: `📈 [Market Maker Bid] Automated MM placed a bid of ${bidAmount} gold on bond listing ${listingId} (Ask: ${listing.askPrice}).`,
            } as any);
            if (!newState.journal) newState.journal = [];
            newState.journal.push(`[Market Maker Bid] MM bid ${bidAmount} gold on listing ${listingId}.`);
          }
        }
      }
    }
    if (listingsChanged) {
      newState.secondaryBondListings = updatedListings;
    }
  }

  // Automated secondary reinsurance market-maker bids (AF-146)
  if (
    newState.swfYieldCDOTrancheReinsuranceListings &&
    Object.keys(newState.swfYieldCDOTrancheReinsuranceListings).length > 0
  ) {
    const updatedListings = { ...newState.swfYieldCDOTrancheReinsuranceListings };
    let listingsChanged = false;

    for (const [listingId, listing] of Object.entries(updatedListings)) {
      if (listing.status === "Open") {
        const currentBids = listing.bids ? { ...listing.bids } : {};
        if (!currentBids["market_maker"]) {
          const { value: bidRoll, nextSeed } = PureRand.nextInt(newState.seed, 1, 100);
          newState.seed = nextSeed;

          if (bidRoll <= 50) {
            // Determine bid amount (85% to 105% of askPrice)
            const { value: pct, nextSeed: s2 } = PureRand.nextInt(newState.seed, 85, 105);
            newState.seed = s2;
            const bidAmount = Math.floor(listing.askPrice * (pct / 100));

            currentBids["market_maker"] = {
              bidderSyndicateId: "market_maker",
              bidAmount: Math.max(1, bidAmount),
              timestamp: newState.step,
            };
            listing.bids = currentBids;
            listingsChanged = true;

            events.push({
              type: "narration",
              text: `📈 [Reinsurance Market Maker Bid] Automated MM placed a bid of ${bidAmount} gold on reinsurance listing ${listingId} (Ask: ${listing.askPrice}).`,
            } as any);
            if (!newState.journal) newState.journal = [];
            newState.journal.push(`[Reinsurance Market Maker Bid] MM bid ${bidAmount} gold on listing ${listingId}.`);
          }
        }
      }
    }
    if (listingsChanged) {
      newState.swfYieldCDOTrancheReinsuranceListings = updatedListings;
    }
  }

  // Automated secondary reinsurance options market-maker bids (AF-148)
  if (newState.swfReinsuranceOptionsListings && Object.keys(newState.swfReinsuranceOptionsListings).length > 0) {
    const updatedListings = { ...newState.swfReinsuranceOptionsListings };
    let listingsChanged = false;

    for (const [listingId, listing] of Object.entries(updatedListings)) {
      if (listing.status === "Open") {
        const currentBids = listing.bids ? { ...listing.bids } : {};
        if (!currentBids["market_maker"]) {
          const { value: bidRoll, nextSeed } = PureRand.nextInt(newState.seed, 1, 100);
          newState.seed = nextSeed;

          if (bidRoll <= 50) {
            // Determine bid amount (85% to 105% of askPrice)
            const { value: pct, nextSeed: s2 } = PureRand.nextInt(newState.seed, 85, 105);
            newState.seed = s2;
            const bidAmount = Math.floor(listing.askPrice * (pct / 100));

            currentBids["market_maker"] = {
              bidderSyndicateId: "market_maker",
              bidAmount: Math.max(1, bidAmount),
              timestamp: newState.step,
            };
            listing.bids = currentBids;
            listingsChanged = true;

            events.push({
              type: "narration",
              text: `📈 [Options Market Maker Bid] Automated MM placed a bid of ${bidAmount} gold on reinsurance option listing ${listingId} (Ask: ${listing.askPrice}).`,
            } as any);
            if (!newState.journal) newState.journal = [];
            newState.journal.push(
              `[Options Market Maker Bid] MM bid ${bidAmount} gold on option listing ${listingId}.`
            );
          }
        }
      }
    }
    if (listingsChanged) {
      newState.swfReinsuranceOptionsListings = updatedListings;
    }
  }

  // Periodic Cooperative Sovereignty Bond dividend and maturation (AF-138)
  if (
    newState.cooperativeSovereigntyBondProposals &&
    Object.keys(newState.cooperativeSovereigntyBondProposals).length > 0
  ) {
    const updatedCoopBonds = { ...newState.cooperativeSovereigntyBondProposals };
    const updatedSyndicates = { ...(newState.syndicates || {}) };
    const updatedFactionReserves = { ...(newState.factionReservePools || {}) };

    for (const [bondId, bond] of Object.entries(updatedCoopBonds)) {
      if (bond.status === "Active" && bond.resolved) {
        const { factionId, faceValue, interestRate, contributions } = bond;
        const totalContributed = Object.values(contributions).reduce((sum, v) => sum + v, 0);
        if (totalContributed <= 0) continue;

        const isFinalEpoch = bond.remainingEpochs === 1;
        const dividend = Math.floor(faceValue * (interestRate / 100));
        let epochPayout = dividend;
        if (isFinalEpoch) {
          epochPayout += faceValue;
        }

        const factionPool = updatedFactionReserves[factionId] ?? 10000;
        let payAmount = epochPayout;
        let isDefault = false;

        if (factionPool < epochPayout) {
          payAmount = factionPool;
          isDefault = true;
        }

        // Deduct from faction reserve pool
        updatedFactionReserves[factionId] = Math.max(0, factionPool - payAmount);

        // Distribute to contributing syndicates based on contribution ratio
        for (const [syndicateId, contrib] of Object.entries(contributions)) {
          const ratio = contrib / totalContributed;
          const share = Math.floor(payAmount * ratio);
          if (share <= 0) continue;

          if (syndicateId.startsWith("pool_")) {
            const poolId = syndicateId.substring(5);
            const pool = newState.sovereignBondLendingPools?.[poolId];
            if (pool && pool.totalDeposited > 0) {
              // Distribute this share to the pool depositors pro-rata
              let poolDistributed = 0;
              const depositors = Object.keys(pool.deposits);
              for (let i = 0; i < depositors.length; i++) {
                const depSyndicateId = depositors[i];
                const depShare =
                  i === depositors.length - 1
                    ? share - poolDistributed
                    : Math.floor(share * ((pool.deposits[depSyndicateId] || 0) / pool.totalDeposited));
                poolDistributed += depShare;
                const depSyndicate = updatedSyndicates[depSyndicateId];
                if (depSyndicate) {
                  depSyndicate.warChest = (depSyndicate.warChest ?? 0) + depShare;
                }
              }
            }
          } else {
            const syndicate = updatedSyndicates[syndicateId];
            if (syndicate) {
              syndicate.warChest = (syndicate.warChest ?? 0) + share;
            }
          }
        }

        const remainingEpochs = Math.max(0, bond.remainingEpochs - 1);
        let newStatus: "Proposed" | "Active" | "Matured" | "Defaulted" = bond.status;
        if (isDefault) {
          newStatus = "Defaulted";
        } else if (remainingEpochs === 0) {
          newStatus = "Matured";
        }

        updatedCoopBonds[bondId] = {
          ...bond,
          remainingEpochs,
          status: newStatus,
        };

        if (!newState.journal) newState.journal = [];
        if (isDefault) {
          newState.journal.push(
            `[Cooperative Sovereignty Bond Defaulted] Faction ${factionId} defaulted on cooperative bond ${bondId} due to insufficient reserves (Paid only ${payAmount} gold).`
          );
          events.push({
            type: "narration",
            text: `⚠️ [Cooperative Sovereignty Bond Defaulted] Faction ${factionId} defaulted on cooperative bond ${bondId}.`,
          } as any);
        } else if (newStatus === "Matured") {
          newState.journal.push(
            `[Cooperative Sovereignty Bond Matured] Cooperative bond ${bondId} for faction ${factionId} has matured. Principal of ${faceValue} and final dividend of ${dividend} gold returned to sponsors.`
          );
          events.push({
            type: "narration",
            text: `🎉 [Cooperative Sovereignty Bond Matured] Cooperative bond ${bondId} for faction ${factionId} matured successfully!`,
          } as any);
        } else {
          newState.journal.push(
            `[Cooperative Sovereignty Bond Dividend] Cooperative bond ${bondId} for faction ${factionId} distributed ${dividend} gold dividend yield to sponsors.`
          );
          events.push({
            type: "narration",
            text: `🏛️ [Cooperative Sovereignty Bond Dividend] Faction ${factionId} distributed ${dividend} gold dividend yield to sponsors of bond ${bondId}.`,
          } as any);
        }
      }
    }

    newState.cooperativeSovereigntyBondProposals = updatedCoopBonds;
    newState.syndicates = updatedSyndicates;
    newState.factionReservePools = updatedFactionReserves;
  }

  // Periodic Sovereign Bond Borrowing & Short Selling Yield/Maintenance/Liquidation ticks (AF-140)
  if (newState.sovereignBondBorrowPositions && Object.keys(newState.sovereignBondBorrowPositions).length > 0) {
    const updatedPositions = { ...newState.sovereignBondBorrowPositions };
    const syndicates = { ...(newState.syndicates || {}) };
    let positionsChanged = false;

    // Update dynamic lending pool fee rates based on utilization before processing positions
    if (newState.sovereignBondLendingPools && Object.keys(newState.sovereignBondLendingPools).length > 0) {
      for (const pool of Object.values(newState.sovereignBondLendingPools)) {
        let U = pool.totalDeposited > 0 ? pool.totalBorrowed / pool.totalDeposited : 0;

        // Faction-backed liquidity injection if utilization exceeds 80% (AF-142)
        if (U > 0.8) {
          const bond = newState.cooperativeSovereigntyBondProposals?.[pool.bondId];
          if (bond) {
            const factionId = bond.factionId;
            // Target utilization after injection: 70%
            const targetU = 0.7;
            const injectionAmount = Math.max(1, Math.ceil(pool.totalBorrowed / targetU) - pool.totalDeposited);

            // Perform injection
            pool.deposits[factionId] = (pool.deposits[factionId] ?? 0) + injectionAmount;
            pool.totalDeposited += injectionAmount;

            // Update bond contributions for the pool
            if (bond.contributions) {
              const poolKey = `pool_${pool.id}`;
              bond.contributions[poolKey] = (bond.contributions[poolKey] ?? 0) + injectionAmount;
            }

            // Also deduct from faction reserve pool if possible (to simulate capital deployment)
            if (newState.factionReservePools) {
              const reserve = newState.factionReservePools[factionId] ?? 10000;
              newState.factionReservePools[factionId] = Math.max(0, reserve - Math.floor(injectionAmount * 0.5));
            }

            // Recalculate utilization
            U = pool.totalDeposited > 0 ? pool.totalBorrowed / pool.totalDeposited : 0;

            if (!newState.journal) newState.journal = [];
            newState.journal.push(
              `[Faction Liquidity Injection] Faction ${factionId} injected ${injectionAmount} shares into pool ${pool.id} due to high utilization (${(U * 100).toFixed(1)}%).`
            );
            events.push({
              type: "narration",
              text: `🏛️ [Faction Liquidity Injection] Faction ${factionId} injected ${injectionAmount} shares into pool ${pool.id} to stabilize credit liquidity.`,
            } as any);
          }
        }

        pool.borrowFeeRate = 5 + 10 * U;
      }
    }

    // Automated SWF Sovereign Bond Arbitrage Routing and Reallocation (AF-142)
    if (
      newState.marginAccounts &&
      newState.sovereignBondLendingPools &&
      Object.keys(newState.sovereignBondLendingPools).length > 0
    ) {
      const updatedPools = { ...newState.sovereignBondLendingPools };
      let poolsChanged = false;

      for (const [syndicateId, marginAccount] of Object.entries(newState.marginAccounts)) {
        if (
          marginAccount.swfBondArbitrageEnabled &&
          marginAccount.swfBondArbitrageTargetPools &&
          marginAccount.swfBondArbitrageTargetPools.length > 0
        ) {
          const targetPoolIds = marginAccount.swfBondArbitrageTargetPools;

          // Find valid active target pools
          const activeTargetPools = targetPoolIds
            .map((id) => updatedPools[id])
            .filter((p) => p !== undefined) as SovereignBondLendingPool[];

          if (activeTargetPools.length === 0) continue;

          // Group pools by their underlying bondId
          const poolsByBond: Record<string, SovereignBondLendingPool[]> = {};
          for (const pool of activeTargetPools) {
            if (!poolsByBond[pool.bondId]) {
              poolsByBond[pool.bondId] = [];
            }
            poolsByBond[pool.bondId].push(pool);
          }

          for (const [bondId, pools] of Object.entries(poolsByBond)) {
            if (pools.length < 1) continue;

            // Find the best pool (highest borrowFeeRate)
            let bestPool = pools[0];
            for (const pool of pools) {
              if (pool.borrowFeeRate > bestPool.borrowFeeRate) {
                bestPool = pool;
              }
            }

            // 1. Reallocate between pools (worst pool -> best pool)
            if (pools.length > 1) {
              // Find the worst pool (lowest borrowFeeRate) where the syndicate has non-zero deposits
              let worstPool: SovereignBondLendingPool | undefined = undefined;
              for (const pool of pools) {
                if (pool.id === bestPool.id) continue;
                const dep = pool.deposits[syndicateId] ?? 0;
                if (dep > 0) {
                  if (!worstPool || pool.borrowFeeRate < worstPool.borrowFeeRate) {
                    worstPool = pool;
                  }
                }
              }

              if (worstPool) {
                const spread = bestPool.borrowFeeRate - worstPool.borrowFeeRate;
                const minSpread = marginAccount.swfBondArbitrageMinYieldSpread ?? 0.0;

                if (spread >= minSpread) {
                  const worstPoolUnborrowed = worstPool.totalDeposited - worstPool.totalBorrowed;
                  const maxMoveFromWorst = Math.min(worstPool.deposits[syndicateId] ?? 0, worstPoolUnborrowed);
                  const limit = marginAccount.swfBondArbitrageMaxCapital ?? 999999;
                  const amountToMove = Math.min(maxMoveFromWorst, limit);

                  if (amountToMove > 0) {
                    // Perform reallocation
                    worstPool.deposits[syndicateId] = (worstPool.deposits[syndicateId] ?? 0) - amountToMove;
                    if (worstPool.deposits[syndicateId] === 0) {
                      delete worstPool.deposits[syndicateId];
                    }
                    worstPool.totalDeposited -= amountToMove;

                    bestPool.deposits[syndicateId] = (bestPool.deposits[syndicateId] ?? 0) + amountToMove;
                    bestPool.totalDeposited += amountToMove;

                    // Update dynamic rates
                    const worstU =
                      worstPool.totalDeposited > 0 ? worstPool.totalBorrowed / worstPool.totalDeposited : 0;
                    worstPool.borrowFeeRate = 5 + 10 * worstU;

                    const bestU = bestPool.totalDeposited > 0 ? bestPool.totalBorrowed / bestPool.totalDeposited : 0;
                    bestPool.borrowFeeRate = 5 + 10 * bestU;

                    // Update underlying bond contributions
                    const bond = newState.cooperativeSovereigntyBondProposals?.[bondId];
                    if (bond && bond.contributions) {
                      const worstPoolKey = `pool_${worstPool.id}`;
                      const bestPoolKey = `pool_${bestPool.id}`;

                      bond.contributions[worstPoolKey] = (bond.contributions[worstPoolKey] ?? 0) - amountToMove;
                      if (bond.contributions[worstPoolKey] === 0) {
                        delete bond.contributions[worstPoolKey];
                      }
                      bond.contributions[bestPoolKey] = (bond.contributions[bestPoolKey] ?? 0) + amountToMove;
                    }

                    poolsChanged = true;

                    if (!newState.journal) newState.journal = [];
                    newState.journal.push(
                      `[SWF Bond Arbitrage Reallocation] Routed ${amountToMove} bond shares from pool ${worstPool.id} (yield: ${worstPool.borrowFeeRate.toFixed(2)}%) to pool ${bestPool.id} (yield: ${bestPool.borrowFeeRate.toFixed(2)}%) for Syndicate ${syndicateId} (Spread: ${spread.toFixed(2)}%).`
                    );
                    events.push({
                      type: "narration",
                      text: `📈 [SWF Bond Arbitrage Reallocation] Routed ${amountToMove} bond shares from pool ${worstPool.id} to pool ${bestPool.id} to maximize yield (Spread: ${spread.toFixed(2)}%).`,
                    } as any);
                  }
                }
              }
            }

            // 2. Deploy fresh capital (direct bond holdings -> best pool)
            const bond = newState.cooperativeSovereigntyBondProposals?.[bondId];
            if (bond && bond.contributions && bond.contributions[syndicateId] && bond.contributions[syndicateId] > 0) {
              const freshCapital = bond.contributions[syndicateId];
              const limit = marginAccount.swfBondArbitrageMaxCapital ?? 999999;
              const amountToDeploy = Math.min(freshCapital, limit);

              if (amountToDeploy > 0) {
                // Perform fresh deployment
                bestPool.deposits[syndicateId] = (bestPool.deposits[syndicateId] ?? 0) + amountToDeploy;
                bestPool.totalDeposited += amountToDeploy;

                const bestU = bestPool.totalDeposited > 0 ? bestPool.totalBorrowed / bestPool.totalDeposited : 0;
                bestPool.borrowFeeRate = 5 + 10 * bestU;

                bond.contributions[syndicateId] -= amountToDeploy;
                if (bond.contributions[syndicateId] === 0) {
                  delete bond.contributions[syndicateId];
                }

                const bestPoolKey = `pool_${bestPool.id}`;
                bond.contributions[bestPoolKey] = (bond.contributions[bestPoolKey] ?? 0) + amountToDeploy;

                poolsChanged = true;

                if (!newState.journal) newState.journal = [];
                newState.journal.push(
                  `[SWF Bond Arbitrage Fresh Deployment] Deployed ${amountToDeploy} fresh bond shares into pool ${bestPool.id} (yield: ${bestPool.borrowFeeRate.toFixed(2)}%) for Syndicate ${syndicateId}.`
                );
                events.push({
                  type: "narration",
                  text: `📈 [SWF Bond Arbitrage Fresh Deployment] Deployed ${amountToDeploy} fresh bond shares into pool ${bestPool.id} to maximize yield.`,
                } as any);
              }
            }
          }
        }
      }

      if (poolsChanged) {
        newState.sovereignBondLendingPools = updatedPools;
      }
    }

    for (const [posId, pos] of Object.entries(updatedPositions)) {
      if (pos.status === "Active" || pos.status === "ShortSold") {
        const borrowerSyndicate = syndicates[pos.borrowerSyndicateId];
        const poolId = pos.lendingPoolId;
        const pool = poolId ? newState.sovereignBondLendingPools?.[poolId] : undefined;
        const lenderSyndicate = !pool ? syndicates[pos.lenderSyndicateId] : undefined;
        const bond = newState.cooperativeSovereigntyBondProposals?.[pos.bondId];

        if (!borrowerSyndicate || (!lenderSyndicate && !pool) || !bond) continue;

        if (pool) {
          pos.borrowFeeRate = pool.borrowFeeRate;
        }

        // 1. Calculate borrow fee
        const borrowerMargin = newState.marginAccounts?.[pos.borrowerSyndicateId];
        const leverageFactor = borrowerMargin?.swfLeverageFactor ?? 1.0;
        const interestRate = bond.interestRate ?? 5;

        const baseFee = pos.amount * (pos.borrowFeeRate / 100);
        const scaledFee = Math.max(1, Math.floor(baseFee * leverageFactor * (1 + interestRate / 100)));

        // 2. Determine if borrower has enough funds for borrow fee + dividend (if ShortSold)
        let dividendAmount = 0;
        if (pos.status === "ShortSold") {
          dividendAmount = Math.floor(pos.amount * (interestRate / 100));
        }
        const totalOwedThisTick = scaledFee + dividendAmount;

        const borrowerTotalGold = (borrowerSyndicate.warChest ?? 0) + pos.collateralGold;

        if (borrowerTotalGold < totalOwedThisTick) {
          // LIQUIDATE DUE TO INSOLVENCY/DEFAULT
          const confiscatedCollateral = pos.collateralGold;
          const borrowerRemainingWarChest = borrowerSyndicate.warChest ?? 0;
          const totalCompensation = confiscatedCollateral + borrowerRemainingWarChest;

          borrowerSyndicate.warChest = 0;
          if (pool) {
            // Distribute to depositors pro-rata
            let distributed = 0;
            const depositors = Object.keys(pool.deposits);
            for (let i = 0; i < depositors.length; i++) {
              const depSyndicateId = depositors[i];
              const shareAmount =
                i === depositors.length - 1
                  ? totalCompensation - distributed
                  : Math.floor(totalCompensation * ((pool.deposits[depSyndicateId] || 0) / pool.totalDeposited));
              distributed += shareAmount;
              const depSyndicate = syndicates[depSyndicateId];
              if (depSyndicate) {
                depSyndicate.warChest = (depSyndicate.warChest ?? 0) + shareAmount;
              }
            }
            pool.totalBorrowed = Math.max(0, pool.totalBorrowed - pos.amount);
          } else if (lenderSyndicate) {
            lenderSyndicate.warChest = (lenderSyndicate.warChest ?? 0) + totalCompensation;
          }

          updatedPositions[posId] = {
            ...pos,
            collateralGold: 0,
            status: "Liquidated" as const,
          };
          positionsChanged = true;

          if (!newState.journal) newState.journal = [];
          newState.journal.push(
            `[Sovereign Bond Liquidation] Forced liquidation of position ${posId} due to borrow fee/dividend default. Lender compensated with ${totalCompensation} gold.`
          );
          events.push({
            type: "narration",
            text: `⚠️ [Sovereign Bond Liquidation] Forced liquidation of position ${posId} due to borrow fee/dividend default. Lender compensated with ${totalCompensation} gold.`,
          } as any);

          continue;
        }

        // Deduct fees and pay lender/pool depositors pro-rata
        let remainingOwed = totalOwedThisTick;
        const warChestDeduction = Math.min(borrowerSyndicate.warChest ?? 0, remainingOwed);
        borrowerSyndicate.warChest = (borrowerSyndicate.warChest ?? 0) - warChestDeduction;
        remainingOwed -= warChestDeduction;

        let collateralDeduction = 0;
        if (remainingOwed > 0) {
          collateralDeduction = remainingOwed;
          pos.collateralGold -= collateralDeduction;
        }

        if (pool) {
          // Distribute to depositors pro-rata
          let distributed = 0;
          const depositors = Object.keys(pool.deposits);
          for (let i = 0; i < depositors.length; i++) {
            const depSyndicateId = depositors[i];
            const shareAmount =
              i === depositors.length - 1
                ? totalOwedThisTick - distributed
                : Math.floor(totalOwedThisTick * ((pool.deposits[depSyndicateId] || 0) / pool.totalDeposited));
            distributed += shareAmount;
            const depSyndicate = syndicates[depSyndicateId];
            if (depSyndicate) {
              depSyndicate.warChest = (depSyndicate.warChest ?? 0) + shareAmount;
            }
          }

          // Pro-rata reputation rewards to pool depositors
          const repReward = Math.max(1, Math.floor(pool.totalBorrowed / 200));
          let distributedRep = 0;
          if (!newState.factionRep) newState.factionRep = {};
          for (let i = 0; i < depositors.length; i++) {
            const depSyndicateId = depositors[i];
            const repShare =
              i === depositors.length - 1
                ? repReward - distributedRep
                : Math.round(repReward * ((pool.deposits[depSyndicateId] || 0) / pool.totalDeposited));
            distributedRep += repShare;
            if (repShare > 0) {
              newState.factionRep[bond.factionId] = (newState.factionRep[bond.factionId] ?? 0) + repShare;
              newState.factionRep[depSyndicateId] = (newState.factionRep[depSyndicateId] ?? 0) + repShare;
            }
          }
        } else if (lenderSyndicate) {
          lenderSyndicate.warChest = (lenderSyndicate.warChest ?? 0) + totalOwedThisTick;
        }

        pos.accumulatedBorrowFees += scaledFee;
        updatedPositions[posId] = {
          ...pos,
          collateralGold: pos.collateralGold,
          accumulatedBorrowFees: pos.accumulatedBorrowFees,
          borrowFeeRate: pos.borrowFeeRate,
        };
        positionsChanged = true;

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Sovereign Bond Borrow Fee] Position ${posId} accrued ${scaledFee} gold borrow fee${dividendAmount > 0 ? ` and ${dividendAmount} gold dividend` : ""} paid to lender.`
        );

        // 3. Margin call sweep / price change checks for ShortSold position
        if (pos.status === "ShortSold") {
          const pricePerShare = getBondPricePerShare(newState, pos.bondId);
          const liabilityValue = Math.floor(pos.amount * pricePerShare);

          const maintenanceMargin = Math.floor(liabilityValue * 1.2);
          const targetMargin = Math.floor(liabilityValue * 1.5);

          if (pos.collateralGold < maintenanceMargin) {
            // Margin call triggered! Sweep from war chest.
            const shortfall = targetMargin - pos.collateralGold;
            if (shortfall > 0) {
              const swept = Math.min(shortfall, borrowerSyndicate.warChest ?? 0);
              if (swept > 0) {
                pos.collateralGold += swept;
                borrowerSyndicate.warChest = (borrowerSyndicate.warChest ?? 0) - swept;
                newState.journal.push(
                  `[Sovereign Bond Margin Sweep] Swept ${swept} gold from borrower syndicate ${pos.borrowerSyndicateId} war chest to support position ${posId} margin.`
                );
                events.push({
                  type: "narration",
                  text: `🔄 [Sovereign Bond Margin Sweep] Swept ${swept} gold from syndicate ${pos.borrowerSyndicateId} war chest to cover margin call on position ${posId}.`,
                } as any);
                updatedPositions[posId] = {
                  ...pos,
                  collateralGold: pos.collateralGold,
                };
              }
            }

            // Re-check margin after sweep
            if (pos.collateralGold < maintenanceMargin) {
              // Forced liquidation
              const confiscatedCollateral = pos.collateralGold;
              if (pool) {
                // Distribute to depositors pro-rata
                let distributed = 0;
                const depositors = Object.keys(pool.deposits);
                for (let i = 0; i < depositors.length; i++) {
                  const depSyndicateId = depositors[i];
                  const shareAmount =
                    i === depositors.length - 1
                      ? confiscatedCollateral - distributed
                      : Math.floor(
                          confiscatedCollateral * ((pool.deposits[depSyndicateId] || 0) / pool.totalDeposited)
                        );
                  distributed += shareAmount;
                  const depSyndicate = syndicates[depSyndicateId];
                  if (depSyndicate) {
                    depSyndicate.warChest = (depSyndicate.warChest ?? 0) + shareAmount;
                  }
                }
                pool.totalBorrowed = Math.max(0, pool.totalBorrowed - pos.amount);
              } else if (lenderSyndicate) {
                lenderSyndicate.warChest = (lenderSyndicate.warChest ?? 0) + confiscatedCollateral;
              }

              updatedPositions[posId] = {
                ...pos,
                collateralGold: 0,
                status: "Liquidated" as const,
              };
              positionsChanged = true;

              newState.journal.push(
                `[Sovereign Bond Margin Liquidation] Forced liquidation of position ${posId} due to margin call failure. Lender compensated with ${confiscatedCollateral} gold.`
              );
              events.push({
                type: "narration",
                text: `⚠️ [Sovereign Bond Margin Liquidation] Forced liquidation of position ${posId} due to margin call failure. Lender compensated with ${confiscatedCollateral} gold.`,
              } as any);
            }
          }
        }
      }
    }

    if (positionsChanged) {
      newState.sovereignBondBorrowPositions = updatedPositions;
      newState.syndicates = syndicates;
    }
  }

  // Periodic Sovereign Wealth Fund / Joint-Venture Portfolios yields and dividends (AF-128)
  if (newState.jointVenturePortfolios && Object.keys(newState.jointVenturePortfolios).length > 0) {
    const updatedPortfolios = { ...newState.jointVenturePortfolios };
    const updatedFunds = newState.sovereignWealthFunds ? { ...newState.sovereignWealthFunds } : {};
    const updatedSyndicates = { ...(newState.syndicates || {}) };
    const updatedFactionReserves = { ...(newState.factionReservePools || {}) };
    let portfoliosChanged = false;

    for (const [portfolioId, portfolio] of Object.entries(updatedPortfolios)) {
      if (portfolio.status === "Active") {
        const fund = updatedFunds[portfolio.fundId];
        if (!fund) continue;

        // Calculate total contributions to determine fractions
        let totalContributed = 0;
        for (const amt of Object.values(fund.syndicates)) {
          totalContributed += amt;
        }

        if (totalContributed <= 0) continue;

        // Determine yield payout
        let yieldAmount = Math.floor(portfolio.investedAmount * (portfolio.yieldRate / 100));

        if (portfolio.targetType === "FactionBond") {
          const factionId = portfolio.targetId;
          const factionGold = updatedFactionReserves[factionId] ?? 10000;
          if (factionGold < yieldAmount) {
            yieldAmount = factionGold;
          }
          if (yieldAmount > 0) {
            updatedFactionReserves[factionId] = factionGold - yieldAmount;
          }
        }

        if (yieldAmount > 0) {
          // 1. Calculate and distribute derivative yield dividends to token holders (AF-130)
          let totalDerivativePaid = 0;
          if (newState.swfYieldTokens) {
            for (const [tokenId, token] of Object.entries(newState.swfYieldTokens)) {
              if (token.portfolioId === portfolioId) {
                for (const [syndicateId, sharesOwned] of Object.entries(token.syndicateShares)) {
                  if (sharesOwned > 0) {
                    const dividend = Math.floor(yieldAmount * (sharesOwned / token.totalShares));
                    if (dividend > 0) {
                      const syndicate = updatedSyndicates[syndicateId];
                      if (syndicate) {
                        syndicate.warChest = (syndicate.warChest ?? 0) + dividend;
                        totalDerivativePaid += dividend;

                        if (!newState.journal) newState.journal = [];
                        newState.journal.push(
                          `[SWF Yield Token Dividend Paid] Syndicate ${syndicateId} received derivative dividend of ${dividend} gold for owning ${sharesOwned} shares of yield token ${tokenId} linked to portfolio ${portfolioId}.`
                        );
                      }
                    }
                  }
                }
              }
            }
          }

          if (totalDerivativePaid > 0) {
            events.push({
              type: "narration",
              text: `📈 [SWF Yield Token Payout] Yield token holders received ${totalDerivativePaid} gold in derivative dividends from portfolio ${portfolioId}.`,
            } as any);
          }

          // 2. Distribute remaining fractional dividends to original SWF syndicates
          const remainingYield = Math.max(0, yieldAmount - totalDerivativePaid);
          if (remainingYield > 0) {
            for (const [syndicateId, contribution] of Object.entries(fund.syndicates)) {
              const syndicate = updatedSyndicates[syndicateId];
              if (!syndicate) continue;

              const factionShare = contribution / totalContributed;
              const dividend = Math.floor(remainingYield * factionShare);

              if (dividend > 0) {
                syndicate.warChest = (syndicate.warChest ?? 0) + dividend;

                if (!newState.journal) newState.journal = [];
                newState.journal.push(
                  `[JV Dividend Paid] Syndicate ${syndicateId} received fractional dividend of ${dividend} gold from joint-venture ${portfolioId} (${(factionShare * 100).toFixed(1)}% share).`
                );
              }
            }

            events.push({
              type: "narration",
              text: `📈 [JV Investment Yield] Joint-venture portfolio ${portfolioId} (${portfolio.targetType} on ${portfolio.targetId}) generated ${yieldAmount} gold in yields, distributed remaining ${remainingYield} gold to SWF ${portfolio.fundId} syndicates.`,
            } as any);
          }

          portfoliosChanged = true;
        }
      }
    }

    if (portfoliosChanged) {
      newState.jointVenturePortfolios = updatedPortfolios;
      newState.sovereignWealthFunds = updatedFunds;
      newState.syndicates = updatedSyndicates;
      newState.factionReservePools = updatedFactionReserves;
    }
  }

  // Automated SWF Multi-Fund Risk Pooling (AF-130)
  if (newState.swfRiskPools && Object.keys(newState.swfRiskPools).length > 0) {
    const updatedRiskPools = { ...newState.swfRiskPools };
    const updatedFunds = newState.sovereignWealthFunds ? { ...newState.sovereignWealthFunds } : {};
    let riskPoolsChanged = false;

    for (const [poolId, riskPool] of Object.entries(updatedRiskPools)) {
      if (riskPool.status === "Active" && riskPool.totalPooledReserves > 0) {
        // Safety threshold for each participating fund: 50 gold
        const safetyThreshold = 50;

        for (const fundId of riskPool.fundIds) {
          const fund = updatedFunds[fundId];
          if (!fund) continue;

          if (fund.totalReserves < safetyThreshold && riskPool.totalPooledReserves > 0) {
            const deficit = safetyThreshold - fund.totalReserves;
            const transferAmount = Math.min(deficit, riskPool.totalPooledReserves);

            if (transferAmount > 0) {
              const oldReserves = fund.totalReserves;
              fund.totalReserves += transferAmount;
              riskPool.totalPooledReserves -= transferAmount;

              // Deduct proportionally from fund contributions in the risk pool
              let totalContributions = 0;
              for (const amt of Object.values(riskPool.fundContributions)) {
                totalContributions += amt;
              }

              if (totalContributions > 0) {
                const updatedContributions = { ...riskPool.fundContributions };
                let remainingDeduction = transferAmount;
                const sortedContributionKeys = Object.keys(updatedContributions).sort(
                  (a, b) => updatedContributions[b] - updatedContributions[a]
                );

                for (const fId of sortedContributionKeys) {
                  const contribution = updatedContributions[fId];
                  const deduction = Math.floor(transferAmount * (contribution / totalContributions));
                  const actualDeduction = Math.min(deduction, contribution, remainingDeduction);

                  updatedContributions[fId] = contribution - actualDeduction;
                  remainingDeduction -= actualDeduction;
                }

                // If there's still a remainder due to floor division, deduct from the highest contributor
                if (remainingDeduction > 0 && sortedContributionKeys.length > 0) {
                  const highestFId = sortedContributionKeys[0];
                  updatedContributions[highestFId] = Math.max(0, updatedContributions[highestFId] - remainingDeduction);
                }

                riskPool.fundContributions = updatedContributions;
              }

              if (!newState.journal) newState.journal = [];
              newState.journal.push(
                `[Risk Pool Auto-Bailout] Risk pool ${poolId} automatically transferred ${transferAmount} gold to bail out SWF ${fundId} (reserves: ${oldReserves} -> ${fund.totalReserves}).`
              );

              events.push({
                type: "narration",
                text: `🛡️ [Risk Pool Auto-Bailout] SWF ${fundId} fell below safety threshold. Risk pool ${poolId} automatically transferred ${transferAmount} gold to restore its reserves.`,
              } as any);

              riskPoolsChanged = true;
            }
          }
        }
      }
    }

    if (riskPoolsChanged) {
      newState.swfRiskPools = updatedRiskPools;
      newState.sovereignWealthFunds = updatedFunds;
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
        const factionId = newState.territoryControl?.[roomId];
        const hasFactionBribe = factionId && newState.bribes?.[factionId] && newState.bribes[factionId].amount > 0;

        const labSyndicateId = lab.syndicateId;
        const labSyndicate = labSyndicateId ? newState.syndicates?.[labSyndicateId] : undefined;
        const hasLabWarChest = labSyndicate && (labSyndicate.warChest ?? 0) > 0;

        const isBribedOrFunded = activeBribe || hasFactionBribe || hasLabWarChest;
        const heatInc = isBribedOrFunded ? Math.floor(productionAmount) : productionAmount * 2;
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
        // Decoy Convoy Diversion (AF-76)
        const activeDecoys = Object.values(newState.decoyConvoys || {}).filter(
          (d) => d.syndicateId === lab.syndicateId && d.status === "en_route"
        );
        if (activeDecoys.length > 0) {
          const decoy = activeDecoys[0];
          newState.decoyConvoys = {
            ...(newState.decoyConvoys || {}),
            [decoy.id]: {
              ...decoy,
              status: "diverted" as const,
              timestamp: newState.step,
            },
          };
          events.push({
            type: "narration",
            text: `[Syndicate] Enforcer raid on the lab in ${roomId} was successfully diverted by decoy convoy ${decoy.id}!`,
          } as any);
          if (!newState.journal) newState.journal = [];
          newState.journal.push(`[Syndicate] Raid in ${roomId} was diverted by decoy convoy ${decoy.id}.`);
          continue; // Skip the raid entirely!
        }

        // Turf Bribe Diversion (AF-76)
        const synd = newState.syndicates?.[lab.syndicateId];
        const turfBribeCost = synd?.turfBribeCost ?? 0;
        if (synd && turfBribeCost > 0 && (synd.warChest ?? 0) >= turfBribeCost) {
          synd.warChest = (synd.warChest ?? 0) - turfBribeCost;
          events.push({
            type: "narration",
            text: `[Syndicate] Enforcer raid on the lab in ${roomId} was successfully diverted by paying a turf bribe of ${turfBribeCost} gold from syndicate ${synd.name} war chest!`,
          } as any);
          if (!newState.journal) newState.journal = [];
          newState.journal.push(
            `[Syndicate] Raid in ${roomId} was diverted by paying a turf bribe of ${turfBribeCost} gold from syndicate ${synd.name} war chest.`
          );
          continue; // Skip the raid entirely!
        }

        // Check if a raid warning was active for this room at this step
        const hasWarning = Object.values(newState.raidWarnings || {}).some(
          (w) => w.roomId === roomId && w.active && w.scheduledStep === newState.step
        );

        if (hasWarning) {
          events.push({
            type: "narration",
            text: `[Syndicate] Pre-emptive raid warning was active! The contraband lab in ${roomId} was successfully evacuated before the raid occurred. No contraband was confiscated!`,
          } as any);
          if (!newState.journal) newState.journal = [];
          newState.journal.push(
            `[Syndicate] Lab in ${roomId} was pre-emptively evacuated due to active raid warning. Stored contraband of ${updatedLab.storedContraband} was saved.`
          );
        } else {
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

            let turretDefenseBonus = 0;
            let turretCount = 0;
            if (outpost && outpost.turrets) {
              for (const turret of Object.values(outpost.turrets)) {
                turretDefenseBonus += turret.firepower + turret.armor;
                turretCount++;
              }
            }

            const defenseScore =
              (updatedLab.defense ?? 0) +
              updatedLab.level * 10 +
              guards * 15 +
              (outpost ? outpost.securityLevel * 25 : 0) +
              turretDefenseBonus;

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
              let repelText = outpost
                ? `[Syndicate] Syndicate defenders, ${guards} hired turf guards, and Defense Outpost successfully repelled the enforcement raid at ${roomId} (Defense: ${defenseScore} vs Raid: ${raidStrength})!`
                : guards > 0
                  ? `[Syndicate] Syndicate defenders and ${guards} hired turf guards successfully repelled the enforcement raid at ${roomId} (Defense: ${defenseScore} vs Raid: ${raidStrength})!`
                  : `[Syndicate] Syndicate defenders successfully repelled the enforcement raid at ${roomId} (Defense: ${defenseScore} vs Raid: ${raidStrength})!`;

              if (outpost && turretCount > 0) {
                repelText = `[Syndicate] Syndicate defenders, ${guards} hired turf guards, and Defense Outpost with ${turretCount} tactical turrets successfully repelled the enforcement raid at ${roomId} (Defense: ${defenseScore} vs Raid: ${raidStrength})!`;
              }

              events.push({
                type: "narration",
                text: repelText,
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

  newState = tickSmugglingConvoys(newState, events, pack);

  return newState;
}

export function tickSmugglingConvoys(state: GameState, events: GameEvent[], _pack?: CYOAPack | ParserPack): GameState {
  const newState = { ...state };
  if (
    (!newState.smugglingConvoys || Object.keys(newState.smugglingConvoys).length === 0) &&
    (!newState.decoyConvoys || Object.keys(newState.decoyConvoys).length === 0)
  ) {
    return newState;
  }

  const updatedConvoys = { ...newState.smugglingConvoys };
  let currentSeed = newState.seed;

  for (const [convoyId, convoy] of Object.entries(updatedConvoys)) {
    if (convoy.status !== "en_route") continue;

    const route = newState.tradeRoutes?.[convoy.routeId];
    if (!route || !route.rooms || route.rooms.length === 0) continue;

    const syndicate = newState.syndicates?.[convoy.syndicateId];
    const hasRingleader = syndicate?.smugglingRingleader !== undefined;
    const speed = hasRingleader ? 2 : 1;

    const updatedConvoy = { ...convoy };

    for (let stepIdx = 0; stepIdx < speed; stepIdx++) {
      if (updatedConvoy.status !== "en_route") break;

      const nextRoomIndex = updatedConvoy.currentRoomIndex + 1;

      if (nextRoomIndex >= route.rooms.length) {
        // Reached destination! Payout
        const dominance = syndicate?.dominance ?? 0;
        const dominanceBonus = Math.floor(dominance * 1.5);

        // Check if destination has active black market
        const destRoom = route.rooms[route.rooms.length - 1];
        const destHasBlackMarket = newState.blackMarkets?.[destRoom] !== undefined;
        const baseValue = destHasBlackMarket ? 200 : 150;
        const payoutGold = updatedConvoy.cargo * baseValue + dominanceBonus;

        const members = syndicate?.members || [convoy.definedBy];
        const share = members.length > 0 ? Math.floor(payoutGold / members.length) : 0;
        if (share > 0) {
          if (!newState.vars) newState.vars = {};
          for (const member of members) {
            const memberGoldKey = member === "player" ? "gold" : `gold_${member}`;
            newState.vars[memberGoldKey] = (newState.vars[memberGoldKey] ?? 0) + share;
          }
        }

        newState.vars["totalConvoyPayouts"] = (newState.vars["totalConvoyPayouts"] ?? 0) + payoutGold;
        updatedConvoy.status = "completed";
        updatedConvoy.currentRoomIndex = route.rooms.length - 1;

        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[Syndicate] Smuggling convoy ${convoyId} successfully completed its route, delivering ${convoy.cargo} cargo. Total payout: ${payoutGold} gold (Distributed ${share} gold to each member).`
        );

        events.push({
          type: "narration",
          text: `💰 Smuggling convoy ${convoyId} arrived at destination! Delivered ${convoy.cargo} cargo, earning ${payoutGold} gold.`,
        } as any);

        events.push({
          type: "smuggling_convoy_completed" as any,
          convoyId,
          syndicateId: convoy.syndicateId,
          payoutGold,
          share,
        } as any);
      } else {
        // Move to next room
        const destRoomId: string = route.rooms[nextRoomIndex];
        const factionId = newState.territoryControl?.[destRoomId];
        let toll = 0;

        if (factionId) {
          const organizerId = convoy.definedBy;
          const rep = newState.factionRep?.[factionId] ?? 0;
          let tax = 5;
          if (rep < 0) {
            tax = 20;
          } else if (rep < 10) {
            tax = 10;
          }
          const rateMultiplier = newState.taxPolicy?.[factionId];
          if (rateMultiplier !== undefined) {
            tax = tax * rateMultiplier;
          }

          let hasAlliedAlliance = false;
          let hasHostileAlliance = false;
          if (newState.alliances && newState.factionRep) {
            for (const [otherFactionId, otherRep] of Object.entries(newState.factionRep)) {
              if (otherFactionId !== factionId && otherRep >= 10) {
                const relation = newState.alliances[factionId]?.[otherFactionId];
                if (relation === "allied") {
                  hasAlliedAlliance = true;
                } else if (relation === "hostile") {
                  hasHostileAlliance = true;
                }
              }
            }
          }
          // Faction-based Trade Route Commercial Warfare: 4x toll multiplier under active rivalry
          let isRouteRival = false;
          if (route.factionId) {
            if (isRivalFaction(newState, route.factionId, factionId)) {
              isRouteRival = true;
            }
          }

          if (isRouteRival) {
            tax = tax * 4;
          } else if (hasAlliedAlliance) {
            tax = 0;
          } else if (hasHostileAlliance) {
            tax = tax * 2;
          }

          // Shadow alliance scaling for convoy (AF-79)
          let hasAlliedShadowAlliance = false;
          let hasHostileShadowAlliance = false;
          if (newState.shadowAlliances && convoy.syndicateId) {
            const relation = newState.shadowAlliances[convoy.syndicateId]?.[factionId];
            if (relation === "allied") {
              hasAlliedShadowAlliance = true;
            } else if (relation === "hostile") {
              hasHostileShadowAlliance = true;
            }
          }

          if (hasAlliedShadowAlliance) {
            tax = 0; // Waive taxes in allied shadow territories
          } else if (hasHostileShadowAlliance) {
            tax = tax * 2; // Double-tax hostile faction regions
          }

          const hasLicense =
            newState.merchantLicenses?.[convoy.syndicateId]?.includes(factionId) === true ||
            newState.merchantLicenses?.[organizerId]?.includes(factionId) === true;
          if (!hasLicense) {
            tax += 15;
          }
          toll = tax * convoy.cargo;

          // Apply Cartel Global Tax if active for this faction
          let cartelTax = 0;
          if (newState.cartels) {
            for (const cartel of Object.values(newState.cartels)) {
              if (cartel.factionId === factionId) {
                const globalTax = newState.cartelGlobalTaxPolicy?.[cartel.id] ?? 0;
                cartelTax = Math.max(cartelTax, globalTax);
              }
            }
          }
          toll += cartelTax * convoy.cargo;

          // Check for Smuggler Guild CBA override for smuggling convoy crossing tolls!
          let hasConvoyCbaOverride = false;
          let convoyCbaToll = toll;
          if (newState.smugglerGuilds && newState.smugglerGuildCbas) {
            for (const guildId of Object.keys(newState.smugglerGuilds)) {
              const guild = newState.smugglerGuilds[guildId];
              if (guild.syndicateId === convoy.syndicateId) {
                const cbaKey = `${guildId}:${convoy.routeId}`;
                const cba = newState.smugglerGuildCbas[cbaKey];
                if (cba !== undefined) {
                  hasConvoyCbaOverride = true;
                  convoyCbaToll = cba.agreedToll * convoy.cargo;
                }
              }
            }
          }
          if (hasConvoyCbaOverride) {
            toll = convoyCbaToll;
          }
        }

        if (toll > 0) {
          if (hasRingleader) {
            toll = Math.round(toll * 0.8); // Coordination toll reduction
          }
          const organizerId = convoy.definedBy;
          const goldKey = organizerId === "player" ? "gold" : `gold_${organizerId}`;
          const currentGold = newState.vars[goldKey] ?? (organizerId === "player" ? 0 : 100);
          newState.vars[goldKey] = Math.max(0, currentGold - toll);
          if (!newState.journal) newState.journal = [];
          newState.journal.push(
            `[Syndicate] Convoy ${convoyId} paid ${toll} gold in faction/cartel tolls to ${factionId} at room ${destRoomId}.`
          );
        }

        // Check ambush risk
        const heat = newState.enforcementHeat?.[destRoomId]?.heat ?? 0;
        let ambushChance = 10;
        ambushChance += heat * 2;
        if (factionId && newState.factionRep?.[factionId] !== undefined && newState.factionRep[factionId] < 0) {
          ambushChance += 15;
        }
        const weather = newState.environment?.weather || "clear";
        if (weather === "storm" || weather === "blizzard" || weather === "rain") {
          ambushChance += 10;
        }

        const outpost = newState.turfGuardOutposts?.[destRoomId];
        if (outpost && outpost.syndicateId === convoy.syndicateId) {
          ambushChance -= outpost.securityLevel * 5;
        }
        const guards = newState.turfGuards?.[destRoomId]?.count ?? 0;
        ambushChance -= guards * 3;

        // Dreadnought Convoy automated defensive turrets reduce ambush risk (AF-80)
        if (convoy.isDreadnought) {
          ambushChance -= 20;
        }

        // Faction-based Trade Route Commercial Warfare: Ambush risk increase in rival territory
        let isRouteRivalForAmbush = false;
        if (route.factionId && factionId) {
          if (isRivalFaction(newState, route.factionId, factionId)) {
            isRouteRivalForAmbush = true;
          }
        }
        if (isRouteRivalForAmbush) {
          ambushChance += 30;
        }

        if (hasRingleader) {
          ambushChance = Math.round(ambushChance * 0.7); // Coordination ambush risk reduction
        }

        ambushChance = Math.max(5, Math.min(80, ambushChance));

        const { value: ambushRoll, nextSeed } = PureRand.nextInt(currentSeed, 1, 100);
        currentSeed = nextSeed;

        if (ambushRoll <= ambushChance) {
          // AMBUSH! Check turrets
          let deflected = false;
          if (
            outpost &&
            outpost.syndicateId === convoy.syndicateId &&
            outpost.turrets &&
            Object.keys(outpost.turrets).length > 0
          ) {
            deflected = true;
            if (!newState.journal) newState.journal = [];
            newState.journal.push(
              `[Syndicate] Convoy ${convoyId} was ambushed in room ${destRoomId}, but the syndicate outpost's tactical turrets struck down the ambushers and defended the convoy!`
            );
            events.push({
              type: "narration",
              text: `💥 Convoy ${convoyId} was ambushed in ${destRoomId}, but tactical turrets successfully defended it!`,
            } as any);
          }

          // Dreadnought Convoy defense turret counter-strike math (AF-80)
          if (!deflected && convoy.isDreadnought) {
            const { value: csRoll, nextSeed: nextSeed2 } = PureRand.nextInt(currentSeed, 1, 100);
            currentSeed = nextSeed2;
            const csSuccessChance = Math.max(20, 75 - heat * 5);
            if (csRoll <= csSuccessChance) {
              deflected = true;
              if (!newState.journal) newState.journal = [];
              newState.journal.push(
                `[Syndicate] Dreadnought convoy ${convoyId} was ambushed in room ${destRoomId}, but its heavy automated defensive turrets counter-strike successfully, obliterating the ambushers!`
              );
              events.push({
                type: "narration",
                text: `💥 Dreadnought convoy ${convoyId} was ambushed in ${destRoomId}, but its heavy automated defensive turrets counter-struck and obliterated the ambushers!`,
              } as any);
            }
          }

          // Check for active interceptor decoy deflection!
          const activeDecoy = Object.values(newState.interceptorDecoys || {}).find(
            (d) => d.syndicateId === convoy.syndicateId && d.active && d.routeId === convoy.routeId
          );
          if (!deflected && activeDecoy) {
            activeDecoy.active = false;
            deflected = true;
            if (!newState.journal) newState.journal = [];
            newState.journal.push(
              `[Syndicate] Convoy ${convoyId} was ambushed in room ${destRoomId}, but the active Interceptor Decoy ${activeDecoy.id} misled the ambushers, protecting the convoy!`
            );
            events.push({
              type: "narration",
              text: `💥 Convoy ${convoyId} was ambushed in ${destRoomId}, but interceptor decoy ${activeDecoy.id} successfully misled the patrol and protected it!`,
            } as any);
          }

          if (!deflected) {
            updatedConvoy.status = "ambushed";
            updatedConvoy.currentRoomIndex = nextRoomIndex;
            if (!newState.journal) newState.journal = [];
            newState.journal.push(
              `[Syndicate] Convoy ${convoyId} was ambushed and destroyed by enforcers/pirates in room ${destRoomId}! All cargo was lost.`
            );
            events.push({
              type: "narration",
              text: `🚨 Oh no! Smuggling convoy ${convoyId} was ambushed and destroyed in ${destRoomId}! All cargo was lost.`,
            } as any);
            events.push({
              type: "smuggling_convoy_ambushed" as any,
              convoyId,
              room: destRoomId,
            } as any);

            // Convoy loss insurance dynamic compensation claim (AF-59)
            const insurance = newState.convoyInsurance?.[convoyId];
            if (insurance && insurance.active) {
              const updatedInsurance = { ...insurance, active: false };
              newState.convoyInsurance = {
                ...newState.convoyInsurance,
                [convoyId]: updatedInsurance,
              };

              const members = syndicate?.members || [convoy.definedBy];
              const coverage = insurance.coverageAmount;
              const share = members.length > 0 ? Math.floor(coverage / members.length) : 0;

              if (share > 0) {
                if (!newState.vars) newState.vars = {};
                for (const member of members) {
                  const memberGoldKey = member === "player" ? "gold" : `gold_${member}`;
                  newState.vars[memberGoldKey] = (newState.vars[memberGoldKey] ?? 0) + share;
                }
              }

              newState.vars["totalConvoyInsurancePayouts"] =
                (newState.vars["totalConvoyInsurancePayouts"] ?? 0) + coverage;
              newState.journal.push(
                `[Syndicate] Insurance claim processed for convoy ${convoyId}. Paid out ${coverage} gold dynamic loss compensation (Distributed ${share} gold to each member).`
              );

              events.push({
                type: "narration",
                text: `🛡️ Smuggling Convoy Insurance Policy triggered! Paid out ${coverage} gold in dynamic loss compensation to the syndicate.`,
              } as any);

              events.push({
                type: "smuggling_convoy_insurance_claimed" as any,
                convoyId,
                syndicateId: convoy.syndicateId,
                payoutGold: coverage,
                share,
              } as any);
            }
          } else {
            updatedConvoy.currentRoomIndex = nextRoomIndex;
            if (!newState.journal) newState.journal = [];
            newState.journal.push(
              `[Syndicate] Convoy ${convoyId} successfully traversed through room ${destRoomId} (survived ambush).`
            );
          }
        } else {
          updatedConvoy.currentRoomIndex = nextRoomIndex;
          if (!newState.journal) newState.journal = [];
          newState.journal.push(`[Syndicate] Convoy ${convoyId} successfully traversed through room ${destRoomId}.`);
        }
      }
    }

    updatedConvoys[convoyId] = updatedConvoy;
  }

  if (newState.smugglingConvoys && Object.keys(newState.smugglingConvoys).length > 0) {
    newState.smugglingConvoys = updatedConvoys;
  }

  if (newState.decoyConvoys && Object.keys(newState.decoyConvoys).length > 0) {
    const updatedDecoys = { ...newState.decoyConvoys };
    for (const [decoyId, decoy] of Object.entries(updatedDecoys)) {
      if (decoy.status !== "en_route") continue;

      const route = newState.tradeRoutes?.[decoy.routeId];
      if (!route || !route.rooms || route.rooms.length === 0) continue;

      const updatedDecoy = { ...decoy };
      const nextRoomIndex = updatedDecoy.currentRoomIndex + 1;

      if (nextRoomIndex >= route.rooms.length) {
        updatedDecoy.status = "completed" as const;
        updatedDecoy.currentRoomIndex = route.rooms.length - 1;
        if (!newState.journal) newState.journal = [];
        newState.journal.push(`[Syndicate] Decoy convoy ${decoyId} successfully completed its route.`);
        events.push({
          type: "narration",
          text: `🛡️ Decoy convoy ${decoyId} arrived at destination! It successfully distracted enforcer forces along route ${decoy.routeId}.`,
        } as any);
      } else {
        updatedDecoy.currentRoomIndex = nextRoomIndex;
        const currentRoomId = route.rooms[nextRoomIndex];

        if (!newState.journal) newState.journal = [];
        newState.journal.push(`[Syndicate] Decoy convoy ${decoyId} advanced to room ${currentRoomId}.`);

        // Decoy routes distract global enforcement:
        // 1. Lower enforcer heat in rooms owned by decoy's syndicate
        if (newState.enforcementHeat && newState.syndicateTurf) {
          const ourTurfRooms = Object.entries(newState.syndicateTurf)
            .filter(([_, syndicateId]) => syndicateId === decoy.syndicateId)
            .map(([roomId, _]) => roomId);

          for (const rId of ourTurfRooms) {
            const heatEntry = newState.enforcementHeat[rId];
            if (heatEntry && heatEntry.heat > 0) {
              newState.enforcementHeat[rId] = {
                ...heatEntry,
                heat: Math.max(0, heatEntry.heat - 10),
                timestamp: newState.step,
              };
            }
          }
        }

        // 2. Distract bounty hunters: 25% chance per active decoy tick to divert pursuing bounty hunters to decoy's room
        if (newState.enforcers) {
          const updatedEnforcers = { ...newState.enforcers };
          for (const [enfId, enforcer] of Object.entries(updatedEnforcers)) {
            if (enforcer.isBountyHunter && enforcer.status === "pursuing") {
              const { value: distractRoll, nextSeed } = PureRand.nextInt(currentSeed, 1, 100);
              currentSeed = nextSeed;
              if (distractRoll <= 25) {
                updatedEnforcers[enfId] = {
                  ...enforcer,
                  currentRoom: currentRoomId,
                  timestamp: newState.step,
                };
                newState.journal.push(
                  `[Enforcement] Smuggling Bounty Hunter ${enforcer.name} was distracted by decoy convoy ${decoyId} and redirected to ${currentRoomId}!`
                );
                events.push({
                  type: "narration",
                  text: `[Enforcement] Smuggling Bounty Hunter ${enforcer.name} was successfully distracted and diverted to ${currentRoomId}!`,
                } as any);
              }
            }
          }
          newState.enforcers = updatedEnforcers;
        }
      }
      updatedDecoys[decoyId] = updatedDecoy;
    }
    newState.decoyConvoys = updatedDecoys;
  }

  newState.seed = currentSeed;
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
function tickEnvironment(state: GameState, events: GameEvent[], pack?: CYOAPack | ParserPack): GameState {
  const newState = tickProductionLabs(state, events, pack);

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
    if (isCyoaPack(pack)) {
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

  const isWeatherAllowed =
    !weatherPool || weatherPool.length === 0 || weatherPool.includes(newState.environment.weather);
  const intervalChanged = newState.step > 0 && interval !== lastInterval;

  // We tick if the 5-step interval has changed OR if the current weather is not allowed in this room
  if (intervalChanged || !isWeatherAllowed) {
    const {
      weather: nextWeather,
      temperature: nextTemp,
      wind: nextWind,
    } = getWeatherForStep(newState.seed, newState.step, weatherPool);

    const oldWeather = newState.environment.weather;
    const oldTemp = newState.environment.temperature;
    const oldWind = newState.environment.wind ?? "calm";

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
        wind: nextWind,
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

    if (nextWind !== oldWind && nextWeather === oldWeather) {
      const msg = `The wind shifts, becoming ${nextWind}.`;
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

export function tickEnforcers(state: GameState, events: GameEvent[], pack?: CYOAPack | ParserPack): GameState {
  let newState = tickUndercoverAgents(state, events, pack);
  newState = tickInformants(newState, events, pack);
  if (!pack || !("rooms" in pack)) {
    return newState;
  }

  const parserPack = pack as ParserPack;
  newState = { ...newState };
  newState.enforcers = newState.enforcers ? { ...newState.enforcers } : {};
  if (newState.vars) {
    newState.vars = { ...newState.vars };
  }
  if (newState.flags) {
    newState.flags = { ...newState.flags };
  }

  // Global Bounty Hunting Network: Automatically track and target high-reputation player or NPC agents carrying contraband (AF-75)
  const candidates = ["player", ...Object.keys(newState.agents || {})];
  for (const candidateId of candidates) {
    // 1. Check if they carry contraband
    let carriesContraband = false;
    if (candidateId === "player") {
      carriesContraband = getContrabandInInventory(newState, parserPack).length > 0;
    } else {
      const agent = newState.agents?.[candidateId];
      if (agent && agent.inventory) {
        for (const itemId of agent.inventory) {
          const packObj = parserPack.objects?.find((o: any) => o.id === itemId);
          const isPackContraband = packObj?.contraband === true;
          const isBlacklisted = newState.contrabandBlacklist?.[itemId]?.blacklisted === true;
          if (isPackContraband || isBlacklisted) {
            carriesContraband = true;
            break;
          }
        }
      }
    }

    // 2. Check if they have high reputation (reputation >= 50 with any faction or in vars, scaled by defunding rate)
    let hasHighRep = false;
    const defundingRate = getEnforcerDefundingRate(newState, candidateId);
    const repThreshold = Math.max(1, Math.round(50 * (1 - defundingRate)));
    if (newState.factionRep) {
      if (Object.values(newState.factionRep).some((v) => v >= repThreshold)) {
        hasHighRep = true;
      }
    }
    if (newState.vars) {
      if (
        Object.entries(newState.vars).some(
          ([k, v]) => (k === "faction_rep" || k.startsWith("faction_rep_")) && v >= repThreshold
        )
      ) {
        hasHighRep = true;
      }
    }

    // If carrying contraband AND has high reputation, target them!
    if (carriesContraband && hasHighRep) {
      if (!newState.bounties) newState.bounties = {};
      const existingBounty = newState.bounties[candidateId];
      if (!existingBounty || !existingBounty.active) {
        newState.bounties[candidateId] = {
          targetId: candidateId,
          amount: 250,
          timestamp: newState.step,
          active: true,
        };
        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[BountyNetwork] Global network placed a 250 gold bounty on high-reputation agent ${candidateId} for carrying contraband!`
        );
      }

      // Spawn or reset bounty hunter
      const hunterId = `bounty_hunter_${candidateId}`;
      const startRoom = parserPack.rooms?.[0]?.id ?? "market";
      if (!newState.enforcers[hunterId]) {
        newState.enforcers[hunterId] = {
          id: hunterId,
          name: `Hunter ${candidateId}`,
          currentRoom: startRoom,
          status: "pursuing",
          isBountyHunter: true,
          targetId: candidateId,
          timestamp: newState.step,
          hp: 30,
          max_hp: 30,
          attack: 5,
          defense: 3,
          gold: 100,
        };
        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[BountyNetwork] Smuggling Bounty Hunter Hunter ${candidateId} has been dispatched to pursue agent ${candidateId}!`
        );
      } else if (newState.enforcers[hunterId].status === "defeated") {
        newState.enforcers[hunterId] = {
          ...newState.enforcers[hunterId],
          status: "pursuing",
          targetId: candidateId,
          timestamp: newState.step,
        };
        if (!newState.journal) newState.journal = [];
        newState.journal.push(
          `[BountyNetwork] Smuggling Bounty Hunter Hunter ${candidateId} has resumed pursuit of agent ${candidateId}!`
        );
      }
    }
  }

  // Helper BFS room-to-room pathfinder
  const findNextRoom = (fromRoom: string, toRoom: string, enforcer: any): string | null => {
    if (fromRoom === toRoom) return null;
    const queue: string[][] = [[fromRoom]];
    const visited = new Set<string>([fromRoom]);

    const getExits = (roomId: string) => {
      const r = parserPack.rooms.find((x) => x.id === roomId);
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
          // Faction War enforcer pursuit BFS modification: avoid enemy syndicate turf during war!
          const enfFaction = enforcer.factionId ?? "rangers";
          const enemySyndicates = Object.values(newState.syndicates || {}).filter(
            (s) => s.members.includes(enforcer.targetId) && newState.factionWars?.[s.id]?.[enfFaction] === true
          );
          const isEnemyTurf = enemySyndicates.some(
            (s) =>
              newState.syndicateTurf?.[neighbor] === s.id ||
              newState.turfGuardOutposts?.[neighbor]?.syndicateId === s.id
          );
          if (isEnemyTurf) {
            continue; // Avoid this room/exit in path planning
          }

          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }
    return null;
  };

  for (const [id, enforcer] of Object.entries(newState.enforcers ?? {})) {
    if (enforcer.status === "defeated") continue;

    // Check for mesh-wide cooperative bounty hunting (AF-68)
    if (newState.bounties?.[id]?.active) {
      const { value: huntRoll, nextSeed } = PureRand.nextInt(newState.seed, 1, 100);
      newState.seed = nextSeed;
      if (huntRoll <= 15) {
        // 15% chance per tick to be hunted down and defeated by syndicate agents!
        enforcer.status = "defeated";
        enforcer.timestamp = newState.step;

        const bounty = newState.bounties[id];
        const reward = bounty.amount;
        newState.bounties[id] = {
          ...bounty,
          active: false,
          timestamp: newState.step,
        };

        // Distribute or award gold to the player or a random syndicate member agent!
        const agentList = Object.keys(newState.agents || {});
        const winningAgentId = agentList.length > 0 ? agentList[huntRoll % agentList.length] : "player";

        const goldKey = winningAgentId === "player" ? "gold" : `gold_${winningAgentId}`;
        const currentGold = newState.vars[goldKey] ?? (winningAgentId === "player" ? 0 : 100);
        newState.vars[goldKey] = currentGold + reward;

        events.push({
          type: "narration",
          text: `🎯 [Cooperative Bounty] Syndicate agents successfully hunted down and defeated enforcer ${enforcer.name} mesh-wide! Agent ${winningAgentId} claimed the ${reward} gold bounty.`,
        } as any);
        continue;
      }
    }

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
            // Check if enforcer is slowed by covert cells or propaganda
            const localCell = newState.covertCells?.[enforcer.currentRoom];
            const targetSyndicate = enforcer.targetId
              ? Object.values(newState.syndicates ?? {}).find((s) => s.members.includes(enforcer.targetId as string))
              : undefined;
            const targetSyndicateId =
              targetSyndicate?.id ??
              Object.values(newState.syndicates ?? {}).find((s) => s.members.includes("player"))?.id;

            const propKey = targetSyndicateId ? `${enforcer.currentRoom}_${targetSyndicateId}` : undefined;
            const localPropaganda = propKey ? newState.propagandaCampaigns?.[propKey] : undefined;

            let slowChance = 0;
            if (localCell && targetSyndicateId && localCell.syndicateId === targetSyndicateId) {
              slowChance += 0.25 * localCell.cellLevel;
            }
            if (localPropaganda) {
              slowChance += 0.15 * localPropaganda.level;
            }

            let slowed = false;
            if (slowChance > 0) {
              const { value: slowRoll, nextSeed: s3 } = PureRand.next(newState.seed);
              newState.seed = s3;
              if (slowRoll <= slowChance) {
                slowed = true;
              }
            }

            if (slowed) {
              events.push({
                type: "narration",
                text: `[Enforcement] Smuggling Bounty Hunter ${enforcer.name}'s pursuit is slowed by local covert operations/propaganda in ${enforcer.currentRoom}!`,
              } as any);
            } else {
              const nextRoom = findNextRoom(enforcer.currentRoom, targetRoom, enforcer);
              if (nextRoom) {
                enforcer.currentRoom = nextRoom;
                enforcer.timestamp = newState.step;
                events.push({
                  type: "narration",
                  text: `[Enforcement] Smuggling Bounty Hunter ${enforcer.name} is pursuing target ${enforcer.targetId} and has moved to ${nextRoom}.`,
                } as any);
              }
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

                const playerSynd = newState.syndicates
                  ? Object.values(newState.syndicates).find((s) => s.members.includes("player"))
                  : undefined;
                const hasWarChestBribe = playerSynd && (playerSynd.warChest ?? 0) >= 50;

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
                    text: `🛡️ Bounty Hunter ${enforcer.name} corners you in ${enforcer.currentRoom}, but your Cartel Smuggling Insurance covers your bounty! They stand down.`,
                  } as any);
                } else if (hasBribe) {
                  events.push({
                    type: "narration",
                    text: `🛡️ Bounty Hunter ${enforcer.name} corners you in ${enforcer.currentRoom}, but accepts your bribe of ${enforcerBribe.amount} gold and stands down.`,
                  } as any);
                } else if (hasWarChestBribe && playerSynd) {
                  playerSynd.warChest = (playerSynd.warChest ?? 0) - 50;
                  events.push({
                    type: "narration",
                    text: `🛡️ Bounty Hunter ${enforcer.name} corners you in ${enforcer.currentRoom}, but a bribe of 50 gold is automatically paid from your syndicate ${playerSynd.name} war chest. They stand down.`,
                  } as any);
                } else {
                  events.push({
                    type: "narration",
                    text: `💥 Ambush! Smuggling Bounty Hunter ${enforcer.name} corners you in ${enforcer.currentRoom} for your active bounty!`,
                  } as any);
                  newState.flags[`in_combat_with_${enforcer.id}`] = true;
                  const defundingRate = getEnforcerDefundingRate(newState, "player");
                  const initialHp = enforcer.hp ?? 20;
                  newState.vars[`npc_hp_${enforcer.id}`] =
                    defundingRate > 0 ? Math.max(1, Math.round(initialHp * (1 - defundingRate))) : initialHp;
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
                  text: `🛡️ Agent ${enforcer.targetId} was ambushed by Bounty Hunter ${enforcer.name} in ${enforcer.currentRoom} but successfully defeated them!`,
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
                  text: `💥 Agent ${enforcer.targetId} was ambushed by Bounty Hunter ${enforcer.name} in ${enforcer.currentRoom} and was defeated!`,
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
                      text: `🛡️ Agent ${enforcer.targetId} fell back to their syndicate safehouse in ${agentFallback.roomId}.`,
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

            const playerSynd = newState.syndicates
              ? Object.values(newState.syndicates).find((s) => s.members.includes("player"))
              : undefined;
            const hasWarChestBribe = playerSynd && (playerSynd.warChest ?? 0) >= 50;

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
                text: `👮 Enforcement Agent ${enforcer.name} stops you, but your Cartel Smuggling Insurance covers the contraband (${contraband.join(", ")}). They let you pass safely.`,
              } as any);
            } else if (hasBribe) {
              events.push({
                type: "narration",
                text: `👮 Enforcement Agent ${enforcer.name} stops you, but recognizes your bribe of ${bribeAmount} gold and lets you pass with your contraband (${contraband.join(", ")}).`,
              } as any);
            } else if (hasWarChestBribe && playerSynd) {
              playerSynd.warChest = (playerSynd.warChest ?? 0) - 50;
              events.push({
                type: "narration",
                text: `👮 Enforcement Agent ${enforcer.name} stops you, but a bribe of 50 gold is automatically paid from your syndicate ${playerSynd.name} war chest. They let you pass with your contraband (${contraband.join(", ")}).`,
              } as any);
            } else if (rep >= 10) {
              events.push({
                type: "narration",
                text: `👮 Enforcement Agent ${enforcer.name} stops you, but recognizes your allied standing with ${factionId} and lets you pass with a warning.`,
              } as any);
            } else if (rep < 0) {
              events.push({
                type: "narration",
                text: `💥 Ambush! Enforcement Agent ${enforcer.name} detects contraband (${contraband.join(", ")}) in your inventory and attacks due to your hostile standing with ${factionId}!`,
              } as any);
              newState.flags[`in_combat_with_${enforcer.id}`] = true;
              const defundingRate = getEnforcerDefundingRate(newState, "player");
              const initialHp = enforcer.hp ?? 20;
              newState.vars[`npc_hp_${enforcer.id}`] =
                defundingRate > 0 ? Math.max(1, Math.round(initialHp * (1 - defundingRate))) : initialHp;
            } else {
              const inventoryFilter = newState.inventory.filter((itemId) => !contraband.includes(itemId));
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
                text: `👮 Enforcement Agent ${enforcer.name} stops you and confiscates your contraband (${contraband.join(", ")}). You are fined ${fine} gold.`,
              } as any);
            }
          }
        }
      }
    }
  }

  return newState;
}

function tickInformants(state: GameState, events: GameEvent[], _pack?: CYOAPack | ParserPack): GameState {
  if (!state.informants || Object.keys(state.informants).length === 0) {
    return state;
  }

  const newState = { ...state };
  newState.informants = { ...newState.informants };
  newState.raidWarnings = newState.raidWarnings ? { ...newState.raidWarnings } : {};
  if (!newState.journal) newState.journal = [];

  for (const informant of Object.values(newState.informants)) {
    if (informant.status !== "active") continue;

    const { value: alertRoll, nextSeed } = PureRand.nextInt(newState.seed + state.step, 1, 100);
    newState.seed = nextSeed;

    // 30% chance per step that an active informant detects an upcoming raid
    if (alertRoll <= 30) {
      let warnedRoom: string | undefined = undefined;

      if (newState.safehouses) {
        const sh = Object.values(newState.safehouses).find((s) => s.syndicateId === informant.syndicateId);
        if (sh) warnedRoom = sh.roomId;
      }
      if (!warnedRoom && newState.productionLabs) {
        const lab = Object.values(newState.productionLabs).find((l) => l.syndicateId === informant.syndicateId);
        if (lab) warnedRoom = lab.roomId;
      }

      if (warnedRoom) {
        const scheduledStep = newState.step + 3;
        const warningId = `warning_${informant.id}_${warnedRoom}_${scheduledStep}`;

        if (!newState.raidWarnings[warningId]) {
          newState.raidWarnings[warningId] = {
            roomId: warnedRoom,
            syndicateId: informant.syndicateId,
            scheduledStep,
            active: true,
            timestamp: newState.step,
          };

          newState.journal.push(
            `[Syndicate] Informant ${informant.name} leaked enforcer raid plans! Pre-emptive warning scheduled for room ${warnedRoom} at step ${scheduledStep}.`
          );
          events.push({
            type: "narration",
            text: `⚠️ [Intelligence] Informant ${informant.name} warns of an upcoming enforcer sweep in ${warnedRoom} at step ${scheduledStep}!`,
          } as any);
        }
      }
    }
  }

  return newState;
}

function tickUndercoverAgents(state: GameState, events: GameEvent[], _pack?: CYOAPack | ParserPack): GameState {
  if (!state.syndicates || Object.keys(state.syndicates).length === 0) {
    return state;
  }

  const newState = { ...state };
  newState.undercoverAgents = newState.undercoverAgents ? { ...newState.undercoverAgents } : {};
  newState.syndicates = { ...newState.syndicates };
  if (newState.safehouses) {
    newState.safehouses = { ...newState.safehouses };
  }
  if (newState.enforcementHeat) {
    newState.enforcementHeat = { ...newState.enforcementHeat };
  }
  newState.journal = [...newState.journal];

  // 1. Infiltration Check
  if (newState.frontBusinesses) {
    newState.frontBusinesses = { ...newState.frontBusinesses };
    for (const front of Object.values(newState.frontBusinesses)) {
      const syndicateId = front.syndicateId;

      // Check if there is already an active undercover agent in this syndicate
      const hasActiveUndercover = Object.values(newState.undercoverAgents).some(
        (agent) => agent.syndicateId === syndicateId && agent.status === "active"
      );

      if (!hasActiveUndercover) {
        const heat = newState.enforcementHeat?.[front.roomId]?.heat ?? 0;
        const volume = front.dirtyGold + front.cleanGold;

        // Infiltration chance: scaled by heat and volume
        const infilChance = Math.min(100, Math.floor(heat * 0.4 + volume * 0.1));
        if (infilChance > 0) {
          const { value: rolled, nextSeed } = PureRand.nextInt(newState.seed, 1, 100);
          newState.seed = nextSeed;

          if (rolled <= infilChance) {
            // Spawn undercover agent!
            const agentNames = [
              "Agent Cooper",
              "Agent Mulder",
              "Officer Jenkins",
              "Detective Vance",
              "Inspector Clouseau",
              "Agent Starling",
              "Agent Smith",
              "Officer Brady",
            ];
            const nameIndex = Math.floor(PureRand.nextInt(newState.seed, 0, agentNames.length - 1).value);
            const agentName = agentNames[nameIndex];
            const agentId = `undercover_${syndicateId}_${newState.step}`;

            newState.undercoverAgents[agentId] = {
              id: agentId,
              syndicateId: syndicateId,
              name: agentName,
              intelAccumulated: 0,
              status: "active",
              timestamp: newState.step,
            };

            const syndicate = newState.syndicates[syndicateId];
            if (syndicate) {
              const updatedAgents = syndicate.undercoverAgents ? [...syndicate.undercoverAgents] : [];
              if (!updatedAgents.includes(agentId)) {
                updatedAgents.push(agentId);
              }
              newState.syndicates[syndicateId] = {
                ...syndicate,
                undercoverAgents: updatedAgents,
                timestamp: newState.step,
              };
            }

            newState.journal.push(
              `[Syndicate] Undercover agent ${agentName} has successfully infiltrated syndicate ${syndicateId} due to enforcer heat (${heat}) and laundering activity!`
            );
            events.push({
              type: "narration",
              text: `⚠️ [Intelligence] Undercover enforcer ${agentName} has infiltrated syndicate ${syndicateId}!`,
            } as any);
          }
        }
      }
    }
  }

  // 2. Intel Accumulation and Raids
  for (const [id, agent] of Object.entries(newState.undercoverAgents)) {
    if (agent.status === "active") {
      let heatBonus = 0;
      if (newState.frontBusinesses) {
        const syndicateFronts = Object.values(newState.frontBusinesses).filter(
          (f) => f.syndicateId === agent.syndicateId
        );
        if (syndicateFronts.length > 0) {
          const firstFront = syndicateFronts[0];
          const heat = newState.enforcementHeat?.[firstFront.roomId]?.heat ?? 0;
          heatBonus = Math.floor(heat * 0.1);
        }
      }

      const updatedIntel = agent.intelAccumulated + 10 + heatBonus;
      const updatedAgent = { ...agent };

      if (updatedIntel >= 100) {
        updatedAgent.intelAccumulated = 100;
        updatedAgent.status = "exposed";
        updatedAgent.timestamp = newState.step;
        newState.undercoverAgents[id] = updatedAgent;

        newState.journal.push(
          `[Syndicate] Undercover agent ${agent.name} completed intel gathering and triggered a high-priority safehouse raid on syndicate ${agent.syndicateId}!`
        );
        events.push({
          type: "narration",
          text: `🚨 [Raid] Undercover agent ${agent.name} has triggered a high-priority raid on syndicate ${agent.syndicateId} safehouses!`,
        } as any);

        // Raid all safehouses owned by this syndicate
        if (newState.safehouses) {
          for (const [roomId, safehouse] of Object.entries(newState.safehouses)) {
            if (safehouse.syndicateId === agent.syndicateId) {
              const itemCount = safehouse.stashItems.length;

              const hasWarning = Object.values(newState.raidWarnings || {}).some(
                (w) => w.roomId === roomId && w.active && w.scheduledStep === newState.step
              );

              if (hasWarning) {
                newState.journal.push(
                  `[Syndicate] Pre-emptive raid warning was active! Safehouse in room ${roomId} was successfully evacuated before the raid. No items were confiscated!`
                );
                events.push({
                  type: "narration",
                  text: `🚨 [Raid] Safehouse in room ${roomId} was raided, but thanks to the informant's warning, it was evacuated in time! No items were lost!`,
                } as any);
              } else {
                newState.safehouses[roomId] = {
                  ...safehouse,
                  stashItems: [],
                  timestamp: newState.step,
                };

                newState.journal.push(
                  `[Syndicate] Safehouse in room ${roomId} was raided! Confiscated ${itemCount} stashed items and spiked room heat to 100.`
                );
                events.push({
                  type: "narration",
                  text: `🚨 [Raid] Enforcers raided the safehouse in ${roomId}, confiscating ${itemCount} items!`,
                } as any);
              }

              if (!newState.enforcementHeat) newState.enforcementHeat = {};
              newState.enforcementHeat[roomId] = {
                roomId: roomId,
                heat: 100,
                timestamp: newState.step,
              };
            }
          }
        }

        // Raid all black ops safehouses owned by this syndicate (AF-83)
        if (newState.blackOpsSafehouses) {
          for (const [safehouseId, safehouse] of Object.entries(newState.blackOpsSafehouses)) {
            if (safehouse.syndicateId === agent.syndicateId && safehouse.active) {
              const roomId = safehouse.roomId;

              const hasWarning = Object.values(newState.raidWarnings || {}).some(
                (w) => w.roomId === roomId && w.active && w.scheduledStep === newState.step
              );

              if (hasWarning) {
                newState.journal.push(
                  `[Syndicate] Pre-emptive raid warning was active! Black Ops Safehouse ${safehouseId} in room ${roomId} was successfully evacuated before the raid. No contraband was confiscated!`
                );
                events.push({
                  type: "narration",
                  text: `🚨 [Raid] Black Ops Safehouse ${safehouseId} was raided, but thanks to the informant's warning, it was evacuated in time!`,
                } as any);
              } else {
                // Determine sweep strength
                const { value: sweepStrength, nextSeed } = PureRand.nextInt(newState.seed, 1, 50);
                newState.seed = nextSeed;

                // Defense score based on guards and safehouse defenses
                const guards = newState.turfGuards?.[roomId]?.count ?? 0;
                const defenses = safehouse.defenses ?? 0;
                const defenseScore = defenses * 30 + guards * 10;

                if (defenseScore >= sweepStrength) {
                  // Repelled!
                  newState.journal.push(
                    `[Syndicate] Black Ops Safehouse ${safehouseId} successfully repelled the enforcer sweep/raid (Defense: ${defenseScore} vs Sweep Strength: ${sweepStrength})!`
                  );
                  events.push({
                    type: "narration",
                    text: `🛡️ Black Ops Safehouse ${safehouseId} repelled the enforcer raid! (Defense: ${defenseScore} vs Sweep Strength: ${sweepStrength})`,
                  } as any);
                } else {
                  // Capture chance and damage reduction factor from defenses
                  const defensesLevel = safehouse.defenses ?? 0;
                  const captureChance = Math.max(0.1, 0.9 - defensesLevel * 0.25);
                  const damageReductionFactor = Math.max(0.2, 1.0 - defensesLevel * 0.2);

                  // Confiscate contraband
                  const storedContraband = safehouse.storedContraband ?? 0;
                  const { value: rolledCaptureChance, nextSeed: nextSeed2 } = PureRand.nextInt(newState.seed, 1, 100);
                  newState.seed = nextSeed2;

                  let confiscated = 0;
                  if (rolledCaptureChance <= captureChance * 100) {
                    confiscated = Math.round(storedContraband * damageReductionFactor);
                  }

                  const remainingContraband = Math.max(0, storedContraband - confiscated);

                  newState.blackOpsSafehouses[safehouseId] = {
                    ...safehouse,
                    storedContraband: remainingContraband,
                    timestamp: newState.step,
                  };

                  newState.journal.push(
                    `[Syndicate] Black Ops Safehouse ${safehouseId} in room ${roomId} was raided by enforcer sweep! Confiscated ${confiscated} contraband (defenses shielded ${storedContraband - confiscated} units).`
                  );
                  events.push({
                    type: "narration",
                    text: `🚨 [Raid] Enforcers raided Black Ops Safehouse ${safehouseId}! Confiscated ${confiscated} contraband items (defenses shielded the rest).`,
                  } as any);
                }
              }

              if (!newState.enforcementHeat) newState.enforcementHeat = {};
              newState.enforcementHeat[roomId] = {
                roomId: roomId,
                heat: 100,
                timestamp: newState.step,
              };
            }
          }
        }

        // Reduce dominance by 25
        const syndicate = newState.syndicates[agent.syndicateId];
        if (syndicate) {
          const currentDominance = syndicate.dominance ?? 50;
          const newDominance = Math.max(0, currentDominance - 25);
          newState.syndicates[agent.syndicateId] = {
            ...syndicate,
            dominance: newDominance,
            timestamp: newState.step,
          };
          newState.journal.push(
            `[Syndicate] Syndicate ${agent.syndicateId} dominance reduced by 25 (New Dominance: ${newDominance}) due to safehouse raid.`
          );
        }
      } else {
        updatedAgent.intelAccumulated = updatedIntel;
        updatedAgent.timestamp = newState.step;
        newState.undercoverAgents[id] = updatedAgent;
      }
    }
  }

  return newState;
}
