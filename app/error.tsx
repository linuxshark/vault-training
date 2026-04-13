"use client";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center p-8">
      <div className="space-y-3 text-center">
        <h1 className="text-2xl font-bold">Algo salió mal</h1>
        <p className="text-text-muted">{error.message}</p>
        <button
          onClick={reset}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
        >
          Reintentar
        </button>
      </div>
    </main>
  );
}
