import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../app/api/line-daily/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const defaults = {
  CRON_SECRET: "test-cron-secret",
  NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-must-not-be-used",
  LINE_CHANNEL_ACCESS_TOKEN: "test-line-token",
  LINE_TO_ID: "test-recipient",
};
function setup({ env = {}, data = [], error = null, lineStatus = 200 } = {}) {
  const calls = { clients: [], queries: [], line: [] };
  const chain = {};
  for (const method of ["from", "select", "eq"]) {
    chain[method] = (...args) => { calls.queries.push([method, ...args]); return chain; };
  }
  chain.order = async (...args) => { calls.queries.push(["order", ...args]); return { data, error }; };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, Request, Response, URL, Date,
    process: { env: { ...defaults, ...env } },
    require: (name) => name === "@supabase/supabase-js"
      ? { createClient: (...args) => { calls.clients.push(args); return chain; } }
      : require(name),
    fetch: async (...args) => { calls.line.push(args); return new Response("{}", { status: lineStatus }); },
  });
  const request = (auth = "Bearer test-cron-secret", query = "") =>
    new Request("https://example.test/api/line-daily" + query, {
      headers: auth === null ? {} : { authorization: auth },
    });
  return { calls, get: exports.GET, request };
}
for (const auth of [null, "Bearer wrong", "test-cron-secret"]) {
  test("reject unauthorized request: " + auth, async () => {
    const { calls, get, request } = setup();
    assert.equal((await get(request(auth))).status, 401);
    assert.equal(calls.clients.length, 0);
    assert.equal(calls.line.length, 0);
  });
}
test("missing cron secret fails closed, including Bearer undefined", async () => {
  const { calls, get, request } = setup({ env: { CRON_SECRET: undefined } });
  assert.equal((await get(request("Bearer undefined"))).status, 401);
  assert.equal(calls.clients.length, 0);
});
for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "LINE_CHANNEL_ACCESS_TOKEN", "LINE_TO_ID"]) {
  test("missing configuration does not send: " + key, async () => {
    const { calls, get, request } = setup({ env: { [key]: undefined } });
    assert.equal((await get(request())).status, 500);
    assert.equal(calls.clients.length, 0);
    assert.equal(calls.line.length, 0);
  });
}
test("dry run uses service role and queries joined schedules without sending", async () => {
  const { calls, get, request } = setup({ data: [{ id: "s1", projects: [] }] });
  const response = await get(request(undefined, "?dryRun=true"));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).count, 1);
  assert.equal(calls.clients[0][1], defaults.SUPABASE_SERVICE_ROLE_KEY);
  assert.deepEqual(JSON.parse(JSON.stringify(calls.clients[0][2])), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  assert.equal(calls.queries[0][1], "recording_sessions");
  assert.match(calls.queries.find(c => c[0] === "select")[1], /projects/);
  assert.equal(calls.line.length, 0);
});
test("database failure never sends an empty schedule notification", async () => {
  const { calls, get, request } = setup({ error: { message: "database unavailable" } });
  assert.equal((await get(request())).status, 500);
  assert.equal(calls.line.length, 0);
});
test("empty schedule preserves existing notification and recipient", async () => {
  const { calls, get, request } = setup();
  const response = await get(request());
  assert.equal(response.status, 200);
  assert.equal(calls.line.length, 1);
  const body = JSON.parse(calls.line[0][1].body);
  assert.equal(body.to, defaults.LINE_TO_ID);
  assert.match(body.messages[0].text, /収録予定はありません/);
});
for (const arrayJoin of [false, true]) {
  test("schedule content preserved for " + (arrayJoin ? "array" : "object") + " join", async () => {
    const project = { project_name: "案件", cast_members: "演者A", sound_director: "監督B", engineer: "担当C" };
    const { calls, get, request } = setup({ data: [{
      id: "s1", session_title: "1回目収録", recording_date: "2026-09-25",
      start_time: "10:00:00", end_time: "12:00:00", memo: null,
      script_url: "https://example.test/script", projects: arrayJoin ? [project] : project,
    }] });
    assert.equal((await get(request())).status, 200);
    assert.equal(calls.line.length, 1);
    const body = JSON.parse(calls.line[0][1].body);
    for (const text of ["10:00〜12:00", "1回目収録", "演者：演者A", "音響監督：監督B", "エンジニア：担当C", "台本：https://example.test/script"]) {
      assert.ok(body.messages[0].text.includes(text));
    }
  });
}
test("LINE failure reports failure and is not retried automatically", async () => {
  const { calls, get, request } = setup({ lineStatus: 429 });
  assert.equal((await get(request())).status, 500);
  assert.equal(calls.line.length, 1);
});

