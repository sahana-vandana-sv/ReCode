"use server";

import { Prisma, type Difficulty } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { fetchTopicTags } from "@/lib/leetcode";
import { prisma } from "@/lib/prisma";
import { computeNextReviewAt } from "@/lib/srs";
import { problemNumberSchema } from "@/lib/validations";

const INVALID_NUMBER = "Enter a problem number, like 1 for Two Sum.";

export type ProblemPreview = {
  number: number;
  title: string;
  difficulty: Difficulty;
  paidOnly: boolean;
};

export type LookupState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "found"; problem: ProblemPreview; alreadyAdded: boolean };

export async function lookupProblem(
  _prevState: LookupState,
  formData: FormData,
): Promise<LookupState> {
  const user = await requireUser();
  const parsed = problemNumberSchema.safeParse(formData.get("number"));
  if (!parsed.success) return { status: "error", message: INVALID_NUMBER };

  const problem = await prisma.problem.findUnique({
    where: { number: parsed.data },
    select: { number: true, title: true, difficulty: true, paidOnly: true },
  });
  if (!problem) {
    return {
      status: "error",
      message: `LeetCode has no problem #${parsed.data}.`,
    };
  }

  const existing = await prisma.userProblem.findUnique({
    where: {
      userId_problemNumber: { userId: user.id, problemNumber: problem.number },
    },
    select: { id: true },
  });

  return { status: "found", problem, alreadyAdded: existing !== null };
}

export type AddProblemState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "added"; number: number; message: string };

export async function addProblem(
  _prevState: AddProblemState,
  formData: FormData,
): Promise<AddProblemState> {
  const user = await requireUser();
  const parsed = problemNumberSchema.safeParse(formData.get("number"));
  if (!parsed.success) return { status: "error", message: INVALID_NUMBER };

  const problem = await prisma.problem.findUnique({
    where: { number: parsed.data },
  });
  if (!problem) {
    return {
      status: "error",
      message: `LeetCode has no problem #${parsed.data}.`,
    };
  }

  // Topic tags are fetched once per problem, the first time anyone adds it.
  // LeetCode is unreliable, so a failure here never blocks adding.
  if (problem.topicTags.length === 0) {
    try {
      const topicTags = await fetchTopicTags(problem.titleSlug);
      if (topicTags.length > 0) {
        await prisma.problem.update({
          where: { number: problem.number },
          data: { topicTags },
        });
      }
    } catch (error) {
      console.error(`Couldn't fetch topic tags for #${problem.number}`, error);
    }
  }

  const solvedAt = new Date();
  try {
    await prisma.userProblem.create({
      data: {
        userId: user.id,
        problemNumber: problem.number,
        solvedAt,
        nextReviewAt: computeNextReviewAt(0, solvedAt, user.timezone),
      },
    });
  } catch (error) {
    // P2002 = unique constraint: this user already has this problem.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { status: "error", message: "This problem is already in your list." };
    }
    throw error;
  }

  revalidatePath("/problems");
  revalidatePath("/dashboard");
  return {
    status: "added",
    number: problem.number,
    message: `Added. Your first review is due tomorrow.`,
  };
}