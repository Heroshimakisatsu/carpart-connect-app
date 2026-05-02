import { MAKE_COLORS } from "@/lib/parts";
import { cn } from "@/lib/utils";
export function MakeBadge({ make }: { make: string }) {
  const cls = MAKE_COLORS[make] ?? MAKE_COLORS.Other;
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border", cls)}>{make}</span>;
}
