"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { japanDate, nextSession, shortSessionDate, sortSessions } from "../lib/schedule";

type RecordingSession = {
  id: string;
  session_title: string | null;
  recording_date: string;
  start_time: string;
  end_time: string;
  memo: string | null;
};
type Project = {
  id: string;
  project_name: string;
  cast_members: string | null;
  sound_director: string | null;
  engineer: string | null;
  order_confirmed: boolean;
  script_created: boolean;
  schedule_confirmed: boolean;
  recording_sessions: RecordingSession[];
};

async function readProjects() {
  return await supabase.from("projects").select(`
    *, recording_sessions (id, session_title, recording_date, start_time, end_time, memo)
  `).eq("recording_completed", false);
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [now, setNow] = useState(() => new Date());

  const applyProjects = useCallback(({ data, error }: Awaited<ReturnType<typeof readProjects>>) => {
    if (error) { setErrorMessage("案件を取得できませんでした。再読み込みしてください。"); }
    else { setProjects((data as Project[]) || []); setErrorMessage(""); }
    setLoading(false);
  }, []);

  const fetchProjects = async () => applyProjects(await readProjects());

  useEffect(() => {
    let active = true;
    void readProjects().then(result => { if (active) applyProjects(result); });
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => { active = false; clearInterval(timer); };
  }, [applyProjects]);

  const handleDelete = async (id: string) => {
    if (!confirm("この案件を削除しますか？")) return;
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) alert("削除エラー: " + error.message);
    else await fetchProjects();
  };
  const handleRecordingComplete = async (id: string) => {
    if (!confirm("収録完了にしますか？")) return;
    const { error } = await supabase.from("projects").update({
      recording_completed: true, recording_completed_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) alert("エラー: " + error.message);
    else await fetchProjects();
  };

  const today = japanDate(now);
  const visible = projects.filter(p =>
    p.project_name.toLowerCase().includes(search.trim().toLowerCase()) &&
    (!showIncompleteOnly || !(p.order_confirmed && p.script_created && p.schedule_confirmed))
  ).map(p => ({ project: p, next: nextSession(p.recording_sessions || [], now) }))
    .sort((a, b) => {
      if (!a.next && !b.next) return 0;
      if (!a.next) return 1;
      if (!b.next) return -1;
      return `${a.next.recording_date} ${a.next.start_time}`.localeCompare(`${b.next.recording_date} ${b.next.start_time}`);
    });

  return (
    <main className="page">
      <div className="app-brand">収録案件管理</div>
      <nav className="project-nav" aria-label="メインナビゲーション">
        <Link href="/" aria-current="page">案件一覧</Link>
        <Link href="/calendar">カレンダー</Link>
        <Link href="/recording-completed">収録完了</Link>
        <Link href="/delivery-completed">納品完了</Link>
      </nav>
      <header className="project-heading">
        <div><span className="eyebrow">PROJECTS</span><h1 className="page-title">案件一覧</h1></div>
        <div className="heading-actions">
          <Link className="button" href="/projects/new">＋ 新規追加</Link>
          <button type="button" className="button-secondary" onClick={async () => {
            await supabase.auth.signOut(); window.location.href = "/login";
          }}>ログアウト</button>
        </div>
      </header>
      <div className="project-filters">
        <input className="input" type="search" aria-label="案件名で検索" placeholder="案件名で検索" value={search} onChange={e => setSearch(e.target.value)} />
        <label><input type="checkbox" checked={showIncompleteOnly} onChange={e => setShowIncompleteOnly(e.target.checked)} />準備未完了のみ</label>
        <span className="small-muted" aria-live="polite">{loading ? "読み込み中…" : `${visible.length} 件`}</span>
      </div>
      {errorMessage && <p className="error-message" role="alert">{errorMessage} <button type="button" className="button-secondary" onClick={fetchProjects}>再読み込み</button></p>}
      {!loading && !errorMessage && visible.length === 0 && <p className="empty-state">条件に一致する案件はありません。</p>}
      <ul className="project-list">
        {visible.map(({ project: p, next }) => {
          const sessions = sortSessions(p.recording_sessions || []);
          const complete = p.order_confirmed && p.script_created && p.schedule_confirmed;
          const isToday = sessions.some(s => s.recording_date === today);
          return <li key={p.id} className={`card project-card${isToday ? " card-today" : ""}`}>
            <div className="project-card-header">
              <h2><Link href={`/projects/${p.id}`}>{p.project_name}</Link></h2>
              <span className={`project-label${!isToday && !complete ? " pending" : ""}`}>
                {isToday ? "本日収録" : !sessions.length ? "日程未設定" : complete ? "準備完了" : "準備中"}
              </span>
            </div>
            <div className="next-session">
              <span className="small-muted">次の収録</span>
              {next ? <><strong>{shortSessionDate(next.recording_date)}</strong><span>{next.start_time.slice(0, 5)}–{next.end_time.slice(0, 5)}</span></> :
                <strong>{sessions.length ? "今後の収録枠なし" : "日程未設定"}</strong>}
              {sessions.length > 1 && <span className="small-muted">全 {sessions.length} 枠</span>}
            </div>
            <div className="project-staff"><span>音響監督：{p.sound_director || "未設定"}</span><span>エンジニア：{p.engineer || "未設定"}</span></div>
            <div className="project-card-footer">
              <div className="project-statuses">
                <span className={`status ${p.order_confirmed ? "status-ok" : "status-ng"}`}>{p.order_confirmed ? "✓ 受注済" : "○ 受注待ち"}</span>
                <span className={`status ${p.script_created ? "status-ok" : "status-ng"}`}>{p.script_created ? "✓ 台本済" : "○ 台本待ち"}</span>
                <span className={`status ${p.schedule_confirmed ? "status-ok" : "status-ng"}`}>{p.schedule_confirmed ? "✓ 日程確認済" : "○ 日程確認待ち"}</span>
              </div>
              <div className="card-actions"><Link className="button button-secondary" href={`/projects/${p.id}`}>詳細 →</Link><Link className="button button-secondary" href={`/projects/${p.id}/edit`}>編集</Link></div>
            </div>
            <details className="project-more">
              <summary>全収録枠・演者・その他の操作</summary>
              {sessions.length ? <ul>{sessions.map(s => <li key={s.id}>{s.recording_date} {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)} {s.session_title && ` / ${s.session_title}`}</li>)}</ul> : <p>収録枠は未設定です。</p>}
              <p>演者：{p.cast_members || "未設定"}</p>
              <div className="card-actions"><button type="button" onClick={() => handleRecordingComplete(p.id)}>収録完了</button><button type="button" className="button-danger" onClick={() => handleDelete(p.id)}>削除</button></div>
            </details>
          </li>;
        })}
      </ul>
    </main>
  );
}
