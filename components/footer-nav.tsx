import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

export function FooterNav({
  prevHref,
  prevLabel,
  nextHref,
  nextLabel,
}: {
  prevHref: string | null;
  prevLabel: string | null;
  nextHref: string | null;
  nextLabel: string | null;
}) {
  return (
    <footer className="mt-8 flex items-center justify-between border-t border-border-subtle pt-4 text-sm">
      {prevHref ? (
        <Link href={prevHref} className="inline-flex items-center gap-2 text-text-muted hover:text-text">
          <ArrowLeft className="size-4" />
          <span className="max-w-[18ch] truncate">{prevLabel}</span>
        </Link>
      ) : (
        <span />
      )}
      {nextHref ? (
        <Link href={nextHref} className="inline-flex items-center gap-2 text-text hover:text-accent">
          <span className="max-w-[18ch] truncate">{nextLabel}</span>
          <ArrowRight className="size-4" />
        </Link>
      ) : (
        <span />
      )}
    </footer>
  );
}
