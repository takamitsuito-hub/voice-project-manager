"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
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
  recording_sessions: RecordingSession[];
};

export default function EditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    fetchProject();
  }, []);

  const fetchProject = async () => {
    const { data } = await supabase
      .from("projects")
      .select(`
        *,
        recording_sessions (*)
      `)
      .eq("id", id)
      .single();

    setProject(data as Project);
  };

  const handleSave = async () => {
    if (!project) return;

    await supabase
      .from("projects")
      .update({
        project_name: project.project_name,
        due_date: project.due_date,
        delivery_date: project.delivery_date,
        meeting_id: project.meeting_id,
        cast_members: project.cast_members,
        sound_director: project.sound_director,
        engineer: project.engineer,
        notes: project.notes,
      })
      .eq("id", id);

    alert("保存しました");
    router.push(`/projects/${id}`);
  };

  if (!project) return <div>読み込み中...</div>;

  return (
    <div className="page">
      <h1>案件編集</h1>

      <input
        value={project.project_name}
        onChange={(e) =>
          setProject({ ...project, project_name: e.target.value })
        }
      />

      <button onClick={handleSave}>保存</button>
    </div>
  );
}