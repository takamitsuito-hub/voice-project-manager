"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

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
  due_date: string | null;
  cast_members: string | null;
  sound_director: string | null;
  engineer: string | null;
  notes: string | null;
  order_confirmed: boolean;
  script_created: boolean;
  schedule_confirmed: boolean;
  recording_completed: boolean;
  recording_completed_at: string | null;
  delivery_completed: boolean;
  delivery_completed_at: string | null;
  recording_sessions: RecordingSession[];
};

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select(`
        *,
        recording_sessions (
          id,
          session_title,
          recording_date,
          start_time,
          end_time,
          memo
        )
      `)
      .eq("recording_completed", false);

    if (error) {
      console.error(error);
    } else {
      setProjects((data as Project[]) || []);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = confirm("この案件を削除しますか？");
    if (!ok) return;

    const { error } = await supabase.from("projects").delete().eq("id", id);

    if (error) {
      alert("削除エラー: " + error.message);
    } else {
      fetchProjects();
    }
  };

  const handleRecordingComplete = async (id: string) => {
    const ok = confirm("この案件を収録完了にしますか？\n進行中一覧から非表示になります。");
    if (!ok) return;

    const { error } = await supabase
      .from("projects")
      .update({
        recording_completed: true,
        recording_completed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      alert("収録完了エラー: " + error.message);
    } else {
      fetchProjects();
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  const filteredProjects = projects.filter((p) => {
    const matchSearch = p.project_name
      .toLowerCase()
      .includes(search.toLowerCase());

    const isIncomplete = !(
      p.order_confirmed &&
      p.script_created &&
      p.schedule_confirmed
    );

    return matchSearch && (showIncompleteOnly ? isIncomplete : true);
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    const aFirst = a.recording_sessions?.[0]?.recording_date;
    const bFirst = b.recording_sessions?.[0]?.recording_date;

    if (!aFirst) return 1;
    if (!bFirst) return -1;

    return aFirst.localeCompare(bFirst);
  });

  const todayProjects = sortedProjects.filter((p) =>
    p.recording_sessions?.some((s) => s.recording_date === today)
  );

  return (
    <div className="page">
      <h1 className="page-title">案件一覧</h1>

      {todayProjects.length > 0 && (
        <div className="form-section" style={{ background: "#fff0f5" }}>
          <h3>📅 今日の収録</h3>

          {todayProjects.map((p) => (
            <div key={p.id} style={{ marginBottom: 12 }}>
              <strong>{p.project_name}</strong>

              {p.recording_sessions
                .filter((s) => s.recording_date === today)
                .map((s) => (
                  <div key={s.id}>
                    ⏰ {s.start_time.slice(0, 5)} ～ {s.end_time.slice(0, 5)}
                    {s.session_title ? ` / ${s.session_title}` : ""}
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}

      <div className="toolbar">
        <a className="button" href="/projects/new">
          ＋ 新規追加
        </a>

        <a className="button button-secondary" href="/calendar">
          カレンダー
        </a>

        <a className="button button-secondary" href="/recording-completed">
          収録完了一覧
        </a>

        <a className="button button-secondary" href="/delivery-completed">
          納品完了一覧
        </a>
      </div>

      <input
        className="input"
        placeholder="案件名で検索"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <label style={{ marginTop: 10, display: "block" }}>
        <input
          type="checkbox"
          checked={showIncompleteOnly}
          onChange={(e) => setShowIncompleteOnly(e.target.checked)}
        />
        {" "}未完了のみ表示
      </label>

      <ul style={{ listStyle: "none", padding: 0, marginTop: 20 }}>
        {sortedProjects.map((p) => {
          const isComplete =
            p.order_confirmed &&
            p.script_created &&
            p.schedule_confirmed;

          const isToday = p.recording_sessions?.some(
            (s) => s.recording_date === today
          );

          const sortedSessions = [...(p.recording_sessions || [])].sort(
            (a, b) =>
              `${a.recording_date} ${a.start_time}`.localeCompare(
                `${b.recording_date} ${b.start_time}`
              )
          );

          return (
            <li
              key={p.id}
              className={`card ${
                isToday
                  ? "card-today"
                  : isComplete
                  ? "card-complete"
                  : "card-incomplete"
              }`}
            >
              <strong style={{ fontSize: 16 }}>{p.project_name}</strong>

              <div style={{ marginTop: 8 }}>
                <strong>収録:</strong>
                {sortedSessions.length === 0 ? (
                  <div>未設定</div>
                ) : (
                  sortedSessions.map((s) => (
                    <div key={s.id}>
                      {s.recording_date} {s.start_time.slice(0, 5)} ～{" "}
                      {s.end_time.slice(0, 5)}
                      {s.session_title ? ` / ${s.session_title}` : ""}
                    </div>
                  ))
                )}
              </div>

              <div style={{ marginTop: 6 }}>
                演者: {p.cast_members || "-"}
              </div>

              <div style={{ marginTop: 4 }}>
                音響監督: {p.sound_director || "-"}
              </div>

              <div style={{ marginTop: 4 }}>
                エンジニア: {p.engineer || "-"}
              </div>

              <div style={{ marginTop: 8 }}>
                <span
                  className={`status ${
                    p.order_confirmed ? "status-ok" : "status-ng"
                  }`}
                >
                  受注
                </span>

                <span
                  className={`status ${
                    p.script_created ? "status-ok" : "status-ng"
                  }`}
                >
                  台本
                </span>

                <span
                  className={`status ${
                    p.schedule_confirmed ? "status-ok" : "status-ng"
                  }`}
                >
                  スケ
                </span>
              </div>

              {p.notes && (
                <div className="small-muted" style={{ marginTop: 6 }}>
                  {p.notes.length > 60
                    ? p.notes.slice(0, 60) + "..."
                    : p.notes}
                </div>
              )}

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <a href={`/projects/${p.id}/edit`} className="button-secondary">
                  編集
                </a>

                <button
                  type="button"
                  onClick={() => handleRecordingComplete(p.id)}
                >
                  収録完了
                </button>

                <button
                  type="button"
                  className="button-danger"
                  onClick={() => handleDelete(p.id)}
                >
                  削除
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}