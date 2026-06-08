import { GameState, findRoom, getRoomExits } from "../core/state.js";
import { CYOAPack } from "../cyoa/schema.js";
import { ParserPack } from "../parser/schema.js";
import { isCyoaPack } from "../core/pack.js";
import { CYOAObservation, ParserObservation, Observation } from "./types.js";
import { evaluateConditions } from "../core/conditions.js";
import { generateLegalActions } from "../parser/legal_actions.js";

function isOutdoorRoom(roomId: string): boolean {
  const idLower = roomId.toLowerCase();
  return (
    idLower.includes("forest") ||
    idLower.includes("garden") ||
    idLower.includes("entrance") ||
    idLower.includes("yard") ||
    idLower.includes("clearing") ||
    idLower.includes("road") ||
    idLower.includes("path") ||
    idLower.includes("outside") ||
    idLower.includes("exterior") ||
    idLower.includes("glade") ||
    idLower.includes("courtyard") ||
    idLower.includes("cliff") ||
    idLower.includes("mountains")
  );
}

function mix(a: number, b: number, c: number): number {
  let h = (a ^ b ^ c) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

const WEATHER_EFFECTS: Record<string, string[]> = {
  clear: [
    "The sky overhead is clear.",
    "Warm sunlight bathes the area.",
    "A few fluffy white clouds drift lazily across the blue sky.",
    "The sun shines brightly overhead.",
    "Clear, open skies stretch out above you.",
    "A gentle warmth radiates from the clear sky.",
    "The bright sky overhead is devoid of clouds.",
    "Soft sunlight filters down from an open, blue sky.",
  ],
  rain: [
    "Rain is falling steadily from the gray sky.",
    "A gentle drizzle dampens the ground.",
    "Fat rain drops splash against the surroundings.",
    "The air is thick with the scent of fresh rain.",
    "Water runs in small streams along the ground as the rain continues.",
    "A light rain falls, leaving everything cool and wet.",
    "A steady, soft rainfall drums a rhythm on the earth.",
    "Cool rain patters down from the gray canopy above.",
  ],
  fog: [
    "A damp, cold fog clings to the surroundings, reducing visibility.",
    "Mist drifts slowly through the area, shrouding everything in gray.",
    "The fog is thick here, making distant shapes look ghostly.",
    "A chilly mist hangs low, dampening your clothes.",
    "Visibility is poor as a heavy shroud of fog settles in.",
    "Wisps of damp fog roll silently past.",
    "A dense fog blankets the landscape, dampening sound and sight.",
    "The damp air is thick with creeping tendrils of cold mist.",
  ],
  storm: [
    "A violent storm rages, with howling winds and flashing lightning.",
    "Thunder rumbles deeply overhead as rain lashes down.",
    "Fierce gusts of wind whip through the area under a dark, stormy sky.",
    "Lightning flashes across the blackened heavens, followed by crashing thunder.",
    "The elements are furious, rain pouring down in torrents amidst the gale.",
    "A heavy storm sweeps through, lashing the ground with wind and rain.",
    "Flashes of lightning periodically illuminate the stormy dark.",
    "Thunderclaps shake the ground as the tempest rages around you.",
  ],
};

function getWeatherEffect(weather: string, seed: number, step: number, roomId: string): string {
  const pool = WEATHER_EFFECTS[weather];
  if (!pool || pool.length === 0) return "";
  const charSum = roomId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const mixed = mix(seed, step + 42, charSum);
  let index = mixed % pool.length;
  if (step > 0) {
    const prevMixed = mix(seed, step - 1 + 42, charSum);
    const prevIndex = prevMixed % pool.length;
    if (index === prevIndex) {
      index = (index + 1) % pool.length;
    }
  }
  return pool[index];
}

function decapitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * Returns a purely deterministic sensory/atmospheric narration based on room type,
 * seed, and step count. Maintains strict byte-identity and Zork-style vibe.
 */
function getSensoryFlavor(roomId: string, seed: number, step: number): string {
  const sensoryData: Record<string, string[]> = {
    forest: [
      "A cold breeze rustles the dry pine needles overhead.",
      "The distant hoot of an owl echoes through the darkening woods.",
      "Mist clings low to the damp earth, smelling of rich loam.",
      "A sense of quiet watchfulness hangs heavily in the air.",
      "Dry leaves crunch softly underfoot, disturbed by some unseen creature.",
      "The canopy above filters the sunlight into dancing, green shadows.",
      "A faint smell of cedar and damp pine needles drifts through the trees.",
      "The wind plays a low, mournful sigh through the high branches.",
      "A small woodland creature rustles in the underbrush and vanishes.",
      "Moss clings thickly to the north side of the ancient trunks.",
      "A dry twig snaps in the undergrowth, though nothing is visible.",
      "The smell of pine needles and damp earth is sharp and clean.",
      "Distant bird calls echo briefly and then die away.",
      "Sunlight filters down in beams through the thick canopy.",
      "Wildflowers nod gently in the faint breeze.",
      "The soft chirp of crickets rises from the shadowed ferns.",
      "A gentle hum of insects plays in the warm air.",
      "Dewdrops cling to the spiderwebs spun between the low branches.",
      "The air is cool, carrying the sweet scent of blooming jasmine.",
      "Pine cones litter the forest floor, half-buried under mossy roots.",
      "A sudden flutter of wings erupts from the canopy as a bird takes flight.",
      "The ground here is spongy with decades of decayed leaves.",
      "A trickle of water from a hidden spring murmurs nearby.",
      "Pockets of warm air drift through the cooler forest paths.",
      "A spider crawls slowly across a rotten log near your feet.",
    ],
    crypt: [
      "A faint smell of incense and damp stonework lingers in the shadows.",
      "Your footsteps kick up tiny clouds of ancient, silent dust.",
      "Dust motes dance lazily in the thin shafts of pale light.",
      "The heavy, chilly silence of the deep earth presses against your ears.",
      "The air is stagnant and cold, smelling faintly of old bones and decay.",
      "A drop of moisture falls from the ceiling, splashing softly somewhere in the dark.",
      "Faint drafts trace cold fingers across the back of your neck.",
      "Cracked tiles shift slightly under your weight with a dry click.",
      "Cobwebs brush against your face like dry, gossamer threads.",
      "The oppressive darkness seems to actively resist the light.",
      "A sudden, chilling draft makes you shiver.",
      "The walls are cold to the touch and slightly damp.",
      "Dust hangs thick in the air, catching the light.",
      "The silence here is profound, broken only by your own breathing.",
      "Your shadow looms large and distorted against the crypt walls.",
      "The smell of damp earth and slow decay is heavy in the stillness.",
      "A faint echo of a distant whisper seems to bounce off the stone walls.",
      "The temperature drops sharply, leaving your breath visible as pale mist.",
      "A shadow passes quickly at the edge of your vision, gone when you turn.",
      "Moisture beads on the low stone ceiling, reflecting your light like tiny stars.",
      "The quiet is absolute, a heavy weight that seems to stifle sound.",
      "Ancient engravings on the stone floor are almost worn away by time.",
      "A sense of dread, faint but persistent, settles in your stomach.",
      "The stone slabs underfoot are icy cold, even through your soles.",
      "A small pile of crumbled mortar lies in the corner, disturbed recently.",
    ],
    castle: [
      "The stones here feel intensely cold, radiating an ancient chill.",
      "Echoes of long-forgotten footsteps seem to whisper from the masonry.",
      "The drafty corridors carry the faint, metallic scent of iron and rust.",
      "A low draft makes the shadows dance flickeringly along the walls.",
      "The ceiling rises into high, vaulted arches lost in gloom.",
      "Flickering torch brackets cling empty and rusted to the cold stone.",
      "The air carries a dry, papery scent, like ancient tapestries crumbling to dust.",
      "A distant door groans on iron hinges, somewhere far below.",
      "Your breathing sounds unusually loud against the solid stone walls.",
      "Shadows stretch long and distorted across the polished flagstones.",
      "An old tapestry hangs tattered on the stone wall.",
      "The flagstones are worn smooth from centuries of footsteps.",
      "A faint draft rustles through the empty corridor.",
      "A distant clinking sound echoes from far away.",
      "The scent of old dust and cold iron is strong.",
      "Muted sunlight struggles to penetrate the narrow slit windows.",
      "The faint smell of tallow and old candle wax hangs in the air.",
      "A scratch of tiny claws suggests mice nesting behind the paneling.",
      "The high walls seem to press in, thick with centuries of secrets.",
      "A light breeze whispers through the arrow slits, carrying a chill.",
      "Your footsteps produce a double-echo in the long, empty hallway.",
      "Heavy iron brackets are bolted deep into the solid masonry.",
      "A draft sweeps dust across the floor in tiny, twisting eddies.",
      "The stone archways overhead show fine cracks from age and settling.",
      "An oppressive weight of history clings to the grand, silent halls.",
    ],
    underground: [
      "The walls are slick with condensation, dripping slowly into dark puddles.",
      "A low, ambient hum of shifting earth vibrates deep in your chest.",
      "A draft smelling of sulfur and wet clay blows from a deep crevice.",
      "Strange, crystalline deposits glitter faintly in the rock face.",
      "The smell of stale water and ancient minerals is thick and heavy here.",
      "A small stone rolls off a ledge, clattering down into an unseen abyss.",
      "The ceiling hangs low, forcing a feeling of heavy confinement.",
      "The sound of distant, slow-dripping water marks the slow passage of time.",
      "Faint, scraping sounds echo from somewhere deep within the rock.",
      "The absolute darkness beyond is silent and absolute.",
      "Water droplets echo with a rhythmic ping as they hit the stones.",
      "A damp, cool breeze blows from a crack in the rock.",
      "Your footsteps echo hollowly in the enclosed space.",
      "The rock face is cold, damp, and rough.",
      "The heavy smell of ancient earth and stone surrounds you.",
      "The air is heavy and humid, making it slightly harder to breathe.",
      "A slow trickle of muddy water runs down a nearby fissure.",
      "Tiny cave crickets scatter as you approach, disappearing into cracks.",
      "The silence is periodically broken by the deep, low groan of the earth.",
      "Slick patches of moss or algae make the rocky floor treacherous.",
      "A cool draft blowing from ahead suggests a larger cavern nearby.",
      "The mineral scent of iron and wet stone is sharp in your nose.",
      "A high-pitched squeak of a bat echoes briefly from the darkness above.",
      "The rock formations look like frozen, melting pillars in the shadows.",
      "A layer of fine silt covers the flat surfaces, undisturbed for ages.",
    ],
    outpost: [
      "The wind howls fiercely against the reinforced stone battlements.",
      "Racks of long-abandoned weapons stand silent and covered in dust.",
      "The air is crisp and carries the scent of wind and distant smoke.",
      "A commanding view of the surrounding wilderness lies just beyond the arrow loops.",
      "Sturdy oak beams overhead creak under the strain of the high winds.",
      "A thin layer of soot lines the hearth, long cold and abandoned.",
      "The sound of flapping banners or flags whips rhythmically in the gale.",
      "Iron-banded doors stand strong, built to withstand a siege.",
      "Scratched shield crests on the walls tell stories of long-past garrisons.",
      "The masonry is worn smooth in places by the boots of ancient sentries.",
      "An empty torch sconce hangs askew on the wall.",
      "The wooden beams are weather-beaten but solid.",
      "The smell of old leather and rust lingers.",
      "A faint whistling sound comes from the narrow windows.",
      "Dusty footprints are visible in the corner.",
      "Rust-flecked iron rings are set into the stone, once used for tethering.",
      "The cold wood of the floorboards creaks under your weight.",
      "Narrow arrow slits slice the incoming light into thin, bright blades.",
      "A faint smell of oil and old leather hangs near the weapon racks.",
      "The distant horizon is visible through the battlements, vast and empty.",
      "Old scratch marks on the table suggest sentries playing games to pass the time.",
      "The air is drafty and brisk, constantly moving through the chamber.",
      "A discarded buckle from a piece of armor lies tarnished in the dust.",
      "Heavy iron bolts secure the window shutters against the elements.",
      "The structure feels solid and functional, built for utility, not comfort.",
    ],
    settlement: [
      "The faint scent of woodsmoke and roasting meat drifts from afar.",
      "Discarded carriage ruts and bootprints mark this as a place of passage.",
      "A forgotten signpost creaks slowly in the wind.",
      "The air feels slightly warmer here, closer to civilization.",
      "Faint chatter or clinking mugs seem to echo from a distant tavern.",
      "A discarded rag or leather scrap lies trampled in the dirt.",
      "The hum of insects rises from the tall grass bordering the path.",
      "Warm sunlight or cozy lantern light softens the edges of the room.",
      "Dust hangs in the air, kicked up by travelers of the road.",
      "A feeling of temporary safety lingers in the open air.",
      "A wooden cart wheel sits broken near the path.",
      "The faint sound of wind chimes can be heard in the distance.",
      "A worn path leads through the middle of the area.",
      "The scent of woodsmoke and soil fills the air.",
      "Grass grows tall and wild at the edges of the path.",
      "The chatter of birds nesting in nearby eaves fills the air.",
      "A gentle breeze carries the smell of freshly cut hay and damp straw.",
      "Scattered hoofprints are pressed deep into the dried mud of the path.",
      "A warm draft blows from a nearby chimney, smelling of cedarwood.",
      "The sound of a distant hammer striking an anvil rings out rhythmically.",
      "A patch of wild herbs grows near the fence, smelling of mint.",
      "Discarded straw and loose twigs are scattered across the path.",
      "A post for hitching horses stands weathered and empty near the trail.",
      "The distant lowing of cattle drifts lazily on the warm wind.",
      "The soft rustle of laundry drying on a line can be heard nearby.",
    ],
  };

  let category = "castle";
  const idLower = roomId.toLowerCase();
  if (
    idLower.includes("forest") ||
    idLower.includes("garden") ||
    idLower.includes("clearing") ||
    idLower.includes("glade")
  ) {
    category = "forest";
  } else if (
    idLower.includes("chapel") ||
    idLower.includes("crypt") ||
    idLower.includes("sacristy") ||
    idLower.includes("altar") ||
    idLower.includes("catacombs") ||
    idLower.includes("graveyard") ||
    idLower.includes("tomb") ||
    idLower.includes("yard")
  ) {
    category = "crypt";
  } else if (
    idLower.includes("dungeon") ||
    idLower.includes("cave") ||
    idLower.includes("cavern") ||
    idLower.includes("vault") ||
    idLower.includes("cellar") ||
    idLower.includes("sewer") ||
    idLower.includes("sanctum") ||
    idLower.includes("abyss") ||
    idLower.includes("well_bottom") ||
    idLower.includes("bottom")
  ) {
    category = "underground";
  } else if (
    idLower.includes("tower") ||
    idLower.includes("outpost") ||
    idLower.includes("barracks") ||
    idLower.includes("wall") ||
    idLower.includes("battlements") ||
    idLower.includes("post") ||
    idLower.includes("garrison")
  ) {
    category = "outpost";
  } else if (
    idLower.includes("crossroads") ||
    idLower.includes("road") ||
    idLower.includes("path") ||
    idLower.includes("street") ||
    idLower.includes("town") ||
    idLower.includes("den") ||
    idLower.includes("tavern") ||
    idLower.includes("market")
  ) {
    category = "settlement";
  }

  const pool = sensoryData[category];
  const charSum = roomId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const mixed = mix(seed, step, charSum);
  let index = mixed % pool.length;
  if (step > 0) {
    const prevMixed = mix(seed, step - 1, charSum);
    const prevIndex = prevMixed % pool.length;
    if (index === prevIndex) {
      index = (index + 1) % pool.length;
    }
  }
  return pool[index];
}

/**
 * Compiles a structured, schema-valid Observation for the AI playtester based
 * on the current GameState and either a CYOAPack or a ParserPack.
 */
export function buildObservation(state: GameState, pack: CYOAPack | ParserPack): Observation {
  // Check if pack is CYOA
  if (isCyoaPack(pack)) {
    const cyoaPack = pack as CYOAPack;
    const currentScene = cyoaPack.scenes.find((s) => s.id === state.current);
    if (!currentScene) {
      const endingMeta = cyoaPack.endings?.find((e) => e.id === state.current);
      if (endingMeta) {
        return {
          mode: "cyoa",
          scene_id: state.current,
          text: `--- ENDING: ${endingMeta.title} ---\n${endingMeta.text}`,
          state: {
            flags: Object.keys(state.flags).filter((f) => state.flags[f]),
            vars: { ...state.vars },
            inventory: [...state.inventory],
            journal: [...state.journal],
          },
          available_actions: [],
        } as CYOAObservation;
      }
      throw new Error(`Current scene '${state.current}' not found in CYOA pack.`);
    }

    const availableChoices = currentScene.choices.filter((choice) => evaluateConditions(state, choice.conditions));

    const sensoryFlavor = getSensoryFlavor(currentScene.id, state.seed, state.step);
    let wEffect = "";
    if (state.environment && isOutdoorRoom(currentScene.id)) {
      wEffect = getWeatherEffect(state.environment.weather, state.seed, state.step, currentScene.id);
    }

    const sceneCharSum = currentScene.id.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    let sceneStructureType = mix(state.seed, state.step + 100, sceneCharSum) % 12;
    if (state.step > 0) {
      const prevStructureType = mix(state.seed, state.step - 1 + 100, sceneCharSum) % 12;
      if (sceneStructureType === prevStructureType) {
        sceneStructureType = (sceneStructureType + 1) % 12;
      }
    }

    let text = "";
    if (wEffect) {
      if (sceneStructureType === 0) {
        text = `${currentScene.text} ${sensoryFlavor} ${wEffect}`;
      } else if (sceneStructureType === 1) {
        text = `${sensoryFlavor} ${currentScene.text} ${wEffect}`;
      } else if (sceneStructureType === 2) {
        text = `${wEffect} ${currentScene.text} ${sensoryFlavor}`;
      } else if (sceneStructureType === 3) {
        text = `${currentScene.text} ${wEffect} ${sensoryFlavor}`;
      } else if (sceneStructureType === 4) {
        text = `${sensoryFlavor} ${wEffect} ${currentScene.text}`;
      } else if (sceneStructureType === 5) {
        text = `${wEffect} ${sensoryFlavor} ${currentScene.text}`;
      } else if (sceneStructureType === 6) {
        text = `As ${decapitalize(wEffect)} ${currentScene.text} ${sensoryFlavor}`;
      } else if (sceneStructureType === 7) {
        text = `${sensoryFlavor} Outside, ${decapitalize(wEffect)} ${currentScene.text}`;
      } else if (sceneStructureType === 8) {
        text = `${currentScene.text} In the background, ${decapitalize(wEffect)} Meanwhile, ${decapitalize(sensoryFlavor)}`;
      } else if (sceneStructureType === 9) {
        text = `You notice that ${decapitalize(sensoryFlavor)} ${currentScene.text} Above, ${decapitalize(wEffect)}`;
      } else if (sceneStructureType === 10) {
        text = `Under ${decapitalize(wEffect)} ${sensoryFlavor} ${currentScene.text}`;
      } else {
        text = `${currentScene.text} The environment shows that ${decapitalize(wEffect)} while ${decapitalize(sensoryFlavor)}`;
      }
    } else {
      if (sceneStructureType === 0) {
        text = `${currentScene.text} ${sensoryFlavor}`;
      } else if (sceneStructureType === 1) {
        text = `${sensoryFlavor} ${currentScene.text}`;
      } else if (sceneStructureType === 2) {
        text = `Around you, ${decapitalize(sensoryFlavor)} ${currentScene.text}`;
      } else if (sceneStructureType === 3) {
        text = `${currentScene.text} Meanwhile, ${decapitalize(sensoryFlavor)}`;
      } else if (sceneStructureType === 4) {
        text = `Here, ${currentScene.text} ${sensoryFlavor}`;
      } else if (sceneStructureType === 5) {
        text = `${sensoryFlavor} Nearby, ${currentScene.text}`;
      } else if (sceneStructureType === 6) {
        text = `A glance shows that ${decapitalize(sensoryFlavor)} ${currentScene.text}`;
      } else if (sceneStructureType === 7) {
        text = `${currentScene.text} You cannot help but notice that ${decapitalize(sensoryFlavor)}`;
      } else if (sceneStructureType === 8) {
        text = `From where you stand, ${decapitalize(sensoryFlavor)} ${currentScene.text}`;
      } else if (sceneStructureType === 9) {
        text = `${currentScene.text} A soft sound or draft suggests that ${decapitalize(sensoryFlavor)}`;
      } else if (sceneStructureType === 10) {
        text = `In this place, ${decapitalize(sensoryFlavor)} ${currentScene.text}`;
      } else {
        text = `${currentScene.text} It is quiet, save for when ${decapitalize(sensoryFlavor)}`;
      }
    }

    const choices = availableChoices.map((c) => ({
      id: c.id,
      text: c.text,
    }));

    if ((cyoaPack as any).recipes) {
      for (const recipe of (cyoaPack as any).recipes) {
        const hasAllIngredients = recipe.ingredients.every((ing: string) => state.inventory.includes(ing));
        if (hasAllIngredients && evaluateConditions(state, recipe.conditions ?? [])) {
          const ingredientNames = recipe.ingredients
            .map((ingId: string) => {
              return ingId.replace(/_/g, " ");
            })
            .join(" and ");
          const resultName = recipe.result.replace(/_/g, " ");
          choices.push({
            id: `craft_${recipe.id}`,
            text: recipe.text ?? `Combine ${ingredientNames} to make ${resultName}`,
          });
        }
      }
    }

    return {
      mode: "cyoa",
      scene_id: state.current,
      text,
      state: {
        flags: Object.keys(state.flags).filter((f) => state.flags[f]),
        vars: { ...state.vars },
        inventory: [...state.inventory],
        journal: [...state.journal],
      },
      available_actions: choices,
    } as CYOAObservation;
  }

  // Otherwise, it is a ParserPack
  const parserPack = pack as ParserPack;
  const room = findRoom(state, parserPack, state.current);
  if (!room) {
    throw new Error(`Current room '${state.current}' not found in parser pack.`);
  }

  // Compile visible objects (including contents of OPEN containers in the room)
  const visibleObjects: { id: string; name: string }[] = [];
  room.objects.forEach((objId: string) => {
    const obj = parserPack.objects.find((o) => o.id === objId);
    if (obj) {
      const runtime = state.objectState[obj.id];
      if (runtime && (runtime.takenBy === "player" || runtime.takenBy === "destroyed")) {
        return;
      }
      visibleObjects.push({ id: obj.id, name: obj.name });

      const isOpen = runtime ? runtime.open : !obj.locked && !obj.openable;
      if (isOpen && obj.contents) {
        obj.contents.forEach((nestedId) => {
          const nestedObj = parserPack.objects.find((o) => o.id === nestedId);
          if (nestedObj) {
            const nestedRuntime = state.objectState[nestedId];
            if (nestedRuntime && (nestedRuntime.takenBy === "player" || nestedRuntime.takenBy === "destroyed")) {
              return;
            }
            visibleObjects.push({ id: nestedObj.id, name: nestedObj.name });
          }
        });
      }
    }
  });

  // Compile exits
  const exitsList = getRoomExits(state, room).map((exit) => ({
    direction: exit.direction,
    to: exit.to,
  }));

  // Compile available legal actions
  const legalActions = generateLegalActions(state, parserPack);

  const sensoryFlavor = getSensoryFlavor(room.id, state.seed, state.step);
  let wEffect = "";
  if (state.environment && isOutdoorRoom(room.id)) {
    wEffect = getWeatherEffect(state.environment.weather, state.seed, state.step, room.id);
  }

  const roomCharSum = room.id.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
  let roomStructureType = mix(state.seed, state.step + 100, roomCharSum) % 12;
  if (state.step > 0) {
    const prevStructureType = mix(state.seed, state.step - 1 + 100, roomCharSum) % 12;
    if (roomStructureType === prevStructureType) {
      roomStructureType = (roomStructureType + 1) % 12;
    }
  }

  let description = "";
  if (wEffect) {
    if (roomStructureType === 0) {
      description = `${room.description} ${sensoryFlavor} ${wEffect}`;
    } else if (roomStructureType === 1) {
      description = `${sensoryFlavor} ${room.description} ${wEffect}`;
    } else if (roomStructureType === 2) {
      description = `${wEffect} ${room.description} ${sensoryFlavor}`;
    } else if (roomStructureType === 3) {
      description = `${room.description} ${wEffect} ${sensoryFlavor}`;
    } else if (roomStructureType === 4) {
      description = `${sensoryFlavor} ${wEffect} ${room.description}`;
    } else if (roomStructureType === 5) {
      description = `${wEffect} ${sensoryFlavor} ${room.description}`;
    } else if (roomStructureType === 6) {
      description = `As ${decapitalize(wEffect)} ${room.description} ${sensoryFlavor}`;
    } else if (roomStructureType === 7) {
      description = `${sensoryFlavor} Outside, ${decapitalize(wEffect)} ${room.description}`;
    } else if (roomStructureType === 8) {
      description = `${room.description} In the background, ${decapitalize(wEffect)} Meanwhile, ${decapitalize(sensoryFlavor)}`;
    } else if (roomStructureType === 9) {
      description = `You notice that ${decapitalize(sensoryFlavor)} ${room.description} Above, ${decapitalize(wEffect)}`;
    } else if (roomStructureType === 10) {
      description = `Under ${decapitalize(wEffect)} ${sensoryFlavor} ${room.description}`;
    } else {
      description = `${room.description} The environment shows that ${decapitalize(wEffect)} while ${decapitalize(sensoryFlavor)}`;
    }
  } else {
    if (roomStructureType === 0) {
      description = `${room.description} ${sensoryFlavor}`;
    } else if (roomStructureType === 1) {
      description = `${sensoryFlavor} ${room.description}`;
    } else if (roomStructureType === 2) {
      description = `Around you, ${decapitalize(sensoryFlavor)} ${room.description}`;
    } else if (roomStructureType === 3) {
      description = `${room.description} Meanwhile, ${decapitalize(sensoryFlavor)}`;
    } else if (roomStructureType === 4) {
      description = `Here, ${room.description} ${sensoryFlavor}`;
    } else if (roomStructureType === 5) {
      description = `${sensoryFlavor} Nearby, ${room.description}`;
    } else if (roomStructureType === 6) {
      description = `A glance shows that ${decapitalize(sensoryFlavor)} ${room.description}`;
    } else if (roomStructureType === 7) {
      description = `${room.description} You cannot help but notice that ${decapitalize(sensoryFlavor)}`;
    } else if (roomStructureType === 8) {
      description = `From where you stand, ${decapitalize(sensoryFlavor)} ${room.description}`;
    } else if (roomStructureType === 9) {
      description = `${room.description} A soft sound or draft suggests that ${decapitalize(sensoryFlavor)}`;
    } else if (roomStructureType === 10) {
      description = `In this place, ${decapitalize(sensoryFlavor)} ${room.description}`;
    } else {
      description = `${room.description} It is quiet, save for when ${decapitalize(sensoryFlavor)}`;
    }
  }

  return {
    mode: "parser",
    room: room.id,
    description,
    visible_objects: visibleObjects,
    exits: exitsList,
    inventory: [...state.inventory],
    available_actions: legalActions,
  } as ParserObservation;
}
