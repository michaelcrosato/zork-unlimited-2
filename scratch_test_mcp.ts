import { McpGameClient } from "./src/playtest/mcp_client.js";

async function main() {
  const client = new McpGameClient("test-session");
  await client.connect();
  const startObs = await client.startGame("unlimited_forest_pack");
  console.log("START OBSERVATION:");
  console.log(JSON.stringify(startObs));
  await client.disconnect();
}

main().catch(console.error);
