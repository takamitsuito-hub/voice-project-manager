-- Apply before deploying the reference-media UI.
-- Additive only; existing rows default to no registered reference media.
ALTER TABLE public.recording_sessions
  ADD COLUMN has_reference_video boolean NOT NULL DEFAULT false,
  ADD COLUMN has_reference_audio boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.recording_sessions.has_reference_video IS
  'Whether reference video is available for this recording session.';
COMMENT ON COLUMN public.recording_sessions.has_reference_audio IS
  'Whether reference audio is available for this recording session.';

-- Existing table grants and RLS policies also cover these columns.
-- Application rollback: deploy the previous commit and retain these columns.
