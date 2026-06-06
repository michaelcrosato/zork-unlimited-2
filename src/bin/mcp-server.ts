#!/usr/bin/env tsx
import { readFileSync, readdirSync, existsSync } from "fs";
import { resolve, join, basename, dirname } from "path";
import { fileURLToPath } from "url";
import { parse as parseYaml } from "yaml";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";

import { step } from "../core/engine.js";
import { createInitialState, GameState, getGuildPrestigeTier } from "../core/state.js";
import { validateCYOAPack } from "../validate/cyoa_validator.js";
import { validateParserPack } from "../validate/parser_validator.js";
import { isCyoaPack } from "../core/pack.js";
import { buildObservation } from "../api/observation.js";
import { CYOAPack } from "../cyoa/schema.js";
import { ParserPack } from "../parser/schema.js";
import { mapCommand } from "../parser/command_map.js";
import { saveGame, loadGame } from "../persist/save_load.js";
import { computeSha256, canonicalStringify } from "../core/hash.js";
import { CYOAObservation, ParserObservation } from "../api/types.js";

// Session storage
interface GameSession {
  sessionId: string;
  pack: CYOAPack | ParserPack;
  state: GameState;
  packPath: string;
  isCyoa: boolean;
  contentHash: string;
}

const sessions = new Map<string, GameSession>();

