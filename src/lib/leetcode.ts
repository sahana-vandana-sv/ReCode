import { z } from "zod";

// LeetCode has no official API. These are the endpoints its own website
// uses, so they can change or fail without notice: always handle errors.
const LEETCODE_URL = "https://leetcode.com";
const TIMEOUT_MS = 30_000;

const DIFFICULTY = { 1: "EASY", 2: "MEDIUM", 3: "HARD" } as const;

// Only the fields we use. Parsing with Zod turns a silent format change
// on LeetCode's side into a clear error.
const problemListSchema = z.object({
  stat_status_pairs: z.array(
    z.object({
      stat: z.object({
        frontend_question_id: z.number().int().positive(),
        question__title: z.string().min(1),
        question__title_slug: z.string().min(1),
      }),
      difficulty: z.object({ level: z.literal([1, 2, 3]) }),
      paid_only: z.boolean(),
    }),
  ),
});

export async function fetchProblemList() {
  const res = await fetch(`${LEETCODE_URL}/api/problems/all/`, {
    headers: { Referer: LEETCODE_URL },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`LeetCode returned HTTP ${res.status}`);

  const { stat_status_pairs } = problemListSchema.parse(await res.json());

  return stat_status_pairs.map((p) => ({
    number: p.stat.frontend_question_id,
    title: p.stat.question__title,
    titleSlug: p.stat.question__title_slug,
    difficulty: DIFFICULTY[p.difficulty.level],
    paidOnly: p.paid_only,
  }));
}


const topicTagsSchema = z.object({
  data: z.object({
    question: z
      .object({ topicTags: z.array(z.object({ name: z.string() })) })
      .nullable(),
  }),
});

const TOPIC_TAGS_QUERY = `
  query questionData($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      topicTags { name }
    }
  }
`;

// Topic tag names for one problem, e.g. ["Array", "Hash Table"].
// Runs while the user waits, so it gives up sooner than the seed does.
export async function fetchTopicTags(titleSlug: string): Promise<string[]> {
  const res = await fetch(`${LEETCODE_URL}/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Referer: LEETCODE_URL },
    body: JSON.stringify({ query: TOPIC_TAGS_QUERY, variables: { titleSlug } }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`LeetCode returned HTTP ${res.status}`);

  const { data } = topicTagsSchema.parse(await res.json());
  return data.question?.topicTags.map((tag) => tag.name) ?? [];
}