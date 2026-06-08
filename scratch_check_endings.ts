import { readFileSync } from "fs";
import { parse as parseYaml } from "yaml";
import { CYOAPackSchema } from "./src/cyoa/schema.js";

const content = readFileSync("content/cyoa/pack/watchtower.yaml", "utf8");
const packData = parseYaml(content);
console.log("Raw packData endings:", packData.endings);

const parsed = CYOAPackSchema.safeParse(packData);
if (parsed.success) {
  console.log("Parsed pack endings:", parsed.data.endings);
} else {
  console.error("Validation failed:", parsed.error);
}