// Initialize the MCP Server
const server = new Server(
  {
    name: "adventureforge-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Helper: Discover all adventure packs in content directory
function findPacks(): Array<{ id: string; title: string; type: "cyoa" | "parser"; path: string }> {
  const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const paths = [
    { type: "cyoa" as const, dir: join(rootDir, "content/cyoa/pack") },
    { type: "parser" as const, dir: join(rootDir, "content/parser/pack") },
  ];

  const results: Array<{ id: string; title: string; type: "cyoa" | "parser"; path: string }> = [];

  for (const { type, dir } of paths) {
    if (!existsSync(dir)) continue;
    try {
      const files = readdirSync(dir);
      for (const file of files) {
        if (file.endsWith(".yaml") || file.endsWith(".yml") || file.endsWith(".json")) {
          const fullPath = join(dir, file);
          try {
            const content = readFileSync(fullPath, "utf8");
            const parsed = file.endsWith(".json") ? JSON.parse(content) : parseYaml(content);
            if (parsed && parsed.meta) {
              results.push({
                id: parsed.meta.id,
                title: parsed.meta.title || basename(file),
                type,
                path: fullPath,
              });
            }
          } catch {
            // Skip invalid files
          }
        }
      }
    } catch {
      // Directory read error
    }
  }

  return results;
}

// Helper: Load, validate, and compute hash for a pack
function loadAndValidatePack(packPath: string): { pack: CYOAPack | ParserPack; isCyoa: boolean; contentHash: string } {
  let content: string;
  try {
    content = readFileSync(packPath, "utf8");
  } catch (err: any) {
    throw new Error(`Failed to read file at ${packPath}: ${err.message}`);
  }

  let packData: any;
  try {
    packData = packPath.endsWith(".json") ? JSON.parse(content) : parseYaml(content);
  } catch (err: any) {
    throw new Error(`Failed to parse pack at ${packPath}: ${err.message}`);
  }

  if (typeof packData !== "object" || packData === null) {
    throw new Error("Invalid pack structure: Must be a YAML or JSON object.");
  }

  let isCyoa = false;
  let validation;

  if (isCyoaPack(packData)) {
    isCyoa = true;
    validation = validateCYOAPack(packData);
  } else if ("rooms" in packData) {
    validation = validateParserPack(packData);
  } else {
    throw new Error("Unknown content pack format: Missing 'scenes' or 'rooms' property.");
  }

  if (!validation.ok) {
    const findingsStr = validation.findings
      .map((f) => `[${f.severity.toUpperCase()}] ${f.code} in ${f.where.join(",")}: ${f.message}`)
      .join("\n");
    throw new Error(`Content pack validation failed:\n${findingsStr}`);
  }

  const contentHash = computeSha256(canonicalStringify(packData));

  return {
    pack: packData as CYOAPack | ParserPack,
    isCyoa,
    contentHash,
  };
}

// Helper: Format Observation into beautiful human-readable / LLM-friendly text representation
function formatObservation(session: GameSession): string {
  const obs = buildObservation(session.state, session.pack);
  const scoreVal = session.state.vars["score"] !== undefined ? ` | Score: ${session.state.vars["score"]}` : "";
  const stepVal = `Step: ${session.state.step}`;

  let buffer = "";

  if (session.isCyoa) {
    const cyoaObs = obs as CYOAObservation;
    buffer += `--- SCENE: ${cyoaObs.scene_id}${scoreVal} | ${stepVal} ---\n`;
    buffer += `${cyoaObs.text}\n`;

    if (session.state.ended) {
      const endingId = session.state.endingId || "game_over";
      let endingText = "You have met your end.";
      const endingMeta = (session.pack as CYOAPack).endings?.find((e) => e.id === endingId);
      if (endingMeta) endingText = endingMeta.text;
      buffer += `\n💀☠️ GAME OVER: ${endingId} ☠️💀\n${endingText}\n`;
    } else {
      buffer += `\nAvailable choices:\n`;
      cyoaObs.available_actions.forEach((choice, index) => {
        buffer += `  ${index + 1}. ${choice.text} [ID: ${choice.id}]\n`;
      });
    }
  } else {
    const parserObs = obs as ParserObservation;
    const roomName = (session.pack as ParserPack).rooms.find((r) => r.id === parserObs.room)?.name || parserObs.room;
    buffer += `--- ROOM: ${roomName}${scoreVal} | ${stepVal} ---\n`;
    buffer += `${parserObs.description}\n`;

    if (parserObs.visible_objects.length > 0) {
      const objNames = parserObs.visible_objects.map((o) => o.name).join(", ");
      buffer += `\nYou see here: ${objNames}\n`;
    }

    if (parserObs.exits.length > 0) {
      const exitsStr = parserObs.exits.map((e) => e.direction).join(", ");
      buffer += `Obvious exits: ${exitsStr}\n`;
    }

    if (session.state.ended) {
      const endingId = session.state.endingId || "game_over";
      let endingText = "You have met your end.";
      const endingMeta = (session.pack as ParserPack).endings.find((e) => e.id === endingId);
      if (endingMeta) endingText = endingMeta.text;
      buffer += `\n💀☠️ GAME OVER: ${endingId} ☠️💀\n${endingText}\n`;
    } else {
      buffer += `\nAvailable actions/verbs:\n`;
      // Compile standard verbs/commands for the LLM to know
      const uniqueVerbs = new Set<string>();
      parserObs.available_actions.forEach((a) => {
        const verb = a.command.split(" ")[0];
        uniqueVerbs.add(verb);
      });
      buffer += `  Verbs you can try: ${Array.from(uniqueVerbs).join(", ")}\n`;
      buffer += `  Specifically, here are some sample commands you can execute:\n`;
      parserObs.available_actions.slice(0, 12).forEach((a) => {
        buffer += `    - ${a.command}\n`;
      });
      if (parserObs.available_actions.length > 12) {
        buffer += `    - ...and more.\n`;
      }
    }
  }

  if (session.state.inventory.length > 0) {
    buffer += `\nInventory: ${session.state.inventory.join(", ")}\n`;
  } else {
    buffer += `\nInventory: (empty)\n`;
  }

  if (session.state.guildContracts && Object.keys(session.state.guildContracts).length > 0) {
    const active = Object.values(session.state.guildContracts).filter((c: any) => c.status === "active");
    if (active.length > 0) {
      buffer += `\nActive Guild Contracts:\n`;
      active.forEach((c: any) => {
        const targetRoomStr = c.targetRoom ? ` in ${c.targetRoom}` : "";
        buffer += `  - ${c.id}: ${c.contractType} target '${c.target}'${targetRoomStr} (${c.guildId}) [Reward: ${c.rewardGold} gold, ${c.rewardPrestige} prestige]\n`;
      });
    }
  }

  if (session.state.guildPrestige && Object.keys(session.state.guildPrestige).length > 0) {
    let printedPrestige = false;
    for (const [key, value] of Object.entries(session.state.guildPrestige)) {
      if (key.startsWith("player-") && typeof value === "number" && value > 0) {
        if (!printedPrestige) {
          buffer += `\nGuild Prestige:\n`;
          printedPrestige = true;
        }
        const guildId = key.substring(7);
        const tier = getGuildPrestigeTier(value);
        buffer += `  - ${guildId}: ${value} prestige (${tier})\n`;
      }
    }
  }

  if (session.state.journal.length > 0) {
    buffer += `\nNarrative Log:\n`;
    session.state.journal.slice(-5).forEach((line) => {
      buffer += `  - ${line}\n`;
    });
  }

  return buffer;
}

// 1. List Available Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_adventures",
        description: "List all available text adventure games (content packs) discovered in the content directory.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "start_new_game",
        description: "Start a new game session using a specific adventure pack. Resets the session state.",
        inputSchema: {
          type: "object",
          properties: {
            adventureId: {
              type: "string",
              description:
                "The metadata ID of the adventure (e.g. 'forest_pack_v1', 'chapel_pack_v1') or a relative filepath in the workspace.",
            },
            sessionId: {
              type: "string",
              description: "Optional session ID to allow multiple parallel games (defaults to 'default').",
            },
            seed: {
              type: "number",
              description: "Optional seed for deterministic randomness/events (defaults to 42).",
            },
          },
          required: ["adventureId"],
        },
      },
      {
        name: "get_current_observation",
        description:
          "Retrieve the current scene/room description, inventory, visible items, obvious exits, and available actions/choices.",
        inputSchema: {
          type: "object",
          properties: {
            sessionId: {
              type: "string",
              description: "Optional session ID (defaults to 'default').",
            },
          },
        },
      },
      {
        name: "execute_action",
        description:
          "Execute a player command or choice in the active adventure. Returns the narrations and updated observation.",
        inputSchema: {
          type: "object",
          properties: {
            action: {
              type: "string",
              description:
                "The action to execute. In CYOA mode: the choice number (e.g. '1'), the choice text, or the choice ID. In Parser mode: a classic text adventure command (e.g. 'go north', 'take key', 'open chest').",
            },
            sessionId: {
              type: "string",
              description: "Optional session ID (defaults to 'default').",
            },
          },
          required: ["action"],
        },
      },
      {
        name: "save_game_state",
        description: "Serialize and export the current session's game state to a JSON string.",
        inputSchema: {
          type: "object",
          properties: {
            sessionId: {
              type: "string",
              description: "Optional session ID (defaults to 'default').",
            },
          },
        },
      },
      {
        name: "load_game_state",
        description: "Resume a previous game session from a serialized JSON string.",
        inputSchema: {
          type: "object",
          properties: {
            saveData: {
              type: "string",
              description: "The serialized JSON string from a previous save_game_state call.",
            },
            sessionId: {
              type: "string",
              description: "Optional session ID (defaults to 'default').",
            },
          },
          required: ["saveData"],
        },
      },
    ],
  };
});

