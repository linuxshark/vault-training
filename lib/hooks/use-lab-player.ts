"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LabStep } from "@/lib/lab-visualizer/types";

interface Options {
  stepMs?: number;
  speed?: number;
}

export function useLabPlayer(steps: LabStep[], opts: Options = {}) {
  const [idx, setIdx] = useState(0);
  const [isPlaying, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(opts.speed ?? 1);
  const stepMs = opts.stepMs ?? 1800;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastIdx = Math.max(0, steps.length - 1);

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const next = useCallback(() => {
    setIdx((i) => Math.min(i + 1, lastIdx));
  }, [lastIdx]);

  const prev = useCallback(() => {
    setIdx((i) => Math.max(i - 1, 0));
  }, []);

  const goto = useCallback(
    (target: number) => setIdx(Math.min(Math.max(target, 0), lastIdx)),
    [lastIdx],
  );

  const reset = useCallback(() => {
    clearTimer();
    setPlaying(false);
    setIdx(0);
  }, []);

  const play = useCallback(() => setPlaying(true), []);
  const pause = useCallback(() => {
    clearTimer();
    setPlaying(false);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    if (idx >= lastIdx) {
      setPlaying(false);
      return;
    }
    timer.current = setTimeout(() => {
      setIdx((i) => Math.min(i + 1, lastIdx));
    }, stepMs / speed);
    return clearTimer;
  }, [idx, isPlaying, lastIdx, speed, stepMs]);

  return {
    idx,
    current: steps[idx] ?? null,
    isPlaying,
    speed,
    setSpeed,
    next,
    prev,
    goto,
    play,
    pause,
    reset,
    total: steps.length,
  };
}
