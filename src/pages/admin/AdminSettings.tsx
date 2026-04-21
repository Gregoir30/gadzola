import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useBranding } from "@/contexts/BrandingContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sun, Moon, Upload, Trash2, Check, Palette, ImageIcon, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

const PRESETS: { name: string; h: number; s: number; l: number }[] = [
  { name: "Violet électrique", h: 265, s: 90, l: 65 },
  { name: "Bleu océan", h: 220, s: 90, l: 60 },
  { name: "Vert émeraude", h: 152, s: 75, l: 50 },
  { name: "Or solaire", h: 38, s: 95, l: 55 },
  { name: "Rouge passion", h: 0, s: 80, l: 60 },
  { name: "Rose flamboyant", h: 330, s: 85, l: 62 },
  { name: "Cyan néon", h: 185, s: 90, l: 55 },
  { name: "Indigo profond", h: 245, s: 80, l: 60 },
];

export default function AdminSettings() {
  const { branding, theme, setTheme, saveBranding, refresh } = useBranding();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [appName, setAppName] = useState(branding.app_name);
  const [hue, setHue] = useState(branding.primary_hue);
  const [sat, setSat] = useState(branding.primary_saturation);
  const [light, setLight] = useState(branding.primary_lightness);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setAppName(branding.app_name);
    setHue(branding.primary_hue);
    setSat(branding.primary_saturation);
    setLight(branding.primary_lightness);
  }, [branding]);

  const previewColor = `hsl(${hue} ${sat}% ${light}%)`;

  const applyPreset = (p: { h: number; s: number; l: number }) => {
    setHue(p.h);
    setSat(p.s);
    setLight(p.l);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await saveBranding({
      app_name: appName.trim() || "Gadzola",
      primary_hue: hue,
      primary_saturation: sat,
      primary_lightness: light,
    });
    setSaving(false);
    if (error) {
      toast.error("Erreur", { description: error });
    } else {
      // Log audit
      await supabase.rpc("log_action", {
        _action: "update_branding",
        _entity_type: "branding",
        _new_data: { app_name: appName, hue, sat, light },
      });
      toast.success("Paramètres sauvegardés", { description: "Le nouveau thème est appliqué partout." });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Fichier trop lourd", { description: "Maximum 2 Mo." });
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `logo-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("branding")
      .upload(path, file, { cacheControl: "3600", upsert: true });

    if (uploadError) {
      setUploading(false);
      toast.error("Échec téléversement", { description: uploadError.message });
      return;
    }

    const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);
    const logoUrl = pub.publicUrl;

    const { error } = await saveBranding({ logo_url: logoUrl });
    setUploading(false);

    if (error) {
      toast.error("Erreur de sauvegarde", { description: error });
    } else {
      toast.success("Logo mis à jour");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleLogoRemove = async () => {
    const { error } = await saveBranding({ logo_url: null });
    if (error) {
      toast.error("Erreur", { description: error });
    } else {
      toast.success("Logo retiré");
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Paramètres & personnalisation</h1>
          <p className="text-muted-foreground">
            Personnalise l'apparence de l'application : thème, couleurs et identité visuelle.
          </p>
        </div>

        {/* Apparence (thème) */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Apparence
            </CardTitle>
            <CardDescription>Choisis l'ambiance visuelle de l'application.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <button
                onClick={() => setTheme("dark")}
                className={`relative rounded-xl border-2 p-5 text-left transition-all ${
                  theme === "dark"
                    ? "border-primary shadow-glow bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center">
                      <Moon className="h-5 w-5 text-violet-400" />
                    </div>
                    <div>
                      <div className="font-semibold">Mode sombre</div>
                      <div className="text-xs text-muted-foreground">Fintech premium</div>
                    </div>
                  </div>
                  {theme === "dark" && <Check className="h-5 w-5 text-primary" />}
                </div>
                <div className="h-12 rounded-lg bg-gradient-to-r from-slate-900 via-violet-950 to-slate-900" />
              </button>

              <button
                onClick={() => setTheme("light")}
                className={`relative rounded-xl border-2 p-5 text-left transition-all ${
                  theme === "light"
                    ? "border-primary shadow-glow bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                      <Sun className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <div className="font-semibold">Mode clair</div>
                      <div className="text-xs text-muted-foreground">Lumineux & épuré</div>
                    </div>
                  </div>
                  {theme === "light" && <Check className="h-5 w-5 text-primary" />}
                </div>
                <div className="h-12 rounded-lg bg-gradient-to-r from-white via-violet-100 to-white border border-border" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Logo */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Logo de l'application
            </CardTitle>
            <CardDescription>
              Format recommandé : PNG carré transparent, 256×256 minimum, 2 Mo max.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <BrandLogo size="lg" />
              <div className="flex-1">
                <div className="font-semibold">{branding.app_name}</div>
                <div className="text-sm text-muted-foreground">
                  {branding.logo_url ? "Logo personnalisé actif" : "Logo par défaut (icône bouclier)"}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="app_name">Nom affiché</Label>
              <Input
                id="app_name"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="Gadzola"
                maxLength={40}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Téléversement…" : branding.logo_url ? "Remplacer le logo" : "Téléverser un logo"}
              </Button>
              {branding.logo_url && (
                <Button variant="outline" onClick={handleLogoRemove}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Retirer
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Couleur principale */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              Couleur principale
            </CardTitle>
            <CardDescription>
              Cette couleur est utilisée pour les boutons, liens, accents et dégradés dans toute l'application.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Aperçu */}
            <div className="rounded-xl p-6 border border-border bg-card/50 space-y-3">
              <div className="text-sm text-muted-foreground">Aperçu</div>
              <div className="flex flex-wrap items-center gap-3">
                <div
                  className="h-16 w-16 rounded-2xl shadow-lg"
                  style={{ background: previewColor }}
                />
                <div
                  className="h-16 flex-1 min-w-[200px] rounded-2xl shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, hsl(${hue} ${sat}% ${light}%) 0%, hsl(${(hue + 20) % 360} ${Math.min(sat + 5, 100)}% ${Math.min(light + 5, 95)}%) 100%)`,
                  }}
                />
                <div
                  className="px-5 py-3 rounded-xl font-semibold text-white shadow-lg"
                  style={{ background: previewColor }}
                >
                  Bouton exemple
                </div>
              </div>
              <div className="text-xs font-mono text-muted-foreground">
                HSL({hue}, {sat}%, {light}%)
              </div>
            </div>

            {/* Presets */}
            <div className="space-y-3">
              <Label>Palettes prédéfinies</Label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {PRESETS.map((p) => {
                  const isActive = hue === p.h && sat === p.s && light === p.l;
                  return (
                    <button
                      key={p.name}
                      title={p.name}
                      onClick={() => applyPreset(p)}
                      className={`group relative aspect-square rounded-xl border-2 transition-all ${
                        isActive ? "border-foreground scale-110 shadow-lg" : "border-transparent hover:scale-105"
                      }`}
                      style={{ background: `hsl(${p.h} ${p.s}% ${p.l}%)` }}
                    >
                      {isActive && (
                        <Check className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sliders fins */}
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>Teinte</Label>
                  <span className="text-muted-foreground font-mono">{hue}°</span>
                </div>
                <Slider value={[hue]} min={0} max={360} step={1} onValueChange={(v) => setHue(v[0])} />
                <div
                  className="h-2 rounded-full"
                  style={{
                    background:
                      "linear-gradient(to right, hsl(0 90% 60%), hsl(60 90% 60%), hsl(120 90% 60%), hsl(180 90% 60%), hsl(240 90% 60%), hsl(300 90% 60%), hsl(360 90% 60%))",
                  }}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>Saturation</Label>
                  <span className="text-muted-foreground font-mono">{sat}%</span>
                </div>
                <Slider value={[sat]} min={20} max={100} step={1} onValueChange={(v) => setSat(v[0])} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>Luminosité</Label>
                  <span className="text-muted-foreground font-mono">{light}%</span>
                </div>
                <Slider value={[light]} min={30} max={80} step={1} onValueChange={(v) => setLight(v[0])} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                onClick={() => {
                  setHue(branding.primary_hue);
                  setSat(branding.primary_saturation);
                  setLight(branding.primary_lightness);
                  setAppName(branding.app_name);
                }}
              >
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gradient-primary text-white">
                {saving ? "Sauvegarde…" : "Enregistrer"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
