import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// Returns the signed-in user's Prisma row, creating it on first login.
// cache() runs this at most once per request, however many components call it.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.email) return null;

  return prisma.user.upsert({
    where: { id: claims.sub },
    update: {},
    create: { id: claims.sub, email: claims.email },
  });
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
