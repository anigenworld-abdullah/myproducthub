import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

const MAIN_ADMIN_EMAIL = "abdullahsaeed9109@gmail.com";

export interface AuthState {
  session: Session | null;
  user: User | null;
  isMainAdmin: boolean;
  isModerator: boolean;
  /** True if user has *any* admin power (main admin OR moderator) */
  isAdmin: boolean;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [isModerator, setIsModerator] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const isMainAdmin = (session?.user?.email ?? "").toLowerCase() === MAIN_ADMIN_EMAIL;

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) { setIsModerator(false); return; }
    let active = true;
    (async () => {
      // Self-promote main admin (legacy role row) — harmless if missing
      if (isMainAdmin) { try { await supabase.rpc("claim_admin_role"); } catch { /* ignore */ } }
      const { data } = await (supabase as any).from("moderators").select("user_id").eq("user_id", uid).maybeSingle();
      if (active) setIsModerator(!!data);
    })();
    return () => { active = false; };
  }, [session?.user?.id, isMainAdmin]);

  return {
    session,
    user: session?.user ?? null,
    isMainAdmin,
    isModerator,
    isAdmin: isMainAdmin || isModerator,
    loading,
  };
}
