import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "collecteur" | "client";

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

export interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  roles: AppRole[];
  primaryRole: AppRole | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        // defer to avoid deadlock
        setTimeout(() => {
          void fetchUserData(newSession.user);
        }, 0);
      } else {
        setRoles([]);
        setProfile(null);
        setLoading(false);
      }
    });

    // 2. Then current session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        void fetchUserData(currentSession.user);
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const fetchUserData = async (currentUser: User) => {
    const [{ data: roleData }, { data: profileData }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", currentUser.id),
      supabase.from("profiles").select("id, full_name, email, phone").eq("id", currentUser.id).maybeSingle(),
    ]);

    setRoles((roleData ?? []).map((r) => r.role as AppRole));
    setProfile(
      profileData
        ? {
            id: profileData.id,
            full_name: profileData.full_name ?? currentUser.user_metadata?.full_name ?? null,
            email: profileData.email ?? currentUser.email ?? null,
            phone: profileData.phone ?? null,
          }
        : {
            id: currentUser.id,
            full_name: currentUser.user_metadata?.full_name ?? currentUser.email ?? null,
            email: currentUser.email ?? null,
            phone: null,
          },
    );
    setLoading(false);
  };

  const primaryRole: AppRole | null = roles.includes("admin")
    ? "admin"
    : roles.includes("collecteur")
    ? "collecteur"
    : roles.includes("client")
    ? "client"
    : null;

  return { session, user, profile, roles, primaryRole, loading };
}
