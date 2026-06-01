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
  isBuy: boolean,
  traderId: string = "player",
  pack?: any
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

  // 4. Faction Territory Merchant Tariff (AF-35)
  if (controllingFactionId) {
    const hasLicense = state.merchantLicenses?.[traderId]?.includes(controllingFactionId) || false;
    if (!hasLicense) {
      const licensing = state.merchantLicensings?.[controllingFactionId];
      const tariffRate = state.tariffPolicy?.[controllingFactionId] ?? licensing?.tariffRate ?? 0;
      if (tariffRate > 0) {
        const factionRep = state.factionRep?.[controllingFactionId] ?? 0;
        const waiverThreshold = licensing?.tariffWaiverThreshold ?? 20;
        const discountThreshold = licensing?.tariffDiscountThreshold ?? 10;

        let effectiveTariffRate = tariffRate;
        if (factionRep >= waiverThreshold) {
          effectiveTariffRate = 0;
        } else if (factionRep >= discountThreshold) {
          effectiveTariffRate = tariffRate / 2;
        }

        if (effectiveTariffRate > 0) {
          if (isBuy) {
            multiplier *= (1.0 + effectiveTariffRate / 100.0);
          } else {
            multiplier *= Math.max(0.1, 1.0 - effectiveTariffRate / 100.0);
          }
        }
      }
    }
  }

  // 5. Local Inventory-Based Dynamic Pricing (AF-37)
  if ((npc?.dynamic_pricing || state.vars["dynamic_pricing"] || state.flags["dynamic_pricing"]) && npc?.id && packObj?.id) {
    const stock = state.merchantInventories?.[npc.id] ?? [];
    const count = stock.filter((itemId: string) => itemId === packObj.id).length;

    if (isBuy) {
      // Player buys from merchant: high supply -> cheap, low supply -> expensive
      if (count === 0) {
        multiplier *= 1.5;
      } else if (count === 1) {
        multiplier *= 1.2;
      } else if (count === 2) {
        multiplier *= 1.0;
      } else {
        multiplier *= Math.max(0.5, 1.0 - (count - 2) * 0.15);
      }
    } else {
      // Player sells to merchant: low supply -> premium payout, high supply -> lower payout
      if (count === 0) {
        multiplier *= 1.5;
      } else if (count === 1) {
        multiplier *= 1.0;
      } else {
        multiplier *= Math.max(0.4, 1.0 - (count - 1) * 0.2);
      }
    }
  }

  // 6. Guild Memberships, Policies, and Collective Bargaining (AF-38)
  if (state.merchantGuilds && npc?.id) {
    for (const [guildId, guild] of Object.entries(state.merchantGuilds)) {
      if (guild.members.includes(npc.id)) {
        // Check if the trader is a member of this guild
        const isTraderMember = state.guildMemberships?.[traderId]?.includes(guildId) || false;
        const guildPolicy = state.guildPolicies?.[guildId];

        // Collective Bargaining Agreements override standard faction territory tariffs
        if (controllingFactionId) {
          const cbaKey = `${guildId}:${controllingFactionId}`;
          const agreement = state.collectiveBargainingAgreements?.[cbaKey];
          if (agreement && !isTraderMember) {
            const licensing = state.merchantLicensings?.[controllingFactionId];
            const standardTariff = state.tariffPolicy?.[controllingFactionId] ?? licensing?.tariffRate ?? 0;
            if (standardTariff > 0) {
              const factionRep = state.factionRep?.[controllingFactionId] ?? 0;
              const waiverThreshold = licensing?.tariffWaiverThreshold ?? 20;
              const discountThreshold = licensing?.tariffDiscountThreshold ?? 10;

              let standardEffectiveRate = standardTariff;
              if (factionRep >= waiverThreshold) {
                standardEffectiveRate = 0;
              } else if (factionRep >= discountThreshold) {
                standardEffectiveRate = standardTariff / 2;
              }

              if (standardEffectiveRate > 0) {
                // De-apply standard effective tariff rate
                if (isBuy) {
                  multiplier /= (1.0 + standardEffectiveRate / 100.0);
                } else {
                  multiplier /= Math.max(0.1, 1.0 - standardEffectiveRate / 100.0);
                }
              }
            }

            // Apply CBA agreed tariff rate
            const appliedTariffRate = agreement.agreedTariff;
            if (appliedTariffRate > 0) {
              if (isBuy) {
                multiplier *= (1.0 + appliedTariffRate / 100.0);
              } else {
                multiplier *= Math.max(0.1, 1.0 - appliedTariffRate / 100.0);
              }
            }
          }
        }

        // Apply member discount / markup
        if (isTraderMember) {
          if (isBuy) {
            multiplier *= 0.85; // 15% discount for buying from own guild
          } else {
            multiplier *= 1.15; // 15% bonus for selling to own guild
          }
        } else {
          // Non-member guild tariff markup/markdown
          if (guildPolicy) {
            const guildTariff = guildPolicy.tariffRate;
            if (guildTariff > 0) {
              if (isBuy) {
                multiplier *= (1.0 + guildTariff / 100.0);
              } else {
                multiplier *= Math.max(0.1, 1.0 - guildTariff / 100.0);
              }
            }
          }
        }

        // Export pricing policy modifier
        if (guildPolicy) {
          const policy = guildPolicy.exportPricingPolicy;
          if (policy === "premium") {
            if (isBuy) {
              multiplier *= 1.25;
            } else {
              multiplier *= 1.15;
            }
          } else if (policy === "discount") {
            if (isBuy) {
              multiplier *= 0.85;
            } else {
              multiplier *= 0.80;
            }
          }
        }
      }
    }
  }

  // 7. Cartel Price Collusion & Coordinated Pricing Hikes (AF-39)
  if (state.cartels && npc?.id && pack?.rooms) {
    let cartelPriceMultiplier = 1.0;
    for (const [cartelId, cartel] of Object.entries(state.cartels)) {
      if (cartel.members.includes(npc.id)) {
        // Find other merchants in the same room
        const room = pack.rooms.find((r: any) => r.npcs?.includes(npc.id));
        if (room && room.npcs) {
          const localMerchants = room.npcs.filter((nid: string) => 
            pack.npcs?.some((n: any) => n.id === nid)
          );
          const cartelMerchants = localMerchants.filter((nid: string) => 
            cartel.members.includes(nid)
          );
          
          const totalCount = localMerchants.length;
          const cartelCount = cartelMerchants.length;
          
          // Coordinated price hikes under low competition:
          // Low competition / high density: cartel merchants represent >= 50% of the merchants in the room
          // or there are no non-cartel merchants.
          if (totalCount > 0 && (cartelCount / totalCount >= 0.5)) {
            const policy = state.cartelPolicies?.[cartelId];
            const multiplierVal = policy?.priceMultiplier ?? cartel.priceMultiplier ?? 1.0;
            cartelPriceMultiplier = Math.max(cartelPriceMultiplier, multiplierVal);
          }
        }
      }
    }
    if (isBuy) {
      multiplier *= cartelPriceMultiplier;
    }
  }

  // 8. Regional Black Market Smuggling Payouts for Contraband (AF-40)
  if (packObj) {
    const isPackContraband = packObj.contraband === true;
    const isBlacklisted = state.contrabandBlacklist?.[packObj.id]?.blacklisted === true;
    if (isPackContraband || isBlacklisted) {
      if (!isBuy) {
        let contrabandMultiplier = 1.2; // Default premium
        const payoutEntry = state.blackMarketPayouts?.[state.current];
        if (payoutEntry && payoutEntry.payout > 0) {
          contrabandMultiplier = payoutEntry.payout / 100.0;
        }
        multiplier *= contrabandMultiplier;
      }

      // Apply global market price multipliers for contraband based on regional supply, syndicate dominance, and enforcement pressure (AF-44)
      const existingLab = state.productionLabs?.[state.current];
      let supplyFactor = 1.0;
      if (existingLab) {
        const supply = existingLab.storedContraband;
        if (supply === 0) {
          supplyFactor = 1.5;
        } else if (supply <= 5) {
          supplyFactor = 1.2;
        } else if (supply <= 10) {
          supplyFactor = 1.0;
        } else {
          supplyFactor = Math.max(0.4, 1.0 - (supply - 10) * 0.03);
        }
      }
      multiplier *= supplyFactor;

      const controllingSyndicateId = state.syndicateTurf?.[state.current];
      if (controllingSyndicateId) {
        const dominance = state.syndicates?.[controllingSyndicateId]?.dominance ?? 50;
        const dominanceMultiplier = 1.0 + (dominance - 50) * 0.01;
        multiplier *= dominanceMultiplier;
      }

      const heatEntry = state.enforcementHeat?.[state.current];
      const heatVal = heatEntry ? heatEntry.heat : 0;
      const activeEnforcers = Object.values(state.enforcers || {}).filter(e => e.currentRoom === state.current && (e as any).status !== "defeated").length;
      const pressure = heatVal + (activeEnforcers * 20);
      const pressureMultiplier = 1.0 + (pressure * 0.02);
      multiplier *= pressureMultiplier;

      // Allied Syndicate Member contraband pricing discount/bonus
      let isAlliedSyndicateMember = false;
      if (state.syndicates && npc?.id) {
        // 1. Check if they belong to the same syndicate
        for (const syndicate of Object.values(state.syndicates)) {
          if (syndicate.members.includes(traderId) && syndicate.members.includes(npc.id)) {
            isAlliedSyndicateMember = true;
            break;
          }
        }
        // 2. Check if player belongs to a syndicate allied with NPC's faction/syndicate
        if (!isAlliedSyndicateMember) {
          const npcFaction = npc.faction;
          if (npcFaction) {
            const playerSyndicates = Object.values(state.syndicates).filter(s => s.members.includes(traderId));
            for (const playerSynd of playerSyndicates) {
              if (state.alliances?.[playerSynd.id]?.[npcFaction] === "allied" || 
                  state.alliances?.[npcFaction]?.[playerSynd.id] === "allied") {
                isAlliedSyndicateMember = true;
                break;
              }
            }
          }
        }
        // 3. Check direct faction alliances
        if (!isAlliedSyndicateMember && npc.faction && state.alliances) {
          for (const [otherFaction, rep] of Object.entries(state.factionRep || {})) {
            if (rep > 0 && state.alliances[npc.faction]?.[otherFaction] === "allied") {
              isAlliedSyndicateMember = true;
              break;
            }
          }
        }
      }

      if (isAlliedSyndicateMember) {
        if (isBuy) {
          multiplier *= 0.80; // 20% strategic discount for purchase
        } else {
          multiplier *= 1.20; // 20% strategic premium for selling
        }
      }
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
  // 1. NPC Reputation Check
  const rep = state.npcRep?.[npc.id] ?? 0;
  const threshold = minRep !== undefined ? minRep : (npc?.min_rep !== undefined ? npc.min_rep : undefined);
  
  if (threshold !== undefined && rep < threshold) {
    return {
      allowed: false,
      reason: `The merchant refuses to trade with you due to your poor reputation (requires ${threshold}, you have ${rep}).`,
    };
  }

  // 2. Faction Reputation Check
  if (npc?.faction && (minRep !== undefined || npc?.min_rep !== undefined)) {
    const factionRep = state.factionRep?.[npc.faction] ?? 0;
    const minFactionRep = minRep !== undefined ? minRep : npc.min_rep;
    if (factionRep < minFactionRep) {
      return {
        allowed: false,
        reason: `The merchant refuses to trade with you due to your poor standing with their faction, ${npc.faction} (requires ${minFactionRep}, you have ${factionRep}).`,
      };
    }
  }

  // 3. Enforcer Heat Check
  const currentRoomId = state.current;
  const currentHeat = state.enforcementHeat?.[currentRoomId]?.heat ?? 0;
  const maxHeat = npc?.max_heat !== undefined ? npc.max_heat : 50; // default limit is 50
  if (currentHeat > maxHeat) {
    return {
      allowed: false,
      reason: `The merchant is too spooked to trade due to high enforcement heat in the area (heat: ${currentHeat}, limit: ${maxHeat}).`,
    };
  }

  // Enforce Cartel Embargoes!
  if (state.cartels && npc?.id) {
    for (const [cartelId, cartel] of Object.entries(state.cartels)) {
      if (cartel.members.includes(npc.id)) {
        const cartelPolicy = state.cartelPolicies?.[cartelId];
        const embargoedFactions = cartelPolicy?.embargoedFactions ?? [];
        for (const factionId of embargoedFactions) {
          const factionRep = state.factionRep?.[factionId] ?? 0;
          if (factionRep > 0) {
            return {
              allowed: false,
              reason: `The merchant is part of the ${cartel.name} cartel, which has active embargoes against faction ${factionId} (reputation: ${factionRep}).`,
            };
          }
        }
      }
    }
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
    merchantLastUpdated: state.merchantLastUpdated ? { ...state.merchantLastUpdated } : {},
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
          let roomTax = Math.max(1, Math.floor(rep / 10));
          const rateMultiplier = newState.taxPolicy?.[factionId];
          if (rateMultiplier !== undefined) {
            roomTax = roomTax * rateMultiplier;
          }
          totalTaxGold += roomTax;
        }
      }
      if (totalTaxGold > 0) {
        const currentGold = newState.vars["gold"] ?? 0;
        newState.vars["gold"] = currentGold + totalTaxGold;
        newState.vars["totalTaxesCollected"] = (newState.vars["totalTaxesCollected"] ?? 0) + totalTaxGold;
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
        newState.merchantLastUpdated[npc.id] = newState.step;
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
        let roomTax = Math.max(1, Math.floor(rep / 10));
        const rateMultiplier = newState.taxPolicy?.[factionId];
        if (rateMultiplier !== undefined) {
          roomTax = roomTax * rateMultiplier;
        }
        totalTaxGold += roomTax;
      }
    }
    if (totalTaxGold > 0) {
      const currentGold = newState.vars["gold"] ?? 0;
      newState.vars["gold"] = currentGold + totalTaxGold;
      newState.vars["totalTaxesCollected"] = (newState.vars["totalTaxesCollected"] ?? 0) + totalTaxGold;
      newState.journal.push(`Collected ${totalTaxGold} gold in taxes from allied faction territories.`);
    }
  }

  // 5. Periodic passive protection racket collections (AF-45)
  if (newState.step > 0 && newState.step % 5 === 0 && newState.protectionRackets) {
    for (const [merchantId, racket] of Object.entries(newState.protectionRackets)) {
      if (racket.active) {
        const syndicate = newState.syndicates?.[racket.syndicateId];
        if (syndicate) {
          // Find which room the merchant NPC is currently in
          const merchantRoom = pack.rooms.find((r: any) => r.npcs?.includes(merchantId));
          if (merchantRoom) {
            const turfSyndicateId = newState.syndicateTurf?.[merchantRoom.id];
            // Only collect if the syndicate currently controls the merchant's room turf!
            if (turfSyndicateId === racket.syndicateId) {
              const currentGold = newState.merchantGold?.[merchantId] ?? 100;
              const protectionFee = Math.min(racket.cost, currentGold);
              if (protectionFee > 0) {
                // Deduct from merchant
                if (!newState.merchantGold) newState.merchantGold = {};
                newState.merchantGold[merchantId] = currentGold - protectionFee;

                // Distribute among syndicate members
                const members = syndicate.members ?? [];
                const share = members.length > 0 ? Math.floor(protectionFee / members.length) : 0;
                if (share > 0) {
                  if (!newState.vars) newState.vars = {};
                  for (const member of members) {
                    const memberGoldKey = member === "player" ? "gold" : `gold_${member}`;
                    newState.vars[memberGoldKey] = (newState.vars[memberGoldKey] ?? 0) + share;
                  }
                }

                newState.vars["totalExtortionGoldCollected"] = (newState.vars["totalExtortionGoldCollected"] ?? 0) + protectionFee;
                newState.journal.push(`[Syndicate] Collected passive protection fee of ${protectionFee} gold from merchant ${merchantId} on turf ${merchantRoom.id} (Distributed ${share} gold to each member).`);
              }
            }
          }
        }
      }
    }
  }

  return newState;
}

