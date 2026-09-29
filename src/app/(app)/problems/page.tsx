import type { Metadata } from "next";

export const metadata: Metadata = { title: "Problems" };

export default function ProblemsPage() {
  return (
    <div className="grid gap-2">
      <h1 className="text-2xl font-semibold">Problems</h1>
      <p className="text-muted-foreground">Your solved problems will show up here.</p>
    </div>
  );
}