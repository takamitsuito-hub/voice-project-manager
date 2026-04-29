"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

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
  delivery_date: string | null;
  cast_members: string | null;
  sound_director: string | null;
  engineer: string | null;
  notes: string | null;
  recording_completed_at: string | null;
  delivery_completed_at: string | null;
  recording_sessions: RecordingSession[];
};

export default function DeliveryCompletedPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");

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
      .eq("delivery_completed", true);

    if (error) {
      alert("取得エラー: " + error.message);
      return;
    }

    setProjects((data as Project[]) || []);
  };

  const handleCancelDeliveryComplete = async (id: string) => {
    const ok = confirm(
      "納品完了を取り消して、収録完了一覧に戻しますか？\n納品日も未設定に戻します。"
    );

    if (!ok) return;

    const { error } = await supabase
      .from("projects")
      .update({
        delivery_completed: false,
        delivery_completed_at: null,
        delivery_date: null,
      })
      .eq("id", id);

    if (error) {
      alert("納品完了取り消しエラー: " + error.message);
    } else {
      fetchProjects();
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.project_name.toLowerCase().includes(search.toLowerCase())
  );

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    const aTime = a.delivery_completed_at || "";
    const bTime = b.delivery_completed_at || "";
    return bTime.localeCompare(aTime);
  });

  return (
    <div className="page">
      <h1 className="page-title">納品完了一覧</h1>

      <div className="toolbar">
        <a className="button button-secondary" href="/">
          案件一覧へ戻る
        </a>

        <a className="button button-secondary" href="/recording-completed">
          収録完了一覧
        </a>
      </div>

      <input
        className="input"
        placeholder="案件名で検索"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {sortedProjects.length === 0 && (
        <p className="small-muted" style={{ marginTop: 20 }}>
          納品完了済みの案件はありません。
        </p>
      )}

      <ul style={{ listStyle: "none", padding: 0, marginTop: 20 }}>
        {sortedProjects.map((p) => {
          const sortedSessions = [...(p.recording_sessions || [])].sort(
            (a, b) =>
              `${a.recording_date} ${a.start_time}`.localeCompare(
                `${b.recording_date} ${b.start_time}`
              )
          );

          return (
            <li key={p.id} className="card card-complete">
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

              <div style={{ marginTop: 6 }}>演者: {p.cast_members || "-"}</div>
              <div style={{ marginTop: 4 }}>音響監督: {p.sound_director || "-"}</div>
              <div style={{ marginTop: 4 }}>エンジニア: {p.engineer || "-"}</div>

              {p.recording_completed_at && (
                <div className="small-muted" style={{ marginTop: 6 }}>
                  収録完了日時:{" "}
                  {new Date(p.recording_completed_at).toLocaleString("ja-JP")}
                </div>
              )}

              {p.delivery_completed_at && (
                <div className="small-muted" style={{ marginTop: 6 }}>
                  納品完了日時:{" "}
                  {new Date(p.delivery_completed_at).toLocaleString("ja-JP")}
                </div>
              )}

              {p.delivery_date && (
                <div className="small-muted" style={{ marginTop: 6 }}>
                  納品日: {p.delivery_date}
                </div>
              )}

              {p.notes && (
                <div className="small-muted" style={{ marginTop: 6 }}>
                  {p.notes.length > 60 ? p.notes.slice(0, 60) + "..." : p.notes}
                </div>
              )}

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <a href={`/projects/${p.id}/edit`} className="button-secondary">
                  編集
                </a>

                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => handleCancelDeliveryComplete(p.id)}
                >
                  納品完了を取り消す
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}