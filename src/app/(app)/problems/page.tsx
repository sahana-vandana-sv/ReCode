import type { Metadata } from "next";
import { AddProblemDialog } from "@/components/problems/add-problem-dialog";
import { ProblemFilterBar } from "@/components/problems/problem-filter-bar";
import { ProblemTable } from "@/components/problems/problem-table";
import { requireUser } from "@/lib/auth";
import { buildProblemWhere } from "@/lib/problem-filters";
import { prisma } from "@/lib/prisma";
import { daysUntilDue, endOfDayIn } from "@/lib/srs";
import { problemFiltersSchema } from "@/lib/validations";

export const metadata: Metadata = { title: "Problems" };

export default async function ProblemsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const filters = problemFiltersSchema.parse(await searchParams);
  const now = new Date();

  const [allProblems, problems] = await Promise.all([
    // Every problem's tags, for the filter dropdowns.
    prisma.userProblem.findMany({
      where: { userId: user.id },
      select: { customTags: true, problem: { select: { topicTags: true } } },
    }),
    prisma.userProblem.findMany({
      where: buildProblemWhere(user.id, filters, endOfDayIn(now, user.timezone)),
      // Most overdue first.
      orderBy: [{ nextReviewAt: "asc" }, { problemNumber: "asc" }],
      select: {
        problemNumber: true,
        customTags: true,
        archived: true,
        nextReviewAt: true,
        problem: { select: { title: true, difficulty: true, topicTags: true } },
      },
    }),
  ]);

  const total = allProblems.length;
  const topicTags = uniqueSorted(allProblems.flatMap((p) => p.problem.topicTags));
  const customTags = uniqueSorted(allProblems.flatMap((p) => p.customTags));

  const rows = problems.map((p) => ({
    number: p.problemNumber,
    title: p.problem.title,
    difficulty: p.problem.difficulty,
    topicTags: p.problem.topicTags,
    customTags: p.customTags,
    archived: p.archived,
    daysUntilDue: daysUntilDue(p.nextReviewAt, now, user.timezone),
  }));

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Problems</h1>
        <AddProblemDialog />
      </div>

      {total === 0 ? (
        <p className="text-muted-foreground">
          No problems yet. Add one you&apos;ve solved.
        </p>
      ) : (
        <div className="grid gap-4">
          <ProblemFilterBar
            filters={filters}
            topicTags={topicTags}
            customTags={customTags}
          />
          {rows.length === 0 ? (
            <p className="text-muted-foreground">
              No problems match these filters.
            </p>
          ) : (
            <div className="grid gap-2">
              <p className="text-sm text-muted-foreground">
                Showing {rows.length} of {total}
              </p>
              <ProblemTable rows={rows} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}