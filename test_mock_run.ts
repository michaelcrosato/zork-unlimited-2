import { MockLlmClient } from "./src/agents/llm/mock_client.js";

async function main() {
  const llm = new MockLlmClient();
  const obs = `📖 Narration:
  - You open the iron cage.

--- ROOM: Sunlit Clearing | Score: 0 | Step: 4 ---
A beautiful sunlit clearing in the heart of the ruins. A massive stone vault door stands to the east. A dark pathway leads west into the control temple. A low draft makes the shadows dance flickeringly along the walls. The sky overhead is clear.

You see here: iron cage, vault key, vault door
Obvious exits: west, east

Available actions/verbs:
  Verbs you can try: look, inventory, go, inspect, close, take`;
  const roomsVisited = ["Sunlit Clearing", "Control Temple"];

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
