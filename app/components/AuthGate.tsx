"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";

export default function AuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const checkAllowedUser = async (email: string) => {
      const { data, error } = await supabase
        .from("allowed_users")
        .select("email")
        .eq("email", email)
        .maybeSingle();

      if (error || !data) {
        await supabase.auth.signOut();
        alert("このアカウントは利用許可されていません。");
        router.push("/login");
        return false;
      }

      return true;
    };

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      setSession(session);

      if (!session) {
        setLoading(false);

        if (pathname !== "/login") {
          router.push("/login");
        }

        return;
      }

      const ok = await checkAllowedUser(session.user.email || "");

      if (!active) return;

      setLoading(false);

      if (ok && pathname === "/login") {
        router.push("/");
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkSession();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="page">
        <div className="form-section">
          <h2>認証確認中...</h2>
        </div>
      </div>
    );
  }

  if (!session && pathname !== "/login") {
    return null;
  }

  return <>{children}</>;
}