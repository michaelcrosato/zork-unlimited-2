import { GameState } from "./state.js";
import { PureRand } from "./rng.js";

/**
 * Calculates dynamic trade cost or payout based on base price, weather climate_pricing, and NPC reputation.
 */
export function calculateTradePrice(
  state: GameState,
  npc: any,
  packObj: any,
  baseCost: number,
  isBuy: boolean
): number {
  let multiplier = 1.0;

  // 1. Weather/Climate Multiplier
  if (state.environment?.weather) {
    const weather = state.environment.weather;
    if (npc?.climate_pricing && npc.climate_pricing[weather] !== undefined) {
      multiplier *= npc.climate_pricing[weather];
    }
    if (packObj?.climate_pricing && packObj.climate_pricing[weather] !== undefined) {
      multiplier *= packObj.climate_pricing[weather];
    }
  }

  // 2. Reputation Modifier (NPC specific)
  const rep = state.npcRep?.[npc.id] ?? 0;
  if (isBuy) {
    // Higher reputation means lower buy prices (discount)
    const repBuyFactor = Math.max(0.5, Math.min(1.5, 1.0 - rep * 0.02));
    multiplier *= repBuyFactor;
  } else {
    // Higher reputation means higher sell payouts (bonus)
    const repSellFactor = Math.max(0.5, Math.min(1.5, 1.0 + rep * 0.02));
    multiplier *= repSellFactor;
  }

  // 3. Faction Territory Control Modifier (AF-29)
  const controllingFactionId = state.territoryControl?.[state.current];
  if (controllingFactionId) {
    const factionRep = state.factionRep?.[controllingFactionId] ?? 0;
    if (isBuy) {
      // Positive faction reputation gives a discount; negative reputation acts as a price penalty (markup)
      const factionBuyFactor = Math.max(0.5, Math.min(1.5, 1.0 - factionRep * 0.02));
      multiplier *= factionBuyFactor;
    } else {
      // Positive faction reputation gives a higher sell payout; negative reputation acts as a sell penalty (lower payout)
      const factionSellFactor = Math.max(0.5, Math.min(1.5, 1.0 + factionRep * 0.02));
      multiplier *= factionSellFactor;
    }
  }

  const finalCost = Math.round(baseCost * multiplier);
  return Math.max(1, finalCost); // price never drops below 1 gold
}

/**
 * Checks if the player has sufficient reputation to trade with the NPC.
 */
export function checkReputationTrade(
  state: GameState,
  npc: any,
  minRep?: number
): { allowed: boolean; reason?: string } {
  const rep = state.npcRep?.[npc.id] ?? 0;
  const threshold = minRep !== undefined ? minRep : (npc?.min_rep !== undefined ? npc.min_rep : undefined);
  
  if (threshold !== undefined && rep < threshold) {
    return {
      allowed: false,
      reason: `The merchant refuses to trade with you due to your poor reputation (requires ${threshold}, you have ${rep}).`,
    };
  }
  return { allowed: true };
}

/**
 * Gets the merchant's current gold, initializing it from the pack if needed.
 */
export function getMerchantGold(state: GameState, npc: any): number {
  if (state.merchantGold && state.merchantGold[npc.id] !== undefined) {
    return state.merchantGold[npc.id];
  }
  const startingGold = npc?.gold ?? npc?.gold_limit ?? 100;
  if (!state.merchantGold) {
    state.merchantGold = {};
  }
  state.merchantGold[npc.id] = startingGold;
  return startingGold;
}

/**
 * Handles merchant restocking logic on every step.
 */
export function tickEconomy(state: GameState, pack: any): GameState {
  const newState = {
    ...state,
    seed: state.seed,
    merchantGold: state.merchantGold ? { ...state.merchantGold } : {},
    merchantLastRestock: state.merchantLastRestock ? { ...state.merchantLastRestock } : {},
    merchantInventories: state.merchantInventories ? JSON.parse(JSON.stringify(state.merchantInventories)) : {},
    objectState: { ...state.objectState },
    vars: { ...state.vars },
    journal: [...state.journal],
  };

  if (!pack || !pack.npcs) {
    // Still run periodic tax ticking even if there are no npcs
    if (newState.step > 0 && newState.step % 5 === 0 && newState.territoryControl) {
      let totalTaxGold = 0;
      for (const [roomId, factionId] of Object.entries(newState.territoryControl)) {
        const rep = newState.factionRep?.[factionId] ?? 0;
        if (rep > 0) {
          const roomTax = Math.max(1, Math.floor(rep / 10));
          totalTaxGold += roomTax;
        }
      }
      if (totalTaxGold > 0) {
        const currentGold = newState.vars["gold"] ?? 0;
        newState.vars["gold"] = currentGold + totalTaxGold;
        newState.journal.push(`Collected ${totalTaxGold} gold in taxes from allied faction territories.`);
      }
    }
    return newState;
  }

  for (const npc of pack.npcs) {
    // Only restock if restock_interval is defined
    if (npc.restock_interval !== undefined) {
      const lastRestock = newState.merchantLastRestock[npc.id] ?? 0;
      const interval = npc.restock_interval;

      if (newState.step > 0 && newState.step - lastRestock >= interval) {
        // 1. Reset gold back to the merchant's limit / starting gold
        const startingGold = npc.gold ?? npc.gold_limit ?? 100;
        newState.merchantGold[npc.id] = startingGold;

        // 2. Procedurally restock one item from possible_items
        if (npc.possible_items && npc.possible_items.length > 0) {
          const { value, nextSeed } = PureRand.choose(newState.seed, npc.possible_items as string[]);
          newState.seed = nextSeed;
          if (value) {
            const itemKey = value as string;
            newState.merchantInventories[npc.id] = [...(newState.merchantInventories[npc.id] || []), itemKey];
            
            // Mark the restocked item as takeable in the world
            const currentObj = newState.objectState[itemKey] ?? {};
            newState.objectState[itemKey] = {
              ...currentObj,
              takenBy: "world",
            };
          }
        }

        // 3. Record the restock step
        newState.merchantLastRestock[npc.id] = newState.step;
      }
    }
  }

  // 4. Periodic passive tax gold generation for controlled faction territories (AF-29)
  if (newState.step > 0 && newState.step % 5 === 0 && newState.territoryControl) {
    let totalTaxGold = 0;
    for (const [roomId, factionId] of Object.entries(newState.territoryControl)) {
      const rep = newState.factionRep?.[factionId] ?? 0;
      if (rep > 0) {
        // Gain 1 gold per positive rep faction territory, plus bonus for higher rep
        const roomTax = Math.max(1, Math.floor(rep / 10));
        totalTaxGold += roomTax;
      }
    }
    if (totalTaxGold > 0) {
      const currentGold = newState.vars["gold"] ?? 0;
      newState.vars["gold"] = currentGold + totalTaxGold;
      newState.journal.push(`Collected ${totalTaxGold} gold in taxes from allied faction territories.`);
    }
  }

  return newState;
}
