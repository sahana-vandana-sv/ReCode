import Link from "next/link";
import type { Difficulty } from "@prisma/client";
import { cn } from "@/lib/utils";
import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type ProblemRow = {
  number: number;
  title: string;
  difficulty: Difficulty;
  topicTags: string[];
  customTags: string[];
  archived: boolean;
  daysUntilDue: number;
};

function reviewLabel({ archived, daysUntilDue: days }: ProblemRow) {
  if (archived) return "Archived";
  if (days < 0) return `Overdue ${-days} day${days === -1 ? "" : "s"}`;
  if (days === 0) return "Due today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

export function ProblemTable({ rows }: { rows: ProblemRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-14">#</TableHead>
          <TableHead>Problem</TableHead>
          <TableHead>Difficulty</TableHead>
          <TableHead className="hidden md:table-cell">Tags</TableHead>
          <TableHead className="text-right">Next review</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.number}>
            <TableCell className="text-muted-foreground tabular-nums">
              {row.number}
            </TableCell>
            <TableCell>
              <Link
                href={`/problems/${row.number}`}
                className="font-medium hover:underline"
              >
                {row.title}
              </Link>
            </TableCell>
            <TableCell>
              <DifficultyBadge difficulty={row.difficulty} />
            </TableCell>
            <TableCell className="hidden md:table-cell">
              <div className="flex flex-wrap gap-1">
                {row.customTags.map((tag) => (
                  <Badge key={`custom-${tag}`} variant="secondary">
                    {tag}
                  </Badge>
                ))}
                {row.topicTags.map((tag) => (
                  <Badge key={`topic-${tag}`} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </TableCell>
            <TableCell
              className={cn(
                "text-right",
                !row.archived && row.daysUntilDue < 0 && "text-destructive",
                !row.archived && row.daysUntilDue === 0 && "font-medium",
              )}
            >
              {reviewLabel(row)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}