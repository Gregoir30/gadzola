import { ShieldCheck } from "lucide-react";
import { useBranding } from "@/contexts/BrandingContext";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  iconClassName?: string;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: "h-9 w-9",
  md: "h-10 w-10",
  lg: "h-14 w-14",
};

const ICON_SIZES = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-7 w-7",
};

export function BrandLogo({ className, iconClassName, size = "md" }: BrandLogoProps) {
  const { branding } = useBranding();

  if (branding.logo_url) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl overflow-hidden bg-card shadow-glow",
          SIZES[size],
          className,
        )}
      >
        <img
          src={branding.logo_url}
          alt={branding.app_name}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl bg-primary shadow-glow",
        SIZES[size],
        className,
      )}
    >
      <ShieldCheck className={cn("text-white", ICON_SIZES[size], iconClassName)} />
    </div>
  );
}
