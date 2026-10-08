import { addDays, differenceInCalendarDays, endOfDay, startOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

export const INTERVALS_DAYS = [1, 3, 7, 14, 30, 60, 120] as const;

// Midnight at the start of the day that's INTERVALS_DAYS[stage] days after
// `from`, in the user's timezone. Stage 0 means "due tomorrow".
export function computeNextReviewAt(
  stage: number,
  from: Date,
  timezone: string,
): Date {
  const index = Math.min(Math.max(stage, 0), INTERVALS_DAYS.length - 1);
  const localToday = startOfDay(toZonedTime(from, timezone));
  return fromZonedTime(addDays(localToday, INTERVALS_DAYS[index]), timezone);
}

// The last moment of `now`'s day in the user's timezone. A problem is due
// when its nextReviewAt is on or before this.
export function endOfDayIn(now: Date, timezone: string): Date {
  return fromZonedTime(endOfDay(toZonedTime(now, timezone)), timezone);
}

// Calendar days from today until the review, in the user's timezone:
// 0 = due today, 1 = tomorrow, -2 = two days overdue.
export function daysUntilDue(
  nextReviewAt: Date,
  now: Date,
  timezone: string,
): number {
  return differenceInCalendarDays(
    toZonedTime(nextReviewAt, timezone),
    toZonedTime(now, timezone),
  );
}