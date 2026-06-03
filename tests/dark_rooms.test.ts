import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { step } from "../src/core/engine.js";
import { ParserPack } from "../src/parser/schema.js";
import { generateLegalActions } from "../src/parser/legal_actions.js";

describe("Dark Rooms & Light Source Mechanics", () => {
  const pack: ParserPack = {
    meta: {
      id: "dark-rooms-test-pack",
      title: "Dark Rooms Test Pack",
      start_room: "room_lit",
      vars_init: {},
      flags_init: [],
    },
    rooms: [
      {
        id: "room_lit",
        name: "Lit Room",
        description: "A bright, welcoming room.",
        objects: ["torch"],
        npcs: [],
        exits: [{ direction: "east", to: "room_dark" }],
      },
      {
        id: "room_dark",
        name: "Dark Cave",
        description: "A deep, scary cave.",
        objects: ["treasure"],
        npcs: ["goblin"],
        exits: [{ direction: "west", to: "room_lit" }],
        dark: true,
      },
    ],
    objects: [
      {
        id: "torch",
        name: "brass torch",
        aliases: ["torch", "brass torch"],
        description: "A sturdy brass torch.",
        takeable: true,
        light_source: true,
      },
      {
        id: "treasure",
        name: "golden chalice",
        aliases: ["chalice", "golden chalice", "treasure"],
        description: "A glittering golden chalice.",
        takeable: true,
      },
    ],
    npcs: [
      {
        id: "goblin",
        name: "Goblin Guide",
        description: "A friendly cave goblin.",
        dialogue: {
          root: "greet",
          nodes: [
            {
              id: "greet",
              npc_text: "Hello explorer!",
              topics: [
                {
                  id: "bye",
                  prompt: "Goodbye",
                  end: true,
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

  it("should hide descriptions, NPCs, and objects in a dark room and trigger grue death after two turns", () => {
    let state = createInitialState({ seed: 42, start: "room_lit" });

    // Take the torch
    let res = step(state, { type: "TAKE", item: "torch" }, pack);
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.inventory).toContain("torch");

    // Move to the dark cave
    res = step(state, { type: "MOVE", direction: "east" }, pack);
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.current).toBe("room_dark");

    // The entry narration should indicate darkness
    const lastEvent = res.events[res.events.length - 1];
    expect(lastEvent.type).toBe("narration");
    expect(lastEvent.text).toBe("It is pitch black. You are likely to be eaten by a grue.");

    // Look around room should show pitch black
    res = step(state, { type: "LOOK" }, pack);
    expect(res.ok).toBe(true);
    expect(res.events[res.events.length - 1].text).toBe("It is pitch black. You are likely to be eaten by a grue.");
    state = res.state;

    // Check legal actions. Npcs and room objects should NOT be visible.
    let legal = generateLegalActions(state, pack);
    expect(legal.map((l) => l.id)).not.toContain("look_treasure");
    expect(legal.map((l) => l.id)).not.toContain("take_treasure");
    expect(legal.map((l) => l.id)).not.toContain("talk_goblin");

    // But we should be able to move or use the torch in our inventory
    expect(legal.map((l) => l.id)).toContain("go_west");
    expect(legal.map((l) => l.id)).toContain("light_torch");

    // We spent 1 turn in darkness (moving in was 1 step, LOOK was 2nd step).
    // Let's do another LOOK, which should trigger grue death at the end of the turn!
    res = step(state, { type: "LOOK" }, pack);
    expect(res.ok).toBe(true);
    state = res.state;

    expect(state.ended).toBe(true);
    expect(state.endingId).toBe("grue_death");
    expect(res.events.some((e) => e.type === "ending" && e.endingId === "grue_death")).toBe(true);
  });

  it("should allow lighting a torch, illuminating the room, revealing objects/NPCs, and resetting grue timer", () => {
    let state = createInitialState({ seed: 42, start: "room_lit" });

    // Take torch and move to dark cave
    state = step(state, { type: "TAKE", item: "torch" }, pack).state;
    let res = step(state, { type: "MOVE", direction: "east" }, pack);
    state = res.state;

    // Light the torch
    res = step(state, { type: "USE", item: "torch", target: "torch" }, pack);
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.objectState["torch"]?.lit).toBe(true);
    expect(res.events.some((e) => e.text && e.text.includes("You light the brass torch"))).toBe(true);

    // Look around room should now show the actual description!
    res = step(state, { type: "LOOK" }, pack);
    expect(res.ok).toBe(true);
    expect(res.events[res.events.length - 1].text).toBe("A deep, scary cave.");
    state = res.state;

    // Check legal actions. Npcs and room objects should now be visible!
    let legal = generateLegalActions(state, pack);
    expect(legal.map((l) => l.id)).toContain("look_treasure");
    expect(legal.map((l) => l.id)).toContain("take_treasure");
    expect(legal.map((l) => l.id)).toContain("talk_goblin");

    // Taking actions should NOT kill us now because the room is illuminated (dark_turns reset to 0)
    res = step(state, { type: "LOOK" }, pack);
    expect(res.state.ended).toBe(false);
    state = res.state;

    // Extinguish the torch
    res = step(state, { type: "USE", item: "torch", target: "torch" }, pack);
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.objectState["torch"]?.lit).toBe(false);
    expect(res.events.some((e) => e.text && e.text.includes("You extinguish the brass torch"))).toBe(true);

    // Now it's dark again. One more turn of LOOK should trigger grue death.
    res = step(state, { type: "LOOK" }, pack);
    expect(res.state.ended).toBe(true);
    expect(res.state.endingId).toBe("grue_death");
  });
});