// 2. Call Tool Request Handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const sessionId = String((args as any)?.sessionId ?? "default");

  try {
    if (name === "list_adventures") {
      const packs = findPacks();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(packs, null, 2),
          },
        ],
      };
    }

    if (name === "start_new_game") {
      const adventureId = String((args as any)?.adventureId);
      const seed = Number((args as any)?.seed ?? 42);

      // Find the pack path
      const packs = findPacks();
      const matchedPack = packs.find(
        (p) =>
          p.id === adventureId ||
          p.path === adventureId ||
          basename(p.path) === adventureId ||
          basename(p.path).replace(/\.(yaml|yml|json)$/i, "") === adventureId
      );

      let packPath = "";
      if (matchedPack) {
        packPath = matchedPack.path;
      } else {
        const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
        packPath = resolve(rootDir, adventureId);
      }

      if (!existsSync(packPath)) {
        throw new Error(`Adventure pack not found: "${adventureId}"`);
      }

      const { pack, isCyoa, contentHash } = loadAndValidatePack(packPath);

      const startNode = isCyoa ? (pack as CYOAPack).meta.start : (pack as ParserPack).meta.start_room;

      const state = createInitialState({
        seed,
        start: startNode,
        varsInit: pack.meta.vars_init,
        flagsInit: pack.meta.flags_init,
      });

      const session: GameSession = {
        sessionId,
        pack,
        state,
        packPath,
        isCyoa,
        contentHash,
      };

      sessions.set(sessionId, session);

      const obsText = formatObservation(session);
      return {
        content: [
          {
            type: "text",
            text: `🎮 Started new game session "${sessionId}" with adventure "${pack.meta.title}" (${pack.meta.id})!\n\n${obsText}`,
          },
        ],
      };
    }

    // All tools below require an active session
    const session = sessions.get(sessionId);
    if (!session) {
      throw new Error(
        `No active game session found for ID "${sessionId}". Please start a new game first using 'start_new_game'.`
      );
    }

    if (name === "get_current_observation") {
      const obsText = formatObservation(session);
      return {
        content: [
          {
            type: "text",
            text: obsText,
          },
        ],
      };
    }

    if (name === "execute_action") {
      const rawInput = String((args as any)?.action ?? "");
      if (!rawInput.trim()) {
        throw new Error("Action command cannot be empty.");
      }

      const obs = buildObservation(session.state, session.pack);

      if (session.isCyoa) {
        const cyoaObs = obs as CYOAObservation;
        let choiceId = "";

        // Try mapping CYOA choices
        const choiceIdx = parseInt(rawInput.trim(), 10) - 1;
        if (!isNaN(choiceIdx) && choiceIdx >= 0 && choiceIdx < cyoaObs.available_actions.length) {
          choiceId = cyoaObs.available_actions[choiceIdx].id;
        }

        if (!choiceId) {
          const matchedById = cyoaObs.available_actions.find(
            (a) => a.id.toLowerCase() === rawInput.trim().toLowerCase()
          );
          if (matchedById) {
            choiceId = matchedById.id;
          }
        }

        if (!choiceId) {
          const matchedByText = cyoaObs.available_actions.find(
            (a) => a.text.toLowerCase() === rawInput.trim().toLowerCase()
          );
          if (matchedByText) {
            choiceId = matchedByText.id;
          }
        }

        if (!choiceId) {
          throw new Error(
            `Invalid choice: "${rawInput}". Please enter a valid choice number, exact ID, or choice text. Available choices are:\n` +
              cyoaObs.available_actions.map((c, i) => `  ${i + 1}. ${c.text} (ID: ${c.id})`).join("\n")
          );
        }

        const result = step(session.state, { type: "CHOOSE", choiceId }, session.pack);
        if (!result.ok) {
          throw new Error(`Action rejected: ${result.rejectionReason ?? "Condition requirements not met."}`);
        }

        session.state = result.state;

        // Collect narration event texts
        const narrationList = result.events.filter((e) => e.type === "narration").map((e) => (e as any).text);

        const newObsText = formatObservation(session);
        const prefix =
          narrationList.length > 0 ? `📖 Narration:\n${narrationList.map((t) => `  - ${t}`).join("\n")}\n\n` : "";

        return {
          content: [
            {
              type: "text",
              text: `${prefix}${newObsText}`,
            },
          ],
        };
      } else {
        // Parser Pack command parsing
        const parserObs = obs as ParserObservation;
        const match = mapCommand(rawInput, parserObs.available_actions);
        if (!match.action) {
          throw new Error(match.error || "I don't understand that command.");
        }

        const result = step(session.state, match.action, session.pack);
        if (!result.ok) {
          throw new Error(`Command rejected: ${result.rejectionReason ?? "Cannot perform that action right now."}`);
        }

        session.state = result.state;

        const narrationList = result.events.filter((e) => e.type === "narration").map((e) => (e as any).text);

        const newObsText = formatObservation(session);
        const prefix =
          narrationList.length > 0 ? `📖 Narration:\n${narrationList.map((t) => `  - ${t}`).join("\n")}\n\n` : "";

        return {
          content: [
            {
              type: "text",
              text: `${prefix}${newObsText}`,
            },
          ],
        };
      }
    }

    if (name === "save_game_state") {
      const saveData = saveGame(session.state, session.pack.meta.id, session.contentHash);
      return {
        content: [
          {
            type: "text",
            text: saveData,
          },
        ],
      };
    }

    if (name === "load_game_state") {
      const saveData = String((args as any)?.saveData ?? "");
      const loadedState = loadGame(saveData, session.pack.meta.id, session.contentHash);

      session.state = loadedState;
      const obsText = formatObservation(session);

      return {
        content: [
          {
            type: "text",
            text: `🎮 Game session "${sessionId}" successfully restored!\n\n${obsText}`,
          },
        ],
      };
    }

    throw new McpError(ErrorCode.MethodNotFound, `Tool "${name}" not implemented.`);
  } catch (err: any) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `❌ Error: ${err.message}`,
        },
      ],
    };
  }
});

// 3. Expose Resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "adventure://state",
        name: "Current Game State",
        description: "The raw JSON state of the 'default' active game session.",
        mimeType: "application/json",
      },
      {
        uri: "adventure://journal",
        name: "Game Narrative History / Journal",
        description: "The sequential narrative log and diary entries for the active 'default' session.",
        mimeType: "text/plain",
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  const session = sessions.get("default");
  if (!session) {
    throw new McpError(ErrorCode.InvalidRequest, "No active game session found for the 'default' slot.");
  }

  if (uri === "adventure://state") {
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(session.state, null, 2),
        },
      ],
    };
  }

  if (uri === "adventure://journal") {
    return {
      contents: [
        {
          uri,
          mimeType: "text/plain",
          text: session.state.journal.join("\n"),
        },
      ],
    };
  }

  throw new McpError(ErrorCode.InvalidRequest, `Unknown resource URI: ${uri}`);
});

// Start the Stdio Server
async function startServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("AdventureForge MCP server running on stdio transport!");
}

startServer().catch((err) => {
  console.error("Fatal error starting AdventureForge MCP server:", err);
  process.exit(1);
});
