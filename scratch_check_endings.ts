import { readFileSync } from "fs";
import { parse as parseYaml } from "yaml";
import { buildObservation } from "./src/api/observation.js";
import { createInitialState } from "./src/core/state.js";

const content = readFileSync("content/cyoa/pack/watchtower.yaml", "utf8");
const packData = parseYaml(content);

const state = createInitialState({
  seed: 42,
  start: "ending_escape",
  varsInit: packData.meta.vars_init,
  flagsInit: packData.meta.flags_init,
});

try {
  const obs = buildObservation(state, packData);
  console.log("Observation succeeded:", obs);
} catch (err: any) {
  console.error("Observation failed:", err.message);
}
