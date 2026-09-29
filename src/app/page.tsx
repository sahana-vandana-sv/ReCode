import Link from "next/link";
import { Button } from "@/components/ui/button";

// Placeholder until the real landing page (Milestone 5).
export default function Home() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-4 text-center">
      <h1 className="text-4xl font-bold">ReCode</h1>
      <p className="max-w-md text-muted-foreground">
        Solve once. Remember forever. A spaced-repetition revision tracker for
        LeetCode problems.
      </p>
      <Button asChild size="lg">
        <Link href="/login">Get started</Link>
      </Button>
    </main>
  );
}