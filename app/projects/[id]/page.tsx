"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { formatDateTimeJP } from "../../../lib/dateFormat";

type RecordingSession = {
  id: string;
  session_title: string | null;
  recording_date: string;
  start_time: string;
  end_time: string;
  memo: string | null;
  script_url: string | null;
};

type Project = {
  id: string;
  project_name: string;
  due_date: string | null;
  delivery_date: string | null;
  meeting_id: string | null;
  cast_members: string | null;
  sound_director: string | null;
  engineer: string | null;
  notes: string | null;
  order_confirmed: boolean;
  script_created: boolean;
  schedule_confirmed: boolean;
  recording_completed: boolean;
  delivery_completed: boolean;
  recording_sessions: RecordingSession[];
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    fetchProject();
  }, []);

  const fetchProject = async () => {
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
          memo,
          script_url
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      alert("取得エラー: " + error.message);
      return;
    }

    setProject(data as Project);
  };

  const copySessionText = async (session: RecordingSession) => {
    if (!project) return;

    const text = `${project.project_name}

収録枠：
${session.session_title || "収録"}

収録日時：
${formatDateTimeJP(session.recording_date, session.start_time, session.end_time)}

台本URL：
${session.script_url || "-"}

メモ：
${session.memo || "-"}`;

    try {
      await navigator.clipboard.writeText(text);
      alert("LINE用テキストをコピーしました");
    } catch {
      alert("コピーに失敗しました。ブラウザの権限設定を確認してください。");
    }
  };

  if (!project) {
    return <div className="page">読み込み中...</div>;
  }

  const sessions = [...(project.recording_sessions || [])].sort((a, b) =>
    `${a.recording_date} ${a.start_time}`.localeCompare(
      `${b.recording_date} ${b.start_time}`
    )
  );

  return (
    <div className="page">
      <h1 className="page-title">案件詳細</h1>

      <div className="toolbar">
        <button onClick={() => router.push("/")}>一覧へ戻る</button>
        <button onClick={() => router.push(`/projects/${id}/edit`)}>
          編集
        </button>
      </div>

      <div className="form-section">
        <h3>基本情報</h3>
        <p>案件名: {project.project_name}</p>
        <p>納期: {project.due_date || "-"}</p>
        <p>納品日: {project.delivery_date || "-"}</p>
        <p>MTG ID: {project.meeting_id || "-"}</p>
      </div>

      <div className="form-section">
        <h3>収録スケジュール</h3>

        {sessions.length === 0 ? (
          <p>未設定</p>
        ) : (
          sessions.map((s) => (
            <div key={s.id} className="card" style={{ background: "#fffafd" }}>
              <p>
                <strong>{s.session_title || "収録"}</strong>
              </p>

              <p>
                {formatDateTimeJP(s.recording_date, s.start_time, s.end_time)}
              </p>

              <p>
                <strong>台本URL:</strong>{" "}
                {s.script_url ? s.script_url : "-"}
              </p>

              {s.memo && (
                <p>
                  <strong>メモ:</strong> {s.memo}
                </p>
              )}

              <button type="button" onClick={() => copySessionText(s)}>
                LINE用にコピー
              </button>
            </div>
          ))
        )}
      </div>

      <div className="form-section">
        <h3>担当</h3>
        <p>演者: {project.cast_members || "-"}</p>
        <p>音響監督: {project.sound_director || "-"}</p>
        <p>エンジニア: {project.engineer || "-"}</p>
      </div>

      <div className="form-section">
        <h3>備考</h3>
        <div style={{ whiteSpace: "pre-wrap" }}>{project.notes || "-"}</div>
      </div>

      <div className="form-section">
        <h3>進行状況</h3>
        <p>
          <span
            className={`status ${
              project.order_confirmed ? "status-ok" : "status-ng"
            }`}
          >
            受注
          </span>

          <span
            className={`status ${
              project.script_created ? "status-ok" : "status-ng"
            }`}
          >
            台本
          </span>

          <span
            className={`status ${
              project.schedule_confirmed ? "status-ok" : "status-ng"
            }`}
          >
            スケ
          </span>
        </p>

        <p>収録完了: {project.recording_completed ? "完了" : "未完了"}</p>
        <p>納品完了: {project.delivery_completed ? "完了" : "未完了"}</p>
      </div>
    </div>
  );
}