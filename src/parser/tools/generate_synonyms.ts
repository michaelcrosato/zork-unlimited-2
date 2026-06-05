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
  { prefix: "myeloblastocytoclast", base: "myeloblast" },
  { prefix: "astrocytocytoclast", base: "astrocyte" },
  { prefix: "oligodendrocytocytoclast", base: "oligodendrocyte" },
  { prefix: "microgliocytoclast", base: "microglia" },
  { prefix: "adipocytocytoclast", base: "adipocyte" },
  { prefix: "macrophagocytoclast", base: "macrophage" },
  { prefix: "dendritocytoclast", base: "dendrite" },
  { prefix: "neuronocytoclast", base: "neuron" },
  { prefix: "hepatoblastocytoclast", base: "hepatoblast" },
  { prefix: "neuroblastocytoclast", base: "neuroblast" },
  { prefix: "osteoblastocytoclast", base: "osteoblast" },
  { prefix: "chondroblastocytoclast", base: "chondroblast" },
  { prefix: "myoblastocytoclast", base: "myoblast" },
  { prefix: "fibroblastocytoclast", base: "fibroblast" },
  { prefix: "epitheliocytocytoclast", base: "epitheliocyte" },
  { prefix: "podocytocytoclast", base: "podocyte" },
  { prefix: "cardiomyocytocytoclast", base: "cardiomyocyte" },
  { prefix: "enteroblastocytoclast", base: "enteroblast" },
  { prefix: "lymphoblastocytoclast", base: "lymphoblast" },
  { prefix: "monoblastocytoclast", base: "monoblast" },
  { prefix: "erythroblastocytoclast", base: "erythroblast" },
  { prefix: "megakaryocytocytoclast", base: "megakaryocyte" },
  { prefix: "purkinjocytoclast", base: "purkinje" },
  { prefix: "schwannocytoclast", base: "schwann" },
  { prefix: "ependymocytoclast", base: "ependymal" },
  { prefix: "satellitecytoclast", base: "satellite" },
  { prefix: "glialcytoclast", base: "glia" },
  { prefix: "gobletcytoclast", base: "goblet" },
  { prefix: "reticulocytoclast", base: "reticulocyte" },
  { prefix: "melanoblastocytoclast", base: "melanoblast" },
  { prefix: "keratinoblastocytoclast", base: "keratinoblast" },
  { prefix: "myelocytocytoclast", base: "myelocyte" },
  { prefix: "neuroendocrinocytoclast", base: "neuroendocrine" },
  { prefix: "pinealocytoclast", base: "pinealocyte" },
  { prefix: "thymocytoclast", base: "thymocyte" },
  { prefix: "splenoblastocytoclast", base: "splenoblast" },
  { prefix: "nephroblastocytoclast", base: "nephroblast" },
  { prefix: "lipocytoclast", base: "lipocyte" },
  { prefix: "histiocytoclast", base: "histiocyte" },
  { prefix: "mastocytoclast", base: "mastocyte" },
  { prefix: "somatocytoclast", base: "somatocyte" },
  { prefix: "plasmacytoclast", base: "plasmacyte" },
  { prefix: "myofibroblastocytoclast", base: "myofibroblast" },
  { prefix: "pericytocytoclast", base: "pericyte" },
  { prefix: "mesothelialcytoclast", base: "mesothelial" },
  { prefix: "endothelialcytoclast", base: "endothelial" },
  { prefix: "epithelialcytoclast", base: "epithelial" },
  { prefix: "keratocytocytoclast", base: "keratocyte" },
  { prefix: "tenocytocytoclast", base: "tenocyte" },
  { prefix: "tenoblastocytoclast", base: "tenoblast" },
  { prefix: "odontoblastocytoclast", base: "odontoblast" },
  { prefix: "ameloblastocytoclast", base: "ameloblast" },
  { prefix: "cementoblastocytoclast", base: "cementoblast" },
  { prefix: "cementocytocytoclast", base: "cementocyte" },
  { prefix: "osteoclastocytoclast", base: "osteoclast" },
  { prefix: "chondroclastocytoclast", base: "chondroclast" },
  { prefix: "spermatocytoclast", base: "spermatocyte" },
  { prefix: "oocytoclast", base: "oocyte" },
  { prefix: "neurogliocytoclast", base: "neuroglia" },
  { prefix: "ependymoblastocytoclast", base: "ependymoblast" },
  { prefix: "spongioblastocytoclast", base: "spongioblast" },
  { prefix: "astroblastocytoclast", base: "astroblast" },
  { prefix: "oligodendroblastocytoclast", base: "oligodendroblast" },
  { prefix: "syncytiotrophoblastocytoclast", base: "syncytiotrophoblast" },
  { prefix: "cytotrophoblastocytoclast", base: "cytotrophoblast" },
  { prefix: "normoblastocytoclast", base: "normoblast" },
  { prefix: "megakaryoblastocytoclast", base: "megakaryoblast" },
  { prefix: "promyelocytocytoclast", base: "promyelocyte" },
  { prefix: "metamyelocytocytoclast", base: "metamyelocyte" },
  { prefix: "histioblastocytoclast", base: "histioblast" },
  { prefix: "kupffercytoclast", base: "kupffer" },
  { prefix: "sertolicytoclast", base: "sertoli" },
  { prefix: "leydigcytoclast", base: "leydig" },
  { prefix: "granulosacytoclast", base: "granulosa" },
  { prefix: "luteincytoclast", base: "lutein" },
  { prefix: "thecacytoclast", base: "theca" },
  { prefix: "merkelcytoclast", base: "merkel" },
  { prefix: "langerhanscytoclast", base: "langerhans" },
  { prefix: "panethcytoclast", base: "paneth" },
  { prefix: "parietalcytoclast", base: "parietal" },
  { prefix: "chiefcytoclast", base: "chief" },
  { prefix: "foveolarcytoclast", base: "foveolar" },
  { prefix: "mesangialcytoclast", base: "mesangial" },
  { prefix: "juxtaglomerularcytoclast", base: "juxtaglomerular" },
  { prefix: "maculadensacytoclast", base: "maculadensa" },
  { prefix: "somatotropicytoclast", base: "somatotropic" },
  { prefix: "corticotropicytoclast", base: "corticotropic" },
  { prefix: "gonadotropicytoclast", base: "gonadotropic" },
  { prefix: "thyrotropicytoclast", base: "thyrotropic" },
  { prefix: "lactotropicytoclast", base: "lactotropic" },
  { prefix: "chromaffincytoclast", base: "chromaffin" },
  { prefix: "parafollicularcytoclast", base: "parafollicular" },
  { prefix: "oxyphilcytoclast", base: "oxyphil" },
  { prefix: "follicularstellarcytoclast", base: "follicularstellate" },
  { prefix: "pituicytocytoclast", base: "pituicyte" },
  { prefix: "gonadocytoclast", base: "gonadocyte" },
  { prefix: "spermatogoniocytoclast", base: "spermatogonium" },
  { prefix: "oogoniocytoclast", base: "oogonium" },
  { prefix: "thecaluteincytoclast", base: "thecalutein" },
  { prefix: "granulosaluteincytoclast", base: "granulosalutein" },
  { prefix: "myelinocytoclast", base: "myelin" },
  { prefix: "sarcomerocytoclast", base: "sarcomere" },
  { prefix: "axonocytoclast", base: "axon" },
  { prefix: "synapsocytoclast", base: "synapse" },
  { prefix: "osteonocytoclast", base: "osteon" },
  { prefix: "chondrinocytoclast", base: "chondrin" },
  { prefix: "collagenocytoclast", base: "collagen" },
  { prefix: "elastinocytoclast", base: "elastin" },
  { prefix: "sarcolemmocytoclast", base: "sarcolemmo" },
  { prefix: "neurolemmocytoclast", base: "neurolemmo" },
  { prefix: "desmosomocytoclast", base: "desmosome" },
  { prefix: "microfilamentocytoclast", base: "microfilament" },
  { prefix: "microtubulocytoclast", base: "microtubule" },
  { prefix: "lysosomocytoclast", base: "lysosome" },
  { prefix: "mitochondriocytoclast", base: "mitochondria" },
  { prefix: "ribosomocytoclast", base: "ribosome" },
  { prefix: "nucleocytoclast", base: "nucleus" },
  { prefix: "nucleolocytoclast", base: "nucleolus" },
  { prefix: "chromatinocytoclast", base: "chromatin" },
  { prefix: "centrosomocytoclast", base: "centrosome" },
  { prefix: "ciliocytoclast", base: "cilio" },
  { prefix: "flagellocytoclast", base: "flagello" },
  { prefix: "peroxisomocytoclast", base: "peroxisome" },
  { prefix: "chloroplastocytoclast", base: "chloroplast" },
  { prefix: "vacuolocytoclast", base: "vacuole" },
  { prefix: "vesiculocytoclast", base: "vesicle" },
  { prefix: "plasmodesmatocytoclast", base: "plasmodesmata" },
  { prefix: "cytoskeletonocytoclast", base: "cytoskeleton" },
  { prefix: "membranocytoclast", base: "membrane" },
  { prefix: "golgicytoclast", base: "golgi" },
  { prefix: "ribosomoblastocytoclast", base: "ribosomoblast" },
  { prefix: "peroxisomoblastocytoclast", base: "peroxisomoblast" },
  { prefix: "vacuoloblastocytoclast", base: "vacuoloblast" },
  { prefix: "lysosomoblastocytoclast", base: "lysosomoblast" },
  { prefix: "cilioblastocytoclast", base: "cilioblast" },
  { prefix: "flagelloblastocytoclast", base: "flagelloblast" },
  { prefix: "myelinoblastocytoclast", base: "myelinoblast" },
  { prefix: "axonoblastocytoclast", base: "axonoblast" },
  { prefix: "synapsoblastocytoclast", base: "synapsoblast" },
  { prefix: "sarcomeroblastocytoclast", base: "sarcomeroblast" },
  { prefix: "collagenoblastocytoclast", base: "collagenoblast" },
  { prefix: "elastinoblastocytoclast", base: "elastinoblast" },
  { prefix: "desmosomoblastocytoclast", base: "desmosomoblast" },
  { prefix: "microfilamentoblastocytoclast", base: "microfilamentoblast" },
  { prefix: "microtubuloblastocytoclast", base: "microtubuloblast" },
  { prefix: "centriolocytoclast", base: "centriole" },
  { prefix: "chromosomocytoclast", base: "chromosome" },
  { prefix: "chromatidocytoclast", base: "chromatid" },
  { prefix: "plasmidocytoclast", base: "plasmid" },
  { prefix: "pilocytoclast", base: "pili" },
  { prefix: "cytosolocytoclast", base: "cytosol" },
  { prefix: "cytoplasmocytoclast", base: "cytoplasm" },
  { prefix: "protoplastocytoclast", base: "protoplast" },
  { prefix: "nucleoplasmocytoclast", base: "nucleoplasm" },
  { prefix: "euchromatinocytoclast", base: "euchromatin" },
  { prefix: "heterochromatinocytoclast", base: "heterochromatin" },
  { prefix: "kinetochorocytoclast", base: "kinetochore" },
  { prefix: "spindlocytoclast", base: "spindle" },
  { prefix: "centromerocytoclast", base: "centromere" },
  { prefix: "telomerocytoclast", base: "telomere" },
  { prefix: "autophagosomocytoclast", base: "autophagosome" },
  { prefix: "endosomocytoclast", base: "endosome" },
  { prefix: "melanosomocytoclast", base: "melanosome" },
  { prefix: "chromatosomocytoclast", base: "chromatosome" },
  { prefix: "chromatosmoblastocytoclast", base: "chromatosmoblast" },
  { prefix: "nucleosomocytoclast", base: "nucleosome" },
  { prefix: "nucleosomblastocytoclast", base: "nucleosomblast" },
  { prefix: "histonocytoclast", base: "histone" },
  { prefix: "histoneblastocytoclast", base: "histoneblast" },
  { prefix: "solenoidocytoclast", base: "solenoid" },
  { prefix: "solenoidoblastocytoclast", base: "solenoidblast" },
  { prefix: "replisomocytoclast", base: "replisome" },
  { prefix: "replisomblastocytoclast", base: "replisomblast" },
  { prefix: "spliceosomocytoclast", base: "spliceosome" },
  { prefix: "spliceosomblastocytoclast", base: "spliceosomblast" },
  { prefix: "ribozymocytoclast", base: "ribozyme" },
  { prefix: "proteasomocytoclast", base: "proteasome" },
  { prefix: "glyoxysomocytoclast", base: "glyoxysome" },
  { prefix: "glyoxysomblastocytoclast", base: "glyoxysomblast" },
  { prefix: "dictyosomocytoclast", base: "dictyosome" },
  { prefix: "dictyosomblastocytoclast", base: "dictyosomblast" },
  { prefix: "carboxysomocytoclast", base: "carboxysome" },
  { prefix: "carboxysomblastocytoclast", base: "carboxysomblast" },
  { prefix: "mitochondrioblastocytoclast", base: "mitochondrioblast" },
  { prefix: "plastidocytoclast", base: "plastid" },
  { prefix: "plastidoblastocytoclast", base: "plastidoblast" },
  { prefix: "amyloplastocytoclast", base: "amyloplast" },
  { prefix: "amyloplastoblastocytoclast", base: "amyloplastoblast" },
  { prefix: "chromoplastocytoclast", base: "chromoplast" },
  { prefix: "chromoplastoblastocytoclast", base: "chromoplastoblast" },
  { prefix: "leucoplastocytoclast", base: "leucoplast" },
  { prefix: "leucoplastoblastocytoclast", base: "leucoplastoblast" },
  { prefix: "elaioplastocytoclast", base: "elaioplast" },
  { prefix: "elaioplastoblastocytoclast", base: "elaioplastoblast" },
  { prefix: "proteinoplastocytoclast", base: "proteinoplast" },
  { prefix: "proteinoplastoblastocytoclast", base: "proteinoplastoblast" },
  { prefix: "etioplastocytoclast", base: "etioplast" },
  { prefix: "etioplastoblastocytoclast", base: "etioplastoblast" },
  { prefix: "statolithocytoclast", base: "statolith" },
  { prefix: "statolithoblastocytoclast", base: "statolithoblast" },
  { prefix: "nucleoblastocytoclast", base: "nucleoblast" },
  { prefix: "nucleoloblastocytoclast", base: "nucleoloblast" },
  { prefix: "chromatinoblastocytoclast", base: "chromatinblast" },
  { prefix: "centrosomoblastocytoclast", base: "centrosomoblast" },
  { prefix: "chloroplastoblastocytoclast", base: "chloroplastoblast" },
  { prefix: "vesiculoblastocytoclast", base: "vesiculoblast" },
  { prefix: "plasmodesmatoblastocytoclast", base: "plasmodesmatoblast" },
  { prefix: "cytoskeletonoblastocytoclast", base: "cytoskeletonblast" },
  { prefix: "membranoblastocytoclast", base: "membranoblast" },
  { prefix: "golgiblastocytoclast", base: "golgiblast" },
  { prefix: "centrioloblastocytoclast", base: "centrioloblast" },
  { prefix: "chromosomoblastocytoclast", base: "chromosomoblast" },
  { prefix: "plasmidoblastocytoclast", base: "plasmidblast" },
  { prefix: "piloblastocytoclast", base: "piloblast" },
  { prefix: "cytosolblastocytoclast", base: "cytosolblast" },
  { prefix: "cytoplasmblastocytoclast", base: "cytoplasmblast" },
  { prefix: "protoplastblastocytoclast", base: "protoplastblast" },
  { prefix: "nucleoplasmblastocytoclast", base: "nucleoplasmblast" },
  { prefix: "euchromatinblastocytoclast", base: "euchromatinblast" },
  { prefix: "heterochromatinblastocytoclast", base: "heterochromatinblast" },
  { prefix: "kinetochoreblastocytoclast", base: "kinetochoreblast" },
  { prefix: "spindleblastocytoclast", base: "spindleblast" },
  { prefix: "centromereblastocytoclast", base: "centromereblast" },
  { prefix: "telomereblastocytoclast", base: "telomereblast" },
  { prefix: "autophagosomeblastocytoclast", base: "autophagosomeblast" },
  { prefix: "endosomeblastocytoclast", base: "endosomeblast" },
  { prefix: "melanosomeblastocytoclast", base: "melanosomeblast" },
  { prefix: "dictyosomeblastocytoclast", base: "dictyosomeblast" },
  { prefix: "carboxysomeblastocytoclast", base: "carboxysomeblast" },
  { prefix: "protoplasmblastocytoclast", base: "protoplasmblast" },
  { prefix: "ectoplasmblastocytoclast", base: "ectoplasmblast" },
  { prefix: "endoplasmblastocytoclast", base: "endoplasmblast" },
  { prefix: "periplasmblastocytoclast", base: "periplasmblast" },
  { prefix: "tonoplastblastocytoclast", base: "tonoplastblast" },
  { prefix: "rhizoplastblastocytoclast", base: "rhizoplastblast" },
  { prefix: "apoplastblastocytoclast", base: "apoplastblast" },
  { prefix: "symplastblastocytoclast", base: "symplastblast" },
  { prefix: "nucleolosomeblastocytoclast", base: "nucleolosomeblast" },
  { prefix: "parasomeblastocytoclast", base: "parasomeblast" },
  { prefix: "karyosomeblastocytoclast", base: "karyosomeblast" },
  { prefix: "phagosomeblastocytoclast", base: "phagosomeblast" },
  { prefix: "acrosomeblastocytoclast", base: "acrosomeblast" },
  { prefix: "cytosomeblastocytoclast", base: "cytosomeblast" },
  { prefix: "microbodyblastocytoclast", base: "microbodyblast" },
  { prefix: "blepharoplastblastocytoclast", base: "blepharoplastblast" },
  { prefix: "kinetoplastblastocytoclast", base: "kinetoplastblast" },
  { prefix: "polysomocytoclast", base: "polysome" },
  { prefix: "polysomoblastocytoclast", base: "polysomoblast" },
  { prefix: "liposomblastocytoclast", base: "liposomblast" },
  { prefix: "phragmoplastocytoclast", base: "phragmoplast" },
  { prefix: "phragmoplastblastocytoclast", base: "phragmoplastblast" },
  { prefix: "nucleoidcytoclast", base: "nucleoid" },
  { prefix: "nucleoidblastocytoclast", base: "nucleoidblast" },
  { prefix: "myofibrilocytoclast", base: "myofibril" },
  { prefix: "myofibrilblastocytoclast", base: "myofibrilblast" },
  { prefix: "desminocytoclast", base: "desmin" },
  { prefix: "desminblastocytoclast", base: "desminblast" },
  { prefix: "vimentinocytoclast", base: "vimentin" },
  { prefix: "vimentinblastocytoclast", base: "vimentinblast" },
  { prefix: "neurofilamentocytoclast", base: "neurofilament" },
  { prefix: "neurofilamentblastocytoclast", base: "neurofilamentblast" }
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
  "calcium",
  "iron",
  "copper",
  "zinc",
  "gold",
  "silver",
  "platinum",
  "mercury",
  "lead",
  "tin",
  "nickel",
  "titanium",
  "cobalt",
  "chromium",
  "manganese",
  "vanadium",
  "scandium",
  "gallium",
  "germanium",
  "arsenic",
  "selenium",
  "rubidium",
  "strontium",
  "yttrium",
  "zirconium",
  "niobium",
  "molybdenum",
  "ruthenium",
  "rhodium",
  "palladium",
  "cadmium",
  "indium",
  "antimony",
  "tellurium",
  "xenon",
  "cesium",
  "barium",
  "lanthanum",
  "cerium",
  "praseodymium",
  "neodymium",
  "promethium",
  "samarium",
  "europium",
  "gadolinium",
  "terbium",
  "dysprosium",
  "holmium",
  "erbium",
  "thulium",
  "ytterbium",
  "lutetium",
  "hafnium",
  "tantalum",
  "tungsten",
  "rhenium",
  "osmium",
  "iridium",
  "thallium",
  "bismuth",
  "polonium",
  "radon",
  "francium",
  "radium",
  "actinium",
  "thorium",
  "protactinium",
  "uranium",
  "neptunium",
  "plutonium",
  "americium",
  "curium",
  "berkelium",
  "californium",
  "einsteinium",
  "fermium",
  "mendelevium",
  "nobelium",
  "lawrencium",
  "rutherfordium",
  "dubnium",
  "seaborgium",
  "bohrium",
  "hassium",
  "meitnerium",
  "darmstadtium",
  "roentgenium",
  "copernicium",
  "nihonium",
  "flerovium",
  "moscovium",
  "livermorium",
  "tennessine",
  "oganesson",
  "deuterium",
  "tritium",
  "mithril",
  "adamant",
  "orichalcum",
  "electrum",
  "steel",
  "bronze",
  "brass",
  "pewter",
  "amalgam",
  "solder",
  "invar",
  "nichrome",
  "alinico",
  "stellite",
  "duralumin",
  "magnalium",
  "constantan",
  "monel",
  "hastelloy",
  "inconel",
  "elinvac",
  "vitallium",
  "galinstan",
  "vibranium",
  "adamantium",
  "beskar",
  "unobtainium",
  "runite",
  "naquadah",
  "trinium",
  "neutronium",
  "dilithium",
  "tritanium",
  "duranium",
  "latinum",
  "corbomite",
  "kryptonite",
  "tiberium",
  "durasteel",
  "plasteel",
  "quadranium",
  "carbonite",
  "cortosis",
  "phrik",
  "nanite",
  "graphene",
  "carbyne",
  "aerogel",
  "chronoton",
  "tachyon",
  "graviton",
  "darkmatter",
  "antimatter",
  "redmatter",
  "ether",
  "phlogiston",
  "quintessence",
  "aurum",
  "argentum",
  "plumbum",
  "ferrum",
  "cuprum",
  "hydrargyrum",
  "stannum",
  "natrium",
  "kalium",
  "krypton",
  "argon",
  "neon",
  "fluorine",
  "chlorine",
  "bromine",
  "iodine",
  "astatine",
  "cobaltite",
  "chromite",
  "magnetite",
  "hematite",
  "pyrite",
  "chalcopyrite",
  "galena",
  "bauxite",
  "sphalerite",
  "cinnabar",
  "malachite",
  "azurite",
  "limonite",
  "siderite",
  "tanzanite",
  "alexandrite",
  "obsidian",
  "malachitite",
  "azuritite",
  "limonitite",
  "sideritite",
  "tanzanitite",
  "alexandritite",
  "pyropite",
  "almandine",
  "spessartine",
  "grossular",
  "andradite",
  "uvarovite",
  "rhodonite",
  "wollastonite",
  "chalcocite",
  "bornite",
  "covellite",
  "tetrahedrite",
  "enargite",
  "pyrhotite",
  "pentlandite",
  "arsenopyrite",
  "skutterudite",
  "ullmannite",
  "marcasite",
  "arsenolite",
  "senarmontite",
  "valentinite",
  "bismite",
  "molybdite",
  "tungstite",
  "ilmenite",
  "rutile",
  "anatase",
  "brookite",
  "pyrolusite",
  "cryolite",
  "fluorite",
  "apatite",
  "monazite",
  "bastnasite",
  "xenotime",
  "zircon",
  "sphene",
  "titanite",
  "leucoxene",
  "ilmenorutile",
  "struverite",
  "columbite",
  "tantalite",
  "pyrochlore",
  "microlite",
  "fergusonite",
  "samarskite",
  "euxenite",
  "polycrase",
  "gadolinite",
  "allanite",
  "parisite",
  "synchysite",
  "ancylite",
  "loparite",
  "latrappite",
  "lueshite",
  "natronosite",
  "thorianite",
  "uraninite",
  "coffinite",
  "brannerite",
  "carnotite",
  "tyuyamunite",
  "autunite",
  "torbernite",
  "urancircite",
  "zeunerite",
  "saleeite",
  "novacekite",
  "sabugalite",
  "bassettite",
  "fritzscheite",
  "heinrichite",
  "kahlerite",
  "kirchheimerite",
  "natrouranospinite",
  "uranospinite",
  "walpurgite",
  "zeuneritite",
  "saleeitite",
  "novacekitite",
  "sabugalitite",
  "bassettitite",
  "fritzscheitite",
  "heinrichitite",
  "kahleritite",
  "kirchheimeritite",
  "natrouranospinitite",
  "uranospinitite",
  "walpurgitite",
  "torbernitite",
  "autunitite",
  "carnotitite",
  "tyuyamunitite",
  "urancircitite",
  "coffinitite",
  "branneritite",
  "fergusonitite",
  "samarskitite",
  "euxenitite",
  "polycrasitite",
  "gadolinitite",
  "allanitite",
  "parisitite",
  "synchysitite",
  "ancylitite",
  "loparitite",
  "latrappitite",
  "lueshitite",
  "natronositite",
  "thorianitite",
  "uraninitite",
  "bastnasitite",
  "monazitite",
  "xenotimitite",
  "cryolitite",
  "apatitite",
  "fluoritite",
  "sphenitite",
  "titanitite",
  "rutilitite",
  "anatasitite",
  "brookitite",
  "ilmenitite",
  "pyrolusitite",
  "zirconitite",
  "columbitite"
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
  if (n >= 150 && n < 160) {
    if (n === 150) return "pentacontahectarchy";
    return units[n - 150] + "pentacontahectarchy";
  }
  if (n >= 160 && n < 170) {
    if (n === 160) return "hexacontahectarchy";
    return units[n - 160] + "hexacontahectarchy";
  }
  if (n >= 170 && n < 180) {
    if (n === 170) return "heptacontahectarchy";
    return units[n - 170] + "heptacontahectarchy";
  }
  if (n >= 180 && n < 190) {
    if (n === 180) return "octacontahectarchy";
    return units[n - 180] + "octacontahectarchy";
  }
  if (n >= 190 && n < 200) {
    if (n === 190) return "enneacontahectarchy";
    return units[n - 190] + "enneacontahectarchy";
  }
  if (n >= 200 && n < 210) {
    if (n === 200) return "dihectarchy";
    return units[n - 200] + "dihectarchy";
  }
  if (n >= 210 && n < 220) {
    if (n === 210) return "decadihectarchy";
    return units[n - 210] + "decadihectarchy";
  }
  if (n >= 220 && n < 230) {
    if (n === 220) return "icosadihectarchy";
    return units[n - 220] + "icosadihectarchy";
  }
  if (n >= 230 && n < 240) {
    if (n === 230) return "triacontadihectarchy";
    return units[n - 230] + "triacontadihectarchy";
  }
  if (n >= 240 && n < 250) {
    if (n === 240) return "tetracontadihectarchy";
    return units[n - 240] + "tetracontadihectarchy";
  }
  if (n >= 250 && n < 260) {
    if (n === 250) return "pentacontadihectarchy";
    return units[n - 250] + "pentacontadihectarchy";
  }
  if (n >= 260 && n < 270) {
    if (n === 260) return "hexacontadihectarchy";
    return units[n - 260] + "hexacontadihectarchy";
  }
  if (n >= 270 && n < 280) {
    if (n === 270) return "heptacontadihectarchy";
    return units[n - 270] + "heptacontadihectarchy";
  }
  if (n >= 280 && n < 290) {
    if (n === 280) return "octacontadihectarchy";
    return units[n - 280] + "octacontadihectarchy";
  }
  if (n >= 290 && n < 300) {
    if (n === 290) return "enneacontadihectarchy";
    return units[n - 290] + "enneacontadihectarchy";
  }
  if (n >= 300 && n < 310) {
    if (n === 300) return "trihectarchy";
    return units[n - 300] + "trihectarchy";
  }
  if (n >= 310 && n < 320) {
    if (n === 310) return "decatrihectarchy";
    return units[n - 310] + "decatrihectarchy";
  }
  if (n >= 320 && n < 330) {
    if (n === 320) return "icosatrihectarchy";
    return units[n - 320] + "icosatrihectarchy";
  }
  if (n >= 330 && n < 340) {
    if (n === 330) return "triacontatrihectarchy";
    return units[n - 330] + "triacontatrihectarchy";
  }
  if (n >= 340 && n < 350) {
    if (n === 340) return "tetracontatrihectarchy";
    return units[n - 340] + "tetracontatrihectarchy";
  }
  if (n >= 350 && n < 360) {
    if (n === 350) return "pentacontatrihectarchy";
    return units[n - 350] + "pentacontatrihectarchy";
  }
  if (n >= 360 && n < 370) {
    if (n === 360) return "hexacontatrihectarchy";
    return units[n - 360] + "hexacontatrihectarchy";
  }
  if (n >= 370 && n < 380) {
    if (n === 370) return "heptacontatrihectarchy";
    return units[n - 370] + "heptacontatrihectarchy";
  }
  if (n >= 380 && n < 390) {
    if (n === 380) return "octacontatrihectarchy";
    return units[n - 380] + "octacontatrihectarchy";
  }
  if (n >= 390 && n < 400) {
    if (n === 390) return "enneacontatrihectarchy";
    return units[n - 390] + "enneacontatrihectarchy";
  }
  if (n === 400) return "tetrahectarchy";

  const tens = ["", "", "", "", "", "pentacontarchy", "hexacontarchy", "heptacontarchy", "octacontarchy", "enneacontarchy"];
  
  const unitDigit = n % 10;
  const tenDigit = Math.floor(n / 10);
  
  if (tenDigit === 5 && unitDigit === 1) return "unapentacontarchy";
  if (tenDigit === 5 && unitDigit === 9) return "nonapentacontarchy";
  
  return units[unitDigit] + tens[tenDigit];
}

// Generate phases starting from Phase 368 up to Phase 600
const PHASES: SynonymPhase[] = [];
for (let p = 368; p <= 600; p++) {
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
