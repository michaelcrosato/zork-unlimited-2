import { readFileSync } from "fs";
import { parse as parseYaml } from "yaml";
import { createInitialState } from "./src/core/state.js";
import { step } from "./src/core/engine.js";
import { buildObservation } from "./src/api/observation.js";

const content = readFileSync("content/cyoa/pack/watchtower.yaml", "utf8");
const pack = parseYaml(content);

console.log("Start room ID:", pack.meta.start);
let state = createInitialState({
  seed: 42,
  start: pack.meta.start,
  varsInit: pack.meta.vars_init,
  flagsInit: pack.meta.flags_init,
});

console.log("Initial state current:", state.current);
console.log("Initial observation:");
let obs = buildObservation(state, pack);
console.log(obs.text);

// Choice 1: go_east (1st choice in forest_crossroads)
console.log("\n--- Action 1: CHOOSE go_east ---");
let result = step(state, { type: "CHOOSE", choiceId: "go_east" }, pack);
state = result.state;
console.log("State current:", state.current);
obs = buildObservation(state, pack);
console.log("Obs text:", obs.text);

// Choice 2: enter_tower (1st choice in ruined_watchtower)
console.log("\n--- Action 2: CHOOSE enter_tower ---");
result = step(state, { type: "CHOOSE", choiceId: "enter_tower" }, pack);
state = result.state;
console.log("State current:", state.current);
obs = buildObservation(state, pack);
console.log("Obs text:", obs.text);

// Choice 3: hide (1st choice in watchtower_inside)
console.log("\n--- Action 3: CHOOSE hide ---");
result = step(state, { type: "CHOOSE", choiceId: "hide" }, pack);
state = result.state;
console.log("State current:", state.current, "ended:", state.ended, "endingId:", state.endingId);
try {
  obs = buildObservation(state, pack);
  console.log("Obs text:", obs.text);
} catch (err: any) {
  console.error("CRASHED in buildObservation:", err.message);
}
