import { readFileSync } from "fs";
import { resolve } from "path";
import { parse as parseYaml } from "yaml";
import { step } from "../core/engine.js";
import { createInitialState } from "../core/state.js";
import { buildObservation } from "../api/observation.js";
import { mapCommand } from "../parser/command_map.js";
import { ParserPack } from "../parser/schema.js";

async function playRpg() {
  const packPath = resolve("content/parser/pack/heros_quest.yaml");
  const packContent = readFileSync(packPath, "utf-8");
  const pack = parseYaml(packContent) as ParserPack;

  console.log("=========================================");
  console.log(`⚔️ PLAYPLAYING RPG: ${pack.meta.title}`);
  console.log("=========================================\n");

  let state = createInitialState({
    seed: 42,
    start: pack.meta.start_room,
    varsInit: pack.meta.vars_init,
    flagsInit: pack.meta.flags_init,
  });

  const commands = [
    "go west",
    "use stone wall",
    "go up",
    "go down",
    "talk to Goblin Guard",
    "fight goblin guard",
    "fight goblin guard",
    "go west",
    "take spell scroll",
    "read spell scroll",
    "go east",
    "go east",
    "take steel broadsword",
    "go west",
    "go north",
    "talk to Shadow Knight",
    "cast fireball",
    "cast fireball",
    "go north",
    "use iron-bound chest",
    "open iron-bound chest",
    "go east",
    "talk to King Aldous",
    "ask about i have recovered your royal crown!"
  ];

  const printRoom = () => {
    const obs = buildObservation(state, pack);
    if (obs.mode !== "parser") return;

    console.log(`📍 [ROOM: ${pack.rooms.find(r => r.id === obs.room)?.name || obs.room}]`);
    console.log(obs.description);

    if (obs.visible_objects.length > 0) {
      console.log(`👉 You see: ${obs.visible_objects.map(o => o.name).join(", ")}`);
    }
    if (obs.exits.length > 0) {
      console.log(`🚪 Exits: ${obs.exits.map(e => e.direction).join(", ")}`);
    }
    if (state.inventory.length > 0) {
      console.log(`🎒 Inventory: ${state.inventory.join(", ")}`);
    }
    const hp = state.vars["hp"] ?? 20;
    const mana = state.vars["mana"] ?? 10;
    const str = state.vars["strength"] ?? 12;
    const score = state.vars["score"] ?? 0;
    console.log(`❤️ HP: ${hp} | ✨ Mana: ${mana} | ⚔️ Str: ${str} | 🏆 Score: ${score}`);
    console.log("-----------------------------------------");
  };

  printRoom();

  for (const cmd of commands) {
    console.log(`\n> ${cmd}\n`);
    const obs = buildObservation(state, pack);
    if (obs.mode !== "parser") continue;

    const match = mapCommand(cmd, obs.available_actions);
    if (!match.action) {
      console.log(`❌ Command failed to map: ${match.error}`);
      break;
    }

    const res = step(state, match.action, pack);
    if (!res.ok) {
      console.log(`❌ Command rejected: ${res.rejectionReason}`);
      break;
    }

    res.events.forEach(e => {
      if (e.type === "narration") {
        console.log(`📖 ${e.text}`);
      }
    });

    state = res.state;
    
    if (state.ended) {
      console.log("\n=========================================");
      console.log(`🎉 VICTORY! Game ended with: ${state.endingId}`);
      
      const endingMeta = pack.endings.find((e) => e.id === state.endingId);
      if (endingMeta) {
        console.log(endingMeta.text);
      }
      console.log("=========================================\n");
      break;
    }

    printRoom();
  }
}

playRpg().catch(console.error);
