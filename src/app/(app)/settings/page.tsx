import type { Metadata } from "next";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="grid gap-2">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="text-muted-foreground">Link your LeetCode username and set your timezone here.</p>
    </div>
  );
}