/**
 * Resolves the faction for an NPC by first checking npc.faction,
 * then falling back to the room's faction where the NPC is defined in the pack,
 * and finally falling back to the state's territory control.
 */
export function getFactionForNpc(state: GameState, npcId: string, pack: any): string | undefined {
  if (!pack) {
    console.log("getFactionForNpc: pack is falsy!");
    return undefined;
  }
  const npc = pack.npcs?.find((n: any) => n.id === npcId);
  if (!npc) {
    console.log("getFactionForNpc: npc not found for id:", npcId, "available npcs:", JSON.stringify(pack.npcs?.map((n: any) => n.id)));
    return undefined;
  }
  if (npc.faction) return npc.faction;
  
  // Find room containing this NPC in the pack definition
  const room = pack.rooms?.find((r: any) => r.npcs?.includes(npcId));
  if (room && room.faction) return room.faction;

  // Fallback to room controlling faction if npc is in the current room
  if (state.current && pack.rooms?.find((r: any) => r.id === state.current)?.npcs?.includes(npcId)) {
    return state.territoryControl?.[state.current];
  }
  return undefined;
}

/**
 * Calculates dynamic trade transaction count and gold volume caps for a given faction
 * based on the player's reputation with that faction.
 */
export function getMerchantTradeCaps(state: GameState, factionId: string): { maxTransactions: number; maxGoldVolume: number } {
  const rep = state.factionRep?.[factionId] ?? 0;
  if (rep < 0) {
    // Hostile standing
    return { maxTransactions: 1, maxGoldVolume: 50 };
  } else if (rep < 10) {
    // Neutral standing
    return {
      maxTransactions: 3 + Math.floor(rep / 2),
      maxGoldVolume: 150 + rep * 10
    };
  } else {
    // Friendly / Allied standing
    return {
      maxTransactions: 10 + Math.floor(rep / 5),
      maxGoldVolume: 500 + rep * 20
    };
  }
}

