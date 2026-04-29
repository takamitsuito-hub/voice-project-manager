"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useParams, useRouter } from "next/navigation";

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
          memo
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
            <div key={s.id} className="card">
              <p>{s.session_title || "収録"}</p>
              <p>
                {s.recording_date} {s.start_time.slice(0, 5)}～
                {s.end_time.slice(0, 5)}
              </p>
              <p>{s.memo || ""}</p>
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
        <p>{project.notes || "-"}</p>
      </div>
    </div>
  );
}