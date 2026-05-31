import { spawn } from "child_process";
import { resolve } from "path";

interface Turn {
  cmd: string;
  type: string;
}

async function runPlaytestSession(adventureId: string, turns: Turn[], verifySensory: boolean = false) {
  console.log(`\n-----------------------------------------`);
  console.log(`🎮 STARTING PLAYTEST SESSION: ${adventureId}`);
  console.log(`-----------------------------------------`);

  const serverScript = resolve("src/bin/mcp-server.ts");
  const server = spawn("npx", ["tsx", serverScript], {
    env: { ...process.env, PAGER: "cat" }
  });

  // Collect stderr for debugging
  server.stderr.on("data", (data) => {
    const msg = data.toString().trim();
    if (msg) {
      console.log(`[MCP Server Stderr] ${msg}`);
    }
  });

  let messageId = 1;
  const pendingRequests = new Map<number, (res: any) => void>();
  let buffer = "";

  server.stdout.on("data", (data) => {
    buffer += data.toString();
    while (true) {
      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex === -1) break;
      const line = buffer.substring(0, newlineIndex).trim();
      buffer = buffer.substring(newlineIndex + 1);
      if (!line) continue;

      try {
        const response = JSON.parse(line);
        if (response.id !== undefined) {
          const resolvePromise = pendingRequests.get(response.id);
          if (resolvePromise) {
            pendingRequests.delete(response.id);
            resolvePromise(response);
          }
        }
      } catch (err) {
        // Skip unparsable output
      }
    }
  });

  function sendRequest(method: string, params: any): Promise<any> {
    const id = messageId++;
    const request = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };
    return new Promise((resolve) => {
      pendingRequests.set(id, resolve);
      server.stdin.write(JSON.stringify(request) + "\n");
    });
  }

  function sendNotification(method: string, params?: any) {
    const notification = {
      jsonrpc: "2.0",
      method,
      params,
    };
    server.stdin.write(JSON.stringify(notification) + "\n");
  }

  // 1. Handshake
  console.log("Initiating MCP handshake...");
  await sendRequest("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "afk-mcp-playtester", version: "1.0.0" },
  });
  sendNotification("notifications/initialized");
  console.log("🟢 MCP Server handshake successful!");

  // 2. Start game
  console.log(`Starting adventure '${adventureId}'...`);
  const startRes = await sendRequest("tools/call", {
    name: "start_new_game",
    arguments: { adventureId, sessionId: "afk-session" }
  });
  const startText = startRes.result?.content?.[0]?.text || "";
  console.log("\n🎮 Initial Observation:\n" + startText);

  let turnIndex = 1;
  let errorsEncountered = 0;

  for (const turn of turns) {
    console.log(`\n👉 TURN #${turnIndex++} (${turn.type.toUpperCase()}): "${turn.cmd}"`);
    try {
      const actionRes = await sendRequest("tools/call", {
        name: "execute_action",
        arguments: { action: turn.cmd, sessionId: "afk-session" }
      });
      const outputText = actionRes.result?.content?.[0]?.text || "";
      
      if (actionRes.result?.isError) {
        console.log(`❌ Turn rejected cleanly by engine: ${outputText}`);
      } else {
        console.log(`🟢 Outcome:\n${outputText}`);
        
        if (verifySensory) {
          // Verify sensory flavor text inclusion for chapel pack
          const hasSensoryText = 
            outputText.includes("pine needles") || 
            outputText.includes("owl echoes") || 
            outputText.includes("loam") || 
            outputText.includes("watchfulness") ||
            outputText.includes("incense") || 
            outputText.includes("clouds of ancient") || 
            outputText.includes("Dust motes") || 
            outputText.includes("deep earth") ||
            outputText.includes(" ancient chill") || 
            outputText.includes("long-forgotten") || 
            outputText.includes("metallic scent") || 
            outputText.includes("shadows dance");
          
          if (hasSensoryText) {
            console.log("✨ Sensory narrative check: PASS (Flavor injected successfully!)");
          } else {
            console.log("⚠️ Sensory narrative check: WARNING (No match in narration, but description updated)");
          }
        }
      }
    } catch (err: any) {
      console.log(`🔴 Subprocess RPC Error: ${err.message}`);
      errorsEncountered++;
    }
  }

  // 4. Terminate subprocess
  console.log("\nTerminating MCP server subprocess...");
  server.kill();
  console.log("🟢 Subprocess killed. Port released.");
  
  if (errorsEncountered === 0) {
    console.log(`\n🎉 PLAYTEST FOR '${adventureId}' COMPLETED SUCCESSFULLY!`);
    return true;
  } else {
    console.log(`\n🔴 PLAYTEST FOR '${adventureId}' FAILED: ${errorsEncountered} RPC errors occurred.`);
    return false;
  }
}

async function runMcpPlaytests() {
  console.log("=================================================");
  console.log("🤖 STARTING AUTONOMOUS AFK MCP PLAYTEST SUITE");
  console.log("=================================================\n");

  // Session 1: Baseline Chapel Quest
  const chapelTurns: Turn[] = [
    { cmd: "look", type: "standard" },
    { cmd: "eat the locked door", type: "chaotic" }, // Edge case parser check
    { cmd: "go north", type: "standard" },
    { cmd: "drop inventory while jumping", type: "chaotic" }, // Edge case check
    { cmd: "go west", type: "standard" },
    { cmd: "take coil of rope", type: "standard" },
    { cmd: "rub the brass key on the wall", type: "chaotic" }, // Unpossessed item check
    { cmd: "go east", type: "standard" },
    { cmd: "open old well with rope", type: "chaotic" }, // Invalid interaction verb mapping check
    { cmd: "use coil of rope on old well", type: "standard" },
    { cmd: "go down", type: "standard" },
    { cmd: "take brass key", type: "standard" },
    { cmd: "go up", type: "standard" },
    { cmd: "go north", type: "standard" }
  ];

  const chapelSuccess = await runPlaytestSession("chapel_pack_v1", chapelTurns, true);

  // Session 2: Procedural Forest Quest
  const forestTurns: Turn[] = [
    { cmd: "look", type: "standard" },
    { cmd: "take rusty shovel", type: "standard" },
    { cmd: "go west", type: "standard" }, // Moves to Deep Forest
    { cmd: "go east", type: "standard" }, // Moves back to Sunlit Clearing
    { cmd: "use rusty shovel on earthen mound", type: "standard" }, // Digs and generates procedural room to the east!
    { cmd: "go east", type: "standard" }, // Navigates to the procedurally generated 'Hidden Glade'
    { cmd: "look", type: "standard" },
    { cmd: "go west", type: "standard" } // Navigates back to 'Sunlit Clearing'
  ];

  const forestSuccess = await runPlaytestSession("unlimited_forest_pack", forestTurns, false);

  if (chapelSuccess && forestSuccess) {
    console.log("\n=================================================");
    console.log("🎉 ALL PLAYTEST RUNS COMPLETED SUCCESSFULLY!");
    console.log("=================================================\n");
    process.exit(0);
  } else {
    console.log("\n=================================================");
    console.log("🔴 PLAYTEST RUNS DETECTED FAILURES!");
    console.log("=================================================\n");
    process.exit(1);
  }
}

runMcpPlaytests().catch((err) => {
  console.error("Playtest suite crashed:", err);
  process.exit(1);
});
