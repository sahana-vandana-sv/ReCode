import type { Metadata } from "next";

export const metadata: Metadata = { title: "Review" };

export default function ReviewPage() {
  return (
    <div className="grid gap-2">
      <h1 className="text-2xl font-semibold">Review</h1>
      <p className="text-muted-foreground">Your review session will run here.</p>
    </div>
  );
}