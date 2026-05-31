import { ParserPack, ParserPackSchema } from "../parser/schema.js";
import { ValidationReport, ValidationFinding } from "./report.js";

/**
 * Validates a ParserPack against all architectural, reachability, and safety checks.
 * Enforces the quest_critical soft-lock and reference integrity gates (§10.2).
 */
export function validateParserPack(rawPack: unknown): ValidationReport {
  const findings: ValidationFinding[] = [];
  let packId = "unknown";

  // 1. Zod Schema Verification
  const parsed = ParserPackSchema.safeParse(rawPack);
  if (!parsed.success) {
    const zodErrors = parsed.error.issues.map((issue) => ({
      severity: "error" as const,
      code: "SCHEMA_ERROR",
      message: `${issue.path.join(".")}: ${issue.message}`,
      where: ["schema"],
    }));
    return {
      pack_id: "unknown",
      ok: false,
      findings: zodErrors,
    };
  }

  const pack = parsed.data;
  packId = pack.meta.id;

  const roomIds = new Set(pack.rooms.map((r) => r.id));
  const objectIds = new Set(pack.objects.map((o) => o.id));
  const npcIds = new Set(pack.npcs.map((n) => n.id));
  const endingIds = new Set(pack.endings.map((e) => e.id));

  // 2. Metadata Start Room Check
  if (!roomIds.has(pack.meta.start_room)) {
    findings.push({
      severity: "error",
      code: "INVALID_START_ROOM",
      message: `Metadata start_room '${pack.meta.start_room}' does not exist in rooms list.`,
      where: ["meta:start_room"],
    });
    return { pack_id: packId, ok: false, findings };
  }

  // 3. BFS Room Reachability & Exit Check
  const queue: string[] = [pack.meta.start_room];
  const visitedRooms = new Set<string>([pack.meta.start_room]);

  while (queue.length > 0) {
    const roomId = queue.shift()!;
    const room = pack.rooms.find((r) => r.id === roomId)!;

    for (const exit of room.exits) {
      if (!roomIds.has(exit.to)) {
        findings.push({
          severity: "error",
          code: "REFERENCE_ERROR",
          message: `Exit direction '${exit.direction}' leads to non-existent room '${exit.to}'.`,
          where: [`room:${roomId}`, "exits"],
        });
      } else if (!visitedRooms.has(exit.to)) {
        visitedRooms.add(exit.to);
        queue.push(exit.to);
      }
    }
  }

  // Report unreachable rooms
  for (const room of pack.rooms) {
    if (!visitedRooms.has(room.id)) {
      findings.push({
        severity: "warning",
        code: "UNREACHABLE_ROOM",
        message: `Room '${room.id}' is unreachable from start_room '${pack.meta.start_room}'.`,
        where: [`room:${room.id}`],
      });
    }
  }

  // 4. Object Verification
  pack.objects.forEach((obj) => {
    // Key reference check
    if (obj.locked && obj.key_id && !objectIds.has(obj.key_id)) {
      findings.push({
        severity: "error",
        code: "REFERENCE_ERROR",
        message: `Locked object '${obj.id}' references non-existent key_id '${obj.key_id}'.`,
        where: [`object:${obj.id}`],
      });
    }

    // Container contents check
    if (obj.container && obj.contents) {
      obj.contents.forEach((childId) => {
        if (!objectIds.has(childId)) {
          findings.push({
            severity: "error",
            code: "REFERENCE_ERROR",
            message: `Container '${obj.id}' contains non-existent object '${childId}'.`,
            where: [`object:${obj.id}`],
          });
        }
      });
    }

    // Quest critical soft-lock check (§10.2)
    if (obj.quest_critical && !obj.takeable) {
      findings.push({
        severity: "warning",
        code: "QUEST_CRITICAL_NONTAKEABLE",
        message: `Object '${obj.id}' is marked quest_critical but is not takeable. Verify if this is intended.`,
        where: [`object:${obj.id}`],
      });
    }
  });

  // 5. NPC & Dialogue Verification
  pack.npcs.forEach((npc) => {
    const dialogue = npc.dialogue;
    const nodeIds = new Set(dialogue.nodes.map((n) => n.id));

    if (!nodeIds.has(dialogue.root)) {
      findings.push({
        severity: "error",
        code: "INVALID_DIALOGUE_ROOT",
        message: `NPC '${npc.id}' dialogue root node '${dialogue.root}' does not exist.`,
        where: [`npc:${npc.id}`, "dialogue"],
      });
    }

    dialogue.nodes.forEach((node) => {
      node.topics.forEach((topic) => {
        if (!topic.end && topic.goto && !nodeIds.has(topic.goto)) {
          findings.push({
            severity: "error",
            code: "REFERENCE_ERROR",
            message: `Dialogue node '${node.id}' topic '${topic.id}' goto destination '${topic.goto}' does not exist.`,
            where: [`npc:${npc.id}`, `node:${node.id}`, `topic:${topic.id}`],
          });
        }
      });
    });
  });

  // 6. Win Conditions Verification
  pack.win_conditions.forEach((win) => {
    if (!endingIds.has(win.ending)) {
      findings.push({
        severity: "error",
        code: "REFERENCE_ERROR",
        message: `Win condition '${win.id}' references non-existent ending '${win.ending}'.`,
        where: [`win_condition:${win.id}`],
      });
    }
  });

  const ok = !findings.some((f) => f.severity === "error");

  return {
    pack_id: packId,
    ok,
    findings,
  };
}
