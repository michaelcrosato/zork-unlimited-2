import { readFileSync } from "fs";
import { resolve } from "path";
import { parse as parseYaml } from "yaml";
import { step } from "../core/engine.js";
import { createInitialState } from "../core/state.js";
import { buildObservation } from "../api/observation.js";
import { mapCommand } from "../parser/command_map.js";
import { ParserPack } from "../parser/schema.js";

async function play() {
  const packPath = resolve("content/parser/pack/chapel.yaml");
  const packContent = readFileSync(packPath, "utf-8");
  const pack = parseYaml(packContent) as ParserPack;

  console.log("=========================================");
  console.log(`🎮 PLAYING ADVENTURE: ${pack.meta.title}`);
  console.log("=========================================\n");

  let state = createInitialState({
    seed: 42,
    start: pack.meta.start_room,
    varsInit: pack.meta.vars_init,
    flagsInit: pack.meta.flags_init,
  });

  const commands = [
    "go north",
    "go north",
    "go west",
    "take coil of rope",
    "go east",
    "use coil of rope on old well",
    "go down",
    "take brass key",
    "go up",
    "go north",
    "go west",
    "unlock banded oak chest with brass key",
    "open banded oak chest",
    "take iron key",
    "go east",
    "use iron key on iron crypt door",
    "go down",
    "use iron portcullis",
    "go down",
  ];

  const printRoom = () => {
    const obs = buildObservation(state, pack);
    if (obs.mode !== "parser") return;

    console.log(`📍 [ROOM: ${pack.rooms.find((r) => r.id === obs.room)?.name || obs.room}]`);
    console.log(obs.description);

    if (obs.visible_objects.length > 0) {
      console.log(`👉 You see: ${obs.visible_objects.map((o) => o.name).join(", ")}`);
    }
    if (obs.exits.length > 0) {
      console.log(`🚪 Exits: ${obs.exits.map((e) => e.direction).join(", ")}`);
    }
    if (state.inventory.length > 0) {
      console.log(`🎒 Inventory: ${state.inventory.join(", ")}`);
    }
    console.log("-----------------------------------------");
  };

  // Initial Room print
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

    res.events.forEach((e) => {
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

play().catch(console.error);
