export function formatDateTimeJP(
  date: string,
  startTime?: string,
  endTime?: string
) {
  if (!date) return "";

  const d = new Date(date);

  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();

  const formatTime = (t?: string) => {
    if (!t) return "";
    const [h, min] = t.split(":");
    return `${h}時${min}分`;
  };

  const week = ["日", "月", "火", "水", "木", "金", "土"];
  const w = week[d.getDay()];

  if (startTime && endTime) {
    return `${y}年${m}月${day}日（${w}） ${formatTime(startTime)}～${formatTime(endTime)}`;
  }

  return `${y}年${m}月${day}日（${w}）`;
}