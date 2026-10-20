"use client";

type Props = {
  video: boolean;
  audio: boolean;
  onVideoChange: (checked: boolean) => void;
  onAudioChange: (checked: boolean) => void;
};

export default function ReferenceMediaFields({ video, audio, onVideoChange, onAudioChange }: Props) {
  return (
    <fieldset className="reference-media-fields">
      <legend>参考動画・音声</legend>
      <div className="reference-media-options">
        <label><input type="checkbox" checked={video} onChange={e => onVideoChange(e.target.checked)} />参考動画あり</label>
        <label><input type="checkbox" checked={audio} onChange={e => onAudioChange(e.target.checked)} />参考音声あり</label>
      </div>
      <p className="small-muted">この収録枠の参考資料にチェック。未チェックは「なし」として表示します。保存場所は台本URLまたはメモで共有できます。</p>
    </fieldset>
  );
}
