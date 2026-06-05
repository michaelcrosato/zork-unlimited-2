import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// Get directories
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../..");

interface SynonymPhase {
  phase: number;
  cycle: number;
  moveCell: string;
  lookAction: string;
  takeCount: string;
  takeViceCount: string;
  openPrefix: string;
  unlockAgent1: string;
  unlockAgent2: string;
  usePrefix: string;
  combatPrefix: string;
  talkPrefix: string;
}

const CELLS = [
  { prefix: "basophilocytoclast", base: "basophil" },
  { prefix: "synoviocytoclast", base: "synovio" },
  { prefix: "lymphocytoclast", base: "lympho" },
  { prefix: "monocytoclast", base: "mono" },
  { prefix: "neutrophilocytoclast", base: "neutrophilo" },
  { prefix: "eosinophilocytoclast", base: "eosinophilo" },
  { prefix: "erythrocytoclast", base: "erythro" },
  { prefix: "thrombocytoclast", base: "thrombo" },
  { prefix: "osteocytoclast", base: "osteo" },
  { prefix: "chondrocytoclast", base: "chondro" },
  { prefix: "fibrocytoclast", base: "fibro" },
  { prefix: "myocytoclast", base: "myo" },
  { prefix: "hepatocytoclast", base: "hepato" },
  { prefix: "splenocytoclast", base: "spleno" },
  { prefix: "nephrocytoclast", base: "nephro" },
  { prefix: "cardiocytoclast", base: "cardio" },
  { prefix: "pneumocytoclast", base: "pneumo" },
  { prefix: "enterocytoclast", base: "entero" },
  { prefix: "melanocytoclast", base: "melano" },
  { prefix: "keratinocytoclast", base: "keratino" },
];

const ELEMENTS = [
  "astatin",
  "iodin",
  "bromin",
  "chlorin",
  "fluorin",
  "sulfur",
  "phosphor",
  "nitrogen",
  "carbon",
  "oxygen",
  "hydrogen",
  "helium",
  "lithium",
  "beryllium",
  "boron",
  "sodium",
  "magnesium",
  "aluminum",
  "silicon",
  "potassium",
  "calcium"
];

const COMBAT_ACTIONS = [
  "blood-cascading",
  "blood-welling",
  "blood-gushing",
  "blood-spilling",
  "blood-flowing",
  "blood-dripping",
  "blood-spraying",
  "blood-splattering",
  "blood-streaming",
  "blood-pouring",
];

function getGreekNumber(n: number): string {
  const units = ["", "hena", "di", "tri", "tetra", "penta", "hexa", "hepta", "octa", "ennea"];

  if (n === 50) return "pentacontarchy";
  if (n === 60) return "hexacontarchy";
  if (n === 70) return "heptacontarchy";
  if (n === 80) return "octacontarchy";
  if (n === 90) return "enneacontarchy";
  if (n >= 100 && n < 110) {
    if (n === 100) return "hectarchy";
    return units[n - 100] + "hectarchy";
  }
  if (n >= 110 && n < 120) {
    if (n === 110) return "decahectarchy";
    return units[n - 110] + "decahectarchy";
  }
  if (n >= 120 && n < 130) {
    if (n === 120) return "icosahectarchy";
    return units[n - 120] + "icosahectarchy";
  }
  if (n >= 130 && n < 140) {
    if (n === 130) return "triacontahectarchy";
    return units[n - 130] + "triacontahectarchy";
  }
  if (n >= 140 && n < 150) {
    if (n === 140) return "tetracontahectarchy";
    return units[n - 140] + "tetracontahectarchy";
  }
  if (n === 150) return "pentacontahectarchy";

  const tens = ["", "", "", "", "", "pentacontarchy", "hexacontarchy", "heptacontarchy", "octacontarchy", "enneacontarchy"];
  
  const unitDigit = n % 10;
  const tenDigit = Math.floor(n / 10);
  
  if (tenDigit === 5 && unitDigit === 1) return "unapentacontarchy";
  if (tenDigit === 5 && unitDigit === 9) return "nonapentacontarchy";
  
  return units[unitDigit] + tens[tenDigit];
}

