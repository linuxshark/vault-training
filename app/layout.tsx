import type { Metadata } from "next";
import "./globals.css";

export const dynamic = "force-dynamic";
import { inter, plexMono } from "./fonts";
import { ensureSeed } from "@/lib/ensure-seed";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";

export const metadata: Metadata = {
  title: "Vault Training",
  description: "HashiCorp Vault Associate (003) study interface",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await ensureSeed();
  return (
    <html lang="es" className={`dark ${inter.variable} ${plexMono.variable}`}>
      <body className="font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:rounded focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-fg"
        >
          Saltar al contenido
        </a>
        <KeyboardShortcuts />
        {children}
      </body>
    </html>
  );
}
