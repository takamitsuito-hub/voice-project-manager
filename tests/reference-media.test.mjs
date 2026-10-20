import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const Fields = () => null;
function pageHarness(path, rows = []) {
  const states = [], effects = [], saved = [], alerts = [];
  let cursor = 0;
  const supabase = { from(table) {
    const query = {
      select() { return query; }, eq() { return query; }, order() { return query; },
      update() { return query; }, delete() { return query; },
      insert(data) { if (table === "recording_sessions") saved.push(...data); return query; },
      single() { return Promise.resolve({ data: { id: "project", project_name: "Test" }, error: null }); },
      then(resolve) { return Promise.resolve({ data: rows, error: null }).then(resolve); },
    };
    return query;
  }};
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports, alert: message => alerts.push(message), window: { location: {} },
    require: name => name === "react" ? {
      useState(initial) { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = value; }]; },
      useEffect(fn) { if (!effects.length) effects.push(fn); },
    } : name === "next/navigation" ? {
      useRouter: () => ({ push() {} }), useParams: () => ({ id: "project" }),
      useSearchParams: () => ({ get: () => null }),
    } : name.endsWith("/supabase") ? { supabase }
      : name.endsWith("/ReferenceMediaFields") ? { default: Fields } : require(name),
  });
  return {
    render() { cursor = 0; return exports.default(); }, effects, saved, alerts,
  };
}
function find(node, predicate) {
  if (!node || typeof node !== "object") return undefined;
  if (predicate(node)) return node;
  for (const child of [node.props?.children].flat(Infinity)) {
    const found = find(child, predicate);
    if (found) return found;
  }
}

test("New project saves independently selected reference video/audio with its session", async () => {
  for (const [video, audio] of [[false,false],[true,false],[false,true],[true,true]]) {
    const h = pageHarness("../app/projects/new/page.tsx");
    let tree = h.render();
    const fields = find(tree, n => n.type === Fields);
    fields.props.onVideoChange(video);
    tree = h.render();
    find(tree, n => n.type === Fields).props.onAudioChange(audio);
    for (const [type, value, occurrence] of [["date","2026-11-01",2],["time","10:00",0],["time","12:00",1]]) {
      tree = h.render();
      let seen = 0;
      const input = find(tree, n => n.type === "input" && n.props.type === type && seen++ === occurrence);
      input.props.onChange({ target: { value } });
    }
    tree = h.render();
    await find(tree, n => n.type === "form").props.onSubmit({ preventDefault() {} });
    assert.equal(h.saved.length, 1);
    assert.equal(h.saved[0].has_reference_video, video);
    assert.equal(h.saved[0].has_reference_audio, audio);
    assert.equal(h.alerts.length, 0);
  }
});

test("Editing loads saved reference flags and persists unchecking without affecting the other flag", async () => {
  const h = pageHarness("../app/projects/[id]/edit/page.tsx", [{
    session_title: "Session", recording_date: "2026-11-01", start_time: "10:00:00", end_time: "12:00:00",
    has_reference_video: true, has_reference_audio: true, script_url: "https://example.com/script",
  }]);
  h.render(); h.effects[0]();
  await new Promise(resolve => setImmediate(resolve));
  let tree = h.render();
  const fields = find(tree, n => n.type === Fields);
  assert.equal(fields.props.video, true);
  assert.equal(fields.props.audio, true);
  fields.props.onVideoChange(false);
  tree = h.render();
  await find(tree, n => n.type === "form").props.onSubmit({ preventDefault() {} });
  assert.equal(h.saved[0].has_reference_video, false);
  assert.equal(h.saved[0].has_reference_audio, true);
  assert.equal(h.saved[0].script_url, "https://example.com/script");
});

test("Reference selections on an undated session are not silently discarded", async () => {
  const h = pageHarness("../app/projects/new/page.tsx");
  find(h.render(), n => n.type === Fields).props.onVideoChange(true);
  await find(h.render(), n => n.type === "form").props.onSubmit({ preventDefault() {} });
  assert.equal(h.saved.length, 0);
  assert.match(h.alerts[0], /収録日・開始時間・終了時間/);
});
