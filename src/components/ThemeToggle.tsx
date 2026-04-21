import { Moon, Sun } from "lucide-react";
import { useBranding } from "@/contexts/BrandingContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className, showLabel = true }: { className?: string; showLabel?: boolean }) {
  const { theme, setTheme } = useBranding();

  const isDark = theme === "dark";

  return (
    <div className={cn("flex items-center gap-3 px-3 py-2 rounded-xl transition-all hover:bg-sidebar-accent/40", className)}>
      <div className="relative h-4 w-4 shrink-0">
        <Sun className={cn(
          "h-4 w-4 absolute transition-all duration-300", 
          isDark ? "opacity-0 scale-50 rotate-90" : "opacity-100 scale-100 rotate-0 text-amber-500"
        )} />
        <Moon className={cn(
          "h-4 w-4 absolute transition-all duration-300", 
          isDark ? "opacity-100 scale-100 rotate-0 text-violet-400" : "opacity-0 scale-50 -rotate-90"
        )} />
      </div>
      
      {showLabel && (
        <Label htmlFor="theme-switch" className="flex-1 text-xs font-medium cursor-pointer text-sidebar-foreground/70">
          {isDark ? "Mode sombre" : "Mode clair"}
        </Label>
      )}

      <Switch
        id="theme-switch"
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        className="data-[state=checked]:bg-primary"
      />
    </div>
  );
}
