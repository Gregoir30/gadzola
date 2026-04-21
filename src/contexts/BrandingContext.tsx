import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ThemeMode = "light" | "dark";

export interface Branding {
  app_name: string;
  primary_hue: number;
  primary_saturation: number;
  primary_lightness: number;
  logo_url: string | null;
}

interface BrandingContextValue {
  branding: Branding;
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
  refresh: () => Promise<void>;
  saveBranding: (b: Partial<Branding>) => Promise<{ error: string | null }>;
}

const DEFAULT_BRANDING: Branding = {
  app_name: "Gadzola",
  primary_hue: 265,
  primary_saturation: 90,
  primary_lightness: 65,
  logo_url: null,
};

const BrandingContext = createContext<BrandingContextValue | null>(null);

const THEME_KEY = "gadzola-theme";

function applyPrimary(b: Branding) {
  const root = document.documentElement;
  const { primary_hue: h, primary_saturation: s, primary_lightness: l } = b;
  // primary + variantes
  root.style.setProperty("--primary", `${h} ${s}% ${l}%`);
  root.style.setProperty("--primary-hover", `${h} ${s}% ${Math.min(l + 5, 95)}%`);
  root.style.setProperty("--primary-glow", `${(h + 20) % 360} ${Math.min(s + 5, 100)}% ${Math.min(l + 5, 95)}%`);
  root.style.setProperty("--ring", `${h} ${s}% ${l}%`);
  root.style.setProperty("--sidebar-primary", `${h} ${s}% ${l}%`);
  root.style.setProperty("--sidebar-ring", `${h} ${s}% ${l}%`);
  root.style.setProperty(
    "--gradient-primary",
    `linear-gradient(135deg, hsl(${h} ${s}% ${l}%) 0%, hsl(${(h + 20) % 360} ${Math.min(s + 5, 100)}% ${Math.min(l + 5, 95)}%) 50%, hsl(${(h - 45 + 360) % 360} ${Math.min(s + 5, 100)}% ${l}%) 100%)`,
  );
}

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  } else {
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  }
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const stored = typeof window !== "undefined" ? (localStorage.getItem(THEME_KEY) as ThemeMode | null) : null;
    return stored ?? "dark";
  });

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t);
    localStorage.setItem(THEME_KEY, t);
    applyTheme(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "branding")
      .maybeSingle();
    if (data?.value) {
      const v = data.value as Partial<Branding>;
      const merged: Branding = { ...DEFAULT_BRANDING, ...v };
      setBranding(merged);
      applyPrimary(merged);
    } else {
      applyPrimary(DEFAULT_BRANDING);
    }
  }, []);

  const saveBranding = useCallback(
    async (patch: Partial<Branding>): Promise<{ error: string | null }> => {
      const next = { ...branding, ...patch };
      const { error } = await supabase
        .from("app_settings")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ value: next as any })
        .eq("key", "branding");
      if (error) return { error: error.message };
      setBranding(next);
      applyPrimary(next);
      return { error: null };
    },
    [branding],
  );

  // Init
  useEffect(() => {
    applyTheme(theme);
    void refresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime sync (toute modif côté admin se propage)
  useEffect(() => {
    const channel = supabase
      .channel("app-settings-branding")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "app_settings", filter: "key=eq.branding" },
        () => {
          void refresh();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return (
    <BrandingContext.Provider value={{ branding, theme, setTheme, toggleTheme, refresh, saveBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error("useBranding must be used within BrandingProvider");
  return ctx;
}
