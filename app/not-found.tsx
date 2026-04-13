import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-8">
      <div className="space-y-3 text-center">
        <h1 className="text-2xl font-bold">No se encontró lo que buscabas</h1>
        <p className="text-text-muted">La tarea o dominio no existe o fue renombrado.</p>
        <Link
          href="/"
          className="inline-block rounded bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
        >
          Volver al dashboard
        </Link>
      </div>
    </main>
  );
}
