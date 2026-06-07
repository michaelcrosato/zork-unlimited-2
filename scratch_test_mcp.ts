import { McpGameClient } from "./src/playtest/mcp_client.js";

async function main() {
  const client = new McpGameClient("test-session");
  await client.connect();
  
  console.log("TRYING 'unlimited_forest':");
  try {
    const startObs1 = await client.startGame("unlimited_forest");
    console.log("SUCCESS:", JSON.stringify(startObs1));
  } catch (err: any) {
    console.log("FAILED:", err.message);
  }

  console.log("\nTRYING 'unlimited_forest_pack':");
  try {
    const startObs2 = await client.startGame("unlimited_forest_pack");
    console.log("SUCCESS:", JSON.stringify(startObs2));
  } catch (err: any) {
    console.log("FAILED:", err.message);
  }

  await client.disconnect();
}

main().catch(console.error);
