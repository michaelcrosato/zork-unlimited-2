#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { createInterface } from "readline";
import { parse as parseYaml } from "yaml";
import { step } from "../core/engine.js";
import { createInitialState } from "../core/state.js";
import { validateCYOAPack } from "../validate/cyoa_validator.js";
import { formatValidationReport } from "../validate/report.js";
import { buildObservation } from "../api/observation.js";
import { Action } from "../api/types.js";
import { CYOAPack } from "../cyoa/schema.js";
import { saveGame, loadGame } from "../persist/save_load.js";
import { computeStateHash } from "../core/hash.js";

// ANSI Terminal Styling
const BOLD = "\x1b[1m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

function main() {
  const args = process.argv.slice(2);
  const packPath = resolve(args[0] ?? "content/cyoa/pack/watchtower.yaml");

  console.log(`${BOLD}${CYAN}=============================================`);
  console.log(`         ADVENTUREFORGE CYOA RUNNER          `);
  console.log(`=============================================${RESET}\n`);
  console.log(`Loading content pack from: ${packPath}...`);

  // 1. Load and parse pack
  let packContent: string;
  try {
    packContent = readFileSync(packPath, "utf-8");
  } catch (err: any) {
    console.error(`${RED}Error reading content pack file: ${err.message}${RESET}`);
    process.exit(1);
  }

  let packData: any;
  try {
    if (packPath.endsWith(".yaml") || packPath.endsWith(".yml")) {
      packData = parseYaml(packContent);
    } else {
      packData = JSON.parse(packContent);
    }
  } catch (err: any) {
    console.error(`${RED}Error parsing content pack file: ${err.message}${RESET}`);
    process.exit(1);
  }

  // 2. Validate pack
  const validationReport = validateCYOAPack(packData);
  if (!validationReport.ok) {
    console.error(`${RED}${formatValidationReport(validationReport)}${RESET}`);
    console.error(`${RED}Content pack validation failed. Aborting game start.${RESET}`);
    process.exit(1);
  }

  const pack = packData as CYOAPack;
  console.log(`${GREEN}✔ Pack '${pack.meta.id}' successfully validated!${RESET}\n`);

  // 3. Initialize GameState
  const seed = 42;
  let state = createInitialState({
    seed,
    start: pack.meta.start,
    varsInit: pack.meta.vars_init,
    flagsInit: pack.meta.flags_init,
  });

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const printScene = () => {
    const currentScene = pack.scenes.find((s) => s.id === state.current);
    if (!currentScene) {
      console.error(`${RED}Error: Current scene '${state.current}' not found.${RESET}`);
      rl.close();
      return;
    }

    console.log(`\n${BOLD}${CYAN}--- ${currentScene.title} ---${RESET}`);
    console.log(currentScene.text);

    // Print ending if applicable
    if (state.ended) {
      console.log(`\n${BOLD}${GREEN}=============================================`);
      console.log(`🎉 GAME OVER: ${state.endingId}`);
      console.log(`=============================================${RESET}\n`);
      rl.close();
      return;
    }

    // Build observation to retrieve available choices
    const obs = buildObservation(state, pack);

    console.log(`\n${BOLD}Available choices:${RESET}`);
    obs.available_actions.forEach((choice, index) => {
      console.log(`  ${BOLD}${index + 1}.${RESET} ${choice.text}`);
    });

    console.log(`\n${YELLOW}(Special commands: save <file>, load <file>, history, exit)${RESET}`);
    rl.question(`\n${BOLD}What will you do? (1-${obs.available_actions.length}): ${RESET}`, handleInput);
  };

  const handleInput = (input: string) => {
    const cleanInput = input.trim().toLowerCase();

    // Handle special commands
    if (cleanInput.startsWith("save ")) {
      const filepath = input.trim().slice(5);
      try {
        const contentHash = "dummy_content_hash"; // Simplified for manual save/load
        const saveStr = saveGame(state, pack.meta.id, contentHash);
        writeFileSync(filepath, saveStr, "utf-8");
        console.log(`${GREEN}✔ Game successfully saved to ${filepath}!${RESET}`);
      } catch (err: any) {
        console.error(`${RED}Failed to save game: ${err.message}${RESET}`);
      }
      printScene();
      return;
    }

    if (cleanInput.startsWith("load ")) {
      const filepath = input.trim().slice(5);
      try {
        const contentHash = "dummy_content_hash";
        const saveStr = readFileSync(filepath, "utf-8");
        state = loadGame(saveStr, pack.meta.id, contentHash);
        console.log(`${GREEN}✔ Game successfully loaded from ${filepath}!${RESET}`);
      } catch (err: any) {
        console.error(`${RED}Failed to load game: ${err.message}${RESET}`);
      }
      printScene();
      return;
    }

    if (cleanInput === "history") {
      console.log(`\n${BOLD}--- Narrative History ---${RESET}`);
      if (state.journal.length === 0) {
        console.log("Your journal is empty.");
      } else {
        state.journal.forEach((entry, i) => {
          console.log(`  - [Step ${i + 1}] ${entry}`);
        });
      }
      printScene();
      return;
    }

    if (cleanInput === "exit") {
      console.log("Exiting game. Goodbye!");
      rl.close();
      return;
    }

    // Handle choices
    const choiceIdx = parseInt(cleanInput, 10) - 1;
    const obs = buildObservation(state, pack);

    if (isNaN(choiceIdx) || choiceIdx < 0 || choiceIdx >= obs.available_actions.length) {
      console.log(`${RED}Invalid input! Please enter a number between 1 and ${obs.available_actions.length}.${RESET}`);
      printScene();
      return;
    }

    const selectedChoice = obs.available_actions[choiceIdx];
    const action: Action = { type: "CHOOSE", choiceId: selectedChoice.id };

    // Advance engine state
    const result = step(state, action, pack);
    if (!result.ok) {
      console.error(`${RED}Action rejected: ${result.rejectionReason}${RESET}`);
      printScene();
      return;
    }

    // Print narration events if any
    result.events.forEach((evt) => {
      if (evt.type === "narration") {
        console.log(`\n${YELLOW}📖 ${evt.text}${RESET}`);
      }
    });

    state = result.state;
    printScene();
  };

  // Start game loop
  printScene();
}

main();
