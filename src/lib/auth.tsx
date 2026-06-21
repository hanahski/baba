import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { pickAvatarForName } from "@/lib/avatars";
import { claimSeedAdminRole, getIsAdminUser } from "@/lib/admin-role";

type Profile = {
  id: string;
  display_name: string;
  email: string | null;
  avatar_key: string;
  department_id: string | null;
  bio: string | null;
  rank_tier: "newbie" | "normal" | "active" | "legend" | "pro" | "sure_plug";
  rank_step: number;
  approved_post_count: number;
  show_online: boolean;
  credits: number;
  seen_welcome: boolean;
  is_verified: boolean;
  status?: "active" | "blocked" | "deactivated";
};

type AuthCtx = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  error: Error | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const loadProfile = async (uid: string, email?: string | null, meta?: Record<string, any>) => {
    let { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    if (!data) {
      // Google OAuth supplies: name, full_name, given_name, picture, avatar_url, email
      const displayName: string =
        meta?.display_name ||
        meta?.full_name ||
        meta?.name ||
        meta?.given_name ||
        (email ? email.split("@")[0] : "Student");
      const referralCode = Math.random().toString(36).slice(2, 8).toUpperCase();
      const { error: insertErr } = await supabase
        .from("profiles")
        .insert({
          id: uid,
          display_name: displayName,
          email: email ?? null,
          referral_code: referralCode,
          avatar_key: pickAvatarForName(displayName),
          picture_url: null,
          rank_tier: "newbie",
          rank_step: 1,
          // Joining bonus — awarded once at profile creation. Existing
          // profiles are skipped because this insert only runs for new users.
          credits: 50,
        } as any);
      if (insertErr) {
        // Surface RLS / duplicate-key issues instead of failing silently — the
        // user otherwise stays signed in with no profile and the app breaks.
        console.error("[auth] profile insert failed", insertErr);
        if (insertErr.code !== "23505") {
          toast.error(`Couldn't set up your profile: ${insertErr.message}`);
        }
      } else {
        // New profile created successfully — surface the credit bonus immediately
        toast.success("Profile created! +50 credits bonus granted.");
      }
      const retry = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
      data = retry.data;
    } else {
      // Keep OAuth metadata from overriding saved uploads / chosen avatars.
      const googleName: string | undefined =
        meta?.full_name || meta?.name || meta?.given_name || meta?.display_name;
      const patch: Record<string, any> = {};
      if (googleName && (!data.display_name || data.display_name === (email?.split("@")[0] ?? ""))) {
        patch.display_name = googleName;
      }
      if (Object.keys(patch).length > 0) {
        await supabase.from("profiles").update(patch as any).eq("id", uid);
        data = { ...(data as any), ...patch };
      }
    }

    const p = (data as Profile | null) ?? null;
    // Enforce admin-set status: blocked or deactivated users get signed out
    // immediately and cannot use the app until an admin reactivates them.
    if (p && p.status && p.status !== "active") {
      const reason =
        p.status === "blocked"
          ? "Your account has been blocked. You can't access StudentsPlug."
          : "Your account has been deactivated. You can't sign in.";
      toast.error(reason, { duration: 8000 });
      await supabase.auth.signOut();
      setProfile(null);
      return;
    }
    if (p?.show_online !== false) {
      void supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", uid)
        .then(({ error: seenErr }) => {
          if (seenErr) console.error("[auth] presence update failed", seenErr);
        });
    }
    setProfile(p);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setError(null);
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setLoading(true);
        setTimeout(async () => {
          try { await loadProfile(s.user.id, s.user.email, s.user.user_metadata); }
          catch (err) { setError(err instanceof Error ? err : new Error(String(err))); }
          finally { setLoading(false); }
        }, 0);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    supabase.auth.getSession().then(async ({ data, error: sessionErr }) => {
      if (sessionErr) setError(sessionErr);
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        try { await loadProfile(data.session.user.id, data.session.user.email, data.session.user.user_metadata); }
        catch (err) { setError(err instanceof Error ? err : new Error(String(err))); }
        finally { setLoading(false); }
      } else {
        setLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // online heartbeat — every 30s + on focus/visibility so "active now" stays accurate
  useEffect(() => {
    if (!user) return;
    const uid = user.id;
    let alive = true;
    const beat = () => {
      if (!alive) return;
      void supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", uid)
        .then(({ error: beatErr }) => {
          if (beatErr) console.error("[auth] heartbeat failed", beatErr);
        });
    };
    beat();
    const t = setInterval(beat, 30_000);
    const onVis = () => { if (document.visibilityState === "visible") beat(); };
    window.addEventListener("focus", beat);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener("focus", beat);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [user]);

  // Check admin role whenever user changes
  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    let alive = true;
    (async () => {
      try {
        await claimSeedAdminRole();
        const admin = await getIsAdminUser(user.id);
        if (alive) setIsAdmin(admin);
      } catch (err) {
        console.error("[auth] admin role check failed", err);
        if (alive) setIsAdmin(false);
      }
    })();
    return () => { alive = false; };
  }, [user]);

  // Realtime: keep profile fresh when credits/seen_welcome/rank change server-side
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`me-profile-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload) => setProfile(payload.new as Profile),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  return (
    <Ctx.Provider
      value={{
        user, session, profile, isAdmin, loading, error,
        signOut: async () => { await supabase.auth.signOut(); },
        refreshProfile: async () => { if (user) await loadProfile(user.id); },
      }}
    >

      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
