import type { Metadata } from "next";
import { signInWithGoogle } from "@/actions/auth";
import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in to ReCode</CardTitle>
          <CardDescription>Solve once. Remember forever.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          {error && (
            <p role="alert" className="text-sm text-destructive">
              Sign-in didn&apos;t work. Please try again.
            </p>
          )}
          <form action={signInWithGoogle}>
            <Button type="submit" variant="outline" className="w-full">
              Continue with Google
            </Button>
          </form>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Separator className="flex-1" />
            or
            <Separator className="flex-1" />
          </div>
          <MagicLinkForm />
        </CardContent>
      </Card>
    </main>
  );
}