/**
 * Scans the player's inventory and returns a list of items that are flagged as contraband
 * either in the pack definition or via the synchronized gossip contraband blacklist.
 */
export function getContrabandInInventory(state: GameState, pack: any): string[] {
  const contrabandItems: string[] = [];
  if (!pack || !pack.objects || !state.inventory) return [];
  for (const itemId of state.inventory) {
    const packObj = pack.objects.find((o: any) => o.id === itemId);
    const isPackContraband = packObj?.contraband === true;
    const isBlacklisted = state.contrabandBlacklist?.[itemId]?.blacklisted === true;
    if (isPackContraband || isBlacklisted) {
      contrabandItems.push(itemId);
    }
  }
  return contrabandItems;
}

/**
 * Scans all merchants and their inventories to find profitable arbitrage loops
 * where an item can be bought from one merchant and sold to another for a profit.
 */
export function findArbitrageOpportunities(
  state: GameState,
  pack: any
): Array<{
  item: string;
  buyNpc: string;
  sellNpc: string;
  cost: number;
  payout: number;
  profit: number;
}> {
  const opportunities: any[] = [];
  if (!pack || !pack.npcs || !pack.objects) return opportunities;

  for (const npcA of pack.npcs) {
    const stock = state.merchantInventories?.[npcA.id] ?? [];
    for (const itemId of stock) {
      const packObj = pack.objects.find((o: any) => o.id === itemId);
      if (!packObj) continue;

      // 1. Calculate buy price from npcA (player buying from npcA)
      const cost = calculateTradePrice(state, npcA, packObj, packObj.cost ?? 10, true);

      for (const npcB of pack.npcs) {
        if (npcA.id === npcB.id) continue;

        // 2. Calculate sell price to npcB (player selling to npcB)
        const payout = calculateTradePrice(state, npcB, packObj, packObj.cost ?? 10, false);

        if (payout > cost) {
          opportunities.push({
            item: itemId,
            buyNpc: npcA.id,
            sellNpc: npcB.id,
            cost,
            payout,
            profit: payout - cost,
          });
        }
      }
    }
  }

  // Sort by profit descending
  return opportunities.sort((a, b) => b.profit - a.profit);
}