// Generate phases starting from Phase 368 up to Phase 450
const PHASES: SynonymPhase[] = [];
for (let p = 368; p <= 450; p++) {
  const cellIndex = (CELLS.length - ((p - 368) % CELLS.length)) % CELLS.length;
  const elemIndex = ((368 - p) % ELEMENTS.length + ELEMENTS.length) % ELEMENTS.length;
  const combatIndex = ((368 - p) % COMBAT_ACTIONS.length + COMBAT_ACTIONS.length) % COMBAT_ACTIONS.length;
  
  const cell = CELLS[cellIndex];
  const element = ELEMENTS[elemIndex];
  const combatAction = COMBAT_ACTIONS[combatIndex];
  const numberVal = p - 308;
  const takeCount = getGreekNumber(numberVal);
  
  PHASES.push({
    phase: p,
    cycle: 410 + (p - 368),
    moveCell: `${cell.prefix}opoiesis`,
    lookAction: `trans${element}ation`,
    takeCount: takeCount,
    takeViceCount: `vice${takeCount}`,
    openPrefix: cell.prefix,
    unlockAgent1: `${cell.prefix}ologist`,
    unlockAgent2: `${cell.base}oblastoclastologist`,
    usePrefix: `${cell.prefix}okinetic`,
    combatPrefix: `ferociously ${combatAction}`,
    talkPrefix: `${cell.prefix}opathological`,
  });
}

