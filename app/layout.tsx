import type { Metadata } from "next";
import "./globals.css";
import { inter, plexMono } from "./fonts";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Vault Training",
  description: "HashiCorp Vault Associate (003) study interface",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={cn("dark", inter.variable, plexMono.variable, "font-sans", geist.variable)}>
      <body className="font-sans">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:bg-accent focus:text-accent-fg focus:px-3 focus:py-2 focus:rounded">
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
