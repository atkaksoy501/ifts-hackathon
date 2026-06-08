import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn.js";

type BadgeTone = "neutral" | "success" | "warning" | "info";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  info: "bg-sky-50 text-sky-700"
};

export function Badge({ className, tone = "neutral", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return <span className={cn("inline-flex rounded-sm px-2 py-1 text-xs font-medium", tones[tone], className)} {...props} />;
}