function generateSynonymsFile() {
  let content = "";

  for (const p of PHASES) {
    const combatNoHyphen = p.combatPrefix.replace("-", "");
    content += `
  // Cycle #${p.cycle}: Phase ${p.phase} mappings
  Object.assign(VERB_CATEGORIES, {
    "navigate one's vector of ${p.moveCell} towards the location of": ["MOVE"],
    "navigate one's vector of ${p.moveCell} towards the location of the": ["MOVE"],
    "navigate ones vector of ${p.moveCell} towards the location of": ["MOVE"],
    "navigate ones vector of ${p.moveCell} towards the location of the": ["MOVE"],
    "steer one's vector of ${p.moveCell} in the direction of the coordinates of": ["MOVE"],
    "steer one's vector of ${p.moveCell} in the direction of the coordinates of the": ["MOVE"],
    "steer ones vector of ${p.moveCell} in the direction of the coordinates of": ["MOVE"],
    "steer ones vector of ${p.moveCell} in the direction of the coordinates of the": ["MOVE"],
    "direct one's vector of ${p.moveCell} towards the coordinates of the location of": ["MOVE"],
    "direct one's vector of ${p.moveCell} towards the coordinates of the location of the": ["MOVE"],
    "direct ones vector of ${p.moveCell} towards the coordinates of the location of": ["MOVE"],
    "direct ones vector of ${p.moveCell} towards the coordinates of the location of the": ["MOVE"],

    "subject to a comprehensive visual ${p.lookAction}": ["LOOK_INSPECT"],
    "subject to a comprehensive visual ${p.lookAction} the": ["LOOK_INSPECT"],
    "subject to a thorough visual ${p.lookAction}": ["LOOK_INSPECT"],
    "subject to a thorough visual ${p.lookAction} the": ["LOOK_INSPECT"],
    "subject to a detailed visual ${p.lookAction}": ["LOOK_INSPECT"],
    "subject to a detailed visual ${p.lookAction} the": ["LOOK_INSPECT"],

    "assume direct exclusive ${p.takeCount} of": ["TAKE"],
    "assume direct exclusive ${p.takeCount} of the": ["TAKE"],
    "assume absolute exclusive ${p.takeCount} of": ["TAKE"],
    "assume absolute exclusive ${p.takeCount} of the": ["TAKE"],
    "assume immediate exclusive ${p.takeCount} of": ["TAKE"],
    "assume immediate exclusive ${p.takeCount} of the": ["TAKE"],
    "assume direct exclusive ${p.takeViceCount} of": ["TAKE"],
    "assume direct exclusive ${p.takeViceCount} of the": ["TAKE"],
    "assume absolute exclusive ${p.takeViceCount} of": ["TAKE"],
    "assume absolute exclusive ${p.takeViceCount} of the": ["TAKE"],
    "assume immediate exclusive ${p.takeViceCount} of": ["TAKE"],
    "assume immediate exclusive ${p.takeViceCount} of the": ["TAKE"],

    "divest oneself of all exclusive ${p.takeCount} of": ["DROP"],
    "divest oneself of all exclusive ${p.takeCount} of the": ["DROP"],
    "relinquish all exclusive ${p.takeCount} of": ["DROP"],
    "relinquish all exclusive ${p.takeCount} of the": ["DROP"],
    "free oneself from all exclusive ${p.takeCount} of": ["DROP"],
    "free oneself from all exclusive ${p.takeCount} of the": ["DROP"],
    "divest oneself of all exclusive ${p.takeViceCount} of": ["DROP"],
    "divest oneself of all exclusive ${p.takeViceCount} of the": ["DROP"],
    "relinquish all exclusive ${p.takeViceCount} of": ["DROP"],
    "relinquish all exclusive ${p.takeViceCount} of the": ["DROP"],
    "free oneself from all exclusive ${p.takeViceCount} of": ["DROP"],
    "free oneself from all exclusive ${p.takeViceCount} of the": ["DROP"],

    "force completely and ${p.openPrefix}orheologically wide open": ["OPEN"],
    "force completely and ${p.openPrefix}orheologically wide open the": ["OPEN"],
    "force completely and ${p.openPrefix}o-rheologically wide open": ["OPEN"],
    "force completely and ${p.openPrefix}o-rheologically wide open the": ["OPEN"],
    "force completely and ${p.openPrefix}o rheologically wide open": ["OPEN"],
    "force completely and ${p.openPrefix}o rheologically wide open the": ["OPEN"],

    "fasten completely and ${p.openPrefix}orheologically closed": ["CLOSE"],
    "fasten completely and ${p.openPrefix}orheologically closed the": ["CLOSE"],
    "fasten completely and ${p.openPrefix}o-rheologically closed": ["CLOSE"],
    "fasten completely and ${p.openPrefix}o-rheologically closed the": ["CLOSE"],
    "fasten completely and ${p.openPrefix}o rheologically closed": ["CLOSE"],
    "fasten completely and ${p.openPrefix}o rheologically closed the": ["CLOSE"],

    "seal completely and ${p.openPrefix}orheologically wide open": ["OPEN"],
    "seal completely and ${p.openPrefix}orheologically wide open the": ["OPEN"],
    "seal completely and ${p.openPrefix}o-rheologically wide open": ["OPEN"],
    "seal completely and ${p.openPrefix}o-rheologically wide open the": ["OPEN"],
    "seal completely and ${p.openPrefix}o rheologically wide open": ["OPEN"],
    "seal completely and ${p.openPrefix}o rheologically wide open the": ["OPEN"],

    "seal completely and ${p.openPrefix}orheologically closed": ["CLOSE"],
    "seal completely and ${p.openPrefix}orheologically closed the": ["CLOSE"],
    "seal completely and ${p.openPrefix}o-rheologically closed": ["CLOSE"],
    "seal completely and ${p.openPrefix}o-rheologically closed the": ["CLOSE"],
    "seal completely and ${p.openPrefix}o rheologically closed": ["CLOSE"],
    "seal completely and ${p.openPrefix}o rheologically closed the": ["CLOSE"],

    "seal completely and ${p.openPrefix}orheologically shut": ["CLOSE"],
    "seal completely and ${p.openPrefix}orheologically shut the": ["CLOSE"],
    "seal completely and ${p.openPrefix}o-rheologically shut": ["CLOSE"],
    "seal completely and ${p.openPrefix}o-rheologically shut the": ["CLOSE"],
    "seal completely and ${p.openPrefix}o rheologically shut": ["CLOSE"],
    "seal completely and ${p.openPrefix}o rheologically shut the": ["CLOSE"],

    "deactivate all ${p.unlockAgent1} and ${p.unlockAgent2} security devices of": ["UNLOCK"],
    "deactivate all ${p.unlockAgent1} and ${p.unlockAgent2} security devices of the": ["UNLOCK"],
    "deactivate all ${p.unlockAgent1}s and ${p.unlockAgent2}s security devices of": ["UNLOCK"],
    "deactivate all ${p.unlockAgent1}s and ${p.unlockAgent2}s security devices of the": ["UNLOCK"],
    "bypass all ${p.unlockAgent1} and ${p.unlockAgent2} security devices on": ["UNLOCK"],
    "bypass all ${p.unlockAgent1} and ${p.unlockAgent2} security devices on the": ["UNLOCK"],
    "bypass all ${p.unlockAgent1}s and ${p.unlockAgent2}s security devices on": ["UNLOCK"],
    "bypass all ${p.unlockAgent1}s and ${p.unlockAgent2}s security devices on the": ["UNLOCK"],
    "disengage the primary ${p.unlockAgent1} and ${p.unlockAgent2} security device on": ["UNLOCK"],
    "disengage the primary ${p.unlockAgent1} and ${p.unlockAgent2} security device on the": ["UNLOCK"],
    "disengage the primary ${p.unlockAgent1}s and ${p.unlockAgent2}s security device on": ["UNLOCK"],
    "disengage the primary ${p.unlockAgent1}s and ${p.unlockAgent2}s security device on the": ["UNLOCK"],

    "harness the full ${p.usePrefix} deployment of": ["USE"],
    "harness the full ${p.usePrefix} deployment of the": ["USE"],
    "bring into active ${p.usePrefix} deployment": ["USE"],
    "bring into active ${p.usePrefix} deployment the": ["USE"],
    "make complete ${p.usePrefix} deployment of": ["USE"],
    "make complete ${p.usePrefix} deployment of the": ["USE"],

    "initiate a/an ${p.combatPrefix} confrontation against": ["FIGHT"],
    "initiate a/an ${p.combatPrefix} confrontation against the": ["FIGHT"],
    "commence a/an ${p.combatPrefix} confrontation against": ["FIGHT"],
    "commence a/an ${p.combatPrefix} confrontation against the": ["FIGHT"],
    "engage in a/an ${p.combatPrefix} confrontation against": ["FIGHT"],
    "engage in a/an ${p.combatPrefix} confrontation against the": ["FIGHT"],
    "initiate an ${p.combatPrefix} confrontation against": ["FIGHT"],
    "initiate an ${p.combatPrefix} confrontation against the": ["FIGHT"],
    "commence an ${p.combatPrefix} confrontation against": ["FIGHT"],
    "commence an ${p.combatPrefix} confrontation against the": ["FIGHT"],
    "engage in an ${p.combatPrefix} confrontation against": ["FIGHT"],
    "engage in an ${p.combatPrefix} confrontation against the": ["FIGHT"],
    "initiate a/an ${combatNoHyphen} confrontation against": ["FIGHT"],
    "initiate a/an ${combatNoHyphen} confrontation against the": ["FIGHT"],
    "commence a/an ${combatNoHyphen} confrontation against": ["FIGHT"],
    "commence a/an ${combatNoHyphen} confrontation against the": ["FIGHT"],
    "engage in a/an ${combatNoHyphen} confrontation against": ["FIGHT"],
    "engage in a/an ${combatNoHyphen} confrontation against the": ["FIGHT"],
    "initiate an ${combatNoHyphen} confrontation against": ["FIGHT"],
    "initiate an ${combatNoHyphen} confrontation against the": ["FIGHT"],
    "commence an ${combatNoHyphen} confrontation against": ["FIGHT"],
    "commence an ${combatNoHyphen} confrontation against the": ["FIGHT"],
    "engage in an ${combatNoHyphen} confrontation against": ["FIGHT"],
    "engage in an ${combatNoHyphen} confrontation against the": ["FIGHT"],

    "initiate a/an ${p.talkPrefix} face to face discussion with": ["TALK"],
    "initiate a/an ${p.talkPrefix} face to face discussion with the": ["TALK"],
    "initiate a/an ${p.talkPrefix} facetoface discussion with": ["TALK"],
    "initiate a/an ${p.talkPrefix} facetoface discussion with the": ["TALK"],
    "initiate a/an ${p.talkPrefix} face-to-face discussion with": ["TALK"],
    "initiate a/an ${p.talkPrefix} face-to-face discussion with the": ["TALK"],
    "initiate an ${p.talkPrefix} face to face discussion with": ["TALK"],
    "initiate an ${p.talkPrefix} face to face discussion with the": ["TALK"],
    "initiate an ${p.talkPrefix} facetoface discussion with": ["TALK"],
    "initiate an ${p.talkPrefix} facetoface discussion with the": ["TALK"],
    "initiate an ${p.talkPrefix} face-to-face discussion with": ["TALK"],
    "initiate an ${p.talkPrefix} face-to-face discussion with the": ["TALK"],
    "engage in a/an ${p.talkPrefix} face to face discussion with": ["TALK"],
    "engage in a/an ${p.talkPrefix} face to face discussion with the": ["TALK"],
    "engage in a/an ${p.talkPrefix} facetoface discussion with": ["TALK"],
    "engage in a/an ${p.talkPrefix} facetoface discussion with the": ["TALK"],
    "engage in a/an ${p.talkPrefix} face-to-face discussion with": ["TALK"],
    "engage in a/an ${p.talkPrefix} face-to-face discussion with the": ["TALK"],
    "engage in an ${p.talkPrefix} face to face discussion with": ["TALK"],
    "engage in an ${p.talkPrefix} face to face discussion with the": ["TALK"],
    "engage in an ${p.talkPrefix} facetoface discussion with": ["TALK"],
    "engage in an ${p.talkPrefix} facetoface discussion with the": ["TALK"],
    "engage in an ${p.talkPrefix} face-to-face discussion with": ["TALK"],
    "engage in an ${p.talkPrefix} face-to-face discussion with the": ["TALK"],
    "strike up a/an ${p.talkPrefix} face to face discussion with": ["TALK"],
    "strike up a/an ${p.talkPrefix} face to face discussion with the": ["TALK"],
    "strike up a/an ${p.talkPrefix} facetoface discussion with": ["TALK"],
    "strike up a/an ${p.talkPrefix} facetoface discussion with the": ["TALK"],
    "strike up a/an ${p.talkPrefix} face-to-face discussion with": ["TALK"],
    "strike up a/an ${p.talkPrefix} face-to-face discussion with the": ["TALK"],
    "strike up an ${p.talkPrefix} face to face discussion with": ["TALK"],
    "strike up an ${p.talkPrefix} face to face discussion with the": ["TALK"],
    "strike up an ${p.talkPrefix} facetoface discussion with": ["TALK"],
    "strike up an ${p.talkPrefix} facetoface discussion with the": ["TALK"],
    "strike up an ${p.talkPrefix} face-to-face discussion with": ["TALK"],
    "strike up an ${p.talkPrefix} face-to-face discussion with the": ["TALK"]
  });

  // Cycle #${p.cycle}: Phase ${p.phase} compound verbs
  compoundVerbs.push(
    "navigate one's vector of ${p.moveCell} towards the location of the",
    "navigate one's vector of ${p.moveCell} towards the location of",
    "navigate ones vector of ${p.moveCell} towards the location of the",
    "navigate ones vector of ${p.moveCell} towards the location of",
    "steer one's vector of ${p.moveCell} in the direction of the coordinates of the",
    "steer one's vector of ${p.moveCell} in the direction of the coordinates of",
    "steer ones vector of ${p.moveCell} in the direction of the coordinates of the",
    "steer ones vector of ${p.moveCell} in the direction of the coordinates of",
    "direct one's vector of ${p.moveCell} towards the coordinates of the location of the",
    "direct one's vector of ${p.moveCell} towards the coordinates of the location of",
    "direct ones vector of ${p.moveCell} towards the coordinates of the location of the",
    "direct ones vector of ${p.moveCell} towards the coordinates of the location of",
    "subject to a comprehensive visual ${p.lookAction} the",
    "subject to a comprehensive visual ${p.lookAction}",
    "subject to a thorough visual ${p.lookAction} the",
    "subject to a thorough visual ${p.lookAction}",
    "subject to a detailed visual ${p.lookAction} the",
    "subject to a detailed visual ${p.lookAction}",
    "assume direct exclusive ${p.takeCount} of the",
    "assume direct exclusive ${p.takeCount} of",
    "assume absolute exclusive ${p.takeCount} of the",
    "assume absolute exclusive ${p.takeCount} of",
    "assume immediate exclusive ${p.takeCount} of the",
    "assume immediate exclusive ${p.takeCount} of",
    "assume direct exclusive ${p.takeViceCount} of the",
    "assume direct exclusive ${p.takeViceCount} of",
    "assume absolute exclusive ${p.takeViceCount} of the",
    "assume absolute exclusive ${p.takeViceCount} of",
    "assume immediate exclusive ${p.takeViceCount} of the",
    "assume immediate exclusive ${p.takeViceCount} of",
    "divest oneself of all exclusive ${p.takeCount} of the",
    "divest oneself of all exclusive ${p.takeCount} of",
    "relinquish all exclusive ${p.takeCount} of the",
    "relinquish all exclusive ${p.takeCount} of",
    "free oneself from all exclusive ${p.takeCount} of the",
    "free oneself from all exclusive ${p.takeCount} of",
    "divest oneself of all exclusive ${p.takeViceCount} of the",
    "divest oneself of all exclusive ${p.takeViceCount} of",
    "relinquish all exclusive ${p.takeViceCount} of the",
    "relinquish all exclusive ${p.takeViceCount} of",
    "free oneself from all exclusive ${p.takeViceCount} of the",
    "free oneself from all exclusive ${p.takeViceCount} of",
    "force completely and ${p.openPrefix}orheologically wide open the",
    "force completely and ${p.openPrefix}orheologically wide open",
    "force completely and ${p.openPrefix}o-rheologically wide open the",
    "force completely and ${p.openPrefix}o-rheologically wide open",
    "force completely and ${p.openPrefix}o rheologically wide open the",
    "force completely and ${p.openPrefix}o rheologically wide open",
    "fasten completely and ${p.openPrefix}orheologically closed the",
    "fasten completely and ${p.openPrefix}orheologically closed",
    "fasten completely and ${p.openPrefix}o-rheologically closed the",
    "fasten completely and ${p.openPrefix}o-rheologically closed",
    "fasten completely and ${p.openPrefix}o rheologically closed the",
    "fasten completely and ${p.openPrefix}o rheologically closed",
    "seal completely and ${p.openPrefix}orheologically wide open the",
    "seal completely and ${p.openPrefix}orheologically wide open",
    "seal completely and ${p.openPrefix}o-rheologically wide open the",
    "seal completely and ${p.openPrefix}o-rheologically wide open",
    "seal completely and ${p.openPrefix}o rheologically wide open the",
    "seal completely and ${p.openPrefix}o rheologically wide open",
    "seal completely and ${p.openPrefix}orheologically closed the",
    "seal completely and ${p.openPrefix}orheologically closed",
    "seal completely and ${p.openPrefix}o-rheologically closed the",
    "seal completely and ${p.openPrefix}o-rheologically closed",
    "seal completely and ${p.openPrefix}o rheologically closed the",
    "seal completely and ${p.openPrefix}o rheologically closed",
    "seal completely and ${p.openPrefix}orheologically shut the",
    "seal completely and ${p.openPrefix}orheologically shut",
    "seal completely and ${p.openPrefix}o-rheologically shut the",
    "seal completely and ${p.openPrefix}o-rheologically shut",
    "seal completely and ${p.openPrefix}o rheologically shut the",
    "seal completely and ${p.openPrefix}o rheologically shut",
    "deactivate all ${p.unlockAgent1} and ${p.unlockAgent2} security devices of the",
    "deactivate all ${p.unlockAgent1} and ${p.unlockAgent2} security devices of",
    "deactivate all ${p.unlockAgent1}s and ${p.unlockAgent2}s security devices of the",
    "deactivate all ${p.unlockAgent1}s and ${p.unlockAgent2}s security devices of",
    "bypass all ${p.unlockAgent1} and ${p.unlockAgent2} security devices on the",
    "bypass all ${p.unlockAgent1} and ${p.unlockAgent2} security devices on",
    "bypass all ${p.unlockAgent1}s and ${p.unlockAgent2}s security devices on the",
    "bypass all ${p.unlockAgent1}s and ${p.unlockAgent2}s security devices on",
    "disengage the primary ${p.unlockAgent1} and ${p.unlockAgent2} security device on the",
    "disengage the primary ${p.unlockAgent1} and ${p.unlockAgent2} security device on",
    "disengage the primary ${p.unlockAgent1}s and ${p.unlockAgent2}s security device on the",
    "disengage the primary ${p.unlockAgent1}s and ${p.unlockAgent2}s security device on",
    "harness the full ${p.usePrefix} deployment of the",
    "harness the full ${p.usePrefix} deployment of",
    "bring into active ${p.usePrefix} deployment the",
    "bring into active ${p.usePrefix} deployment",
    "make complete ${p.usePrefix} deployment of the",
    "make complete ${p.usePrefix} deployment of",
    "initiate a/an ${p.combatPrefix} confrontation against the",
    "initiate a/an ${p.combatPrefix} confrontation against",
    "commence a/an ${p.combatPrefix} confrontation against the",
    "commence a/an ${p.combatPrefix} confrontation against",
    "engage in a/an ${p.combatPrefix} confrontation against the",
    "engage in a/an ${p.combatPrefix} confrontation against",
    "initiate an ${p.combatPrefix} confrontation against the",
    "initiate an ${p.combatPrefix} confrontation against",
    "commence an ${p.combatPrefix} confrontation against the",
    "commence an ${p.combatPrefix} confrontation against",
    "engage in an ${p.combatPrefix} confrontation against the",
    "engage in an ${p.combatPrefix} confrontation against",
    "initiate a/an ${combatNoHyphen} confrontation against the",
    "initiate a/an ${combatNoHyphen} confrontation against",
    "commence a/an ${combatNoHyphen} confrontation against the",
    "commence a/an ${combatNoHyphen} confrontation against",
    "engage in a/an ${combatNoHyphen} confrontation against the",
    "engage in a/an ${combatNoHyphen} confrontation against",
    "initiate an ${combatNoHyphen} confrontation against the",
    "initiate an ${combatNoHyphen} confrontation against",
    "commence an ${combatNoHyphen} confrontation against the",
    "commence an ${combatNoHyphen} confrontation against",
    "engage in an ${combatNoHyphen} confrontation against the",
    "engage in an ${combatNoHyphen} confrontation against",
    "initiate a/an ${p.talkPrefix} face to face discussion with the",
    "initiate a/an ${p.talkPrefix} face to face discussion with",
    "initiate a/an ${p.talkPrefix} facetoface discussion with the",
    "initiate a/an ${p.talkPrefix} facetoface discussion with",
    "initiate a/an ${p.talkPrefix} face-to-face discussion with the",
    "initiate a/an ${p.talkPrefix} face-to-face discussion with",
    "initiate an ${p.talkPrefix} face to face discussion with the",
    "initiate an ${p.talkPrefix} face to face discussion with",
    "initiate an ${p.talkPrefix} facetoface discussion with the",
    "initiate an ${p.talkPrefix} facetoface discussion with",
    "initiate an ${p.talkPrefix} face-to-face discussion with the",
    "initiate an ${p.talkPrefix} face-to-face discussion with",
    "engage in a/an ${p.talkPrefix} face to face discussion with the",
    "engage in a/an ${p.talkPrefix} face to face discussion with",
    "engage in a/an ${p.talkPrefix} facetoface discussion with the",
    "engage in a/an ${p.talkPrefix} facetoface discussion with",
    "engage in a/an ${p.talkPrefix} face-to-face discussion with the",
    "engage in a/an ${p.talkPrefix} face-to-face discussion with",
    "engage in an ${p.talkPrefix} face to face discussion with the",
    "engage in an ${p.talkPrefix} face to face discussion with",
    "engage in an ${p.talkPrefix} facetoface discussion with the",
    "engage in an ${p.talkPrefix} facetoface discussion with",
    "engage in an ${p.talkPrefix} face-to-face discussion with the",
    "engage in an ${p.talkPrefix} face-to-face discussion with",
    "strike up a/an ${p.talkPrefix} face to face discussion with the",
    "strike up a/an ${p.talkPrefix} face to face discussion with",
    "strike up a/an ${p.talkPrefix} facetoface discussion with the",
    "strike up a/an ${p.talkPrefix} facetoface discussion with",
    "strike up a/an ${p.talkPrefix} face-to-face discussion with the",
    "strike up a/an ${p.talkPrefix} face-to-face discussion with",
    "strike up an ${p.talkPrefix} face to face discussion with the",
    "strike up an ${p.talkPrefix} face to face discussion with",
    "strike up an ${p.talkPrefix} facetoface discussion with the",
    "strike up an ${p.talkPrefix} facetoface discussion with",
    "strike up an ${p.talkPrefix} face-to-face discussion with the",
    "strike up an ${p.talkPrefix} face-to-face discussion with"
  );
`;
  }

  const synonyms2Path = path.resolve(projectRoot, "src/parser/command_map_synonyms_2.ts");
  let synonyms2Content = fs.readFileSync(synonyms2Path, "utf8");

  const startMarker = "// --- GENERATED SYNONYMS START ---";
  const endMarker = "// --- GENERATED SYNONYMS END ---";

  const startIndex = synonyms2Content.indexOf(startMarker);
  const endIndex = synonyms2Content.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1) {
    throw new Error(`Markers not found in ${synonyms2Path}`);
  }

  const before = synonyms2Content.substring(0, startIndex + startMarker.length);
  const after = synonyms2Content.substring(endIndex);

  const newSynonyms2Content = before + "\n" + content + "\n  " + after;
  fs.writeFileSync(synonyms2Path, newSynonyms2Content, "utf8");
  console.log(`Updated synonym file: ${synonyms2Path}`);
}

