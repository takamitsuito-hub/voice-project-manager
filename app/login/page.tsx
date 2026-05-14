"use client";

import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/`
        : undefined;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error) {
      alert("ログインエラー: " + error.message);
    }
  };

  return (
    <div className="page">
      <div className="form-section" style={{ maxWidth: 520, margin: "80px auto" }}>
        <h1 className="page-title">収録案件管理</h1>

        <p className="small-muted">
          Googleアカウントでログインしてください。
        </p>

        <button type="button" onClick={handleGoogleLogin}>
          Googleでログイン
        </button>
      </div>
    </div>
  );
}