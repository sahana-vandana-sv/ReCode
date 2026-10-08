import { fetchProblemList } from "../src/lib/leetcode";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Fetching the problem list from LeetCode…");
  const problems = await fetchProblemList();

  // Topic tags aren't in this list; they're fetched the first time someone
  // adds a problem. skipDuplicates makes re-runs safe: existing rows are
  // left alone and only problems LeetCode added since are inserted.
  const { count } = await prisma.problem.createMany({
    data: problems.map((problem) => ({ ...problem, topicTags: [] })),
    skipDuplicates: true,
  });

  console.log(`LeetCode lists ${problems.length} problems; added ${count} new.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());