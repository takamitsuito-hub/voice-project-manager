type Props = { video: boolean; audio: boolean };

export default function ReferenceMediaStatus({ video, audio }: Props) {
  return (
    <>
      <span className={`status ${video ? "status-ok" : "small-muted"}`}>参考動画{video ? "あり" : "なし"}</span>
      <span className={`status ${audio ? "status-ok" : "small-muted"}`}>参考音声{audio ? "あり" : "なし"}</span>
    </>
  );
}
