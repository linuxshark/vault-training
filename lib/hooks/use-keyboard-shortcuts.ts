"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

interface AdjacentTasks {
  prev?: string;
  next?: string;
}

export function useKeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function handler(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName))
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "n") {
        e.preventDefault();
        document.getElementById("note-editor")?.focus();
      } else if (e.key === "j" || e.key === "k") {
        const match = pathname.match(/^\/domains\/([^/]+)\/([^/]+)$/);
        if (!match) return;
        const [, objectiveSlug, taskSlug] = match;
        const res = await fetch(`/api/nav?objective=${objectiveSlug}&task=${taskSlug}`);
        if (!res.ok) return;
        const { prev, next } = (await res.json()) as AdjacentTasks;
        if (e.key === "j" && next) router.push(next);
        if (e.key === "k" && prev) router.push(prev);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pathname, router]);
}
