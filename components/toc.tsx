"use client";
import { useEffect, useState } from "react";

export function Toc() {
  const [items, setItems] = useState<{ id: string; text: string; level: number }[]>([]);

  useEffect(() => {
    const headings = Array.from(
      document.querySelectorAll("article h2, article h3"),
    ) as HTMLHeadingElement[];
    setItems(
      headings
        .filter((h) => h.id)
        .map((h) => ({ id: h.id, text: h.textContent ?? "", level: h.tagName === "H2" ? 2 : 3 })),
    );
  }, []);

  if (items.length === 0) return null;
  return (
    <ul className="space-y-1 text-xs">
      {items.map((i) => (
        <li key={i.id} style={{ paddingLeft: (i.level - 2) * 10 }}>
          <a href={`#${i.id}`} className="text-text-muted hover:text-text">
            {i.text}
          </a>
        </li>
      ))}
    </ul>
  );
}
