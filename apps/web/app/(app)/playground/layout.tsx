import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Playground edits the bot's configuration, so it's admin-only (agents land in Conversations).
export default async function PlaygroundLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user.role !== "ADMIN") redirect("/conversations");
  return children;
}
