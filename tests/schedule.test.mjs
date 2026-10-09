import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../lib/schedule.ts", import.meta.url), "utf8");
const exports = {};
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports, Date, Intl });
const { japanDate, nextSession, sortSessions } = exports;
const session = (date, start, end) => ({ recording_date: date, start_time: start, end_time: end });

test("Japan date changes at midnight JST, not UTC", () => {
  assert.equal(japanDate(new Date("2026-10-08T14:59:59Z")), "2026-10-08");
  assert.equal(japanDate(new Date("2026-10-08T15:00:00Z")), "2026-10-09");
});
test("Ongoing session remains visible; ended session advances to the next", () => {
  const morning = session("2026-10-09", "10:00:00", "12:00:00");
  const afternoon = session("2026-10-09", "14:00:00", "16:00:00");
  assert.equal(nextSession([afternoon, morning], new Date("2026-10-09T02:00:00Z")), morning);
  assert.equal(nextSession([afternoon, morning], new Date("2026-10-09T03:00:00Z")), afternoon);
});
test("Empty and past-only projects have no upcoming session", () => {
  const now = new Date("2026-10-09T09:00:00Z");
  assert.equal(nextSession([], now), undefined);
  assert.equal(nextSession([session("2026-10-08", "10:00:00", "12:00:00")], now), undefined);
});
test("Sorting sessions does not mutate fetched data", () => {
  const first = session("2026-10-09", "10:00:00", "12:00:00");
  const second = session("2026-10-10", "10:00:00", "12:00:00");
  const input = [second, first];
  assert.equal(sortSessions(input)[0], first);
  assert.equal(input[0], second);
});
