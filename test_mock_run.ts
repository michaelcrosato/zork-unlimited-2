import { MockLlmClient } from "./src/agents/llm/mock_client.js";

async function main() {
  const llm = new MockLlmClient();
  const obs = `🎮 Started new game session "blind-2467f681" with adventure "The Procedural Forest" (unlimited_forest_pack)!

--- ROOM: Sunlit Clearing | Score: 0 | Step: 0 ---
A beautiful sunlit clearing in the heart of the forest. The trees press in close, but a path leads west. Steep rocks lead up to a cliffside.

You see here: rusty shovel, earthen mound
Obvious exits: west, up`;
  const roomsVisited = ["Sunlit Clearing"];

  const res = await llm.completeJson<{ action: string; reason: string; want_to_quit: boolean }>({
    role: "playtester",
    system: "debug",
    input: {
      observation: obs,
      rooms_visited: roomsVisited,
    },
    schema: {},
  });

  console.log("RESULT:", JSON.stringify(res, null, 2));
}

main().catch(console.error);
