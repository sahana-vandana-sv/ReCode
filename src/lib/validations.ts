import { z } from "zod";

export const magicLinkSchema = z.object({
  email: z.email(),
});

// Form fields arrive as strings, so coerce "1" to 1 before checking.
export const problemNumberSchema = z.coerce.number().int().positive();

// Filters for /problems, read from the URL. .catch(undefined) drops any
// value that doesn't fit, so a hand-edited URL can't break the page.
export const problemFiltersSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional().catch(undefined),
  topic: z.string().max(50).optional().catch(undefined),
  tag: z.string().max(50).optional().catch(undefined),
  status: z.enum(["due", "upcoming", "archived"]).optional().catch(undefined),
});

export type ProblemFilters = z.infer<typeof problemFiltersSchema>;