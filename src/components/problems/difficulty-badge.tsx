import type { Difficulty } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

const STYLES: Record<Difficulty, { label: string; className: string }> = {
  EASY: { label: "Easy", className: "text-emerald-700 dark:text-emerald-400" },
  MEDIUM: { label: "Medium", className: "text-amber-700 dark:text-amber-400" },
  HARD: { label: "Hard", className: "text-red-700 dark:text-red-400" },
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const { label, className } = STYLES[difficulty];
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}