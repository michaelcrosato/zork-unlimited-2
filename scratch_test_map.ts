import { mapCommand } from "./src/parser/command_map.js";

const actions = [
  { id: "move-east", command: "go east", action: { type: "MOVE" as const, direction: "east" } },
  { id: "look-altar", command: "look altar", action: { type: "LOOK" as const, target: "altar" } },
  { id: "take-katana", command: "take steel katana", action: { type: "TAKE" as const, item: "katana" } },
  { id: "drop-boots", command: "drop leather boots", action: { type: "DROP" as const, item: "boots" } },
  { id: "open-vault", command: "open iron vault", action: { type: "OPEN" as const, target: "vault" } },
  { id: "close-vault", command: "close iron vault", action: { type: "CLOSE" as const, target: "vault" } },
  {
    id: "unlock-chest",
    command: "unlock massive chest with gold key",
    action: { type: "UNLOCK" as const, target: "chest" },
  },
  { id: "use-amulet", command: "use golden amulet", action: { type: "USE" as const, item: "amulet" } },
  { id: "talk-capo", command: "talk to smuggler capo", action: { type: "TALK" as const, npc: "capo" } },
  {
    id: "ask-capo-contracts",
    command: "ask capo about contracts",
    action: { type: "ASK" as const, npc: "capo", topic: "contracts" },
  },
  { id: "give-biscuit", command: "give dry biscuit to capo", action: { type: "GIVE" as const, target: "capo" } },
  { id: "fight-ghoul", command: "fight crypt ghoul", action: { type: "FIGHT" as const, npc: "ghoul" } },
];

console.log("RESULT:", mapCommand("unseal vaults", actions));
