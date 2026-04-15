/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLabPlayer } from "@/lib/hooks/use-lab-player";
import type { LabStep } from "@/lib/lab-visualizer/types";

const steps: LabStep[] = [
  { index: 0, commands: ["a"], output: null, affects: ["server"], caption: null },
  { index: 1, commands: ["b"], output: null, affects: ["server"], caption: null },
  { index: 2, commands: ["c"], output: null, affects: ["server"], caption: null },
];

describe("useLabPlayer", () => {
  it("starts at index 0 and not playing", () => {
    const { result } = renderHook(() => useLabPlayer(steps));
    expect(result.current.idx).toBe(0);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.current).toBe(steps[0]);
  });

  it("next advances idx", () => {
    const { result } = renderHook(() => useLabPlayer(steps));
    act(() => result.current.next());
    expect(result.current.idx).toBe(1);
  });

  it("prev decrements idx, clamped at 0", () => {
    const { result } = renderHook(() => useLabPlayer(steps));
    act(() => result.current.prev());
    expect(result.current.idx).toBe(0);
    act(() => result.current.next());
    act(() => result.current.prev());
    expect(result.current.idx).toBe(0);
  });

  it("next does not go past last step", () => {
    const { result } = renderHook(() => useLabPlayer(steps));
    act(() => result.current.next());
    act(() => result.current.next());
    act(() => result.current.next());
    act(() => result.current.next());
    expect(result.current.idx).toBe(2);
  });

  it("goto jumps to arbitrary index", () => {
    const { result } = renderHook(() => useLabPlayer(steps));
    act(() => result.current.goto(2));
    expect(result.current.idx).toBe(2);
  });

  it("reset goes back to 0 and pauses", () => {
    const { result } = renderHook(() => useLabPlayer(steps));
    act(() => result.current.goto(2));
    act(() => result.current.reset());
    expect(result.current.idx).toBe(0);
    expect(result.current.isPlaying).toBe(false);
  });

  it("play toggles isPlaying and advances via timer", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useLabPlayer(steps, { stepMs: 1000 }));
    act(() => result.current.play());
    expect(result.current.isPlaying).toBe(true);
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.idx).toBe(1);
    act(() => result.current.pause());
    expect(result.current.isPlaying).toBe(false);
    vi.useRealTimers();
  });
});
