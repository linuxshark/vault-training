"use client";
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

export function LabControls({
  isPlaying,
  speed,
  onPlayPause,
  onPrev,
  onNext,
  onReset,
  onSpeed,
  disabled,
}: {
  isPlaying: boolean;
  speed: number;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
  onSpeed: (s: number) => void;
  disabled?: boolean;
}) {
  const speeds = [0.5, 1, 2];
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-bg-elevated px-3 py-2">
      <div className="flex items-center gap-1">
        <IconBtn label="Anterior" onClick={onPrev} disabled={disabled}>
          <SkipBack className="size-4" />
        </IconBtn>
        <IconBtn label={isPlaying ? "Pausa" : "Reproducir"} onClick={onPlayPause} disabled={disabled}>
          {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
        </IconBtn>
        <IconBtn label="Siguiente" onClick={onNext} disabled={disabled}>
          <SkipForward className="size-4" />
        </IconBtn>
        <IconBtn label="Reiniciar" onClick={onReset} disabled={disabled}>
          <RotateCcw className="size-4" />
        </IconBtn>
      </div>
      <div className="flex items-center gap-1">
        {speeds.map((s) => (
          <button
            key={s}
            onClick={() => onSpeed(s)}
            className={cn(
              "rounded px-2 py-0.5 text-xs font-medium transition-colors",
              speed === s
                ? "bg-accent text-accent-fg"
                : "text-text-muted hover:text-text",
            )}
            aria-pressed={speed === s}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="rounded p-1.5 text-text-muted transition-colors hover:bg-bg hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
