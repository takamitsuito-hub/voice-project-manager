"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { useParams, useRouter, useSearchParams } from "next/navigation";

type RecordingSessionForm = {
  sessionTitle: string;
  recordingDate: string;
  startTime: string;
  endTime: string;
  memo: string;
};

export default function EditProject() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const id = params.id as string;
  const from = searchParams.get("from");

  const [projectName, setProjectName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [meetingId, setMeetingId] = useState("");
  const [castMembers, setCastMembers] = useState("");
  const [soundDirector, setSoundDirector] = useState("");
  const [engineer, setEngineer] = useState("");
  const [notes, setNotes] = useState("");

  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [scriptCreated, setScriptCreated] = useState(false);
  const [scheduleConfirmed, setScheduleConfirmed] = useState(false);

  const [sessions, setSessions] = useState<RecordingSessionForm[]>([]);

  useEffect(() => {
    fetchProject();
    fetchSessions();
  }, []);

  const fetchProject = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      alert("取得エラー: " + error.message);
      return;
    }

    setProjectName(data.project_name || "");
    setDueDate(data.due_date || "");
    setDeliveryDate(data.delivery_date || "");
    setMeetingId(data.meeting_id || "");
    setCastMembers(data.cast_members || "");
    setSoundDirector(data.sound_director || "");
    setEngineer(data.engineer || "");
    setNotes(data.notes || "");

    setOrderConfirmed(data.order_confirmed || false);
    setScriptCreated(data.script_created || false);
    setScheduleConfirmed(data.schedule_confirmed || false);
  };

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from("recording_sessions")
      .select("*")
      .eq("project_id", id)
      .order("recording_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      alert("収録スケジュール取得エラー: " + error.message);
      return;
    }

    if (!data || data.length === 0) {
      setSessions([
        {
          sessionTitle: "1回目収録",
          recordingDate: "",
          startTime: "",
          endTime: "",
          memo: "",
        },
      ]);
      return;
    }

    setSessions(
      data.map((s) => ({
        sessionTitle: s.session_title || "",
        recordingDate: s.recording_date || "",
        startTime: s.start_time ? s.start_time.slice(0, 5) : "",
        endTime: s.end_time ? s.end_time.slice(0, 5) : "",
        memo: s.memo || "",
      }))
    );
  };

  const addSession = () => {
    setSessions([
      ...sessions,
      {
        sessionTitle: `${sessions.length + 1}回目収録`,
        recordingDate: "",
        startTime: "",
        endTime: "",
        memo: "",
      },
    ]);
  };

  const removeSession = (index: number) => {
    if (sessions.length === 1) {
      alert("収録枠は最低1つ必要です");
      return;
    }

    setSessions(sessions.filter((_, i) => i !== index));
  };

  const updateSession = (
    index: number,
    field: keyof RecordingSessionForm,
    value: string
  ) => {
    const next = [...sessions];
    next[index] = {
      ...next[index],
      [field]: value,
    };
    setSessions(next);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error: projectError } = await supabase
      .from("projects")
      .update({
        project_name: projectName,
        due_date: dueDate || null,
        delivery_date: deliveryDate || null,
        meeting_id: meetingId || null,
        cast_members: castMembers || null,
        sound_director: soundDirector || null,
        engineer: engineer || null,
        notes: notes || null,
        order_confirmed: orderConfirmed,
        script_created: scriptCreated,
        schedule_confirmed: scheduleConfirmed,
      })
      .eq("id", id);

    if (projectError) {
      alert("案件更新エラー: " + projectError.message);
      return;
    }

    const { error: deleteError } = await supabase
      .from("recording_sessions")
      .delete()
      .eq("project_id", id);

    if (deleteError) {
      alert("既存スケジュール削除エラー: " + deleteError.message);
      return;
    }

    const validSessions = sessions.filter(
      (s) => s.recordingDate && s.startTime && s.endTime
    );

    if (validSessions.length > 0) {
      const sessionRows = validSessions.map((s) => ({
        project_id: id,
        session_title: s.sessionTitle || null,
        recording_date: s.recordingDate,
        start_time: s.startTime,
        end_time: s.endTime,
        memo: s.memo || null,
      }));

      const { error: insertError } = await supabase
        .from("recording_sessions")
        .insert(sessionRows);

      if (insertError) {
        alert("収録スケジュール更新エラー: " + insertError.message);
        return;
      }
    }

    if (from === "calendar") {
      window.location.href = "/calendar";
    } else {
      router.push(`/projects/${id}`);
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">案件編集</h1>

      <form onSubmit={handleUpdate}>
        <div className="form-section">
          <h3>基本情報</h3>

          <label>案件名</label>
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            required
          />

          <div style={{ marginTop: 12 }}>
            <label>納期</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <label>納品日</label>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <label>MTG ID</label>
            <input
              value={meetingId}
              onChange={(e) => setMeetingId(e.target.value)}
            />
          </div>
        </div>

        <div className="form-section">
          <h3>収録スケジュール</h3>

          {sessions.map((session, index) => (
            <div
              key={index}
              className="card"
              style={{ marginTop: 12, background: "#fffafd" }}
            >
              <div style={{ marginBottom: 12 }}>
                <label>収録枠名</label>
                <input
                  value={session.sessionTitle}
                  onChange={(e) =>
                    updateSession(index, "sessionTitle", e.target.value)
                  }
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label>収録日</label>
                <input
                  type="date"
                  value={session.recordingDate}
                  onChange={(e) =>
                    updateSession(index, "recordingDate", e.target.value)
                  }
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label>開始時間</label>
                <input
                  type="time"
                  value={session.startTime}
                  onChange={(e) =>
                    updateSession(index, "startTime", e.target.value)
                  }
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label>終了時間</label>
                <input
                  type="time"
                  value={session.endTime}
                  onChange={(e) =>
                    updateSession(index, "endTime", e.target.value)
                  }
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label>メモ</label>
                <textarea
                  rows={2}
                  value={session.memo}
                  onChange={(e) => updateSession(index, "memo", e.target.value)}
                />
              </div>

              <button
                type="button"
                className="button-danger"
                onClick={() => removeSession(index)}
              >
                この収録枠を削除
              </button>
            </div>
          ))}

          <button
            type="button"
            className="button-secondary"
            onClick={addSession}
            style={{ marginTop: 12 }}
          >
            ＋ 収録枠を追加
          </button>
        </div>

        <div className="form-section">
          <h3>担当者・演者</h3>

          <label>演者</label>
          <textarea
            value={castMembers}
            onChange={(e) => setCastMembers(e.target.value)}
            rows={3}
          />

          <div style={{ marginTop: 12 }}>
            <label>音響監督</label>
            <input
              value={soundDirector}
              onChange={(e) => setSoundDirector(e.target.value)}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <label>エンジニア</label>
            <input
              value={engineer}
              onChange={(e) => setEngineer(e.target.value)}
            />
          </div>
        </div>

        <div className="form-section">
          <h3>備考・共有事項</h3>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={7}
            style={{ maxWidth: 760 }}
          />
        </div>

        <div className="form-section">
          <h3>進行状況</h3>

          <label>
            <input
              type="checkbox"
              checked={orderConfirmed}
              onChange={(e) => setOrderConfirmed(e.target.checked)}
            />
            {" "}受注確定
          </label>

          <br />

          <label>
            <input
              type="checkbox"
              checked={scriptCreated}
              onChange={(e) => setScriptCreated(e.target.checked)}
            />
            {" "}台本作成
          </label>

          <br />

          <label>
            <input
              type="checkbox"
              checked={scheduleConfirmed}
              onChange={(e) => setScheduleConfirmed(e.target.checked)}
            />
            {" "}スケジュール確認
          </label>
        </div>

        <div className="toolbar">
          <button type="submit">更新</button>

          <button
            type="button"
            className="button-secondary"
            onClick={() => router.push(`/projects/${id}`)}
          >
            戻る
          </button>
        </div>
      </form>
    </div>
  );
}