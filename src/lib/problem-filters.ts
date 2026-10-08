import type { Prisma } from "@prisma/client";
import type { ProblemFilters } from "@/lib/validations";

// Turns the list page's filters into a Prisma `where`, always scoped to one
// user. `endOfToday` is the end of today in that user's timezone.
export function buildProblemWhere(
  userId: string,
  filters: ProblemFilters,
  endOfToday: Date,
): Prisma.UserProblemWhereInput {
  const { q, difficulty, topic, tag, status } = filters;
  const number = q && /^\d+$/.test(q) ? Number(q) : undefined;

  return {
    userId,
    archived: status === "archived",
    nextReviewAt:
      status === "due"
        ? { lte: endOfToday }
        : status === "upcoming"
          ? { gt: endOfToday }
          : undefined,
    customTags: tag ? { has: tag } : undefined,
    problem: {
      difficulty,
      topicTags: topic ? { has: topic } : undefined,
    },
    // Search matches the title, or the exact number when q is all digits.
    OR: q
      ? [
          { problem: { title: { contains: q, mode: "insensitive" } } },
          ...(number ? [{ problemNumber: number }] : []),
        ]
      : undefined,
  };
}