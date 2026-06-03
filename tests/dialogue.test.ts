import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { generateLegalActions } from "../src/parser/legal_actions.js";
import { validateParserPack } from "../src/validate/parser_validator.js";

describe("Advanced NPC Dialogue Trees & Routing", () => {
  const testPackRaw = {
    meta: {
      id: "dialogue_test",
      title: "Dialogue Test Pack",
      start_room: "start_room",
      vars_init: {
        gold: 0,
        intelligence: 5,
      },
      flags_init: [],
    },
    rooms: [
      {
        id: "start_room",
        name: "Starting Room",
        description: "A room for testing dialogues.",
        npcs: ["gimli"],
        exits: [],
      },
    ],
    objects: [],
    npcs: [
      {
        id: "gimli",
        name: "Gimli",
        description: "A friendly dwarf.",
        dialogue: {
          root: "node_welcome",
          nodes: [
            {
              id: "node_welcome",
              npc_text: "Welcome, traveller! What do you seek?",
              topics: [
                {
                  id: "topic_riddle",
                  prompt: "Ask Gimli about the secret riddle",
                  goto: "node_riddle_solved",
                  conditions: [
                    {
                      has_flag: "knows_riddle",
                    },
                  ],
                },
                {
                  id: "topic_give_gold",
                  prompt: "Ask Gimli for dwarf gold",
                  goto: "node_welcome",
                  effects: [
                    {
                      inc_var: {
                        name: "gold",
                        by: 10,
                      },
                    },
                  ],
                },
                {
                  id: "topic_ask_path",
                  prompt: "Ask Gimli for directions",
                  routing: [
                    {
                      goto: "node_smart_path",
                      conditions: [
                        {
                          var_gte: {
                            name: "intelligence",
                            value: 10,
                          },
                        },
                      ],
                    },
                    {
                      goto: "node_dumb_path",
                    },
                  ],
                },
                {
                  id: "topic_exit",
                  prompt: "Say goodbye",
                  end: true,
                },
              ],
            },
            {
              id: "node_riddle_solved",
              npc_text: "Ah, so you found the secret riddle! Here is the treasure room key.",
              effects: [
                {
                  set_flag: "has_key",
                },
              ],
              topics: [
                {
                  id: "topic_back",
                  prompt: "Go back to welcome",
                  goto: "node_welcome",
                },
              ],
            },
            {
              id: "node_smart_path",
              npc_text: "Ah, an intellectual! The high path to the east is safe for you.",
              topics: [
                {
                  id: "topic_back",
                  prompt: "Go back",
                  goto: "node_welcome",
                },
              ],
            },
            {
              id: "node_dumb_path",
              npc_text: "You look weak-minded. The low swamp path to the west is your only hope.",
              topics: [
                {
                  id: "topic_back",
                  prompt: "Go back",
                  goto: "node_welcome",
                },
              ],
            },
          ],
        },
      },
    ],
    win_conditions: [],
    endings: [],
  };

  it("should validate without errors", () => {
    const report = validateParserPack(testPackRaw);
    expect(report.ok).toBe(true);
  });

  const pack: ParserPack = ParserPackSchema.parse(testPackRaw);

  it("should dynamically hide/show topic options based on condition evaluation", () => {
    let state = createInitialState({
      seed: 123,
      start: pack.meta.start_room,
      varsInit: pack.meta.vars_init,
      flagsInit: pack.meta.flags_init,
    });

    // Gimli dialogue starts off in room, talk to him
    const res = step(state, { type: "TALK", npc: "gimli" }, pack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Check legal actions. gimli's root has: topic_riddle (locked behind knows_riddle), topic_give_gold, topic_ask_path, topic_exit
    let legal = generateLegalActions(state, pack);
    let promptCommands = legal.map((l) => l.command);

    // Riddle option should NOT be visible yet
    expect(promptCommands).not.toContain("ask about ask gimli about the secret riddle");
    expect(promptCommands).toContain("ask about ask gimli for dwarf gold");
    expect(promptCommands).toContain("ask about ask gimli for directions");
    expect(promptCommands).toContain("ask about say goodbye");

    // Enable knows_riddle flag
    state.flags["knows_riddle"] = true;

    legal = generateLegalActions(state, pack);
    promptCommands = legal.map((l) => l.command);

    // Riddle option SHOULD be visible now!
    expect(promptCommands).toContain("ask about ask gimli about the secret riddle");
  });

  it("should execute effects directly placed on topics", () => {
    let state = createInitialState({
      seed: 123,
      start: pack.meta.start_room,
      varsInit: pack.meta.vars_init,
      flagsInit: pack.meta.flags_init,
    });

    // Talk to Gimli
    let res = step(state, { type: "TALK", npc: "gimli" }, pack);
    state = res.state;

    expect(state.vars["gold"]).toBe(0);

    // Ask Gimli for dwarf gold
    res = step(state, { type: "ASK", npc: "gimli", topic: "topic_give_gold" }, pack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Check that topic effect to increment gold by 10 worked!
    expect(state.vars["gold"]).toBe(10);
  });

  it("should dynamically route dialogue transitions based on conditions (routing schema check)", () => {
    let state = createInitialState({
      seed: 123,
      start: pack.meta.start_room,
      varsInit: pack.meta.vars_init,
      flagsInit: pack.meta.flags_init,
    });

    // Case 1: intelligence = 5 (default: node_dumb_path)
    let res = step(state, { type: "TALK", npc: "gimli" }, pack);
    state = res.state;

    res = step(state, { type: "ASK", npc: "gimli", topic: "topic_ask_path" }, pack);
    expect(res.ok).toBe(true);
    state = res.state;

    // Should have routed to node_dumb_path
    const nodeVarName = "dialogue_node_gimli";
    expect(state.questStage[nodeVarName]).toBe("node_dumb_path");

    // Case 2: intelligence = 12 (routes to node_smart_path)
    let state2 = createInitialState({
      seed: 123,
      start: pack.meta.start_room,
      varsInit: { ...pack.meta.vars_init, intelligence: 12 },
      flagsInit: pack.meta.flags_init,
    });

    let res2 = step(state2, { type: "TALK", npc: "gimli" }, pack);
    state2 = res2.state;

    res2 = step(state2, { type: "ASK", npc: "gimli", topic: "topic_ask_path" }, pack);
    expect(res2.ok).toBe(true);
    state2 = res2.state;

    // Should have routed to node_smart_path
    expect(state2.questStage[nodeVarName]).toBe("node_smart_path");
  });

  it("should evaluate greeting overrides to dynamically select starting dialogue node", () => {
    const rawGreetingPack = {
      meta: {
        id: "greeting_override_test",
        title: "Greeting Override Test Pack",
        start_room: "start_room",
        vars_init: {
          prestige: 0,
        },
        flags_init: [],
      },
      rooms: [
        {
          id: "start_room",
          name: "Starting Room",
          description: "A room for testing greeting overrides.",
          npcs: ["boss"],
          exits: [],
        },
      ],
      objects: [],
      npcs: [
        {
          id: "boss",
          name: "Boss NPC",
          description: "The boss.",
          dialogue: {
            root: "node_default",
            nodes: [
              {
                id: "node_default",
                npc_text: "Welcome, new recruit.",
                topics: [{ id: "topic_exit", prompt: "Say goodbye", end: true }],
              },
              {
                id: "node_high_prestige",
                npc_text: "Welcome, master operative! I am honored by your presence.",
                topics: [{ id: "topic_exit", prompt: "Say goodbye", end: true }],
              },
            ],
            greeting_overrides: [
              {
                node: "node_high_prestige",
                conditions: [
                  {
                    var_gte: {
                      name: "prestige",
                      value: 100,
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
      win_conditions: [],
    };

    const pack = ParserPackSchema.parse(rawGreetingPack);

    // Case 1: prestige = 0 (default: node_default)
    let state = createInitialState({
      seed: 123,
      start: pack.meta.start_room,
      varsInit: pack.meta.vars_init,
      flagsInit: pack.meta.flags_init,
    });
    let res = step(state, { type: "TALK", npc: "boss" }, pack);
    expect(res.ok).toBe(true);
    expect(res.state.questStage["dialogue_node_boss"]).toBe("node_default");

    // Case 2: prestige = 100 (routes to node_high_prestige)
    let state2 = createInitialState({
      seed: 123,
      start: pack.meta.start_room,
      varsInit: { prestige: 100 },
      flagsInit: pack.meta.flags_init,
    });
    let res2 = step(state2, { type: "TALK", npc: "boss" }, pack);
    expect(res2.ok).toBe(true);
    expect(res2.state.questStage["dialogue_node_boss"]).toBe("node_high_prestige");
  });
});
