import { MockLlmClient } from "./src/agents/llm/mock_client.js";

async function main() {
  const client = new MockLlmClient();
  const obs = `📖 Narration:\n  - [Skill Check] Rolling LOCKPICKING (Difficulty: 12): Rolled 6 + Skill 4 = 10. 🔴 FAILURE!\n  - You carefully pull out your lockpicks and work on the chest lock...\n\n--- ROOM: The Royal Treasury | Score: 40 | Step: 23 ---\nAround you, the air carries a dry, papery scent, like ancient tapestries crumbling to dust. Piles of copper and silver lie scattered about. In the center sits a small, locked, iron-bound chest. An exit leads east to the King's Throne Room.\n\nYou see here: iron-bound chest\nObvious exits: south, east\n\n`;

  const res = await client.completeJson<any>({
    role: "playtester",
    system: "You are a playtester",
    input: {
      observation: obs,
      step: 26,
      persona: "hoarder"
    },
    schema: {}
  });

  console.log("Decision:", res);
}

main().catch(console.error);
