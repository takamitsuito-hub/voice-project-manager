import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RecordingSession = {
  id: string;
  session_title: string | null;
  recording_date: string;
  start_time: string;
  end_time: string;
  memo: string | null;
  script_url: string | null;
  projects: {
    project_name: string;
    cast_members: string | null;
    sound_director: string | null;
    engineer: string | null;
  };
};

const formatTime = (time: string) => time.slice(0, 5);

const getTodayJST = () => {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
};

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const to = process.env.LINE_TO_ID;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Supabase server configuration is missing" },
      { status: 500 }
    );
  }

  if (!token || !to) {
    return NextResponse.json(
      { error: "LINE_CHANNEL_ACCESS_TOKEN or LINE_TO_ID is missing" },
      { status: 500 }
    );
  }

  // This client is exclusive to this server route; never forward a user session.
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const today = getTodayJST();

  const { data, error } = await supabase
    .from("recording_sessions")
    .select(`
      id,
      session_title,
      recording_date,
      start_time,
      end_time,
      memo,
      script_url,
      projects (
        project_name,
        cast_members,
        sound_director,
        engineer
      )
    `)
    .eq("recording_date", today)
    .order("start_time", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

const sessions = (data || []).map((s) => ({
  ...s,
  projects: Array.isArray(s.projects) ? s.projects[0] : s.projects,
})) as RecordingSession[];

  // An authenticated read-only check for deployments, without sending LINE.
  if (new URL(request.url).searchParams.get("dryRun") === "true") {
    return NextResponse.json({ ok: true, dryRun: true, date: today, count: sessions.length });
  }

  const text =
    sessions.length === 0
      ? `【本日の収録】\n\n本日 ${today} の収録予定はありません。`
      : `【本日の収録】\n${today}\n\n` +
        sessions
          .map((s) => {


return [
  "━━━━━━━━━━",
  `■ ${formatTime(s.start_time)}〜${formatTime(s.end_time)}`,
  "",
  `${s.session_title || "収録枠名未設定"}`,
  "",
  `演者：${s.projects.cast_members || "-"}`,
  `音響監督：${s.projects.sound_director || "-"}`,
  `エンジニア：${s.projects.engineer || "-"}`,
  s.script_url ? `台本：${s.script_url}` : null,
]


              .filter(Boolean)
              .join("\n");
          })
          .join("\n\n");

  const lineResponse = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to,
      messages: [
        {
          type: "text",
          text,
        },
      ],
    }),
  });

  if (!lineResponse.ok) {
    const detail = await lineResponse.text();
    return NextResponse.json(
      { error: "LINE送信エラー", detail },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    date: today,
    count: sessions.length,
  });
}
