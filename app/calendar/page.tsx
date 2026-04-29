"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";

import { format, parse, startOfWeek, getDay } from "date-fns";
import { ja } from "date-fns/locale/ja";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

const DragAndDropCalendar = withDragAndDrop(Calendar as any) as any;

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { ja },
});

/* ---------------- 色分けロジック ---------------- */
const getColorBySession = (title: string | null) => {
  if (!title) return "#90caf9";
  if (title.includes("1回")) return "#42a5f5"; // 青
  if (title.includes("2回")) return "#ab47bc"; // 紫
  if (title.includes("3回")) return "#ffa726"; // オレンジ
  return "#90caf9";
};

/* ---------------- 型 ---------------- */
type Project = {
  id: string;
  project_name: string;
  cast_members: string | null;
  sound_director: string | null;
  engineer: string | null;
  notes: string | null;
  order_confirmed: boolean;
  script_created: boolean;
  schedule_confirmed: boolean;
};

type RecordingSession = {
  id: string;
  project_id: string;
  session_title: string | null;
  recording_date: string;
  start_time: string;
  end_time: string;
  memo: string | null;
  projects: Project;
};

type CalendarEvent = {
  title: string;
  start: Date;
  end: Date;
  session: RecordingSession;
  project: Project;
  isComplete: boolean;
};

/* ---------------- ユーティリティ ---------------- */
const formatDateLocal = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatTimeLocal = (date: Date) => {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}:00`;
};

/* ---------------- 本体 ---------------- */
export default function CalendarPage() {
  const router = useRouter();

  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from("recording_sessions")
      .select(`
        *,
        projects (
          id,
          project_name,
          cast_members,
          sound_director,
          engineer,
          notes,
          order_confirmed,
          script_created,
          schedule_confirmed
        )
      `)
      .order("recording_date", { ascending: true });

    if (error) {
      alert("取得エラー: " + error.message);
      return;
    }

    const mapped = (data as RecordingSession[]).map((s) => {
      const start = new Date(`${s.recording_date}T${s.start_time}`);
      const end = new Date(`${s.recording_date}T${s.end_time}`);

      const project = s.projects;

      return {
        title: `${project.project_name}${
          s.session_title ? `｜${s.session_title}` : ""
        }`,
        start,
        end,
        session: s,
        project,
        isComplete:
          project.order_confirmed &&
          project.script_created &&
          project.schedule_confirmed,
      };
    });

    setEvents(mapped);
  };

  /* ---------------- ドラッグ更新 ---------------- */
  const updateSessionSchedule = async (
    event: CalendarEvent,
    start: Date,
    end: Date
  ) => {
    const { error } = await supabase
      .from("recording_sessions")
      .update({
        recording_date: formatDateLocal(start),
        start_time: formatTimeLocal(start),
        end_time: formatTimeLocal(end),
      })
      .eq("id", event.session.id);

    if (error) {
      alert("更新エラー: " + error.message);
      return;
    }

    await fetchSessions();
  };

  const handleEventDrop = async ({ event, start, end }: any) => {
    await updateSessionSchedule(event, start, end);
  };

  const handleEventResize = async ({ event, start, end }: any) => {
    await updateSessionSchedule(event, start, end);
  };

  /* ---------------- 表示 ---------------- */
  return (
    <div className="page">
      <h1 className="page-title">収録カレンダー</h1>

      <div className="toolbar">
        <button onClick={() => router.push("/")}>
          案件一覧へ戻る
        </button>
      </div>

      <div style={{ height: "80vh", marginTop: 20 }}>
        <DragAndDropCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          views={["month", "week", "day", "agenda"]}
          defaultView="week"
          resizable
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}

          /* ⭐ クリックで編集 */
          onSelectEvent={(event: CalendarEvent) =>
            router.push(`/projects/${event.project.id}/edit?from=calendar`)
          }

          /* ⭐ 日本語化 */
          messages={{
            today: "今日",
            previous: "前",
            next: "次",
            month: "月",
            week: "週",
            day: "日",
            agenda: "一覧",
          }}

          /* ⭐ フォーマット */
          formats={{
            timeGutterFormat: "HH:mm",
            dayFormat: "yyyy/MM/dd",
            eventTimeRangeFormat: ({ start, end }: any) =>
              `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`,
            dayRangeHeaderFormat: ({ start, end }: any) =>
              `${format(start, "yyyy/MM/dd")} ～ ${format(end, "yyyy/MM/dd")}`,
          }}

          /* ⭐ 色分け */
          eventPropGetter={(event: CalendarEvent) => {
  const today = new Date().toISOString().slice(0, 10);
  const eventDate = event.session.recording_date;

  let backgroundColor = getColorBySession(event.session.session_title);

  if (eventDate === today) {
    backgroundColor = "#ef5350"; // 今日だけ最優先で赤
  }

  return {
    style: {
      backgroundColor,
      borderRadius: "10px",
      border: event.isComplete ? "2px solid #2e7d32" : "none",
      color: "white",
      padding: "4px",
      fontWeight: 700,
    },
  };
}}
        />
      </div>
    </div>
  );
}