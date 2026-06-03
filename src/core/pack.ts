import { CYOAPack } from "../cyoa/schema.js";
import { ParserPack } from "../parser/schema.js";

/**
 * Type guard to check if a game pack is a CYOA pack.
 */
export function isCyoaPack(pack: any): pack is CYOAPack {
  return pack !== null && typeof pack === "object" && "scenes" in pack;
}

/**
 * Type guard to check if a game pack is a Parser pack.
 */
export function isParserPack(pack: any): pack is ParserPack {
  return pack !== null && typeof pack === "object" && "rooms" in pack;
}
