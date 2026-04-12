import { Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const variants = {
  info: { icon: Info, color: "text-blue", border: "border-blue/40", bg: "bg-blue/5" },
  warning: {
    icon: AlertTriangle,
    color: "text-amber",
    border: "border-amber/40",
    bg: "bg-amber/5",
  },
  success: { icon: CheckCircle2, color: "text-green", border: "border-green/40", bg: "bg-green/5" },
};

export function Callout({
  type = "info",
  children,
}: {
  type?: keyof typeof variants;
  children: React.ReactNode;
}) {
  const v = variants[type];
  const Icon = v.icon;
  return (
    <div className={cn("my-4 flex gap-3 rounded-md border px-4 py-3 text-sm", v.border, v.bg)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", v.color)} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
