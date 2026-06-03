import { spawn } from "child_process";
import { resolve } from "path";

async function playThroughMcp() {
  console.log("=========================================");
  console.log("🎮 PLAYING THE GAME DIRECTLY VIA MCP SERVER");
  console.log("=========================================\n");

  const serverScript = resolve("src/bin/mcp-server.ts");
  const server = spawn("npx", ["tsx", serverScript], {
    env: { ...process.env, PAGER: "cat" },
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

  // Handle incoming stdout from the MCP server
  server.stdout.on("data", (data) => {
    buffer += data.toString();

    // Process JSON-RPC lines
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
      } catch {
        // Skip unparsable output
      }
    }
  });

  // Helper to send a JSON-RPC request to the MCP server
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

  // Helper to send a JSON-RPC notification
  function sendNotification(method: string, params?: any) {
    const notification = {
      jsonrpc: "2.0",
      method,
      params,
    };
    server.stdin.write(JSON.stringify(notification) + "\n");
  }

  // 1. Initialize Connection
  console.log("Initializing MCP handshake...");
  const initResult = await sendRequest("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: {
      name: "mcp-play-tester",
      version: "1.0.0",
    },
  });

  sendNotification("notifications/initialized");
  console.log("✅ MCP Handshake complete!");
  console.log(`Server Name: ${initResult.result?.serverInfo?.name}`);
  console.log(`Server Version: ${initResult.result?.serverInfo?.version}\n`);

  // 2. Start the game via tools/call
  console.log("Starting a new game session using MCP tool: 'start_new_game'...");
  const startResult = await sendRequest("tools/call", {
    name: "start_new_game",
    arguments: {
      adventureId: "chapel_pack_v1",
      sessionId: "mcp-session",
    },
  });

  const startText = startResult.result?.content?.[0]?.text || "";
  console.log("\n-----------------------------------------");
  console.log(startText);
  console.log("-----------------------------------------");

  // Walkthrough steps
  const moves = [
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

  for (const move of moves) {
    console.log(`\nPlayer command via MCP: "${move}"`);
    const actionResult = await sendRequest("tools/call", {
      name: "execute_action",
      arguments: {
        action: move,
        sessionId: "mcp-session",
      },
    });

    const outputText = actionResult.result?.content?.[0]?.text || "";
    console.log("-----------------------------------------");
    console.log(outputText);
    console.log("-----------------------------------------");

    if (outputText.includes("GAME OVER") || outputText.includes("VICTORY")) {
      break;
    }
  }

  // Cleanup server process
  server.kill();
  console.log("\n✅ Playthrough completed successfully through the MCP server process!");
}

playThroughMcp().catch(console.error);
