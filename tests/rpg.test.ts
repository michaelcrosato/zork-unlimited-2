import { describe, it, expect } from "vitest";
import { parse as parseYaml } from "yaml";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { createInitialState } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { buildObservation } from "../src/api/observation.js";
import { Action, ParserObservation } from "../src/api/types.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { mapCommand } from "../src/parser/command_map.js";
import { saveGame, loadGame } from "../src/persist/save_load.js";

describe("Hero's Quest RPG Mechanics (Stage 4)", () => {
  const packPath = fileURLToPath(new URL("../content/parser/pack/heros_quest.yaml", import.meta.url));
  const pack = ParserPackSchema.parse(parseYaml(readFileSync(packPath, "utf-8")));

  it("should successfully run the full RPG quest line with combat, skill checks, and spells", () => {
    let state = createInitialState({
      seed: 12345, // Set seed for deterministic rolls
      start: pack.meta.start_room,
      varsInit: pack.meta.vars_init,
      flagsInit: pack.meta.flags_init,
    });

    const runAction = (cmd: string) => {
      const obs = buildObservation(state, pack) as ParserObservation;
      const match = mapCommand(cmd, obs.available_actions);
      if (!match.action) {
        throw new Error(`Command failed to map: '${cmd}'. ${match.error}`);
      }

      const res = step(state, match.action, pack);
      expect(res.ok).toBe(true);
      state = res.state;
      return res;
    };

    // 1. Initial gates room check
    expect(state.current).toBe("castle_gates");

    // 2. Go to castle wall and perform a seeded climbing skill check
    runAction("go west");
    expect(state.current).toBe("castle_wall");
    expect(state.flags["wall_climb_success"]).toBeUndefined();

    // scaling the wall triggers a skill check (climbing=5, difficulty=10)
    // with seed 12345, check if success is rolled
    runAction("use stone wall");
    expect(state.flags["wall_climb_success"]).toBeDefined();
    
    // Check if we scale battlements
    if (state.flags["wall_climb_success"]) {
      runAction("go up");
      expect(state.current).toBe("battlements");
      runAction("go down");
      expect(state.current).toBe("castle_courtyard");
    } else {
      // If failed, let's force it to succeed by mocking or retrying.
      // But let's check what was rolled. Since it's fully deterministic,
      // it should be reproducible. Let's see if we can do multiple retries or if it succeeds.
      // Wait, let's keep trying until we scale it.
      while (!state.flags["wall_climb_success"]) {
        runAction("use stone wall");
      }
      runAction("go up");
      expect(state.current).toBe("battlements");
      runAction("go down");
      expect(state.current).toBe("castle_courtyard");
    }

    // 3. Meet the Goblin Guard and initiate combat
    runAction("talk to Goblin Guard");
    expect(state.flags["in_combat_with_goblin_guard"]).toBe(true);

    // 4. Fight the Goblin Guard in turn-based combat using spell scrolls or weapons
    // Let's run a loop of fighting the goblin until he is dead
    while (state.flags["in_combat_with_goblin_guard"]) {
      runAction("fight goblin guard");
    }
    expect(state.flags["npc_defeated_goblin_guard"]).toBe(true);
    expect(state.vars["gold"]).toBeGreaterThan(0);
    expect(state.vars["xp"]).toBeGreaterThan(0);

    // 5. Go to Library and collect spell scroll
    runAction("go west");
    expect(state.current).toBe("library");
    runAction("take spell scroll");
    expect(state.inventory).toContain("spell_scroll");
    
    // Read spell scroll (increases intelligence & mana)
    runAction("read spell scroll");
    expect(state.vars["intelligence"]).toBeGreaterThan(12);
    expect(state.vars["mana"]).toBeGreaterThan(10);

    // 6. Go to Armory and collect broadsword
    runAction("go east"); // back to courtyard
    runAction("go east"); // to armory
    expect(state.current).toBe("armory");
    runAction("take steel broadsword");
    expect(state.inventory).toContain("broadsword");
    expect(state.vars["strength"]).toBeGreaterThan(12);

    // 7. Go to Castle Dungeons and fight the Shadow Knight boss
    runAction("go west"); // back to courtyard
    runAction("go north"); // to dungeons
    expect(state.current).toBe("dungeons");
    runAction("talk to Shadow Knight");
    expect(state.flags["in_combat_with_shadow_knight"]).toBe(true);

    // Fight boss using Fireball spell!
    // Each Fireball costs 3 mana and automatically hits for high damage
    while (state.flags["in_combat_with_shadow_knight"]) {
      if (state.vars["mana"] >= 3) {
        runAction("cast fireball");
      } else if (state.vars["mana"] >= 2 && state.vars["hp"] < 15) {
        runAction("cast heal");
      } else {
        runAction("fight shadow knight");
      }
    }
    expect(state.flags["npc_defeated_shadow_knight"]).toBe(true);

    // 8. Go to Treasury and pick lock on the chest
    runAction("go north"); // to treasury
    expect(state.current).toBe("treasury");
    expect(state.flags["chest_unlocked"]).toBeUndefined();

    // Evolve lockpicking check until success
    while (!state.flags["chest_unlocked"]) {
      runAction("use iron-bound chest");
    }
    expect(state.flags["chest_unlocked"]).toBe(true);

    // Open chest and get crown
    runAction("open iron-bound chest");
    expect(state.inventory).toContain("royal_crown");

    // 9. Go to Throne Room, speak to King Aldous and return the crown to win!
    runAction("go east"); // to throne_room
    expect(state.current).toBe("throne_room");
    
    // Give crown triggers victory
    runAction("talk to King Aldous");
    runAction("ask about i have recovered your royal crown!");
    expect(state.ended).toBe(true);
    expect(state.endingId).toBe("ending_victory");
  });
});