function generateTestsFile() {
  let content = `import { describe, it, expect } from "vitest";
import { mapCommand } from "../src/parser/command_map.js";

describe("Parser Synonym Expansion (Generated)", () => {
  const actions = [
    { id: "move-east", command: "go east", action: { type: "MOVE" as const, direction: "east" } },
    { id: "look-altar", command: "look altar", action: { type: "LOOK" as const, target: "altar" } },
    { id: "take-katana", command: "take steel katana", action: { type: "TAKE" as const, item: "katana" } },
    { id: "drop-boots", command: "drop leather boots", action: { type: "DROP" as const, item: "boots" } },
    { id: "talk-capo", command: "talk to smuggler capo", action: { type: "TALK" as const, npc: "capo" } },
    { id: "use-lockpick", command: "use lockpick on chest", action: { type: "USE" as const, target: "chest" } },
    { id: "unlock-chest", command: "unlock chest with key", action: { type: "UNLOCK" as const, target: "chest" } },
    { id: "open-vault", command: "open iron vault", action: { type: "OPEN" as const, target: "vault" } },
    { id: "close-door", command: "close heavy door", action: { type: "CLOSE" as const, target: "door" } },
    { id: "fight-ghoul", command: "fight crypt ghoul", action: { type: "FIGHT" as const, npc: "ghoul" } },
  ];
`;

  for (const p of PHASES) {
    const combatNoHyphen = p.combatPrefix.replace("-", "");
    content += `
  describe("Phase ${p.phase} (Cycle #${p.cycle})", () => {
    it("should map newly added movement verbs to MOVE action", () => {
      expect(
        mapCommand("navigate one's vector of ${p.moveCell} towards the location of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
      expect(
        mapCommand("steer one's vector of ${p.moveCell} in the direction of the coordinates of east", actions).action
      ).toEqual({ type: "MOVE", direction: "east" });
    });

    it("should map newly added inspection verbs to LOOK action", () => {
      expect(mapCommand("subject to a comprehensive visual ${p.lookAction} altar", actions).action).toEqual({
        type: "LOOK",
        target: "altar",
      });
    });

    it("should map newly added take verbs to TAKE action", () => {
      expect(mapCommand("assume direct exclusive ${p.takeCount} of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
      expect(mapCommand("assume direct exclusive ${p.takeViceCount} of katana", actions).action).toEqual({
        type: "TAKE",
        item: "katana",
      });
    });

    it("should map newly added drop verbs to DROP action", () => {
      expect(mapCommand("divest oneself of all exclusive ${p.takeCount} of boots", actions).action).toEqual({
        type: "DROP",
        item: "boots",
      });
    });

    it("should map newly added open/close verbs to OPEN/CLOSE action", () => {
      expect(mapCommand("force completely and ${p.openPrefix}orheologically wide open vault", actions).action).toEqual({
        type: "OPEN",
        target: "vault",
      });
      expect(mapCommand("fasten completely and ${p.openPrefix}orheologically closed door", actions).action).toEqual({
        type: "CLOSE",
        target: "door",
      });
    });

    it("should map newly added unlock verbs to UNLOCK action", () => {
      expect(mapCommand("deactivate all ${p.unlockAgent1} and ${p.unlockAgent2} security devices of chest", actions).action).toEqual({
        type: "UNLOCK",
        target: "chest",
      });
    });

    it("should map newly added use verbs to USE action", () => {
      expect(mapCommand("harness the full ${p.usePrefix} deployment of lockpick", actions).action).toEqual({
        type: "USE",
        target: "chest",
      });
    });

    it("should map newly added combat verbs to FIGHT action", () => {
      expect(mapCommand("initiate a/an ${p.combatPrefix} confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
      expect(mapCommand("initiate a/an ${combatNoHyphen} confrontation against ghoul", actions).action).toEqual({
        type: "FIGHT",
        npc: "ghoul",
      });
    });

    it("should map newly added dialogue verbs to TALK action", () => {
      expect(mapCommand("initiate a/an ${p.talkPrefix} face to face discussion with capo", actions).action).toEqual({
        type: "TALK",
        npc: "capo",
      });
    });
  });
`;
  }

  content += `});\n`;

  const outputPath = path.resolve(projectRoot, "tests/parser_synonym_expansion_generated.test.ts");
  fs.writeFileSync(outputPath, content, "utf8");
  console.log(`Generated test file: ${outputPath}`);
}

generateSynonymsFile();
generateTestsFile();
