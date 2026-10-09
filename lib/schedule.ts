export type SessionSchedule = {
  recording_date: string;
  start_time: string;
  end_time: string;
};

export function japanDate(now = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(now);
}

export function sortSessions<T extends SessionSchedule>(sessions: T[]): T[] {
  return [...sessions].sort((a, b) =>
    `${a.recording_date} ${a.start_time}`.localeCompare(`${b.recording_date} ${b.start_time}`)
  );
}

// Keep an ongoing session visible until its end, using the studio's timezone.
export function nextSession<T extends SessionSchedule>(sessions: T[], now = new Date()): T | undefined {
  return sortSessions(sessions).find((s) =>
    new Date(`${s.recording_date}T${s.end_time}+09:00`).getTime() > now.getTime()
  );
}

export function shortSessionDate(date: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", weekday: "short",
  }).format(new Date(`${date}T00:00:00+09:00`));
}
