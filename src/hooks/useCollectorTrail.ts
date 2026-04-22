import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CollectorPoint {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  recorded_at: string;
  source: "browser";
}

const TRAIL_STORAGE_PREFIX = "gadzola-collector-trail:";

function loadTrail(collectorId: string): CollectorPoint[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${TRAIL_STORAGE_PREFIX}${collectorId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CollectorPoint[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTrail(collectorId: string, points: CollectorPoint[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${TRAIL_STORAGE_PREFIX}${collectorId}`, JSON.stringify(points.slice(-100)));
}

export function useCollectorTrail(collectorId: string | null) {
  const [currentPoint, setCurrentPoint] = useState<CollectorPoint | null>(null);
  const [trail, setTrail] = useState<CollectorPoint[]>([]);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastSyncRef = useRef(0);

  useEffect(() => {
    if (!collectorId) return;
    setTrail(loadTrail(collectorId));
  }, [collectorId]);

  useEffect(() => {
    if (!collectorId) return;
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setSupported(false);
      setError("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const point: CollectorPoint = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
          speed: pos.coords.speed ?? null,
          heading: pos.coords.heading ?? null,
          recorded_at: new Date(pos.timestamp).toISOString(),
          source: "browser",
        };

        setCurrentPoint(point);
        setError(null);

        setTrail((prev) => {
          const next = [...prev, point].slice(-100);
          saveTrail(collectorId, next);
          return next;
        });

        const now = Date.now();
        if (now - lastSyncRef.current < 60000) return;
        lastSyncRef.current = now;

        if (!navigator.onLine) return;

        await supabase.from("collector_locations").insert({
          collector_id: collectorId,
          latitude: point.latitude,
          longitude: point.longitude,
          accuracy: point.accuracy,
          speed: point.speed,
          heading: point.heading,
          source: point.source,
          recorded_at: point.recorded_at,
        } as any);
      },
      (geoError) => {
        setError(geoError.message);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [collectorId]);

  const lastPoint = useMemo(() => currentPoint ?? trail[trail.length - 1] ?? null, [currentPoint, trail]);

  return {
    currentPoint: lastPoint,
    trail,
    supported,
    error,
  };
}
