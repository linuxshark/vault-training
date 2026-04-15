"use client";
import { useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useLabPlayer } from "@/lib/hooks/use-lab-player";
import { VaultTerminal } from "./VaultTerminal";
import { LabControls } from "./LabControls";
import { LabStepTimeline } from "./LabStepTimeline";
import { LabVisualizerEmpty } from "./LabVisualizerEmpty";
import type { LabStep } from "@/lib/lab-visualizer/types";
import { deriveVisible } from "./VaultScene";

const VaultScene = dynamic(
  () => import("./VaultScene").then((m) => ({ default: m.VaultScene })),
  { ssr: false, loading: () => <div className="h-[440px] animate-pulse rounded-lg bg-bg-elevated" /> },
);

export function LabVisualizer({
  steps,
  initialSpeed = 1,
}: {
  steps: LabStep[];
  initialSpeed?: number;
}) {
  const player = useLabPlayer(steps, { speed: initialSpeed });

  const visible = useMemo(
    () => deriveVisible(steps.map((s) => s.affects)),
    [steps],
  );
  const active = player.current?.affects ?? [];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName))
        return;
      if (e.key === "ArrowRight") player.next();
      else if (e.key === "ArrowLeft") player.prev();
      else if (e.key === " ") {
        e.preventDefault();
        if (player.isPlaying) player.pause();
        else player.play();
      } else if (e.key === "r") player.reset();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [player]);

  if (steps.length === 0) return <LabVisualizerEmpty />;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <div className="md:col-span-3">
          <VaultScene visible={visible} active={active} />
        </div>
        <div className="md:col-span-2">
        <VaultTerminal
          commands={player.current?.commands ?? []}
          output={player.current?.output ?? null}
          caption={player.current?.caption ?? null}
        />
        </div>
      </div>
      <LabStepTimeline total={player.total} current={player.idx} onSelect={player.goto} />
      <LabControls
        isPlaying={player.isPlaying}
        speed={player.speed}
        onPlayPause={() => (player.isPlaying ? player.pause() : player.play())}
        onPrev={player.prev}
        onNext={player.next}
        onReset={player.reset}
        onSpeed={player.setSpeed}
      />
    </div>
  );
}
