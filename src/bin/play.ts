#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { createInterface } from "readline";
import { parse as parseYaml } from "yaml";
import { step } from "../core/engine.js";
import { createInitialState } from "../core/state.js";
import { validateCYOAPack } from "../validate/cyoa_validator.js";
import { validateParserPack } from "../validate/parser_validator.js";
import { formatValidationReport } from "../validate/report.js";
import { isCyoaPack } from "../core/pack.js";
import { buildObservation } from "../api/observation.js";
import { Action, CYOAObservation, ParserObservation } from "../api/types.js";
import { CYOAPack } from "../cyoa/schema.js";
import { ParserPack } from "../parser/schema.js";
import { saveGame, loadGame } from "../persist/save_load.js";
import { mapCommand } from "../parser/command_map.js";

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
  console.log(`         ADVENTUREFORGE ENGINE PLAY          `);
  console.log(`=============================================${RESET}\n`);
  console.log(`Loading content pack: ${packPath}...`);

  // 1. Load and parse pack
  let packContent: string;
  try {
    packContent = readFileSync(packPath, "utf-8");
  } catch (err: any) {
    console.error(`${RED}Error reading file: ${err.message}${RESET}`);
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
    console.error(`${RED}Error parsing file: ${err.message}${RESET}`);
    process.exit(1);
  }

  // 2. Validate and identify pack type
  let isCyoa = false;
  let validationReport;

  if (isCyoaPack(packData)) {
    console.log("Detecting CYOA pack format.");
    validationReport = validateCYOAPack(packData);
    isCyoa = true;
  } else if ("rooms" in packData) {
    console.log("Detecting Parser pack format.");
    validationReport = validateParserPack(packData);
  } else {
    console.error(`${RED}Error: Unknown content pack format (missing 'scenes' or 'rooms').${RESET}`);
    process.exit(1);
  }

  if (!validationReport.ok) {
    console.error(`${RED}${formatValidationReport(validationReport)}${RESET}`);
    console.error(`${RED}Content pack validation failed. Aborting game.${RESET}`);
    process.exit(1);
  }

  const pack = packData as CYOAPack | ParserPack;
  console.log(`${GREEN}✔ Pack successfully validated!${RESET}\n`);

  const startRoom = isCyoa ? (pack as CYOAPack).meta.start : (pack as ParserPack).meta.start_room;

  // 3. Initialize GameState
  const seed = 42;
  let state = createInitialState({
    seed,
    start: startRoom,
    varsInit: pack.meta.vars_init,
    flagsInit: pack.meta.flags_init,
  });

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const printScene = () => {
    const scoreVal = state.vars["score"] !== undefined ? ` | Score: ${state.vars["score"]}` : "";
    const stepVal = `Step: ${state.step}`;

    // Handle Game Over / Death loop
    if (state.ended) {
      console.log(`\n${BOLD}${RED}=============================================`);
      console.log(`☠️  GAME OVER: ${state.endingId}`);
      console.log(`=============================================${RESET}\n`);

      // Find ending text
      let endingText = "You have met your end.";
      if (isCyoa) {
        const endingMeta = (pack as CYOAPack).endings?.find((e) => e.id === state.endingId);
        if (endingMeta) endingText = endingMeta.text;
      } else {
        const endingMeta = (pack as ParserPack).endings.find((e) => e.id === state.endingId);
        if (endingMeta) endingText = endingMeta.text;
      }
      console.log(endingText);

      console.log(`\n${BOLD}Options:${RESET}`);
      console.log(`  ${BOLD}1.${RESET} Restore from a save file (Undo Death)`);
      console.log(`  ${BOLD}2.${RESET} Restart from the beginning`);
      console.log(`  ${BOLD}3.${RESET} Exit`);

      rl.question(`\n${BOLD}Select option (1-3): ${RESET}`, (choice) => {
        const option = choice.trim();
        if (option === "1") {
          rl.question(`\n${BOLD}Enter save file path to restore: ${RESET}`, (filepath) => {
            try {
              const contentHash = "dummy_content_hash";
              const saveStr = readFileSync(filepath.trim(), "utf-8");
              state = loadGame(saveStr, pack.meta.id, contentHash);
              console.log(`${GREEN}✔ Game successfully restored from ${filepath}!${RESET}`);
            } catch (err: any) {
              console.error(`${RED}Failed to restore game: ${err.message}${RESET}`);
            }
            printScene();
          });
        } else if (option === "2") {
          state = createInitialState({
            seed,
            start: startRoom,
            varsInit: pack.meta.vars_init,
            flagsInit: pack.meta.flags_init,
          });
          console.log(`${GREEN}✔ Game restarted!${RESET}`);
          printScene();
        } else {
          console.log("Exiting game. Goodbye!");
          rl.close();
        }
      });
      return;
    }

    // Regular Game Loop Screen Compilation
    const obs = buildObservation(state, pack);

    if (isCyoa) {
      const cyoaObs = obs as CYOAObservation;
      console.log(`\n${BOLD}${CYAN}--- ${cyoaObs.scene_id}${scoreVal} | ${stepVal} ---${RESET}`);
      console.log(cyoaObs.text);

      console.log(`\n${BOLD}Available choices:${RESET}`);
      cyoaObs.available_actions.forEach((choice, index) => {
        console.log(`  ${BOLD}${index + 1}.${RESET} ${choice.text}`);
      });

      console.log(`\n${YELLOW}(Special commands: save <file>, load <file>, history, exit)${RESET}`);
      rl.question(`\n${BOLD}What will you do? (1-${cyoaObs.available_actions.length}): ${RESET}`, handleInput);
    } else {
      const parserObs = obs as ParserObservation;
      const roomObj = (pack as ParserPack).rooms.find((r) => r.id === parserObs.room);

      console.log(`\n${BOLD}${CYAN}--- ${roomObj?.name ?? parserObs.room}${scoreVal} | ${stepVal} ---${RESET}`);
      console.log(parserObs.description);

      // Print visible objects
      if (parserObs.visible_objects.length > 0) {
        const objNames = parserObs.visible_objects.map((o) => o.name).join(", ");
        console.log(`You see here: ${objNames}.`);
      }

      // Print exits
      const exitsStr = parserObs.exits.map((e) => e.direction).join(", ");
      console.log(`Obvious exits: ${exitsStr || "none"}.`);

      console.log(`\n${YELLOW}(Special commands: save <file>, load <file>, history, inventory, exit)${RESET}`);
      rl.question(`\n${BOLD}> ${RESET}`, handleInput);
    }
  };

  const handleInput = (input: string) => {
    const cleanInput = input.trim().toLowerCase();

    // Handle generic CLI utilities
    if (cleanInput.startsWith("save ")) {
      const filepath = input.trim().slice(5);
      try {
        const contentHash = "dummy_content_hash";
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

    // Resolve action based on mode
    let action: Action;
    const obs = buildObservation(state, pack);

    if (isCyoa) {
      const cyoaObs = obs as CYOAObservation;
      const choiceIdx = parseInt(cleanInput, 10) - 1;

      if (isNaN(choiceIdx) || choiceIdx < 0 || choiceIdx >= cyoaObs.available_actions.length) {
        console.log(
          `${RED}Invalid input! Please enter a choice index (1-${cyoaObs.available_actions.length}).${RESET}`
        );
        printScene();
        return;
      }
      const selectedChoice = cyoaObs.available_actions[choiceIdx];
      action = { type: "CHOOSE", choiceId: selectedChoice.id };
    } else {
      const parserObs = obs as ParserObservation;
      const match = mapCommand(input, parserObs.available_actions);

      if (!match.action) {
        console.log(`${RED}${match.error}${RESET}`);
        printScene();
        return;
      }
      action = match.action;
    }

    // Step the pure reducer
    const result = step(state, action, pack);
    if (!result.ok) {
      console.log(`${RED}${result.rejectionReason ?? "Command rejected."}${RESET}`);
      printScene();
      return;
    }

    // Print all narration flavor text
    result.events.forEach((evt) => {
      if (evt.type === "narration") {
        console.log(`\n${YELLOW}📖 ${evt.text}${RESET}`);
      }
    });

    state = result.state;
    printScene();
  };

  // Start game loops
  printScene();
}

main();
