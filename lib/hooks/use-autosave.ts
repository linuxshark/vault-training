"use client";
import { useEffect, useRef, useState } from "react";

export function useAutosave<T>(
  value: T,
  save: (value: T) => Promise<void>,
  delayMs = 800,
): { saving: boolean; savedAt: Date | null } {
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await save(value);
        setSavedAt(new Date());
      } finally {
        setSaving(false);
      }
    }, delayMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, delayMs, save]);

  return { saving, savedAt };
}
