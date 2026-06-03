import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { ParserPackSchema } from "./src/parser/schema.js";
import { createInitialState } from "./src/core/state.js";
import { step } from "./src/core/engine.js";
import { generateLegalActions } from "./src/parser/legal_actions.js";
import { mapCommand } from "./src/parser/command_map.js";

const packPath = resolve("content/parser/pack/guild_showcase.yaml");
const packContent = readFileSync(packPath, "utf-8");
const rawPack = parseYaml(packContent);
const showcasePack = ParserPackSchema.parse(rawPack);

let state = createInitialState({
  seed: 42,
  start: "crossroads",
  varsInit: { gold: 100 },
});

const runAction = (input: string) => {
  console.log(`\n--- Action input: "${input}" ---`);
  const legal = generateLegalActions(state, showcasePack);
  const mapped = mapCommand(input, legal);
  if (!mapped.action) {
    console.log("Mapped error:", mapped.error);
    return;
  }
  console.log("Mapped to action:", JSON.stringify(mapped.action));
  const res = step(state, mapped.action, showcasePack);
  if (!res.ok) {
    console.log("Execution failed:", res.rejectionReason);
    return;
  }
  state = res.state;
  console.log("Current room:", state.current);
  console.log("Dialogue node:", state.questStage["dialogue_node_smuggler_capo"]);
  const active = Object.values(state.guildContracts || {}).filter((c: any) => c.status === "active").map((c: any) => c.id);
  console.log("Active contracts:", active);
  console.log("Available commands:", generateLegalActions(state, showcasePack).map(a => a.command));
};

runAction("go west");
runAction("talk to smuggler capo");
runAction("ask about ask about contracts");
runAction("ask about accept the smuggling contract");
runAction("ask about go back");
runAction("ask about ask about contracts");
