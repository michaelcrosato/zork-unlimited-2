import { McpGameClient } from "./src/playtest/mcp_client.js";

async function main() {
  const client = new McpGameClient("test-session");
  await client.connect();
  
  console.log("Starting forest_pack_v1:");
  try {
    const startObs = await client.startGame("forest_pack_v1");
    console.log("Start observation:\n", startObs);
    
    console.log("\nExecuting choice 1 (go_east):");
    const r1 = await client.executeAction("1");
    console.log("Result 1 (isError:", r1.isError, "):\n", r1.text);
    
    console.log("\nExecuting choice 1 (enter_tower):");
    const r2 = await client.executeAction("1");
    console.log("Result 2 (isError:", r2.isError, "):\n", r2.text);
    
    console.log("\nExecuting choice 1 (hide):");
    const r3 = await client.executeAction("1");
    console.log("Result 3 (isError:", r3.isError, "):\n", r3.text);
    
  } catch (err: any) {
    console.log("FAILED with error:", err.message);
  }

  await client.disconnect();
}

main().catch(console.error);
