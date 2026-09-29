"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { magicLinkSchema } from "@/lib/validations";

// Build the callback URL from the request's origin so it works on
// localhost and on the deployed site.
async function callbackUrl() {
  const origin = (await headers()).get("origin");
  return `${origin}/auth/callback`;
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: await callbackUrl() },
  });

  if (error) redirect("/login?error=google");
  redirect(data.url);
}

export type MagicLinkState = {
  status: "idle" | "sent" | "error";
  message?: string;
};

export async function sendMagicLink(
  _prevState: MagicLinkState,
  formData: FormData,
): Promise<MagicLinkState> {
  const parsed = magicLinkSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { status: "error", message: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: await callbackUrl() },
  });

  if (error) {
    return {
      status: "error",
      message: "Couldn't send the link. Wait a minute and try again.",
    };
  }
  return {
    status: "sent",
    message: `Check ${parsed.data.email} for a sign-in link. Open it in this browser.`,
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}